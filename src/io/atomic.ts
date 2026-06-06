import { renameSync, writeFileSync } from 'node:fs'

// Write to a sibling temp file then rename into place. rename is atomic within
// a directory on POSIX, so a killed write cannot leave a half-written file -
// whether the baseline (the tool's trust anchor) or a watched settings.json we
// edit on consent. Pass a mode to create the destination owner-only; omit it to
// preserve whatever the existing file used.
export function writeFileAtomic(path: string, data: string, mode?: number): void {
  const tmp = `${path}.${process.pid}.tmp`
  writeFileSync(tmp, data, mode === undefined ? undefined : { mode })
  renameSync(tmp, path)
}
