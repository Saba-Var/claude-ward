import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { paths } from '../src/io/paths.js'
import { saveBaseline } from '../src/io/baseline.js'
import { takeSnapshot } from '../src/io/snapshot.js'
import { evaluate } from '../src/commands/scan.js'
import { installHookCommand, uninstallHookCommand } from '../src/commands/install-hook.js'

// Drive the consent prompt without a real tty: the factory reads a hoisted
// answer the decline test flips to 'n'. The --yes tests short-circuit confirm()
// before it ever calls createInterface, so the mock is irrelevant there.
const prompt = vi.hoisted(() => ({ answer: 'n' }))
vi.mock('node:readline/promises', () => ({
  createInterface: () => ({ question: async () => prompt.answer, close: () => {} }),
}))

const HOOK = 'claude-ward scan --quiet'
const original = { ...paths }
let out: string

function readSettings(): Record<string, unknown> {
  return JSON.parse(readFileSync(paths.settings, 'utf8'))
}

beforeEach(() => {
  const dir = mkdtempSync(join(tmpdir(), 'cward-hook-'))
  Object.assign(paths, {
    claudeJson: join(dir, '.claude.json'),
    settings: join(dir, 'settings.json'),
    settingsLocal: join(dir, 'settings.local.json'),
    credentials: join(dir, '.credentials.json'),
    wardDir: dir,
    baseline: join(dir, 'baseline.json'),
    config: join(dir, 'config.json'),
  })
  out = ''
  vi.spyOn(process.stdout, 'write').mockImplementation((s) => {
    out += String(s)
    return true
  })
  vi.spyOn(process.stderr, 'write').mockImplementation((s) => {
    out += String(s)
    return true
  })
  process.exitCode = 0
})

afterEach(() => {
  vi.restoreAllMocks()
  Object.assign(paths, original)
  process.exitCode = 0
})

describe('installHookCommand', () => {
  it('adds the hook to a fresh settings file and is idempotent', async () => {
    await installHookCommand({ yes: true, now: 't0' })
    const groups = readSettings().hooks as { SessionStart: { hooks: { command: string }[] }[] }
    expect(groups.SessionStart[0]?.hooks[0]?.command).toBe(HOOK)

    out = ''
    await installHookCommand({ yes: true, now: 't1' })
    expect(out).toContain('already installed')
  })

  it('preserves the user existing settings keys when adding the hook', async () => {
    writeFileSync(
      paths.settings,
      JSON.stringify({ permissions: { allow: ['Read'] }, model: 'opus' }),
    )
    await installHookCommand({ yes: true, now: 't0' })
    const s = readSettings()
    expect(s.permissions).toEqual({ allow: ['Read'] })
    expect(s.model).toBe('opus')
    expect(s.hooks).toBeDefined()
  })

  it('refuses to overwrite a malformed settings.json', async () => {
    writeFileSync(paths.settings, '{ this is not json')
    await installHookCommand({ yes: true, now: 't0' })
    expect(process.exitCode).toBe(1)
    expect(out).toContain('Refusing to edit')
    // the malformed file is left exactly as it was
    expect(readFileSync(paths.settings, 'utf8')).toBe('{ this is not json')
  })

  it('does not write when the user declines consent', async () => {
    prompt.answer = 'n'
    await installHookCommand({ now: 't0' })
    expect(out).toContain('Aborted')
    expect(() => readFileSync(paths.settings, 'utf8')).toThrow()
  })

  it('re-baselines only its own hook, leaving a concurrent repoint pending', async () => {
    // Trusted starting point: one remote MCP server.
    writeFileSync(
      paths.claudeJson,
      JSON.stringify({ mcpServers: { gh: { url: 'https://api.github.com/mcp' } } }),
    )
    saveBaseline(takeSnapshot().state, 't0')

    // An attacker repoints it to localhost before we install the hook.
    writeFileSync(
      paths.claudeJson,
      JSON.stringify({ mcpServers: { gh: { url: 'http://localhost:6666/mcp' } } }),
    )

    await installHookCommand({ yes: true, now: 't1' })
    expect(out).toContain('other pending change')

    // The CRITICAL repoint must still be detectable - not absorbed into trust.
    const findings = evaluate()?.findings ?? []
    expect(findings.some((f) => f.ruleId === 'mcp.localhost-repoint')).toBe(true)
  })
})

describe('uninstallHookCommand', () => {
  it('removes only our hook and keeps a co-located user hook', async () => {
    writeFileSync(
      paths.settings,
      JSON.stringify({
        hooks: {
          SessionStart: [
            { hooks: [{ type: 'command', command: 'echo hi' }] },
            { hooks: [{ type: 'command', command: HOOK }] },
          ],
        },
      }),
    )
    await uninstallHookCommand({ now: 't0' })
    const groups = (readSettings().hooks as { SessionStart: { hooks: { command: string }[] }[] })
      .SessionStart
    const commands = groups.flatMap((g) => g.hooks.map((h) => h.command))
    expect(commands).toContain('echo hi')
    expect(commands).not.toContain(HOOK)
  })
})
