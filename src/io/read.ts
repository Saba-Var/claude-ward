import { readFileSync, statSync } from 'node:fs'

export type ReadResult =
  | { status: 'ok'; data: unknown; raw: string }
  | { status: 'missing' }
  | { status: 'malformed'; error: string }
  | { status: 'denied'; error: string }
  | { status: 'error'; error: string }

export function readJsonFile(path: string): ReadResult {
  let raw: string
  try {
    raw = readFileSync(path, 'utf8')
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code
    if (code === 'ENOENT') return { status: 'missing' }
    if (code === 'EACCES' || code === 'EPERM') return { status: 'denied', error: String(err) }
    return { status: 'error', error: String(err) }
  }
  try {
    return { status: 'ok', data: JSON.parse(raw), raw }
  } catch (err) {
    return { status: 'malformed', error: String(err) }
  }
}

export type StatResult =
  | { status: 'ok'; mode: number; size: number }
  | { status: 'missing' }
  | { status: 'denied'; error: string }

// Distinguish "the file is gone" (a normal logout) from "the file is there but
// we cannot read it" (a permission change worth flagging). Folding both into
// null is how the credential file used to fail open.
export function statFile(path: string): StatResult {
  try {
    const s = statSync(path)
    return { status: 'ok', mode: s.mode & 0o777, size: s.size }
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code
    if (code === 'ENOENT') return { status: 'missing' }
    return { status: 'denied', error: String(err) }
  }
}

export function readBytes(path: string): Buffer | null {
  try {
    return readFileSync(path)
  } catch {
    return null
  }
}
