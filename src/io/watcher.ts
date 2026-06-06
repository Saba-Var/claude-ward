import chokidar from 'chokidar'
import { watchTargets } from './paths.js'

export interface WatcherHandle {
  close: () => Promise<void>
}

export function startWatcher(onChange: () => void, debounceMs = 400): WatcherHandle {
  const watcher = chokidar.watch(
    watchTargets.map((t) => t.path),
    {
      ignoreInitial: true,
      // Do not follow a watched path that becomes a symlink to somewhere else -
      // that retargeting is itself the kind of tamper this tool watches for.
      followSymlinks: false,
      awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
    },
  )

  let timer: NodeJS.Timeout | null = null
  const trigger = (): void => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(onChange, debounceMs)
  }

  watcher.on('add', trigger).on('change', trigger).on('unlink', trigger)
  // A watch error must not crash the process or pass unnoticed: a silently dead
  // watcher is a tripwire that has stopped tripping.
  watcher.on('error', (err) => {
    process.stderr.write(`claude-ward: watch error, coverage may be degraded: ${String(err)}\n`)
  })

  return {
    close: async () => {
      if (timer) clearTimeout(timer)
      await watcher.close()
    },
  }
}
