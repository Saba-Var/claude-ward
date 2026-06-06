import { hostOf, normalizeHostEntry } from './host.js'
import type { TrackedState, WardConfig } from './model.js'

const REDIRECT_ENV_KEYS = ['ANTHROPIC_BASE_URL', 'OTEL_EXPORTER_OTLP_ENDPOINT']

export function defaultConfig(): WardConfig {
  return { allowedHosts: [], knownMarketplaces: [] }
}

export function loadConfig(raw: unknown): WardConfig {
  const base = defaultConfig()
  if (!raw || typeof raw !== 'object') return base
  const obj = raw as Record<string, unknown>
  return {
    // The config file is user/tool-editable, so validate element types rather
    // than asserting them: a stray non-string would otherwise poison host
    // matching. Host entries are canonicalized so spellings compare equal.
    allowedHosts: Array.isArray(obj.allowedHosts)
      ? obj.allowedHosts.filter((x): x is string => typeof x === 'string').map(normalizeHostEntry)
      : base.allowedHosts,
    knownMarketplaces: Array.isArray(obj.knownMarketplaces)
      ? obj.knownMarketplaces.filter((x): x is string => typeof x === 'string')
      : base.knownMarketplaces,
  }
}

export function deriveConfig(state: TrackedState): WardConfig {
  const hosts = new Set<string>()
  for (const s of state.mcpServers) {
    const h = hostOf(s.url)
    if (h) hosts.add(h)
  }
  for (const e of state.env) {
    if (REDIRECT_ENV_KEYS.includes(e.key)) {
      const h = hostOf(e.value)
      if (h) hosts.add(h)
    }
  }
  return {
    allowedHosts: [...hosts].sort(),
    knownMarketplaces: [...state.marketplaces].sort(),
  }
}
