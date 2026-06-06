// src/core/rules/index.ts (minimal, expanded in Task 14)
import { sha256 } from '../hash.js';
export function findingId(ruleId: string, path: string): string {
  return sha256(`${ruleId}:${path}`).slice(0, 12);
}
