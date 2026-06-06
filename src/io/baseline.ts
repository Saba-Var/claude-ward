import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { defaultConfig, loadConfig } from '../core/config.js';
import type { TrackedState, WardConfig } from '../core/model.js';
import { paths } from './paths.js';

export interface Baseline {
  version: 1;
  createdAt: string;
  updatedAt: string;
  state: TrackedState;
}

function ensureDir(): void {
  mkdirSync(paths.wardDir, { recursive: true });
}

export function baselineExists(): boolean {
  try {
    readFileSync(paths.baseline, 'utf8');
    return true;
  } catch {
    return false;
  }
}

export function loadBaseline(): Baseline | null {
  try {
    return JSON.parse(readFileSync(paths.baseline, 'utf8')) as Baseline;
  } catch {
    return null;
  }
}

export function saveBaseline(state: TrackedState, now: string): Baseline {
  ensureDir();
  const existing = loadBaseline();
  const baseline: Baseline = {
    version: 1,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    state,
  };
  writeFileSync(paths.baseline, JSON.stringify(baseline, null, 2));
  return baseline;
}

export function loadWardConfig(): WardConfig {
  try {
    return loadConfig(JSON.parse(readFileSync(paths.config, 'utf8')));
  } catch {
    return defaultConfig();
  }
}

export function saveWardConfig(config: WardConfig): void {
  ensureDir();
  writeFileSync(paths.config, JSON.stringify(config, null, 2));
}
