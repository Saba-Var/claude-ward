import { describe, expect, it } from 'vitest'
import { ruleCredentials } from '../src/core/rules/credentials.js'
import type { Change, CredentialMeta } from '../src/core/model.js'

const cfg = { allowedHosts: [], knownMarketplaces: [] }

function credChange(kind: Change['kind'], after: CredentialMeta, before?: CredentialMeta): Change {
  return { kind, category: 'credentials', path: 'credentials', before, after }
}

describe('ruleCredentials', () => {
  it('flags a changed hash as HIGH', () => {
    const change = credChange(
      'modified',
      { present: true, hash: 'b', mode: 0o600 },
      { present: true, hash: 'a', mode: 0o600 },
    )
    expect(ruleCredentials(change, cfg)?.severity).toBe('HIGH')
  })

  it('flags world-readable mode as HIGH', () => {
    const change = credChange(
      'modified',
      { present: true, hash: 'a', mode: 0o644 },
      { present: true, hash: 'a', mode: 0o600 },
    )
    const f = ruleCredentials(change, cfg)
    expect(f?.severity).toBe('HIGH')
    expect(f?.detail).toContain('readable')
  })

  it('ignores first appearance of the credentials file', () => {
    expect(
      ruleCredentials(credChange('added', { present: true, hash: 'a', mode: 0o600 }), cfg),
    ).toBeNull()
  })

  it('flags a credential file that became unreadable as HIGH', () => {
    const change = credChange(
      'modified',
      { present: true, unreadable: true },
      { present: true, hash: 'a', mode: 0o600 },
    )
    const f = ruleCredentials(change, cfg)
    expect(f?.severity).toBe('HIGH')
    expect(f?.ruleId).toBe('credentials.unreadable')
  })
})
