import type { Change, Finding, WardConfig } from '../model.js'
import { findingId } from './index.js'

export function ruleMarketplaceOrPlugin(change: Change, cfg: WardConfig): Finding | null {
  if (change.kind !== 'added') return null

  if (change.category === 'marketplace') {
    const name = change.after
    if (name === undefined) return null
    return {
      id: findingId('plugins.new-marketplace', change),
      ruleId: 'plugins.new-marketplace',
      severity: 'MEDIUM',
      title: 'New marketplace source added',
      detail: `A new plugin marketplace was added: "${name}".`,
      change,
    }
  }

  if (change.category === 'plugin') {
    const id = change.after
    if (id === undefined) return null
    const marketplace = id.includes('@') ? id.slice(id.lastIndexOf('@') + 1) : undefined
    if (marketplace && cfg.knownMarketplaces.includes(marketplace)) return null
    return {
      id: findingId('plugins.new-plugin', change),
      ruleId: 'plugins.new-plugin',
      severity: 'MEDIUM',
      title: 'Plugin from a non-known marketplace',
      detail: `Plugin "${id}" was enabled${marketplace ? ` from marketplace "${marketplace}"` : ''}.`,
      change,
    }
  }
  return null
}
