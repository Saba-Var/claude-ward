import { chmodSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { readBytes, readJsonFile, statFile } from '../src/io/read.js'

const dir = mkdtempSync(join(tmpdir(), 'cward-'))
const canTestPerms =
  process.platform !== 'win32' && typeof process.getuid === 'function' && process.getuid() !== 0

describe('readJsonFile', () => {
  it('returns status missing for a nonexistent file', () => {
    expect(readJsonFile(join(dir, 'nope.json')).status).toBe('missing')
  })

  it('parses valid json', () => {
    const p = join(dir, 'ok.json')
    writeFileSync(p, '{"a":1}')
    const r = readJsonFile(p)
    expect(r.status).toBe('ok')
    expect(r.status === 'ok' && r.data).toEqual({ a: 1 })
  })

  it('returns status malformed for invalid json', () => {
    const p = join(dir, 'bad.json')
    writeFileSync(p, '{not json')
    expect(readJsonFile(p).status).toBe('malformed')
  })

  it.skipIf(!canTestPerms)('returns status denied for an unreadable file', () => {
    const p = join(dir, 'denied.json')
    writeFileSync(p, '{"a":1}')
    chmodSync(p, 0o000)
    expect(readJsonFile(p).status).toBe('denied')
    chmodSync(p, 0o600)
  })
})

describe('statFile', () => {
  it('reports ok with the permission bits masked to the low 9', () => {
    const p = join(dir, 'stat.json')
    writeFileSync(p, '{}')
    chmodSync(p, 0o640)
    const r = statFile(p)
    expect(r.status).toBe('ok')
    expect(r.status === 'ok' && r.mode).toBe(0o640)
  })

  it('reports missing for a nonexistent file', () => {
    expect(statFile(join(dir, 'gone.json')).status).toBe('missing')
  })
})

describe('readBytes', () => {
  it('reads raw bytes, returning null when the file is absent', () => {
    const p = join(dir, 'bytes.bin')
    writeFileSync(p, 'hi')
    expect(readBytes(p)?.toString()).toBe('hi')
    expect(readBytes(join(dir, 'no.bin'))).toBeNull()
  })
})
