import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { VERSION } from '../src/index.js'

describe('VERSION', () => {
  it('matches the version in package.json so --version cannot drift', () => {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
      version: string
    }
    expect(VERSION).toBe(pkg.version)
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+/)
  })
})
