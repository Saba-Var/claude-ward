import { sha256 } from '../core/hash.js';
import { collect, type CollectInputs } from '../core/collect.js';
import type { CredentialMeta, TrackedState } from '../core/model.js';
import { paths } from './paths.js';
import { readBytes, readJsonFile, statFile } from './read.js';

export interface SnapshotWarning {
  file: string;
  status: 'malformed' | 'denied';
  error: string;
}

export interface Snapshot {
  state: TrackedState;
  warnings: SnapshotWarning[];
}

function readJsonInput(file: string, warnings: SnapshotWarning[]): unknown {
  const r = readJsonFile(file);
  if (r.status === 'ok') return r.data;
  if (r.status === 'malformed' || r.status === 'denied')
    warnings.push({ file, status: r.status, error: r.error });
  return undefined;
}

function readCredentials(): CredentialMeta {
  const meta = statFile(paths.credentials);
  if (!meta) return { present: false };
  const bytes = readBytes(paths.credentials);
  return {
    present: true,
    hash: bytes ? sha256(bytes) : undefined,
    mode: meta.mode,
    size: meta.size,
  };
}

export function takeSnapshot(): Snapshot {
  const warnings: SnapshotWarning[] = [];
  const inputs: CollectInputs = {
    claudeJson: readJsonInput(paths.claudeJson, warnings),
    settings: readJsonInput(paths.settings, warnings),
    settingsLocal: readJsonInput(paths.settingsLocal, warnings),
    credentials: readCredentials(),
  };
  return { state: collect(inputs), warnings };
}
