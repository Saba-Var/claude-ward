import { type Finding, type Severity } from '../core/model.js'

export function summarize(findings: Finding[]): Record<Severity, number> {
  const counts: Record<Severity, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, INFO: 0 }
  for (const f of findings) counts[f.severity]++
  return counts
}

export function formatFindings(findings: Finding[], opts: { quiet?: boolean } = {}): string {
  const shown = opts.quiet ? findings.filter((f) => f.severity !== 'INFO') : findings
  if (shown.length === 0) return 'No changes against baseline.'
  return shown
    .map(
      (f) =>
        `[${f.severity}] ${f.id}  ${f.title}\n    ${f.detail}\n    (${f.ruleId} @ ${f.change.path})`,
    )
    .join('\n\n')
}

export function hasActionable(findings: Finding[]): boolean {
  return findings.some((f) => f.severity === 'CRITICAL' || f.severity === 'HIGH')
}
