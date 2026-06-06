import { readFileSync } from 'node:fs'

// Single source of truth: read the version from package.json (shipped beside
// dist/ in the tarball) so `--version` can never drift from the manifest.
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
  version: string
}

/** The package version, read from package.json at load time. */
export const VERSION: string = pkg.version

export * from './core/model.js'
export { collect, type CollectInputs } from './core/collect.js'
export { diff, applyChange } from './core/diff.js'
export { runRules, findingId } from './core/rules/index.js'
export { defaultConfig, loadConfig, deriveConfig } from './core/config.js'
