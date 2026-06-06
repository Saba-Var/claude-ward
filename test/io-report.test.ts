import { describe, expect, it } from 'vitest';
import type { Finding } from '../src/core/model.js';
import { formatFindings, summarize } from '../src/io/report.js';

const findings: Finding[] = [
  { id: 'a1', ruleId: 'mcp.localhost-repoint', severity: 'CRITICAL', title: 'X', detail: 'd', change: { kind: 'modified', category: 'mcpServer', path: 'p' } },
  { id: 'b2', ruleId: 'info.tracked-change', severity: 'INFO', title: 'Y', detail: 'd2', change: { kind: 'added', category: 'env', path: 'q' } },
];

describe('report', () => {
  it('summarize counts by severity', () => {
    expect(summarize(findings)).toEqual({ CRITICAL: 1, HIGH: 0, MEDIUM: 0, INFO: 1 });
  });

  it('formatFindings includes id, severity and title', () => {
    const out = formatFindings(findings);
    expect(out).toContain('CRITICAL');
    expect(out).toContain('a1');
    expect(out).toContain('X');
  });

  it('formatFindings can drop INFO', () => {
    const out = formatFindings(findings, { quiet: true });
    expect(out).not.toContain('Y');
  });
});
