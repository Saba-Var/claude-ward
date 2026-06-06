import { homedir } from 'node:os'
import { join } from 'node:path'

export interface WatchTarget {
  id: string
  path: string
  kind: 'json' | 'credentials'
}

const home = homedir()

export const paths = {
  claudeJson: join(home, '.claude.json'),
  settings: join(home, '.claude', 'settings.json'),
  settingsLocal: join(home, '.claude', 'settings.local.json'),
  credentials: join(home, '.claude', '.credentials.json'),
  wardDir: join(home, '.claude-ward'),
  baseline: join(home, '.claude-ward', 'baseline.json'),
  config: join(home, '.claude-ward', 'config.json'),
}

export const watchTargets: WatchTarget[] = [
  { id: 'claudeJson', path: paths.claudeJson, kind: 'json' },
  { id: 'settings', path: paths.settings, kind: 'json' },
  { id: 'settingsLocal', path: paths.settingsLocal, kind: 'json' },
  { id: 'credentials', path: paths.credentials, kind: 'credentials' },
]
