import { describe, expect, it } from 'vitest'
import { ruleObfuscation } from '../src/core/rules/obfuscation.js'
import type { Change } from '../src/core/model.js'

const cfg = { allowedHosts: [], knownMarketplaces: [] }

describe('ruleObfuscation', () => {
  it('flags a long base64 blob in an mcp arg as HIGH', () => {
    const blob = 'QUJDRA'.repeat(10)
    const change: Change = {
      kind: 'added',
      category: 'mcpServer',
      path: 'mcpServer/global//x',
      after: { scope: 'global', name: 'x', command: 'node', args: ['-e', blob] },
    }
    expect(ruleObfuscation(change, cfg)?.severity).toBe('HIGH')
  })

  it('flags a unicode homoglyph in a host as HIGH', () => {
    const change: Change = {
      kind: 'modified',
      category: 'mcpServer',
      path: 'mcpServer/global//x',
      after: { scope: 'global', name: 'x', url: 'https://githυb.com/mcp' },
    }
    expect(ruleObfuscation(change, cfg)?.severity).toBe('HIGH')
  })

  it('ignores ordinary values', () => {
    const change: Change = {
      kind: 'added',
      category: 'env',
      path: 'env/EDITOR',
      after: { key: 'EDITOR', value: 'vim' },
    }
    expect(ruleObfuscation(change, cfg)).toBeNull()
  })
})
