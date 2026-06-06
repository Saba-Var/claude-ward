import { diff } from '../core/diff.js';
import { runRules } from '../core/rules/index.js';
import type { Finding } from '../core/model.js';
import { loadBaseline, loadWardConfig } from '../io/baseline.js';
import { formatFindings, hasActionable } from '../io/report.js';
import { takeSnapshot } from '../io/snapshot.js';

export interface ScanResult {
  findings: Finding[];
  warnings: { file: string; status: string; error: string }[];
}

export function evaluate(): ScanResult | null {
  const baseline = loadBaseline();
  if (!baseline) return null;
  const cfg = loadWardConfig();
  const snap = takeSnapshot();
  return { findings: runRules(diff(baseline.state, snap.state), cfg), warnings: snap.warnings };
}

export function scanCommand(opts: { quiet?: boolean } = {}): void {
  const result = evaluate();
  if (!result) {
    process.stderr.write('No baseline found. Run "claude-ward init" first.\n');
    process.exitCode = 1;
    return;
  }
  for (const w of result.warnings) {
    process.stderr.write(`warning: could not read ${w.file} (${w.status})\n`);
  }
  process.stdout.write(`${formatFindings(result.findings, opts)}\n`);
  if (hasActionable(result.findings)) process.exitCode = 2;
}
