import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { defaultConfig, loadConfig } from '../core/config.js'
import { type TrackedState, type WardConfig, emptyState } from '../core/model.js'
import { paths } from './paths.js'

export interface Baseline {
  version: 1
  createdAt: string
  updatedAt: string
  state: TrackedState
}

function ensureDir(): void {
  mkdirSync(paths.wardDir, { recursive: true, mode: 0o700 })
}

// Write to a sibling temp file then rename into place. rename is atomic within
// a directory on POSIX, so a killed write cannot leave the baseline - the
// tool's own trust anchor - truncated. Mode 0o600 keeps the file, which holds
// verbatim MCP URLs and the credential hash, owner-only.
function writeAtomic(path: string, data: string): void {
  const tmp = `${path}.${process.pid}.tmp`
  writeFileSync(tmp, data, { mode: 0o600 })
  renameSync(tmp, path)
}

function isBaseline(value: unknown): value is Baseline {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return v.version === 1 && typeof v.state === 'object' && v.state !== null
}

export function loadBaseline(): Baseline | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(readFileSync(paths.baseline, 'utf8'))
  } catch {
    return null
  }
  if (!isBaseline(parsed)) return null
  // Backfill missing array fields so a hand-edited or partially-written
  // baseline cannot crash diff(), which assumes they exist.
  return { ...parsed, state: { ...emptyState(), ...parsed.state } }
}

export function baselineExists(): boolean {
  return loadBaseline() !== null
}

export function saveBaseline(state: TrackedState, now: string): Baseline {
  ensureDir()
  const existing = loadBaseline()
  const baseline: Baseline = {
    version: 1,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    state,
  }
  writeAtomic(paths.baseline, JSON.stringify(baseline, null, 2))
  return baseline
}

export function loadWardConfig(): WardConfig {
  try {
    return loadConfig(JSON.parse(readFileSync(paths.config, 'utf8')))
  } catch {
    return defaultConfig()
  }
}

export function saveWardConfig(config: WardConfig): void {
  ensureDir()
  writeAtomic(paths.config, JSON.stringify(config, null, 2))
}
