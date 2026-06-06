import { diff, applyChange } from '../core/diff.js'
import { runRules } from '../core/rules/index.js'
import { loadBaseline, loadWardConfig, saveBaseline } from '../io/baseline.js'
import { takeSnapshot } from '../io/snapshot.js'

export function approveCommand(opts: { all?: boolean; id?: string; now: string }): void {
  const baseline = loadBaseline()
  if (!baseline) {
    process.stderr.write('No baseline found. Run "claude-ward init" first.\n')
    process.exitCode = 1
    return
  }
  const snap = takeSnapshot()

  if (opts.all) {
    // --all means the user explicitly chose to trust the entire current
    // snapshot. The surgical approve <id> path below (applyChange) is the model
    // install-hook reuses so it never blesses more than its own edit.
    saveBaseline(snap.state, opts.now)
    process.stdout.write('All current changes approved; baseline updated.\n')
    return
  }

  if (!opts.id) {
    process.stderr.write('Provide a finding id, or use --all.\n')
    process.exitCode = 1
    return
  }

  const cfg = loadWardConfig()
  const findings = runRules(diff(baseline.state, snap.state), cfg)
  const target = findings.find((f) => f.id === opts.id)
  if (!target) {
    process.stderr.write(`No pending change with id "${opts.id}". Run "claude-ward diff".\n`)
    process.exitCode = 1
    return
  }
  const next = applyChange(baseline.state, target.change)
  saveBaseline(next, opts.now)
  process.stdout.write(`Approved ${target.id} (${target.title}); baseline updated.\n`)
}
