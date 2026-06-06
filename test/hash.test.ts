import { describe, expect, it } from 'vitest'
import { sha256 } from '../src/core/hash.js'

describe('sha256', () => {
  it('hashes a known string', () => {
    expect(sha256('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
  })

  it('is stable across calls', () => {
    expect(sha256('claude-ward')).toBe(sha256('claude-ward'))
  })
})
