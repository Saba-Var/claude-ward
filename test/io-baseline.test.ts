import { existsSync, mkdtempSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { emptyState } from '../src/core/model.js'
import { paths } from '../src/io/paths.js'
import { baselineExists, loadBaseline, saveBaseline } from '../src/io/baseline.js'

// baseline.ts reads the module-level `paths` object, so redirect its fields at
// the ward-state files into a fresh temp dir for each test and restore after.
const original = { wardDir: paths.wardDir, baseline: paths.baseline, config: paths.config }

beforeEach(() => {
  const dir = mkdtempSync(join(tmpdir(), 'cward-bl-'))
  paths.wardDir = dir
  paths.baseline = join(dir, 'baseline.json')
  paths.config = join(dir, 'config.json')
})

afterEach(() => {
  Object.assign(paths, original)
})

describe('saveBaseline / loadBaseline', () => {
  it('preserves createdAt across an update but advances updatedAt', () => {
    const first = saveBaseline(emptyState(), '2026-01-01T00:00:00Z')
    const second = saveBaseline(emptyState(), '2026-02-02T00:00:00Z')
    expect(second.createdAt).toBe(first.createdAt)
    expect(second.updatedAt).toBe('2026-02-02T00:00:00Z')
  })

  it('round-trips through load', () => {
    const state = { ...emptyState(), plugins: ['p@m'] }
    saveBaseline(state, '2026-01-01T00:00:00Z')
    expect(loadBaseline()?.state.plugins).toEqual(['p@m'])
  })

  it('writes the baseline owner-only and leaves no temp file behind', () => {
    saveBaseline(emptyState(), '2026-01-01T00:00:00Z')
    expect(statSync(paths.baseline).mode & 0o777).toBe(0o600)
    expect(readdirSync(paths.wardDir).filter((f) => f.endsWith('.tmp'))).toEqual([])
  })

  it('treats a truncated/corrupt baseline as absent rather than crashing', () => {
    writeFileSync(paths.baseline, '{"version":1,"state":{"mcpServers": ') // truncated
    expect(loadBaseline()).toBeNull()
    expect(baselineExists()).toBe(false)
  })

  it('rejects a baseline with an unknown version', () => {
    writeFileSync(paths.baseline, JSON.stringify({ version: 2, state: emptyState() }))
    expect(loadBaseline()).toBeNull()
  })

  it('backfills missing array fields so diff cannot crash on a partial state', () => {
    writeFileSync(paths.baseline, JSON.stringify({ version: 1, state: { plugins: ['p'] } }))
    const loaded = loadBaseline()
    expect(loaded?.state.mcpServers).toEqual([])
    expect(loaded?.state.plugins).toEqual(['p'])
  })

  it('baselineExists is false when no baseline file exists', () => {
    expect(existsSync(paths.baseline)).toBe(false)
    expect(baselineExists()).toBe(false)
  })
})
