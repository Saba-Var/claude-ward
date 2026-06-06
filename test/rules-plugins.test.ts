import { describe, expect, it } from 'vitest';
import { ruleMarketplaceOrPlugin } from '../src/core/rules/plugins.js';
import type { Change } from '../src/core/model.js';

const cfg = { allowedHosts: [], knownMarketplaces: ['trusted-market'] };

describe('ruleMarketplaceOrPlugin', () => {
  it('flags a new marketplace as MEDIUM', () => {
    const change: Change = { kind: 'added', category: 'marketplace', path: 'marketplace/new-market', after: 'new-market' };
    expect(ruleMarketplaceOrPlugin(change, cfg)?.severity).toBe('MEDIUM');
  });

  it('flags a plugin from an unknown marketplace as MEDIUM', () => {
    const change: Change = { kind: 'added', category: 'plugin', path: 'plugin/x@shady-market', after: 'x@shady-market' };
    expect(ruleMarketplaceOrPlugin(change, cfg)?.severity).toBe('MEDIUM');
  });

  it('ignores a plugin from a known marketplace (left for INFO)', () => {
    const change: Change = { kind: 'added', category: 'plugin', path: 'plugin/x@trusted-market', after: 'x@trusted-market' };
    expect(ruleMarketplaceOrPlugin(change, cfg)).toBeNull();
  });
});
