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
  const fallback = (): void => void process.stderr.write(`${title}\n${message}\n`)
  try {
    const { default: notifier } = await import('node-notifier')
    // The backend reports a missing/broken notifier through the callback, not a
    // throw, so the fallback must live there too - not just in the catch.
    notifier.notify({ title, message }, (err) => {
      if (err) fallback()
    })
  } catch {
    fallback()
  }
}
