import { describe, expect, it } from 'vitest'
import { collect } from '../src/core/collect.js'

describe('collect', () => {
  it('flattens global and project mcp servers', () => {
    const state = collect({
      claudeJson: {
        mcpServers: { github: { url: 'https://api.github.com/mcp' } },
        projects: {
          '/home/u/app': { mcpServers: { local: { command: 'node', args: ['server.js'] } } },
        },
      },
    })
    expect(state.mcpServers).toEqual([
      { scope: 'global', name: 'github', url: 'https://api.github.com/mcp' },
      {
        scope: 'project',
        project: '/home/u/app',
        name: 'local',
        command: 'node',
        args: ['server.js'],
      },
    ])
  })

  it('flattens hooks from settings with matcher and index', () => {
    const state = collect({
      settings: {
        hooks: {
          SessionStart: [{ hooks: [{ type: 'command', command: 'echo hi' }] }],
          PreToolUse: [{ matcher: 'Bash', hooks: [{ command: 'a' }, { command: 'b' }] }],
        },
      },
    })
    expect(state.hooks).toEqual([
      { source: 'settings', event: 'PreToolUse', matcher: 'Bash', command: 'a', index: 0 },
      { source: 'settings', event: 'PreToolUse', matcher: 'Bash', command: 'b', index: 1 },
      {
        source: 'settings',
        event: 'SessionStart',
        matcher: undefined,
        command: 'echo hi',
        index: 0,
      },
    ])
  })

  it('collects a hook written as a bare group and labels its source', () => {
    const state = collect({
      claudeJson: { hooks: { SessionStart: [{ command: 'run-me' }] } },
    })
    expect(state.hooks).toEqual([
      {
        source: 'claude.json',
        event: 'SessionStart',
        matcher: undefined,
        command: 'run-me',
        index: 0,
      },
    ])
  })

  it('indexes hooks per matcher so distinct matchers do not collide', () => {
    const state = collect({
      settings: {
        hooks: {
          PreToolUse: [
            { matcher: 'Bash', hooks: [{ command: 'a' }] },
            { matcher: 'Read', hooks: [{ command: 'b' }] },
          ],
        },
      },
    })
    expect(state.hooks).toEqual([
      { source: 'settings', event: 'PreToolUse', matcher: 'Bash', command: 'a', index: 0 },
      { source: 'settings', event: 'PreToolUse', matcher: 'Read', command: 'b', index: 0 },
    ])
  })

  it('normalizes plugins, marketplaces and permissions', () => {
    const state = collect({
      settings: {
        enabledPlugins: { 'acme-market': ['fmt', 'lint'] },
        extraKnownMarketplaces: { 'acme-market': { source: 'github:acme/market' } },
        permissions: { allow: ['Read', 'Bash'], deny: [], ask: ['WebFetch'] },
        env: { ANTHROPIC_BASE_URL: 'https://x.io' },
      },
    })
    expect(state.plugins).toEqual(['fmt@acme-market', 'lint@acme-market'])
    expect(state.marketplaces).toEqual(['acme-market'])
    expect(state.permissions).toEqual([
      { list: 'allow', entry: 'Bash' },
      { list: 'allow', entry: 'Read' },
      { list: 'ask', entry: 'WebFetch' },
    ])
    expect(state.env).toEqual([{ key: 'ANTHROPIC_BASE_URL', value: 'https://x.io' }])
  })

  it('redacts secret env and mcp-env values but keeps endpoint keys raw', () => {
    const state = collect({
      claudeJson: {
        mcpServers: {
          gh: { url: 'https://api.github.com/mcp', env: { GITHUB_TOKEN: 'ghp_supersecret' } },
        },
      },
      settings: {
        env: { ANTHROPIC_BASE_URL: 'https://proxy.io', ANTHROPIC_API_KEY: 'sk-ant-secret-value' },
      },
    })

    // Endpoint key kept raw (rules need the host); the API key is never stored raw.
    const baseUrl = state.env.find((e) => e.key === 'ANTHROPIC_BASE_URL')
    const apiKey = state.env.find((e) => e.key === 'ANTHROPIC_API_KEY')
    expect(baseUrl?.value).toBe('https://proxy.io')
    expect(apiKey?.value).not.toContain('sk-ant-secret-value')
    expect(apiKey?.value).toMatch(/^redacted:sha256:[0-9a-f]{12}$/)

    // mcp env token is redacted; the raw secret never appears anywhere in state.
    expect(state.mcpServers[0]?.env?.GITHUB_TOKEN).not.toContain('ghp_supersecret')
    expect(JSON.stringify(state)).not.toContain('ghp_supersecret')
    expect(JSON.stringify(state)).not.toContain('sk-ant-secret-value')
  })

  it('strips userinfo and query secrets from URL-valued fields', () => {
    const state = collect({
      claudeJson: {
        mcpServers: { gh: { url: 'https://user:p4ss@api.evil.io/mcp?api_key=AKIAABCDEF' } },
      },
      settings: { env: { ANTHROPIC_BASE_URL: 'https://tok@proxy.io/?key=sk-secret' } },
    })
    const url = state.mcpServers[0]?.url ?? ''
    expect(url).not.toContain('p4ss')
    expect(url).not.toContain('AKIAABCDEF')
    expect(url).toContain('api.evil.io') // host preserved for the rules
    expect(url).toContain('redacted@') // but credentials-present marker kept
    const baseUrl = state.env.find((e) => e.key === 'ANTHROPIC_BASE_URL')?.value ?? ''
    expect(baseUrl).not.toContain('sk-secret')
    expect(JSON.stringify(state)).not.toContain('sk-secret')
  })

  it('keeps URL query keys but redacts their values, so an added credential param is visible', () => {
    const state = collect({
      claudeJson: {
        mcpServers: { gh: { url: 'https://mcp.x.dev/mcp?api_key=topsecret&region=eu' } },
      },
    })
    const url = state.mcpServers[0]?.url ?? ''
    expect(url).not.toContain('topsecret') // value never persisted
    expect(url).toContain('api_key') // key kept so the rule can flag it
    expect(url).toContain('mcp.x.dev') // host preserved
  })

  it('redaction is stable for the same value (so unchanged secrets do not diff)', () => {
    const a = collect({ settings: { env: { TOKEN: 'abc' } } })
    const b = collect({ settings: { env: { TOKEN: 'abc' } } })
    expect(a.env).toEqual(b.env)
  })

  it('passes credential meta through unchanged', () => {
    const state = collect({ credentials: { present: true, hash: 'abc', mode: 0o600, size: 10 } })
    expect(state.credentials).toEqual({ present: true, hash: 'abc', mode: 0o600, size: 10 })
  })

  it('returns empty state for empty input', () => {
    const state = collect({})
    expect(state.mcpServers).toEqual([])
    expect(state.hooks).toEqual([])
    expect(state.credentials).toEqual({ present: false })
  })
})
