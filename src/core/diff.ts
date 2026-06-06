import {
  assertNever,
  type Change,
  type ChangeCategory,
  type CredentialMeta,
  type EnvEntry,
  type HookEntry,
  type McpServerEntry,
  type PermissionEntry,
  type TrackedState,
} from './model.js'

interface Keyed<T> {
  key: string
  path: string
  value: T
}

function eq(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

function diffKeyed<C extends ChangeCategory, V>(
  category: C,
  before: Keyed<V>[],
  after: Keyed<V>[],
): Change[] {
  const beforeMap = new Map(before.map((k) => [k.key, k]))
  const afterMap = new Map(after.map((k) => [k.key, k]))
  const changes: Change[] = []
  // TypeScript cannot prove `V` is the payload type for category `C`, so the
  // constructed object is asserted once here. This is the single cast that
  // lets every rule and applyChange consume `Change` with no cast of its own.
  for (const a of after) {
    const b = beforeMap.get(a.key)
    if (!b)
      changes.push({ kind: 'added', category, path: a.path, key: a.key, after: a.value } as Change)
    else if (!eq(b.value, a.value))
      changes.push({
        kind: 'modified',
        category,
        path: a.path,
        key: a.key,
        before: b.value,
        after: a.value,
      } as Change)
  }
  for (const b of before) {
    if (!afterMap.has(b.key))
      changes.push({
        kind: 'removed',
        category,
        path: b.path,
        key: b.key,
        before: b.value,
      } as Change)
  }
  return changes
}

// Keys join attacker-influenceable fields (project paths, server names, hook
// matchers), so a raw delimiter join lets two distinct entities collapse to one
// key. JSON.stringify of an ordered tuple is injective; the readable `path`
// stays a separate, display-only string.
function servers(state: TrackedState): Keyed<McpServerEntry>[] {
  return state.mcpServers.map((s) => ({
    key: JSON.stringify(['mcpServer', s.scope, s.project ?? null, s.name]),
    path: `mcpServer/${s.scope}/${s.project ?? ''}/${s.name}`,
    value: s,
  }))
}

function hooks(state: TrackedState): Keyed<HookEntry>[] {
  return state.hooks.map((h) => ({
    key: JSON.stringify(['hook', h.source, h.event, h.matcher ?? null, h.index]),
    path: `hook/${h.source}/${h.event}/${h.matcher ?? ''}#${h.index}`,
    value: h,
  }))
}

function strings(state: TrackedState, field: 'plugins' | 'marketplaces'): Keyed<string>[] {
  return state[field].map((v) => ({
    key: JSON.stringify([field, v]),
    path: `${field === 'plugins' ? 'plugin' : 'marketplace'}/${v}`,
    value: v,
  }))
}

function permissions(state: TrackedState): Keyed<PermissionEntry>[] {
  return state.permissions.map((p) => ({
    key: JSON.stringify(['permission', p.list, p.entry]),
    path: `permission/${p.list}/${p.entry}`,
    value: p,
  }))
}

function env(state: TrackedState): Keyed<EnvEntry>[] {
  return state.env.map((e) => ({
    key: JSON.stringify(['env', e.key]),
    path: `env/${e.key}`,
    value: e,
  }))
}

function credChanges(before: CredentialMeta, after: CredentialMeta): Change[] {
  const base = { category: 'credentials', path: 'credentials', key: 'credentials' } as const
  if (!before.present && !after.present) return []
  if (!before.present && after.present) return [{ ...base, kind: 'added', after }]
  if (before.present && !after.present) return [{ ...base, kind: 'removed', before }]
  if (!eq(before, after)) return [{ ...base, kind: 'modified', before, after }]
  return []
}

export function diff(before: TrackedState, after: TrackedState): Change[] {
  return [
    ...diffKeyed('mcpServer', servers(before), servers(after)),
    ...diffKeyed('hook', hooks(before), hooks(after)),
    ...diffKeyed('plugin', strings(before, 'plugins'), strings(after, 'plugins')),
    ...diffKeyed('marketplace', strings(before, 'marketplaces'), strings(after, 'marketplaces')),
    ...diffKeyed('permission', permissions(before), permissions(after)),
    ...diffKeyed('env', env(before), env(after)),
    ...credChanges(before.credentials, after.credentials),
  ]
}

export function applyChange(state: TrackedState, change: Change): TrackedState {
  const next: TrackedState = JSON.parse(JSON.stringify(state))
  const replaceArray = <T>(arr: T[], match: (x: T) => boolean, value: T | null): T[] => {
    const filtered = arr.filter((x) => !match(x))
    return value === null ? filtered : [...filtered, value]
  }

  switch (change.category) {
    case 'mcpServer': {
      const v = change.after ?? change.before
      if (!v) break
      const m = (x: McpServerEntry) =>
        x.scope === v.scope && (x.project ?? '') === (v.project ?? '') && x.name === v.name
      next.mcpServers = replaceArray(next.mcpServers, m, change.kind === 'removed' ? null : v)
      break
    }
    case 'hook': {
      const v = change.after ?? change.before
      if (!v) break
      const m = (x: HookEntry) =>
        x.source === v.source &&
        x.event === v.event &&
        (x.matcher ?? '') === (v.matcher ?? '') &&
        x.index === v.index
      next.hooks = replaceArray(next.hooks, m, change.kind === 'removed' ? null : v)
      break
    }
    case 'plugin':
    case 'marketplace': {
      const v = change.after ?? change.before
      if (v === undefined) break
      const field = change.category === 'plugin' ? 'plugins' : 'marketplaces'
      next[field] = replaceArray(next[field], (x) => x === v, change.kind === 'removed' ? null : v)
      break
    }
    case 'permission': {
      const v = change.after ?? change.before
      if (!v) break
      const m = (x: PermissionEntry) => x.list === v.list && x.entry === v.entry
      next.permissions = replaceArray(next.permissions, m, change.kind === 'removed' ? null : v)
      break
    }
    case 'env': {
      const v = change.after ?? change.before
      if (!v) break
      next.env = replaceArray(
        next.env,
        (x) => x.key === v.key,
        change.kind === 'removed' ? null : v,
      )
      break
    }
    case 'credentials': {
      next.credentials =
        change.kind === 'removed' ? { present: false } : (change.after ?? { present: false })
      break
    }
    default:
      return assertNever(change)
  }
  return next
}
