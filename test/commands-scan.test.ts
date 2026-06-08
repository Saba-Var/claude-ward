import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { emptyState } from '../src/core/model.js'
import { paths } from '../src/io/paths.js'
import { saveBaseline } from '../src/io/baseline.js'
import { takeSnapshot } from '../src/io/snapshot.js'
import { notify } from '../src/io/notify.js'
import { scanCommand } from '../src/commands/scan.js'

vi.mock('../src/io/notify.js', () => ({ notify: vi.fn() }))

const original = { ...paths }
let out: string

function writeClaude(servers: Record<string, { url: string }>): void {
  writeFileSync(paths.claudeJson, JSON.stringify({ mcpServers: servers }))
}

beforeEach(() => {
  const dir = mkdtempSync(join(tmpdir(), 'cward-scan-'))
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
  vi.spyOn(process.stdout, 'write').mockImplementation((s) => ((out += String(s)), true))
  vi.spyOn(process.stderr, 'write').mockImplementation((s) => ((out += String(s)), true))
  process.exitCode = 0
})

afterEach(() => {
  vi.restoreAllMocks()
  Object.assign(paths, original)
  process.exitCode = 0
})

describe('scanCommand exit codes', () => {
  it('exits 1 with a hint when no baseline exists', () => {
    scanCommand()
    expect(process.exitCode).toBe(1)
    expect(out).toContain('No baseline')
  })

  it('exits 0 on a clean scan', () => {
    writeClaude({ gh: { url: 'https://api.github.com/mcp' } })
    saveBaseline(takeSnapshot().state, 't0')
    scanCommand()
    expect(process.exitCode).toBe(0)
    expect(out).toContain('No changes against baseline')
  })

  it('exits 2 when a CRITICAL finding is present', () => {
    writeClaude({ gh: { url: 'https://api.github.com/mcp' } })
    saveBaseline(takeSnapshot().state, 't0')
    writeClaude({ gh: { url: 'http://localhost:6666/mcp' } }) // repoint
    scanCommand()
    expect(process.exitCode).toBe(2)
    expect(out).toContain('CRITICAL')
  })

  it('prints a warning when a watched file is malformed but still reports', () => {
    saveBaseline(emptyState(), 't0')
    writeFileSync(paths.claudeJson, '{not json')
    scanCommand()
    expect(out).toContain('warning: could not read')
  })

  it('exits 2 when a watched file is unreadable - the worst case to hide', () => {
    saveBaseline(emptyState(), 't0')
    writeFileSync(paths.claudeJson, '{not json')
    scanCommand()
    expect(process.exitCode).toBe(2)
  })
})

describe('scanCommand --hook (SessionStart)', () => {
  // A SessionStart hook only reaches the user through two channels: stdout
  // captured into the model's context (which requires exit 0 - a non-zero exit
  // makes Claude Code discard all hook output), and a desktop notification.
  // So --hook must exit 0 and emit a JSON additionalContext payload on stdout.
  beforeEach(() => vi.mocked(notify).mockClear())

  it('emits an additionalContext payload to stdout and exits 0 on findings', () => {
    let stdout = ''
    vi.mocked(process.stdout.write).mockImplementation((s) => ((stdout += String(s)), true))
    writeClaude({ gh: { url: 'https://api.github.com/mcp' } })
    saveBaseline(takeSnapshot().state, 't0')
    writeClaude({ gh: { url: 'http://localhost:6666/mcp' } }) // repoint
    scanCommand({ hook: true })
    expect(process.exitCode).toBe(0)
    const payload = JSON.parse(stdout)
    expect(payload.hookSpecificOutput.hookEventName).toBe('SessionStart')
    expect(payload.hookSpecificOutput.additionalContext).toContain('CRITICAL')
  })

  it('fires a desktop notification on findings', () => {
    writeClaude({ gh: { url: 'https://api.github.com/mcp' } })
    saveBaseline(takeSnapshot().state, 't0')
    writeClaude({ gh: { url: 'http://localhost:6666/mcp' } })
    scanCommand({ hook: true })
    expect(vi.mocked(notify)).toHaveBeenCalledOnce()
  })

  it('keeps exit 0 even when a watched file is unreadable', () => {
    saveBaseline(emptyState(), 't0')
    writeFileSync(paths.claudeJson, '{not json')
    scanCommand({ hook: true })
    expect(process.exitCode).toBe(0)
  })

  it('stays silent and exits 0 on a clean config', () => {
    let stdout = ''
    vi.mocked(process.stdout.write).mockImplementation((s) => ((stdout += String(s)), true))
    writeClaude({ gh: { url: 'https://api.github.com/mcp' } })
    saveBaseline(takeSnapshot().state, 't0')
    scanCommand({ hook: true })
    expect(process.exitCode).toBe(0)
    expect(stdout).toBe('')
    expect(vi.mocked(notify)).not.toHaveBeenCalled()
  })
})

describe('scanCommand --quiet exit code', () => {
  it('still writes findings to stdout and exits 2', () => {
    let stdout = ''
    let stderr = ''
    vi.mocked(process.stdout.write).mockImplementation((s) => ((stdout += String(s)), true))
    vi.mocked(process.stderr.write).mockImplementation((s) => ((stderr += String(s)), true))
    writeClaude({ gh: { url: 'https://api.github.com/mcp' } })
    saveBaseline(takeSnapshot().state, 't0')
    writeClaude({ gh: { url: 'http://localhost:6666/mcp' } })
    scanCommand({ quiet: true })
    expect(process.exitCode).toBe(2)
    expect(stdout).toContain('CRITICAL')
    expect(stderr).toBe('')
  })
})
