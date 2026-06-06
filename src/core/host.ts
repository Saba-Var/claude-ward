// URL and host canonicalization shared by the rules and the allowlist
// derivation. Centralizing it keeps the localhost-repoint signature and the
// allowlist from disagreeing on what a host string means - a disagreement is
// exactly the gap an attacker repoints through.

export interface ParsedUrl {
  // Canonical hostname: lowercased, single trailing dot removed. IDN names are
  // punycode (the WHATWG URL parser does that); IPv6 keeps its brackets.
  host: string
  // Scheme without the trailing colon, lowercased (e.g. "http").
  scheme: string
  // True if the URL carried a user or password component (user:pass@host).
  hasUserinfo: boolean
}

export function parseUrl(value: string | undefined): ParsedUrl | undefined {
  if (!value) return undefined
  let u: URL
  try {
    u = new URL(value)
  } catch {
    return undefined
  }
  return {
    host: canonicalHost(u.hostname),
    scheme: u.protocol.replace(/:$/, '').toLowerCase(),
    hasUserinfo: u.username !== '' || u.password !== '',
  }
}

// Canonical form of a hostname: lowercase, single trailing dot removed.
// "API.GitHub.com." and "api.github.com" collapse to one string.
export function canonicalHost(hostname: string): string {
  const h = hostname.toLowerCase()
  return h.endsWith('.') ? h.slice(0, -1) : h
}

// Host of a URL string in canonical form, or undefined if it does not parse.
export function hostOf(value: string | undefined): string | undefined {
  return parseUrl(value)?.host
}

// Canonical form of a bare hostname taken from user config, matched against the
// same canonicalization a parsed URL host gets (lowercase, punycode, no
// trailing dot) so allowlist comparisons hold across spellings.
export function normalizeHostEntry(entry: string): string {
  try {
    return canonicalHost(new URL(`http://${entry}`).hostname)
  } catch {
    return canonicalHost(entry)
  }
}

// True if the host resolves to the loopback interface in any common form:
// localhost, the whole 127.0.0.0/8 range, 0.0.0.0, ::1, and IPv4-mapped
// loopback (::ffff:127.x.x.x, which Node renders as ::ffff:7f00:1). These all
// route a "remote" MCP endpoint to a local proxy, so the localhost-repoint
// rule treats them alike. Node's URL parser already folds 127.1, 0x7f000001,
// and 2130706433 down to 127.0.0.1 before we see them.
export function isLoopbackHost(hostname: string): boolean {
  const h = canonicalHost(hostname)
  if (h === 'localhost') return true
  const bare = h.startsWith('[') && h.endsWith(']') ? h.slice(1, -1) : h
  if (bare === '0.0.0.0') return true
  if (bare === '::1' || /^(?:0+:){7}0*1$/.test(bare)) return true
  const dotted = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(bare)
  if (dotted) return isIpv4Loopback(dotted[1] ?? '')
  // IPv4-mapped IPv6 in the hex form Node emits: the high byte 0x7f is 127/8.
  if (/^::ffff:7f[0-9a-f]{2}:[0-9a-f]{1,4}$/i.test(bare)) return true
  return isIpv4Loopback(bare)
}

function isIpv4Loopback(h: string): boolean {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(h)
  if (!m) return false
  const octets = m.slice(1).map(Number)
  if (octets.some((n) => n > 255)) return false
  return octets[0] === 127
}
