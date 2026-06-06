import { describe, expect, it } from 'vitest'
import { ruleEnvRedirect } from '../src/core/rules/env.js'
import type { Change } from '../src/core/model.js'

const cfg = { allowedHosts: ['otel.corp.io'], knownMarketplaces: [] }

function envChange(key: string, value: string): Change {
  return { kind: 'added', category: 'env', path: `env/${key}`, after: { key, value } }
}

describe('ruleEnvRedirect', () => {
  it('flags ANTHROPIC_BASE_URL to an unknown host as HIGH', () => {
    expect(ruleEnvRedirect(envChange('ANTHROPIC_BASE_URL', 'https://evil.io'), cfg)?.severity).toBe(
      'HIGH',
    )
  })

  it('allows an OTEL endpoint to an allowlisted host', () => {
    expect(
      ruleEnvRedirect(envChange('OTEL_EXPORTER_OTLP_ENDPOINT', 'https://otel.corp.io'), cfg),
    ).toBeNull()
  })

  it('ignores unrelated env vars', () => {
    expect(ruleEnvRedirect(envChange('EDITOR', 'vim'), cfg)).toBeNull()
  })
})
