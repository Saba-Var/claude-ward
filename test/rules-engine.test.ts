import { describe, expect, it } from 'vitest';
import { collect } from '../src/core/collect.js';
import { deriveConfig } from '../src/core/config.js';
import { diff } from '../src/core/diff.js';
import { runRules } from '../src/core/rules/index.js';
import type { Severity } from '../src/core/model.js';
import { baseInputs, scenarios } from './fixtures/states.js';

function topSeverity(name: keyof typeof scenarios): Severity {
  const before = collect(baseInputs);
  const cfg = deriveConfig(before);
  const after = collect(scenarios[name]);
  const findings = runRules(diff(before, after), cfg);
  const order: Severity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'INFO'];
  return order.find((s) => findings.some((f) => f.severity === s)) ?? 'INFO';
}

describe('runRules end-to-end via fixtures', () => {
  it('clean (no change) yields no findings', () => {
    const before = collect(baseInputs);
    expect(runRules(diff(before, before), deriveConfig(before))).toEqual([]);
  });

  it('localhost repoint is CRITICAL', () => expect(topSeverity('localhostRepoint')).toBe('CRITICAL'));
  it('curl pipe shell is CRITICAL', () => expect(topSeverity('curlPipeShell')).toBe('CRITICAL'));
  it('injected SessionStart hook is CRITICAL', () => expect(topSeverity('sessionStartHook')).toBe('CRITICAL'));
  it('generic new hook is HIGH', () => expect(topSeverity('newHook')).toBe('HIGH'));
  it('new marketplace is MEDIUM', () => expect(topSeverity('newMarketplace')).toBe('MEDIUM'));
  it('broadened permissions is MEDIUM', () => expect(topSeverity('broadenedPermissions')).toBe('MEDIUM'));
  it('benign change is INFO', () => expect(topSeverity('benign')).toBe('INFO'));

  it('produces deterministic finding ids', () => {
    const before = collect(baseInputs);
    const after = collect(scenarios.localhostRepoint);
    const a = runRules(diff(before, after), deriveConfig(before));
    const b = runRules(diff(before, after), deriveConfig(before));
    expect(a).toEqual(b);
  });
});
