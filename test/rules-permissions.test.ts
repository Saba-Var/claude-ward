import { describe, expect, it } from 'vitest';
import { ruleBroadenedPermissions } from '../src/core/rules/permissions.js';
import type { Change } from '../src/core/model.js';

const cfg = { allowedHosts: [], knownMarketplaces: [] };

function permChange(kind: Change['kind'], list: 'allow' | 'deny' | 'ask', entry: string): Change {
  return { kind, category: 'permission', path: `permission/${list}/${entry}`, after: { list, entry } };
}

describe('ruleBroadenedPermissions', () => {
  it('flags a bare Bash allow as MEDIUM', () => {
    expect(ruleBroadenedPermissions(permChange('added', 'allow', 'Bash'), cfg)?.severity).toBe('MEDIUM');
  });

  it('flags a wildcard allow as MEDIUM', () => {
    expect(ruleBroadenedPermissions(permChange('added', 'allow', 'Bash(*)'), cfg)?.severity).toBe('MEDIUM');
  });

  it('ignores a narrow specific allow (left for INFO)', () => {
    expect(ruleBroadenedPermissions(permChange('added', 'allow', 'Read(./src/**)'), cfg)).toBeNull();
  });

  it('ignores additions to the deny list', () => {
    expect(ruleBroadenedPermissions(permChange('added', 'deny', 'Bash'), cfg)).toBeNull();
  });
});
