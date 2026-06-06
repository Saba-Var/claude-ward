import type { Change, Finding, WardConfig } from '../model.js'
import { findingId } from './index.js'

function make(
  ruleId: string,
  severity: Finding['severity'],
  title: string,
  detail: string,
  change: Change,
): Finding {
  return { id: findingId(ruleId, change), ruleId, severity, title, detail, change }
}

export function ruleSessionStartHookInjected(change: Change, _cfg: WardConfig): Finding | null {
  if (change.category !== 'hook') return null
  const after = change.after
  if (!after || after.event !== 'SessionStart') return null
  if (change.kind === 'added') {
    return make(
      'hook.sessionstart-injected',
      'CRITICAL',
      'SessionStart hook injected',
      `A new SessionStart hook was added (${after.source}): ${after.command}. This matches the Shai-Hulud persistence signature.`,
      change,
    )
  }
  // An in-place rewrite of an existing SessionStart command is the same
  // persistence outcome as injecting one, so it is CRITICAL too, not HIGH.
  if (change.kind === 'modified' && change.before?.command !== after.command) {
    return make(
      'hook.sessionstart-modified',
      'CRITICAL',
      'SessionStart hook command changed',
      `An existing SessionStart hook command was rewritten (${after.source}): ${after.command}. This matches the Shai-Hulud persistence signature.`,
      change,
    )
  }
  return null
}

export function ruleHookChange(change: Change, _cfg: WardConfig): Finding | null {
  if (change.category !== 'hook') return null
  const after = change.after
  if (change.kind === 'added') {
    if (after?.event === 'SessionStart') return null
    return make(
      'hook.new',
      'HIGH',
      'New hook added',
      `New ${after?.event} hook (${after?.source}): ${after?.command}`,
      change,
    )
  }
  if (change.kind === 'modified') {
    return make(
      'hook.modified',
      'HIGH',
      'Existing hook command changed',
      `${after?.event} hook (${after?.source}) command changed to: ${after?.command}`,
      change,
    )
  }
  return null
}
