import type { Change, CredentialMeta, Finding, WardConfig } from '../model.js'
import { findingId } from './index.js'

function isGroupOrWorldReadable(mode: number | undefined): boolean {
  return mode !== undefined && (mode & 0o077) !== 0
}

// A real chown: both sides know the owner and it differs. When the old baseline
// predates owner tracking (uid/gid undefined), the first post-upgrade snapshot
// fills the field in - that is a schema change, not a tamper, so it stays quiet.
function ownerChanged(before: CredentialMeta | undefined, after: CredentialMeta): boolean {
  if (!before) return false
  const uidDrift = before.uid !== undefined && after.uid !== undefined && before.uid !== after.uid
  const gidDrift = before.gid !== undefined && after.gid !== undefined && before.gid !== after.gid
  return uidDrift || gidDrift
}

export function ruleCredentials(change: Change, _cfg: WardConfig): Finding | null {
  if (change.category !== 'credentials') return null
  const after = change.after
  if (change.kind === 'added' || !after) return null

  if (after.unreadable) {
    return {
      id: findingId('credentials.unreadable', change),
      ruleId: 'credentials.unreadable',
      severity: 'HIGH',
      title: 'Credentials file became unreadable',
      detail:
        '~/.claude/.credentials.json exists but could not be read (permissions may have been dropped). A tamper can hide behind an unreadable file - investigate before re-authenticating.',
      change,
    }
  }
  if (ownerChanged(change.before, after)) {
    return {
      id: findingId('credentials.owner', change),
      ruleId: 'credentials.owner',
      severity: 'HIGH',
      title: 'Credentials file owner changed',
      detail:
        '~/.claude/.credentials.json is now owned by a different user or group. The file should stay owned by your account; a changed owner can mean another account took control of it. Investigate before re-authenticating.',
      change,
    }
  }
  if (isGroupOrWorldReadable(after.mode)) {
    return {
      id: findingId('credentials.mode', change),
      ruleId: 'credentials.mode',
      severity: 'HIGH',
      title: 'Credentials file became group/world-readable',
      detail: `~/.claude/.credentials.json is group/world-readable (mode ${(after.mode ?? 0).toString(8)}); expected 600. Readable by others - tighten permissions immediately.`,
      change,
    }
  }
  if (change.kind === 'modified') {
    // Contents changed but the owner and permissions did not. This is what a
    // routine token refresh looks like, and claude-ward cannot tell a refresh
    // from a content swap without parsing the file (which it never does), so the
    // honest call is INFO, not a HIGH that cries on every refresh. The real
    // tamper signals - owner, permissions, unreadable - are handled above.
    return {
      id: findingId('credentials.hash', change),
      ruleId: 'credentials.hash',
      severity: 'INFO',
      title: 'Credentials file contents changed',
      detail:
        'The hash of ~/.claude/.credentials.json changed while its owner and permissions stayed the same. This is the normal result of a token refresh or re-authentication. If you have not used Claude Code recently, run "claude-ward diff" and look closer.',
      change,
    }
  }
  return null
}
