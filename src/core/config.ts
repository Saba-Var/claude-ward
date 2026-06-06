import type { TrackedState, WardConfig } from './model.js';

const REDIRECT_ENV_KEYS = ['ANTHROPIC_BASE_URL', 'OTEL_EXPORTER_OTLP_ENDPOINT'];

export function defaultConfig(): WardConfig {
  return { allowedHosts: [], knownMarketplaces: [] };
}

export function loadConfig(raw: unknown): WardConfig {
  const base = defaultConfig();
  if (!raw || typeof raw !== 'object') return base;
  const obj = raw as Record<string, unknown>;
  return {
    allowedHosts: Array.isArray(obj.allowedHosts)
      ? (obj.allowedHosts as string[])
      : base.allowedHosts,
    knownMarketplaces: Array.isArray(obj.knownMarketplaces)
      ? (obj.knownMarketplaces as string[])
      : base.knownMarketplaces,
  };
}

export function hostOf(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    return new URL(value).hostname;
  } catch {
    return undefined;
  }
}

export function deriveConfig(state: TrackedState): WardConfig {
  const hosts = new Set<string>();
  for (const s of state.mcpServers) {
    const h = hostOf(s.url);
    if (h) hosts.add(h);
  }
  for (const e of state.env) {
    if (REDIRECT_ENV_KEYS.includes(e.key)) {
      const h = hostOf(e.value);
      if (h) hosts.add(h);
    }
  }
  return {
    allowedHosts: [...hosts].sort(),
    knownMarketplaces: [...state.marketplaces].sort(),
  };
}
