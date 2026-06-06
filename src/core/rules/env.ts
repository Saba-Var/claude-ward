import type { Change, Finding, WardConfig } from '../model.js'
import { findingId } from './index.js'

const REDIRECT_KEYS = new Set(['ANTHROPIC_BASE_URL', 'OTEL_EXPORTER_OTLP_ENDPOINT'])

function host(value: string): string | undefined {
  try {
    return new URL(value).hostname
  } catch {
    return undefined
  }
}

export function ruleEnvRedirect(change: Change, cfg: WardConfig): Finding | null {
  if (change.category !== 'env' || change.kind === 'removed') return null
  const after = change.after
  if (!after || !REDIRECT_KEYS.has(after.key)) return null
  const h = host(after.value)
  if (h && cfg.allowedHosts.includes(h)) return null
  return {
    id: findingId('env.redirect', change.path),
    ruleId: 'env.redirect',
    severity: 'HIGH',
    title: 'Traffic-redirecting env var changed',
    detail: `${after.key} is set to ${after.value}${h ? ` (host ${h})` : ''}, which is not allowlisted.`,
    change,
  }
}
