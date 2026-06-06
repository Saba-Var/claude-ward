import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readJsonFile } from '../src/io/read.js';

const dir = mkdtempSync(join(tmpdir(), 'cward-'));

describe('readJsonFile', () => {
  it('returns status missing for a nonexistent file', () => {
    expect(readJsonFile(join(dir, 'nope.json')).status).toBe('missing');
  });

  it('parses valid json', () => {
    const p = join(dir, 'ok.json');
    writeFileSync(p, '{"a":1}');
    const r = readJsonFile(p);
    expect(r.status).toBe('ok');
    expect(r.status === 'ok' && r.data).toEqual({ a: 1 });
  });

  it('returns status malformed for invalid json', () => {
    const p = join(dir, 'bad.json');
    writeFileSync(p, '{not json');
    expect(readJsonFile(p).status).toBe('malformed');
  });
});
