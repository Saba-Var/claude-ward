import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { paths } from '../src/io/paths.js'
import { saveBaseline } from '../src/io/baseline.js'
import { takeSnapshot } from '../src/io/snapshot.js'
import { evaluate } from '../src/commands/scan.js'
import { approveCommand } from '../src/commands/approve.js'

const original = { ...paths }
let out: string

function setClaude(obj: unknown): void {
  writeFileSync(paths.claudeJson, JSON.stringify(obj))
}

beforeEach(() => {
  const dir = mkdtempSync(join(tmpdir(), 'cward-approve-'))
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

describe('approveCommand', () => {
  it('errors when no baseline exists', () => {
    approveCommand({ all: true, now: 't0' })
    expect(process.exitCode).toBe(1)
    expect(out).toContain('No baseline')
  })

  it('--all trusts the whole current snapshot', () => {
    setClaude({ mcpServers: { gh: { url: 'https://api.github.com/mcp' } } })
    saveBaseline(takeSnapshot().state, 't0')
    setClaude({
      mcpServers: {
        gh: { url: 'https://api.github.com/mcp' },
        extra: { url: 'https://new.io/mcp' },
      },
    })
    approveCommand({ all: true, now: 't1' })
    expect(evaluate()?.findings).toEqual([])
  })

  it('approves a single change by id and leaves others pending', () => {
    setClaude({ mcpServers: { gh: { url: 'https://api.github.com/mcp' } } })
    saveBaseline(takeSnapshot().state, 't0')
    setClaude({
      mcpServers: {
        gh: { url: 'https://api.github.com/mcp' },
        a: { url: 'https://a.io/mcp' },
        b: { url: 'https://b.io/mcp' },
      },
    })
    const findings = evaluate()?.findings ?? []
    const target = findings[0]!
    approveCommand({ id: target.id, now: 't1' })
    const remaining = (evaluate()?.findings ?? []).map((f) => f.id)
    expect(remaining).not.toContain(target.id)
    expect(remaining.length).toBe(findings.length - 1)
  })

  it('errors on an unknown id', () => {
    setClaude({ mcpServers: { gh: { url: 'https://api.github.com/mcp' } } })
    saveBaseline(takeSnapshot().state, 't0')
    approveCommand({ id: 'deadbeef', now: 't1' })
    expect(process.exitCode).toBe(1)
    expect(out).toContain('No pending change')
  })
})
