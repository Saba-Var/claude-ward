import type { Change, Finding, McpServerEntry, WardConfig } from '../model.js'
import { findingId } from './index.js'

// URL.hostname returns the IPv6 loopback bracketed, so both forms are listed.
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]'])

const SHELLS = '(sh|bash|zsh|ksh|dash)'
const REMOTE_EXEC_PATTERNS: RegExp[] = [
  new RegExp(`\\bcurl\\b[^\\n]*\\|\\s*${SHELLS}\\b`, 'i'),
  new RegExp(`\\bwget\\b[^\\n]*\\|\\s*${SHELLS}\\b`, 'i'),
  new RegExp(`\\|\\s*${SHELLS}\\b`),
  /\beval\b/,
  /base64\s+-{1,2}d/i, // -d, -D (macOS default), --decode, -di
]

function host(url: string | undefined): string | undefined {
  if (!url) return undefined
  try {
    return new URL(url).hostname
  } catch {
    return undefined
  }
}

function isLocal(url: string | undefined): boolean {
  const h = host(url)
  return h !== undefined && LOCAL_HOSTS.has(h)
}

function make(
  ruleId: string,
  severity: Finding['severity'],
  title: string,
  detail: string,
  change: Change,
): Finding {
  return { id: findingId(ruleId, change.path), ruleId, severity, title, detail, change }
}

export function ruleMcpLocalhostRepoint(change: Change, _cfg: WardConfig): Finding | null {
  if (change.category !== 'mcpServer' || change.kind === 'removed') return null
  const after = change.after as McpServerEntry
  const before = change.before as McpServerEntry | undefined
  if (!isLocal(after.url)) return null
  if (change.kind === 'modified' && isLocal(before?.url)) return null
  return make(
    'mcp.localhost-repoint',
    'CRITICAL',
    'MCP endpoint points at localhost',
    `Server "${after.name}" now points at ${after.url}. This matches the Mitiga MitM proxy signature.`,
    change,
  )
}

export function ruleMcpRemoteExec(change: Change, _cfg: WardConfig): Finding | null {
  if (change.category !== 'mcpServer' || change.kind === 'removed') return null
  const after = change.after as McpServerEntry
  const text = [after.command ?? '', ...(after.args ?? [])].join(' ')
  if (!REMOTE_EXEC_PATTERNS.some((re) => re.test(text))) return null
  return make(
    'mcp.remote-exec',
    'CRITICAL',
    'MCP command contains remote-exec / pipe-to-shell',
    `Server "${after.name}" command resolves to: ${text}`,
    change,
  )
}

export function ruleMcpHostNotAllowlisted(change: Change, cfg: WardConfig): Finding | null {
  if (change.category !== 'mcpServer' || change.kind === 'removed') return null
  const after = change.after as McpServerEntry
  const h = host(after.url)
  if (!h || LOCAL_HOSTS.has(h) || cfg.allowedHosts.includes(h)) return null
  return make(
    'mcp.host-not-allowlisted',
    'HIGH',
    'MCP endpoint host is not in the allowlist',
    `Server "${after.name}" points at ${h}, which is not a known-good host.`,
    change,
  )
}
