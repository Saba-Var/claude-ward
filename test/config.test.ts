import { describe, expect, it } from 'vitest'
import { defaultConfig, deriveConfig, loadConfig } from '../src/core/config.js'
import { emptyState } from '../src/core/model.js'

describe('config', () => {
  it('default config has empty allowlists', () => {
    expect(defaultConfig()).toEqual({ allowedHosts: [], knownMarketplaces: [] })
  })

  it('derives allowed hosts and marketplaces from state', () => {
    const state = {
      ...emptyState(),
      mcpServers: [{ scope: 'global' as const, name: 'a', url: 'https://api.example.com/mcp' }],
      marketplaces: ['acme-market'],
      env: [{ key: 'ANTHROPIC_BASE_URL', value: 'https://corp.proxy.io' }],
    }
    const cfg = deriveConfig(state)
    expect(cfg.allowedHosts).toContain('api.example.com')
    expect(cfg.allowedHosts).toContain('corp.proxy.io')
    expect(cfg.knownMarketplaces).toEqual(['acme-market'])
  })

  it('loadConfig fills missing fields from defaults', () => {
    expect(loadConfig({ allowedHosts: ['x.io'] })).toEqual({
      allowedHosts: ['x.io'],
      knownMarketplaces: [],
    })
    expect(loadConfig(null)).toEqual(defaultConfig())
  })

  it('loadConfig drops non-string allowlist entries instead of trusting them', () => {
    const cfg = loadConfig({ allowedHosts: ['good.io', 42, null, { host: 'x' }] })
    expect(cfg.allowedHosts).toEqual(['good.io'])
  })

  it('loadConfig canonicalizes host entries so spellings compare equal', () => {
    expect(loadConfig({ allowedHosts: ['API.GitHub.com.'] }).allowedHosts).toEqual([
      'api.github.com',
    ])
  })

  it('a host derived from state matches its canonicalized allowlist entry', () => {
    const derived = deriveConfig({
      ...emptyState(),
      mcpServers: [{ scope: 'global' as const, name: 'a', url: 'https://api.github.com./mcp' }],
    })
    const configured = loadConfig({ allowedHosts: ['API.github.com'] })
    expect(configured.allowedHosts).toEqual(derived.allowedHosts)
  })
})
