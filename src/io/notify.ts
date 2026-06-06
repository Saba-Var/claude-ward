import type { Finding } from '../core/model.js'
import { hasActionable, summarize } from './report.js'

export function notify(findings: Finding[]): void {
  if (!hasActionable(findings)) return
  const counts = summarize(findings)
  const title = 'claude-ward: suspicious config change'
  const message = `${counts.CRITICAL} critical, ${counts.HIGH} high. Run "claude-ward diff".`

  void deliver(title, message)
}

async function deliver(title: string, message: string): Promise<void> {
  try {
    const { default: notifier } = await import('node-notifier')
    notifier.notify({ title, message })
  } catch {
    // Any backend failure falls back to stderr; never throw from the notifier.
    process.stderr.write(`${title}\n${message}\n`)
  }
}
