import { sha256 } from '../core/hash.js'
import { collect, type CollectInputs } from '../core/collect.js'
import type { CredentialMeta, TrackedState } from '../core/model.js'
import { paths } from './paths.js'
import { readBytes, readJsonFile, statFile } from './read.js'

export interface SnapshotWarning {
  file: string
  status: 'malformed' | 'denied' | 'error'
  error: string
}

export interface Snapshot {
  state: TrackedState
  warnings: SnapshotWarning[]
}

function readJsonInput(file: string, warnings: SnapshotWarning[]): unknown {
  const r = readJsonFile(file)
  if (r.status === 'ok') return r.data
  if (r.status === 'malformed' || r.status === 'denied' || r.status === 'error')
    warnings.push({ file, status: r.status, error: r.error })
  return undefined
}

function readCredentials(warnings: SnapshotWarning[]): CredentialMeta {
  const meta = statFile(paths.credentials)
  if (meta.status === 'missing') return { present: false }
  if (meta.status === 'denied') {
    // Present but unreadable: record it so the rule can flag a tamper instead
    // of treating the dropout as a logout.
    warnings.push({ file: paths.credentials, status: 'denied', error: meta.error })
    return { present: true, unreadable: true }
  }
  const bytes = readBytes(paths.credentials)
  if (!bytes) {
    warnings.push({
      file: paths.credentials,
      status: 'denied',
      error: 'stat succeeded but the file could not be read',
    })
    return { present: true, unreadable: true }
  }
  return { present: true, hash: sha256(bytes), mode: meta.mode, size: meta.size }
}

export function takeSnapshot(): Snapshot {
  const warnings: SnapshotWarning[] = []
  const inputs: CollectInputs = {
    claudeJson: readJsonInput(paths.claudeJson, warnings),
    settings: readJsonInput(paths.settings, warnings),
    settingsLocal: readJsonInput(paths.settingsLocal, warnings),
    credentials: readCredentials(warnings),
  }
  return { state: collect(inputs), warnings }
}
