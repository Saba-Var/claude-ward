import { describe, expect, it } from 'vitest';
import { collect } from '../src/core/collect.js';

describe('collect', () => {
  it('flattens global and project mcp servers', () => {
    const state = collect({
      claudeJson: {
        mcpServers: { github: { url: 'https://api.github.com/mcp' } },
        projects: {
          '/home/u/app': { mcpServers: { local: { command: 'node', args: ['server.js'] } } },
        },
      },
    });
    expect(state.mcpServers).toEqual([
      { scope: 'global', name: 'github', url: 'https://api.github.com/mcp' },
      {
        scope: 'project',
        project: '/home/u/app',
        name: 'local',
        command: 'node',
        args: ['server.js'],
      },
    ]);
  });

  it('flattens hooks from settings with matcher and index', () => {
    const state = collect({
      settings: {
        hooks: {
          SessionStart: [{ hooks: [{ type: 'command', command: 'echo hi' }] }],
          PreToolUse: [
            { matcher: 'Bash', hooks: [{ command: 'a' }, { command: 'b' }] },
          ],
        },
      },
    });
    expect(state.hooks).toEqual([
      { source: 'settings', event: 'PreToolUse', matcher: 'Bash', command: 'a', index: 0 },
      { source: 'settings', event: 'PreToolUse', matcher: 'Bash', command: 'b', index: 1 },
      { source: 'settings', event: 'SessionStart', matcher: undefined, command: 'echo hi', index: 0 },
    ]);
  });

  it('normalizes plugins, marketplaces and permissions', () => {
    const state = collect({
      settings: {
        enabledPlugins: { 'acme-market': ['fmt', 'lint'] },
        extraKnownMarketplaces: { 'acme-market': { source: 'github:acme/market' } },
        permissions: { allow: ['Read', 'Bash'], deny: [], ask: ['WebFetch'] },
        env: { ANTHROPIC_BASE_URL: 'https://x.io' },
      },
    });
    expect(state.plugins).toEqual(['fmt@acme-market', 'lint@acme-market']);
    expect(state.marketplaces).toEqual(['acme-market']);
    expect(state.permissions).toEqual([
      { list: 'allow', entry: 'Bash' },
      { list: 'allow', entry: 'Read' },
      { list: 'ask', entry: 'WebFetch' },
    ]);
    expect(state.env).toEqual([{ key: 'ANTHROPIC_BASE_URL', value: 'https://x.io' }]);
  });

  it('passes credential meta through unchanged', () => {
    const state = collect({ credentials: { present: true, hash: 'abc', mode: 0o600, size: 10 } });
    expect(state.credentials).toEqual({ present: true, hash: 'abc', mode: 0o600, size: 10 });
  });

  it('returns empty state for empty input', () => {
    const state = collect({});
    expect(state.mcpServers).toEqual([]);
    expect(state.hooks).toEqual([]);
    expect(state.credentials).toEqual({ present: false });
  });
});
