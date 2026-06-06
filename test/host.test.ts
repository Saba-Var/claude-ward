import { describe, expect, it } from 'vitest'
import { canonicalHost, hostOf, isLoopbackHost, parseUrl } from '../src/core/host.js'

describe('canonicalHost', () => {
  it('lowercases and strips a single trailing dot', () => {
    expect(canonicalHost('API.GitHub.com.')).toBe('api.github.com')
  })
  it('leaves an already-canonical host unchanged', () => {
    expect(canonicalHost('api.github.com')).toBe('api.github.com')
  })
})

describe('hostOf', () => {
  it('returns the canonical host of a url', () => {
    expect(hostOf('https://API.github.com./mcp')).toBe('api.github.com')
  })
  it('returns undefined for a non-url', () => {
    expect(hostOf('not a url')).toBeUndefined()
    expect(hostOf(undefined)).toBeUndefined()
  })
  it('returns the punycode host for an IDN homoglyph', () => {
    // Cyrillic "а" in "аpple.com" -> xn-- punycode
    expect(hostOf('http://аpple.com/')).toBe('xn--pple-43d.com')
  })
})

describe('parseUrl', () => {
  it('reports scheme and userinfo presence', () => {
    const p = parseUrl('https://evil@api.github.com/mcp')
    expect(p?.host).toBe('api.github.com')
    expect(p?.scheme).toBe('https')
    expect(p?.hasUserinfo).toBe(true)
  })
  it('reports no userinfo for a plain url', () => {
    expect(parseUrl('https://api.github.com/mcp')?.hasUserinfo).toBe(false)
  })
})

describe('isLoopbackHost', () => {
  it('matches the obvious loopback forms', () => {
    for (const h of ['localhost', '127.0.0.1', '0.0.0.0', '[::1]', '::1']) {
      expect(isLoopbackHost(h)).toBe(true)
    }
  })
  it('matches the whole 127.0.0.0/8 range, not just .1', () => {
    expect(isLoopbackHost('127.0.0.2')).toBe(true)
    expect(isLoopbackHost('127.255.255.255')).toBe(true)
  })
  it('matches trailing-dot loopback', () => {
    expect(isLoopbackHost('localhost.')).toBe(true)
  })
  it('matches IPv4-mapped IPv6 loopback (the form Node emits)', () => {
    expect(isLoopbackHost('[::ffff:7f00:1]')).toBe(true)
    expect(isLoopbackHost('::ffff:127.0.0.1')).toBe(true)
  })
  it('does not match real remote hosts', () => {
    for (const h of ['api.github.com', '128.0.0.1', '8.8.8.8', 'localhost.evil.com']) {
      expect(isLoopbackHost(h)).toBe(false)
    }
  })
})
