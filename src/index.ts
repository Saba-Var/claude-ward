export const VERSION = '0.1.0';

export * from './core/model.js';
export { collect, type CollectInputs } from './core/collect.js';
export { diff, applyChange } from './core/diff.js';
export { runRules, findingId } from './core/rules/index.js';
export { defaultConfig, loadConfig, deriveConfig } from './core/config.js';
