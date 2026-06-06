import { sha256 } from './hash.js'
import {
  type CredentialMeta,
  type HookEntry,
  type McpServerEntry,
  type PermissionEntry,
  type TrackedState,
  emptyState,
} from './model.js'

// Env values can hold OAuth tokens / API keys. We must be able to detect a
// change without ever persisting the secret, so every value is replaced by a
// short hash marker. The only exceptions are the URL-valued keys the rules
// actually inspect — those are endpoints, not secrets, and host extraction
// needs the real value. The marker is deliberately short so it never trips the
// obfuscation blob regexes.
const SAFE_RAW_ENV_KEYS = new Set(['ANTHROPIC_BASE_URL', 'OTEL_EXPORTER_OTLP_ENDPOINT'])

function redactSecret(value: string): string {
  return `redacted:sha256:${sha256(value).slice(0, 12)}`
}

function envValue(key: string, value: string): string {
  return SAFE_RAW_ENV_KEYS.has(key) ? value : redactSecret(value)
}

function redactEnvRecord(env: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(env)) out[k] = redactSecret(String(v))
  return out
}

export interface CollectInputs {
  claudeJson?: unknown
  settings?: unknown
  settingsLocal?: unknown
  credentials?: CredentialMeta
}

function asObject(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : []
}

function collectServersFrom(
  raw: unknown,
  scope: 'global' | 'project',
  project?: string,
): McpServerEntry[] {
  const servers = asObject(raw)
  const out: McpServerEntry[] = []
  for (const name of Object.keys(servers).sort()) {
    const s = asObject(servers[name])
    const entry: McpServerEntry = { scope, name }
    if (project) entry.project = project
    if (typeof s.command === 'string') entry.command = s.command
    if (Array.isArray(s.args)) entry.args = s.args.map(String)
    if (typeof s.url === 'string') entry.url = s.url
    if (s.env && typeof s.env === 'object')
      entry.env = redactEnvRecord(s.env as Record<string, unknown>)
    out.push(entry)
  }
  return out
}

function collectMcpServers(claudeJson: Record<string, unknown>): McpServerEntry[] {
  const out = collectServersFrom(claudeJson.mcpServers, 'global')
  const projects = asObject(claudeJson.projects)
  for (const path of Object.keys(projects).sort()) {
    out.push(...collectServersFrom(asObject(projects[path]).mcpServers, 'project', path))
  }
  return out
}

function collectHooks(raw: unknown, source: HookEntry['source']): HookEntry[] {
  const hooks = asObject(raw)
  const out: HookEntry[] = []
  for (const event of Object.keys(hooks).sort()) {
    const counters = new Map<string, number>()
    for (const group of asArray(hooks[event])) {
      const g = asObject(group)
      const matcher = typeof g.matcher === 'string' ? g.matcher : undefined
      const cmds = Array.isArray(g.hooks) ? g.hooks : [g]
      for (const c of cmds) {
        const cmd = asObject(c).command
        if (typeof cmd !== 'string') continue
        const key = matcher ?? ''
        const index = counters.get(key) ?? 0
        counters.set(key, index + 1)
        out.push({ source, event, matcher, command: cmd, index })
      }
    }
  }
  return out
}

function collectPlugins(...sources: Record<string, unknown>[]): string[] {
  const out = new Set<string>()
  for (const src of sources) {
    const ep = src.enabledPlugins
    if (Array.isArray(ep)) {
      for (const p of ep) out.add(String(p))
    } else if (ep && typeof ep === 'object') {
      for (const [key, val] of Object.entries(ep)) {
        if (Array.isArray(val)) for (const p of val) out.add(`${p}@${key}`)
        else if (val === true) out.add(key)
      }
    }
  }
  return [...out].sort()
}

function collectMarketplaces(...sources: Record<string, unknown>[]): string[] {
  const out = new Set<string>()
  for (const src of sources) {
    for (const k of Object.keys(asObject(src.extraKnownMarketplaces))) out.add(k)
  }
  return [...out].sort()
}

function collectPermissions(...sources: Record<string, unknown>[]): PermissionEntry[] {
  const lists: PermissionEntry['list'][] = ['allow', 'deny', 'ask']
  const seen = new Set<string>()
  const out: PermissionEntry[] = []
  for (const list of lists) {
    const entries = new Set<string>()
    for (const src of sources) {
      for (const e of asArray(asObject(src.permissions)[list])) entries.add(String(e))
    }
    for (const entry of [...entries].sort()) {
      const key = `${list}:${entry}`
      if (!seen.has(key)) {
        seen.add(key)
        out.push({ list, entry })
      }
    }
  }
  return out
}

function collectEnv(...sources: Record<string, unknown>[]): { key: string; value: string }[] {
  const merged = new Map<string, string>()
  for (const src of sources) {
    const env = asObject(src.env)
    for (const [k, v] of Object.entries(env)) merged.set(k, envValue(k, String(v)))
  }
  return [...merged.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => ({ key, value }))
}

export function collect(inputs: CollectInputs): TrackedState {
  const claudeJson = asObject(inputs.claudeJson)
  const settings = asObject(inputs.settings)
  const settingsLocal = asObject(inputs.settingsLocal)

  const state = emptyState()
  state.mcpServers = collectMcpServers(claudeJson)
  state.hooks = [
    ...collectHooks(claudeJson.hooks, 'claude.json'),
    ...collectHooks(settings.hooks, 'settings'),
    ...collectHooks(settingsLocal.hooks, 'settings.local'),
  ]
  state.plugins = collectPlugins(settings, settingsLocal)
  state.marketplaces = collectMarketplaces(settings, settingsLocal)
  state.permissions = collectPermissions(settings, settingsLocal)
  state.env = collectEnv(claudeJson, settings, settingsLocal)
  state.credentials = inputs.credentials ?? { present: false }
  return state
}
