import type { Change, Finding, WardConfig } from '../model.js';
import { findingId } from './index.js';

const BASE64_BLOB = /[A-Za-z0-9+/]{40,}={0,2}/;
const HEX_BLOB = /\b[0-9a-fA-F]{40,}\b/;
const NON_ASCII = /[^\x20-\x7E]/;

function valueStrings(value: unknown): string[] {
  if (value == null) return [];
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(valueStrings);
  if (typeof value === 'object') return Object.values(value).flatMap(valueStrings);
  return [];
}

function isUrlLike(s: string): boolean {
  return /^[a-z]+:\/\//i.test(s);
}

export function ruleObfuscation(change: Change, _cfg: WardConfig): Finding | null {
  if (change.kind === 'removed') return null;
  const strings = valueStrings(change.after);
  for (const s of strings) {
    if (BASE64_BLOB.test(s) || HEX_BLOB.test(s)) {
      return mk('obfuscation.blob', 'Obfuscated blob detected', `Value contains a long base64/hex blob: ${truncate(s)}`, change);
    }
    if (isUrlLike(s) && NON_ASCII.test(s)) {
      return mk('obfuscation.homoglyph', 'Non-ASCII characters in a URL', `Possible homoglyph host in: ${s}`, change);
    }
  }
  return null;
}

function truncate(s: string): string {
  return s.length > 60 ? `${s.slice(0, 57)}...` : s;
}

function mk(ruleId: string, title: string, detail: string, change: Change): Finding {
  return { id: findingId(ruleId, change.path), ruleId, severity: 'HIGH', title, detail, change };
}
