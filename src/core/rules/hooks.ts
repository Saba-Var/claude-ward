import type { Change, Finding, HookEntry, WardConfig } from '../model.js';
import { findingId } from './index.js';

function make(ruleId: string, severity: Finding['severity'], title: string, detail: string, change: Change): Finding {
  return { id: findingId(ruleId, change.path), ruleId, severity, title, detail, change };
}

export function ruleSessionStartHookInjected(change: Change, _cfg: WardConfig): Finding | null {
  if (change.category !== 'hook' || change.kind !== 'added') return null;
  const after = change.after as HookEntry;
  if (after.event !== 'SessionStart') return null;
  return make(
    'hook.sessionstart-injected',
    'CRITICAL',
    'SessionStart hook injected',
    `A new SessionStart hook was added (${after.source}): ${after.command}. This matches the Shai-Hulud persistence signature.`,
    change,
  );
}

export function ruleHookChange(change: Change, _cfg: WardConfig): Finding | null {
  if (change.category !== 'hook') return null;
  const after = change.after as HookEntry | undefined;
  if (change.kind === 'added') {
    if (after?.event === 'SessionStart') return null;
    return make(
      'hook.new',
      'HIGH',
      'New hook added',
      `New ${after?.event} hook (${after?.source}): ${after?.command}`,
      change,
    );
  }
  if (change.kind === 'modified') {
    return make(
      'hook.modified',
      'HIGH',
      'Existing hook command changed',
      `${after?.event} hook (${after?.source}) command changed to: ${after?.command}`,
      change,
    );
  }
  return null;
}
