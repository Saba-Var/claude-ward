import { readFileSync, statSync } from 'node:fs'

export type ReadResult =
  | { status: 'ok'; data: unknown; raw: string }
  | { status: 'missing' }
  | { status: 'malformed'; error: string }
  | { status: 'denied'; error: string }

export function readJsonFile(path: string): ReadResult {
  let raw: string
  try {
    raw = readFileSync(path, 'utf8')
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code
    if (code === 'ENOENT') return { status: 'missing' }
    if (code === 'EACCES' || code === 'EPERM') return { status: 'denied', error: String(err) }
    return { status: 'denied', error: String(err) }
  }
  try {
    return { status: 'ok', data: JSON.parse(raw), raw }
  } catch (err) {
    return { status: 'malformed', error: String(err) }
  }
}

export function statFile(path: string): { mode: number; size: number } | null {
  try {
    const s = statSync(path)
    return { mode: s.mode & 0o777, size: s.size }
  } catch {
    return null
  }
}

export function readBytes(path: string): Buffer | null {
  try {
    return readFileSync(path)
  } catch {
    return null
  }
}
