import { describe, expect, it } from 'vitest'
import { ruleCredentials } from '../src/core/rules/credentials.js'
import type { Change, CredentialMeta } from '../src/core/model.js'

const cfg = { allowedHosts: [], knownMarketplaces: [] }

function credChange(kind: Change['kind'], after: CredentialMeta, before?: CredentialMeta): Change {
  return { kind, category: 'credentials', path: 'credentials', before, after }
}

describe('ruleCredentials', () => {
  it('treats a content-only change (token refresh) as INFO, not HIGH', () => {
    const change = credChange(
      'modified',
      { present: true, hash: 'b', mode: 0o600, uid: 1000, gid: 1000 },
      { present: true, hash: 'a', mode: 0o600, uid: 1000, gid: 1000 },
    )
    const f = ruleCredentials(change, cfg)
    expect(f?.severity).toBe('INFO')
    expect(f?.ruleId).toBe('credentials.hash')
  })

  it('flags a changed owner (uid) as HIGH', () => {
    const change = credChange(
      'modified',
      { present: true, hash: 'a', mode: 0o600, uid: 0, gid: 1000 },
      { present: true, hash: 'a', mode: 0o600, uid: 1000, gid: 1000 },
    )
    const f = ruleCredentials(change, cfg)
    expect(f?.severity).toBe('HIGH')
    expect(f?.ruleId).toBe('credentials.owner')
  })

  it('flags a changed group (gid) as HIGH', () => {
    const change = credChange(
      'modified',
      { present: true, hash: 'a', mode: 0o600, uid: 1000, gid: 0 },
      { present: true, hash: 'a', mode: 0o600, uid: 1000, gid: 1000 },
    )
    expect(ruleCredentials(change, cfg)?.ruleId).toBe('credentials.owner')
  })

  it('does not flag owner drift when the old baseline lacks an owner', () => {
    // A baseline written before uid/gid tracking has them undefined; the first
    // snapshot after upgrade adds them. That is a schema fill-in, not a chown.
    const change = credChange(
      'modified',
      { present: true, hash: 'a', mode: 0o600, uid: 1000, gid: 1000 },
      { present: true, hash: 'a', mode: 0o600 },
    )
    const f = ruleCredentials(change, cfg)
    expect(f?.severity).toBe('INFO')
    expect(f?.ruleId).not.toBe('credentials.owner')
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
