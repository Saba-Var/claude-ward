import { sha256 } from '../hash.js'
import type { Change, Finding, WardConfig } from '../model.js'
import { ruleCredentials } from './credentials.js'
import { ruleEnvRedirect } from './env.js'
import { ruleHookChange, ruleSessionStartHookInjected } from './hooks.js'
import { ruleMcpHostNotAllowlisted, ruleMcpLocalhostRepoint, ruleMcpRemoteExec } from './mcp.js'
import { ruleObfuscation } from './obfuscation.js'
import { ruleBroadenedPermissions } from './permissions.js'
import { ruleMarketplaceOrPlugin } from './plugins.js'

export function findingId(ruleId: string, change: Change): string {
  // Seed from the injective `key` set by diff() (falls back to the readable
  // path for hand-built changes) so two distinct entities never share an id.
  return sha256(`${ruleId}:${change.key ?? change.path}`).slice(0, 12)
}

type Rule = (change: Change, cfg: WardConfig) => Finding | null

// Ordered by severity: first match wins per change.
const RULES: Rule[] = [
  ruleMcpLocalhostRepoint,
  ruleMcpRemoteExec,
  ruleSessionStartHookInjected,
  ruleMcpHostNotAllowlisted,
  ruleHookChange,
  ruleEnvRedirect,
  ruleCredentials,
  ruleObfuscation,
  ruleMarketplaceOrPlugin,
  ruleBroadenedPermissions,
]

function infoFinding(change: Change): Finding {
  return {
    id: findingId('info.tracked-change', change),
    ruleId: 'info.tracked-change',
    severity: 'INFO',
    title: `Tracked ${change.category} ${change.kind}`,
    detail: `${change.path} was ${change.kind}.`,
    change,
  }
}

/**
 * Classify changes into findings: exactly one Finding per input Change. Rules
 * are ordered by severity and the first to match a change wins; a change no rule
 * claims becomes an INFO finding, so nothing passes silently. Pure and
 * deterministic - the same changes and config always yield the same findings.
 */
export function runRules(changes: Change[], cfg: WardConfig): Finding[] {
  const findings: Finding[] = []
  for (const change of changes) {
    let matched: Finding | null = null
    for (const rule of RULES) {
      matched = rule(change, cfg)
      if (matched) break
    }
    findings.push(matched ?? infoFinding(change))
  }
  return findings
}
