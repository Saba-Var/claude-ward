import { evaluate } from './scan.js'
import { formatFindings } from '../io/report.js'

export function diffCommand(opts: { quiet?: boolean } = {}): void {
  const result = evaluate()
  if (!result) {
    process.stderr.write('No baseline found. Run "claude-ward init" first.\n')
    process.exitCode = 1
    return
  }
  process.stdout.write(`${formatFindings(result.findings, opts)}\n`)
}
