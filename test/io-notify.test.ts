import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Finding } from '../src/core/model.js'
import { notify } from '../src/io/notify.js'

// A backend that throws on notify, so the fallback path is exercised
// deterministically regardless of the host's desktop notification setup.
vi.mock('node-notifier', () => ({
  default: {
    notify: () => {
      throw new Error('no notification backend')
    },
  },
}))

function finding(severity: Finding['severity']): Finding {
  return {
    id: 'x',
    ruleId: 'r',
    severity,
    title: 't',
    detail: 'd',
    change: { kind: 'added', category: 'plugin', path: 'plugin/x', after: 'x' },
  }
}

const flush = () => new Promise((r) => setTimeout(r, 20))

afterEach(() => {
  vi.restoreAllMocks()
})

describe('notify', () => {
  it('falls back to stderr and never throws when the backend fails', async () => {
    let err = ''
    vi.spyOn(process.stderr, 'write').mockImplementation((s) => ((err += String(s)), true))
    expect(() => notify([finding('CRITICAL')])).not.toThrow()
    await flush()
    expect(err).toContain('suspicious config change')
  })

  it('stays silent for INFO-only findings', async () => {
    let wrote = false
    vi.spyOn(process.stderr, 'write').mockImplementation(() => ((wrote = true), true))
    notify([finding('INFO')])
    await flush()
    expect(wrote).toBe(false)
  })
})
