import { hostOf, isLoopbackHost, parseUrl } from '../host.js'
import type { Change, Finding, WardConfig } from '../model.js'
import { findingId } from './index.js'

const SHELLS = '(sh|bash|zsh|ksh|dash)'
const REMOTE_EXEC_PATTERNS: RegExp[] = [
  new RegExp(`\\bcurl\\b[^\\n]*\\|\\s*${SHELLS}\\b`, 'i'),
  new RegExp(`\\bwget\\b[^\\n]*\\|\\s*${SHELLS}\\b`, 'i'),
  new RegExp(`\\|\\s*${SHELLS}\\b`),
  /\beval\b/,
  /base64\s+-{1,2}d/i, // -d, -D (macOS default), --decode, -di
]

function isLocal(url: string | undefined): boolean {
  const h = hostOf(url)
  return h !== undefined && isLoopbackHost(h)
}

function make(
  ruleId: string,
  severity: Finding['severity'],
  title: string,
  detail: string,
  change: Change,
): Finding {
  return { id: findingId(ruleId, change), ruleId, severity, title, detail, change }
}

export function ruleMcpLocalhostRepoint(change: Change, _cfg: WardConfig): Finding | null {
  if (change.category !== 'mcpServer' || change.kind === 'removed') return null
  const after = change.after
  if (!after) return null
  const before = change.before
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
  const after = change.after
  if (!after) return null
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
  const after = change.after
  if (!after) return null
  const parsed = parseUrl(after.url)
  if (!parsed || isLoopbackHost(parsed.host)) return null
  // Credentials embedded in the host (user:pass@) are worth flagging even when
  // the host itself is allowlisted - they are leaked to whatever the URL hits.
  if (parsed.hasUserinfo) {
    return make(
      'mcp.url-userinfo',
      'HIGH',
      'MCP endpoint URL embeds credentials',
      `Server "${after.name}" points at ${parsed.host} with credentials embedded in the URL.`,
      change,
    )
  }
  if (cfg.allowedHosts.includes(parsed.host)) return null
  return make(
    'mcp.host-not-allowlisted',
    'HIGH',
    'MCP endpoint host is not in the allowlist',
    `Server "${after.name}" points at ${parsed.host}, which is not a known-good host.`,
    change,
  )
}
