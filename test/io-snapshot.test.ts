import { chmodSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { sha256 } from '../src/core/hash.js'
import { paths } from '../src/io/paths.js'
import { takeSnapshot } from '../src/io/snapshot.js'

const original = { ...paths }
// chmod 000 still reads as root, so the fail-closed assertions are skipped there.
const canTestPerms =
  process.platform !== 'win32' && typeof process.getuid === 'function' && process.getuid() !== 0

beforeEach(() => {
  const dir = mkdtempSync(join(tmpdir(), 'cward-snap-'))
  Object.assign(paths, {
    claudeJson: join(dir, '.claude.json'),
    settings: join(dir, 'settings.json'),
    settingsLocal: join(dir, 'settings.local.json'),
    credentials: join(dir, '.credentials.json'),
  })
})

afterEach(() => {
  Object.assign(paths, original)
})

describe('takeSnapshot credentials', () => {
  it('records the credential file as a hash, never its bytes', () => {
    const secret = '{"token":"super-secret-value"}'
    writeFileSync(paths.credentials, secret)
    chmodSync(paths.credentials, 0o600)
    const snap = takeSnapshot()
    expect(snap.state.credentials.present).toBe(true)
    expect(snap.state.credentials.hash).toBe(sha256(Buffer.from(secret)))
    expect(JSON.stringify(snap.state)).not.toContain('super-secret-value')
    expect(snap.state.credentials.unreadable).toBeUndefined()
  })

  it('reports an absent credential file as not present, with no warning', () => {
    const snap = takeSnapshot()
    expect(snap.state.credentials).toEqual({ present: false })
    expect(snap.warnings).toEqual([])
  })

  it.skipIf(!canTestPerms)(
    'reports an unreadable credential file as a tamper, not a logout',
    () => {
      writeFileSync(paths.credentials, '{"token":"x"}')
      chmodSync(paths.credentials, 0o000)
      const snap = takeSnapshot()
      expect(snap.state.credentials.present).toBe(true)
      expect(snap.state.credentials.unreadable).toBe(true)
      expect(snap.warnings.some((w) => w.status === 'denied')).toBe(true)
      chmodSync(paths.credentials, 0o600) // let the temp dir clean up
    },
  )
})

describe('takeSnapshot warnings', () => {
  it('surfaces a malformed watched file as a warning', () => {
    writeFileSync(paths.claudeJson, '{not json')
    const snap = takeSnapshot()
    expect(snap.warnings.some((w) => w.status === 'malformed')).toBe(true)
  })
})
