import { describe, expect, it } from 'vitest';
import { collect } from '../src/core/collect.js';
import { deriveConfig } from '../src/core/config.js';
import { diff } from '../src/core/diff.js';
import { runRules } from '../src/core/rules/index.js';
import type { Severity } from '../src/core/model.js';
import { baseInputs, scenarios } from './fixtures/states.js';

function findingsFor(name: keyof typeof scenarios) {
  const before = collect(baseInputs);
  const after = collect(scenarios[name]);
  return runRules(diff(before, after), deriveConfig(before));
}

function topSeverity(name: keyof typeof scenarios): Severity {
  const findings = findingsFor(name);
  const order: Severity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'INFO'];
  return order.find((s) => findings.some((f) => f.severity === s)) ?? 'INFO';
}

// The rule that produces the highest-severity finding for a scenario.
function topRuleId(name: keyof typeof scenarios): string | undefined {
  const findings = findingsFor(name);
  const top = topSeverity(name);
  return findings.find((f) => f.severity === top)?.ruleId;
}

describe('runRules end-to-end via fixtures', () => {
  it('clean (no change) yields no findings', () => {
    const before = collect(baseInputs);
    expect(runRules(diff(before, before), deriveConfig(before))).toEqual([]);
  });

  it('localhost repoint is CRITICAL', () =>
    expect(topSeverity('localhostRepoint')).toBe('CRITICAL'));
  it('curl pipe shell is CRITICAL', () => expect(topSeverity('curlPipeShell')).toBe('CRITICAL'));
  it('injected SessionStart hook is CRITICAL', () =>
    expect(topSeverity('sessionStartHook')).toBe('CRITICAL'));
  it('generic new hook is HIGH', () => expect(topSeverity('newHook')).toBe('HIGH'));
  it('new marketplace is MEDIUM', () => expect(topSeverity('newMarketplace')).toBe('MEDIUM'));
  it('broadened permissions is MEDIUM', () =>
    expect(topSeverity('broadenedPermissions')).toBe('MEDIUM'));
  it('benign change is INFO', () => expect(topSeverity('benign')).toBe('INFO'));

  // Lock the *intended* rule for each scenario, so a future reorder or a new
  // shadowing rule can't silently reach the right severity via the wrong path.
  it('each scenario fires its intended rule', () => {
    expect(topRuleId('localhostRepoint')).toBe('mcp.localhost-repoint');
    expect(topRuleId('curlPipeShell')).toBe('mcp.remote-exec');
    expect(topRuleId('sessionStartHook')).toBe('hook.sessionstart-injected');
    expect(topRuleId('newHook')).toBe('hook.new');
    expect(topRuleId('newMarketplace')).toBe('plugins.new-marketplace');
    expect(topRuleId('broadenedPermissions')).toBe('permissions.broadened');
    expect(topRuleId('benign')).toBe('info.tracked-change');
  });

  it('produces deterministic finding ids', () => {
    const before = collect(baseInputs);
    const after = collect(scenarios.localhostRepoint);
    const a = runRules(diff(before, after), deriveConfig(before));
    const b = runRules(diff(before, after), deriveConfig(before));
    expect(a).toEqual(b);
  });
});
