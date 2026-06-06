import {
  type Change,
  type ChangeCategory,
  type CredentialMeta,
  type HookEntry,
  type McpServerEntry,
  type PermissionEntry,
  type TrackedState,
} from './model.js';

interface Keyed<T> {
  key: string;
  path: string;
  value: T;
}

function eq(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function diffKeyed<T>(category: ChangeCategory, before: Keyed<T>[], after: Keyed<T>[]): Change[] {
  const beforeMap = new Map(before.map((k) => [k.key, k]));
  const afterMap = new Map(after.map((k) => [k.key, k]));
  const changes: Change[] = [];
  for (const a of after) {
    const b = beforeMap.get(a.key);
    if (!b) changes.push({ kind: 'added', category, path: a.path, after: a.value });
    else if (!eq(b.value, a.value))
      changes.push({ kind: 'modified', category, path: a.path, before: b.value, after: a.value });
  }
  for (const b of before) {
    if (!afterMap.has(b.key))
      changes.push({ kind: 'removed', category, path: b.path, before: b.value });
  }
  return changes;
}

function servers(state: TrackedState): Keyed<McpServerEntry>[] {
  return state.mcpServers.map((s) => ({
    key: `${s.scope}:${s.project ?? ''}:${s.name}`,
    path: `mcpServer/${s.scope}/${s.project ?? ''}/${s.name}`,
    value: s,
  }));
}

function hooks(state: TrackedState): Keyed<HookEntry>[] {
  return state.hooks.map((h) => ({
    key: `${h.source}:${h.event}:${h.matcher ?? ''}:${h.index}`,
    path: `hook/${h.source}/${h.event}/${h.matcher ?? ''}#${h.index}`,
    value: h,
  }));
}

function strings(state: TrackedState, field: 'plugins' | 'marketplaces'): Keyed<string>[] {
  return state[field].map((v) => ({
    key: v,
    path: `${field === 'plugins' ? 'plugin' : 'marketplace'}/${v}`,
    value: v,
  }));
}

function permissions(state: TrackedState): Keyed<PermissionEntry>[] {
  return state.permissions.map((p) => ({
    key: `${p.list}:${p.entry}`,
    path: `permission/${p.list}/${p.entry}`,
    value: p,
  }));
}

function env(state: TrackedState): Keyed<{ key: string; value: string }>[] {
  return state.env.map((e) => ({ key: e.key, path: `env/${e.key}`, value: e }));
}

function credChanges(before: CredentialMeta, after: CredentialMeta): Change[] {
  if (!before.present && !after.present) return [];
  if (!before.present && after.present)
    return [{ kind: 'added', category: 'credentials', path: 'credentials', after }];
  if (before.present && !after.present)
    return [{ kind: 'removed', category: 'credentials', path: 'credentials', before }];
  if (!eq(before, after))
    return [{ kind: 'modified', category: 'credentials', path: 'credentials', before, after }];
  return [];
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
  ];
}

export function applyChange(state: TrackedState, change: Change): TrackedState {
  const next: TrackedState = JSON.parse(JSON.stringify(state));
  const replaceArray = <T>(arr: T[], match: (x: T) => boolean, value: T | null): T[] => {
    const filtered = arr.filter((x) => !match(x));
    return value === null ? filtered : [...filtered, value];
  };

  switch (change.category) {
    case 'mcpServer': {
      const v = (change.after ?? change.before) as McpServerEntry;
      const m = (x: McpServerEntry) =>
        x.scope === v.scope && (x.project ?? '') === (v.project ?? '') && x.name === v.name;
      next.mcpServers = replaceArray(next.mcpServers, m, change.kind === 'removed' ? null : v);
      break;
    }
    case 'hook': {
      const v = (change.after ?? change.before) as HookEntry;
      const m = (x: HookEntry) =>
        x.source === v.source &&
        x.event === v.event &&
        (x.matcher ?? '') === (v.matcher ?? '') &&
        x.index === v.index;
      next.hooks = replaceArray(next.hooks, m, change.kind === 'removed' ? null : v);
      break;
    }
    case 'plugin':
    case 'marketplace': {
      const v = (change.after ?? change.before) as string;
      const field = change.category === 'plugin' ? 'plugins' : 'marketplaces';
      next[field] = replaceArray(next[field], (x) => x === v, change.kind === 'removed' ? null : v);
      break;
    }
    case 'permission': {
      const v = (change.after ?? change.before) as PermissionEntry;
      const m = (x: PermissionEntry) => x.list === v.list && x.entry === v.entry;
      next.permissions = replaceArray(next.permissions, m, change.kind === 'removed' ? null : v);
      break;
    }
    case 'env': {
      const v = (change.after ?? change.before) as { key: string; value: string };
      next.env = replaceArray(
        next.env,
        (x) => x.key === v.key,
        change.kind === 'removed' ? null : v,
      );
      break;
    }
    case 'credentials': {
      next.credentials =
        change.kind === 'removed' ? { present: false } : (change.after as CredentialMeta);
      break;
    }
  }
  return next;
}
