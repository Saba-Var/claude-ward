import { deriveConfig } from '../core/config.js'
import { baselineExists, saveBaseline, saveWardConfig } from '../io/baseline.js'
import { paths } from '../io/paths.js'
import { takeSnapshot } from '../io/snapshot.js'

export function initCommand(opts: { force?: boolean; now: string }): void {
  if (baselineExists() && !opts.force) {
    process.stderr.write('Baseline already exists. Use --force to overwrite.\n')
    process.exitCode = 1
    return
  }
  const snap = takeSnapshot()
  for (const w of snap.warnings) {
    process.stderr.write(`warning: could not read ${w.file} (${w.status})\n`)
  }
  saveBaseline(snap.state, opts.now)
  saveWardConfig(deriveConfig(snap.state))
  process.stdout.write(
    `Baseline written to ${paths.baseline}\nConfig (allowlist) written to ${paths.config}\nCurrent config is now trusted.\n`,
  )
}
