import { sha256 } from '../hash.js'
import type { Change, Finding, WardConfig } from '../model.js'
import { findingId } from './index.js'

const BASE64_BLOB = /[A-Za-z0-9+/]{40,}={0,2}/
const HEX_BLOB = /\b[0-9a-fA-F]{40,}\b/
const NON_ASCII = /[^\x20-\x7E]/

function valueStrings(value: unknown): string[] {
  if (value == null) return []
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap(valueStrings)
  if (typeof value === 'object') return Object.values(value).flatMap(valueStrings)
  return []
}

function isUrlLike(s: string): boolean {
  return /^[a-z]+:\/\//i.test(s)
}

// Never echo the matched bytes - they could be the very secret we are warning
// about. Describe the blob by length and a short fingerprint instead.
function describeBlob(blob: string): string {
  return `a ${blob.length}-char base64/hex blob (sha256:${sha256(blob).slice(0, 12)})`
}

export function ruleObfuscation(change: Change, _cfg: WardConfig): Finding | null {
  if (change.kind === 'removed') return null
  // The credential change carries our own SHA-256 hash, which reads as a hex
  // blob; skip it so we do not flag a value we produced ourselves.
  if (change.category === 'credentials') return null
  for (const s of valueStrings(change.after)) {
    const blob = BASE64_BLOB.exec(s) ?? HEX_BLOB.exec(s)
    if (blob) {
      return mk(
        'obfuscation.blob',
        'Obfuscated blob detected',
        `Value contains ${describeBlob(blob[0])}.`,
        change,
      )
    }
    if (isUrlLike(s) && NON_ASCII.test(s)) {
      return mk(
        'obfuscation.homoglyph',
        'Non-ASCII characters in a URL',
        'A URL value contains non-ASCII characters that may be homoglyphs of a trusted host.',
        change,
      )
    }
  }
  return null
}

function mk(ruleId: string, title: string, detail: string, change: Change): Finding {
  return { id: findingId(ruleId, change), ruleId, severity: 'HIGH', title, detail, change }
}
