import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { emptyState } from '../src/core/model.js'
import { paths } from '../src/io/paths.js'
import { saveBaseline } from '../src/io/baseline.js'
import { watchCommand } from '../src/commands/watch.js'

// Replace the real fs watcher and the notifier so the test does no I/O beyond
// the temp baseline and never opens a real chokidar handle.
vi.mock('../src/io/watcher.js', () => ({
  startWatcher: () => ({ close: async () => {} }),
}))
vi.mock('../src/io/notify.js', () => ({ notify: () => {} }))

const original = { ...paths }
let out: string

beforeEach(() => {
  const dir = mkdtempSync(join(tmpdir(), 'cward-watch-'))
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
  // Swallow signal-handler registration so the test does not leak listeners.
  vi.spyOn(process, 'on').mockImplementation(() => process)
})

afterEach(() => {
  vi.restoreAllMocks()
  Object.assign(paths, original)
})

describe('watchCommand', () => {
  it('runs an initial evaluation and prints the same output shape as scan', () => {
    saveBaseline(emptyState(), 't0')
    watchCommand()
    expect(out).toContain('Watching Claude Code config')
    expect(out).toContain('No changes against baseline')
  })
})
