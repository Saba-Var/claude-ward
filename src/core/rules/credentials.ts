import type { Change, CredentialMeta, Finding, WardConfig } from '../model.js'
import { findingId } from './index.js'

function isGroupOrWorldReadable(mode: number | undefined): boolean {
  return mode !== undefined && (mode & 0o077) !== 0
}

export function ruleCredentials(change: Change, _cfg: WardConfig): Finding | null {
  if (change.category !== 'credentials') return null
  const after = change.after as CredentialMeta | undefined
  if (change.kind === 'added' || !after) return null

  if (isGroupOrWorldReadable(after.mode)) {
    return {
      id: findingId('credentials.mode', change.path),
      ruleId: 'credentials.mode',
      severity: 'HIGH',
      title: 'Credentials file became group/world-readable',
      detail: `~/.claude/.credentials.json is group/world-readable (mode ${(after.mode ?? 0).toString(8)}); expected 600. Readable by others — tighten permissions immediately.`,
      change,
    }
  }
  if (change.kind === 'modified') {
    return {
      id: findingId('credentials.hash', change.path),
      ruleId: 'credentials.hash',
      severity: 'HIGH',
      title: 'Credentials file changed unexpectedly',
      detail:
        'The hash of ~/.claude/.credentials.json changed. If you did not just (re)authenticate, treat this as suspicious.',
      change,
    }
  }
  return null
}
