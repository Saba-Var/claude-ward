import { notify } from '../io/notify.js'
import { formatFindings } from '../io/report.js'
import { startWatcher } from '../io/watcher.js'
import { evaluate, reportWarnings } from './scan.js'

// Reuses scan's evaluate() and mirrors its output so the two commands cannot
// drift apart. Kept out of cli.ts to keep that file thin wiring.
export function watchCommand(opts: { quiet?: boolean } = {}): void {
  const run = (): void => {
    const result = evaluate()
    if (!result) {
      process.stderr.write('No baseline found. Run "claude-ward init" first.\n')
      return
    }
    reportWarnings(result.warnings)
    process.stdout.write(
      `\n${new Date().toISOString()}\n${formatFindings(result.findings, { quiet: opts.quiet })}\n`,
    )
    notify(result.findings)
  }

  process.stdout.write('Watching Claude Code config. Ctrl-C to stop.\n')
  run()
  const handle = startWatcher(run)
  const stop = (): void => void handle.close().then(() => process.exit(0))
  process.on('SIGINT', stop)
  process.on('SIGTERM', stop)
}
