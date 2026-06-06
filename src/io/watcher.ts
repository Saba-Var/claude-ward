import chokidar from 'chokidar'
import { watchTargets } from './paths.js'

export interface WatcherHandle {
  close: () => Promise<void>
}

export function startWatcher(onChange: () => void, debounceMs = 400): WatcherHandle {
  const watcher = chokidar.watch(
    watchTargets.map((t) => t.path),
    { ignoreInitial: true, awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 } },
  )

  let timer: NodeJS.Timeout | null = null
  const trigger = (): void => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(onChange, debounceMs)
  }

  watcher.on('add', trigger).on('change', trigger).on('unlink', trigger)

  return {
    close: async () => {
      if (timer) clearTimeout(timer)
      await watcher.close()
    },
  }
}
