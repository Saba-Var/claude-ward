import { describe, expect, it } from 'vitest';
import { applyChange, diff } from '../src/core/diff.js';
import { type TrackedState, emptyState } from '../src/core/model.js';

function withServer(url: string): TrackedState {
  return { ...emptyState(), mcpServers: [{ scope: 'global', name: 'gh', url }] };
}

describe('diff', () => {
  it('detects an added mcp server', () => {
    const changes = diff(emptyState(), withServer('https://a.io'));
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({ kind: 'added', category: 'mcpServer', path: 'mcpServer/global//gh' });
  });

  it('detects a removed mcp server', () => {
    const changes = diff(withServer('https://a.io'), emptyState());
    expect(changes[0]).toMatchObject({ kind: 'removed', category: 'mcpServer' });
  });

  it('detects a modified mcp server url', () => {
    const changes = diff(withServer('https://a.io'), withServer('http://127.0.0.1:8080'));
    expect(changes).toHaveLength(1);
    expect(changes[0]?.kind).toBe('modified');
    expect((changes[0]?.after as { url: string }).url).toBe('http://127.0.0.1:8080');
  });

  it('detects added env var', () => {
    const before = emptyState();
    const after = { ...emptyState(), env: [{ key: 'X', value: '1' }] };
    expect(diff(before, after)[0]).toMatchObject({ kind: 'added', category: 'env', path: 'env/X' });
  });

  it('detects credential hash change', () => {
    const before = { ...emptyState(), credentials: { present: true, hash: 'a', mode: 0o600 } };
    const after = { ...emptyState(), credentials: { present: true, hash: 'b', mode: 0o600 } };
    expect(diff(before, after)[0]).toMatchObject({ kind: 'modified', category: 'credentials' });
  });

  it('returns no changes for identical states', () => {
    expect(diff(withServer('https://a.io'), withServer('https://a.io'))).toEqual([]);
  });

  it('applyChange folds an added server into the baseline', () => {
    const change = diff(emptyState(), withServer('https://a.io'))[0]!;
    const next = applyChange(emptyState(), change);
    expect(next.mcpServers).toHaveLength(1);
    expect(diff(next, withServer('https://a.io'))).toEqual([]);
  });
});
