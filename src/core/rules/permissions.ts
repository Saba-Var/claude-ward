import type { Change, Finding, PermissionEntry, WardConfig } from '../model.js'
import { findingId } from './index.js'

function isBroad(entry: string): boolean {
  if (entry === '*') return true
  // Bare tool name (no parenthesised scope) = unrestricted
  if (/^[A-Za-z][A-Za-z0-9]*$/.test(entry)) return true
  // Scoped entry: ToolName(scope) - broad only when scope is a bare wildcard (no path context)
  const match = /^[A-Za-z][A-Za-z0-9]*\((.+)\)$/.exec(entry)
  if (match !== null) {
    const scope: string = match[1] ?? ''
    // A scope that starts with '.' or '/' or a word-char followed by '/' is a specific path - narrow
    if (/^[./]/.test(scope) || /^[A-Za-z0-9_-]+\//.test(scope)) return false
    // A bare '*' or wildcards without path separators are broad
    return scope.includes('*')
  }
  return false
}

export function ruleBroadenedPermissions(change: Change, _cfg: WardConfig): Finding | null {
  if (change.category !== 'permission' || change.kind !== 'added') return null
  const after = change.after as PermissionEntry
  if (after.list !== 'allow' || !isBroad(after.entry)) return null
  return {
    id: findingId('permissions.broadened', change.path),
    ruleId: 'permissions.broadened',
    severity: 'MEDIUM',
    title: 'Permission allow-list broadened',
    detail: `A broad permission was added to allow: "${after.entry}".`,
    change,
  }
}
