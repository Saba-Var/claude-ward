import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { paths } from '../src/io/paths.js'
import { baselineExists } from '../src/io/baseline.js'
import { initCommand } from '../src/commands/init.js'

const original = { ...paths }
let out: string

beforeEach(() => {
  const dir = mkdtempSync(join(tmpdir(), 'cward-init-'))
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

describe('initCommand', () => {
  it('writes a baseline and derives the allowlist from the current config', () => {
    writeFileSync(
      paths.claudeJson,
      JSON.stringify({ mcpServers: { gh: { url: 'https://api.github.com/mcp' } } }),
    )
    initCommand({ now: 't0' })
    expect(baselineExists()).toBe(true)
    const cfg = JSON.parse(readFileSync(paths.config, 'utf8'))
    expect(cfg.allowedHosts).toContain('api.github.com')
  })

  it('refuses to overwrite an existing baseline without --force', () => {
    initCommand({ now: 't0' })
    out = ''
    initCommand({ now: 't1' })
    expect(process.exitCode).toBe(1)
    expect(out).toContain('already exists')
  })

  it('overwrites with --force', () => {
    initCommand({ now: 't0' })
    out = ''
    initCommand({ force: true, now: 't1' })
    expect(process.exitCode).toBe(0)
    expect(out).toContain('trusted')
  })

  it('surfaces a warning for a malformed watched file', () => {
    writeFileSync(paths.claudeJson, '{not json')
    initCommand({ now: 't0' })
    expect(out).toContain('warning: could not read')
  })
})
