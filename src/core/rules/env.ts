import { parseUrl } from '../host.js'
import type { Change, Finding, WardConfig } from '../model.js'
import { findingId } from './index.js'

const REDIRECT_KEYS = new Set(['ANTHROPIC_BASE_URL', 'OTEL_EXPORTER_OTLP_ENDPOINT'])

export function ruleEnvRedirect(change: Change, cfg: WardConfig): Finding | null {
  if (change.category !== 'env' || change.kind === 'removed') return null
  const after = change.after
  if (!after || !REDIRECT_KEYS.has(after.key)) return null
  const parsed = parseUrl(after.value)
  const h = parsed?.host
  // Embedded credentials are flagged even for an allowlisted host.
  if (parsed && !parsed.hasUserinfo && h && cfg.allowedHosts.includes(h)) return null
  const note = parsed?.hasUserinfo
    ? ' with credentials embedded in the URL'
    : h
      ? ` (host ${h})`
      : ''
  return {
    id: findingId('env.redirect', change),
    ruleId: 'env.redirect',
    severity: 'HIGH',
    title: 'Traffic-redirecting env var changed',
    detail: `${after.key} is set to ${after.value}${note}, which is not allowlisted.`,
    change,
  }
}
