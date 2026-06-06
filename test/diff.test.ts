import { describe, expect, it } from 'vitest'
import { applyChange, diff } from '../src/core/diff.js'
import { runRules } from '../src/core/rules/index.js'
import { type TrackedState, emptyState } from '../src/core/model.js'

function withServer(url: string): TrackedState {
  return { ...emptyState(), mcpServers: [{ scope: 'global', name: 'gh', url }] }
}

describe('diff', () => {
  it('detects an added mcp server', () => {
    const changes = diff(emptyState(), withServer('https://a.io'))
    expect(changes).toHaveLength(1)
    expect(changes[0]).toMatchObject({
      kind: 'added',
      category: 'mcpServer',
      path: 'mcpServer/global//gh',
    })
  })

  it('detects a removed mcp server', () => {
    const changes = diff(withServer('https://a.io'), emptyState())
    expect(changes[0]).toMatchObject({ kind: 'removed', category: 'mcpServer' })
  })

  it('detects a modified mcp server url', () => {
    const changes = diff(withServer('https://a.io'), withServer('http://127.0.0.1:8080'))
    expect(changes).toHaveLength(1)
    expect(changes[0]?.kind).toBe('modified')
    expect((changes[0]?.after as { url: string }).url).toBe('http://127.0.0.1:8080')
  })

  it('detects added env var', () => {
    const before = emptyState()
    const after = { ...emptyState(), env: [{ key: 'X', value: '1' }] }
    expect(diff(before, after)[0]).toMatchObject({ kind: 'added', category: 'env', path: 'env/X' })
  })

  it('detects credential hash change', () => {
    const before = { ...emptyState(), credentials: { present: true, hash: 'a', mode: 0o600 } }
    const after = { ...emptyState(), credentials: { present: true, hash: 'b', mode: 0o600 } }
    expect(diff(before, after)[0]).toMatchObject({ kind: 'modified', category: 'credentials' })
  })

  it('returns no changes for identical states', () => {
    expect(diff(withServer('https://a.io'), withServer('https://a.io'))).toEqual([])
  })

  it('keeps colliding entities distinct so a decoy cannot mask a repoint', () => {
    // Under a raw "scope:project:name" join these two key identically. An
    // attacker plants the decoy D (already localhost) so a real remote->local
    // repoint of V pairs with D's localhost "before" and the CRITICAL rule,
    // which ignores always-local servers, stays silent.
    const victim = { scope: 'global' as const, project: 'p', name: 'x:y' }
    const decoy = { scope: 'global' as const, project: 'p:x', name: 'y' }
    const before: TrackedState = {
      ...emptyState(),
      mcpServers: [
        { ...victim, url: 'https://remote.example/mcp' },
        { ...decoy, url: 'http://localhost:1/' },
      ],
    }
    const after: TrackedState = {
      ...emptyState(),
      mcpServers: [
        { ...victim, url: 'http://localhost:6666/' },
        { ...decoy, url: 'http://localhost:1/' },
      ],
    }
    const cfg = { allowedHosts: [], knownMarketplaces: [] }
    const findings = runRules(diff(before, after), cfg)
    expect(findings.some((f) => f.ruleId === 'mcp.localhost-repoint')).toBe(true)
  })

  it('applyChange folds an added server into the baseline', () => {
    const change = diff(emptyState(), withServer('https://a.io'))[0]!
    const next = applyChange(emptyState(), change)
    expect(next.mcpServers).toHaveLength(1)
    expect(diff(next, withServer('https://a.io'))).toEqual([])
  })

  it('applying every diff converges the baseline on the target across all categories', () => {
    const before: TrackedState = {
      mcpServers: [
        { scope: 'global', name: 'keep', url: 'https://k.io' },
        { scope: 'global', name: 'drop', url: 'https://d.io' },
      ],
      hooks: [
        { source: 'settings', event: 'PreToolUse', matcher: 'Bash', command: 'old', index: 0 },
      ],
      plugins: ['p@m'],
      marketplaces: ['m1'],
      permissions: [{ list: 'allow', entry: 'Read' }],
      env: [{ key: 'A', value: '1' }],
      credentials: { present: true, hash: 'a', mode: 0o600 },
    }
    const after: TrackedState = {
      mcpServers: [
        { scope: 'global', name: 'keep', url: 'https://k.io' },
        { scope: 'global', name: 'new', url: 'https://n.io' },
      ],
      hooks: [
        { source: 'settings', event: 'PreToolUse', matcher: 'Bash', command: 'new', index: 0 },
      ],
      plugins: ['p@m', 'q@m'],
      marketplaces: [],
      permissions: [
        { list: 'allow', entry: 'Read' },
        { list: 'deny', entry: 'Bash' },
      ],
      env: [
        { key: 'A', value: '2' },
        { key: 'B', value: '3' },
      ],
      credentials: { present: true, hash: 'b', mode: 0o600 },
    }
    let state = before
    for (const c of diff(before, after)) state = applyChange(state, c)
    expect(diff(state, after)).toEqual([])
  })
})
