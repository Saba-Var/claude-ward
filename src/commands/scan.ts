import { diff } from '../core/diff.js'
import { runRules } from '../core/rules/index.js'
import type { Finding } from '../core/model.js'
import { loadBaseline, loadWardConfig } from '../io/baseline.js'
import { formatFindings, hasActionable } from '../io/report.js'
import { type SnapshotWarning, takeSnapshot } from '../io/snapshot.js'

export interface ScanResult {
  findings: Finding[]
  warnings: SnapshotWarning[]
}

export function evaluate(): ScanResult | null {
  const baseline = loadBaseline()
  if (!baseline) return null
  const cfg = loadWardConfig()
  const snap = takeSnapshot()
  return { findings: runRules(diff(baseline.state, snap.state), cfg), warnings: snap.warnings }
}

// A watched file we could not read is the worst case to hide for a tamper
// detector, so every command that evaluates prints these to stderr.
export function reportWarnings(warnings: SnapshotWarning[]): void {
  for (const w of warnings) {
    process.stderr.write(`warning: could not read ${w.file} (${w.status})\n`)
  }
}

export function scanCommand(opts: { quiet?: boolean } = {}): void {
  const result = evaluate()
  if (!result) {
    process.stderr.write('No baseline found. Run "claude-ward init" first.\n')
    process.exitCode = 1
    return
  }
  reportWarnings(result.warnings)
  process.stdout.write(`${formatFindings(result.findings, opts)}\n`)
  if (hasActionable(result.findings)) process.exitCode = 2
}
