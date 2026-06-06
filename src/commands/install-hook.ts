import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { createInterface } from 'node:readline/promises'
import { applyChange, diff } from '../core/diff.js'
import type { Change } from '../core/model.js'
import { writeFileAtomic } from '../io/atomic.js'
import { loadBaseline, saveBaseline } from '../io/baseline.js'
import { paths } from '../io/paths.js'
import { readJsonFile, statFile } from '../io/read.js'
import { takeSnapshot } from '../io/snapshot.js'

const HOOK_COMMAND = 'claude-ward scan --quiet'

interface HookCommand {
  type: 'command'
  command: string
}
interface HookGroup {
  hooks?: HookCommand[]
}
interface SettingsShape {
  hooks?: Record<string, HookGroup[]>
  [k: string]: unknown
}

type SettingsRead =
  | { ok: true; settings: SettingsShape; mode?: number }
  | { ok: false; reason: string }

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

// Never overwrite a settings.json we could not read cleanly. A blanket
// "{} on any error" would silently wipe the user's real config (permissions,
// env, other hooks) when the file is merely malformed or unreadable.
function readSettings(): SettingsRead {
  const r = readJsonFile(paths.settings)
  if (r.status === 'missing') return { ok: true, settings: {} }
  if (r.status === 'ok') {
    if (!isObject(r.data)) return { ok: false, reason: 'it is not a JSON object' }
    const stat = statFile(paths.settings)
    return {
      ok: true,
      settings: r.data as SettingsShape,
      mode: stat.status === 'ok' ? stat.mode : undefined,
    }
  }
  return {
    ok: false,
    reason: r.status === 'malformed' ? 'it is not valid JSON' : 'it is unreadable',
  }
}

function writeSettings(settings: SettingsShape, mode?: number): void {
  mkdirSync(dirname(paths.settings), { recursive: true })
  writeFileAtomic(paths.settings, `${JSON.stringify(settings, null, 2)}\n`, mode)
}

function hasOurHook(settings: SettingsShape): boolean {
  return (settings.hooks?.SessionStart ?? []).some((g) =>
    (g.hooks ?? []).some((h) => h.command === HOOK_COMMAND),
  )
}

// The hook line we wrote (added) or removed (removed). Used to re-baseline only
// our own edit, never the rest of the snapshot.
function isOurHookAdd(c: Change): boolean {
  return (
    c.category === 'hook' &&
    c.kind === 'added' &&
    c.after?.event === 'SessionStart' &&
    c.after?.source === 'settings' &&
    c.after?.command === HOOK_COMMAND
  )
}

function isOurHookRemove(c: Change): boolean {
  return (
    c.category === 'hook' &&
    c.kind === 'removed' &&
    c.before?.event === 'SessionStart' &&
    c.before?.source === 'settings' &&
    c.before?.command === HOOK_COMMAND
  )
}

// Fold only the changes matching `mine` into the baseline; leave everything
// else pending so a routine consented edit cannot bless an attacker's
// concurrent change (e.g. a localhost MCP repoint) by re-snapshotting the world.
function rebaselineSelfEdit(
  mine: (c: Change) => boolean,
  now: string,
): { absorbed: number; others: number } {
  const baseline = loadBaseline()
  if (!baseline) {
    saveBaseline(takeSnapshot().state, now)
    return { absorbed: 0, others: 0 }
  }
  const changes = diff(baseline.state, takeSnapshot().state)
  let next = baseline.state
  let absorbed = 0
  let others = 0
  for (const c of changes) {
    if (mine(c)) {
      next = applyChange(next, c)
      absorbed++
    } else {
      others++
    }
  }
  saveBaseline(next, now)
  return { absorbed, others }
}

async function confirm(question: string, assumeYes: boolean): Promise<boolean> {
  if (assumeYes) return true
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const answer = (await rl.question(`${question} [y/N] `)).trim().toLowerCase()
  rl.close()
  return answer === 'y' || answer === 'yes'
}

function reportPending(others: number): void {
  if (others > 0) {
    process.stdout.write(
      `Note: ${others} other pending change(s) were left unapproved. Review with "claude-ward diff".\n`,
    )
  }
}

export async function installHookCommand(opts: { yes?: boolean; now: string }): Promise<void> {
  const read = readSettings()
  if (!read.ok) {
    process.stderr.write(`Refusing to edit ${paths.settings}: ${read.reason}. Fix it first.\n`)
    process.exitCode = 1
    return
  }
  const { settings, mode } = read
  if (hasOurHook(settings)) {
    process.stdout.write('SessionStart hook already installed.\n')
    return
  }
  const ok = await confirm(
    `This will add a SessionStart hook ("${HOOK_COMMAND}") to ${paths.settings}.\nThis is the only write claude-ward makes to a watched file. Continue?`,
    Boolean(opts.yes),
  )
  if (!ok) {
    process.stdout.write('Aborted.\n')
    return
  }
  settings.hooks ??= {}
  settings.hooks.SessionStart ??= []
  settings.hooks.SessionStart.push({ hooks: [{ type: 'command', command: HOOK_COMMAND }] })
  writeSettings(settings, mode)

  const { others } = rebaselineSelfEdit(isOurHookAdd, opts.now)
  process.stdout.write('Installed SessionStart hook and trusted only that change.\n')
  reportPending(others)
}

export async function uninstallHookCommand(opts: { now: string }): Promise<void> {
  const read = readSettings()
  if (!read.ok) {
    process.stderr.write(`Refusing to edit ${paths.settings}: ${read.reason}. Fix it first.\n`)
    process.exitCode = 1
    return
  }
  const { settings, mode } = read
  const hooks = settings.hooks
  const groups = hooks?.SessionStart
  if (!hooks || !groups) {
    process.stdout.write('No SessionStart hook to remove.\n')
    return
  }
  const kept = groups
    .map((g) => ({ ...g, hooks: (g.hooks ?? []).filter((h) => h.command !== HOOK_COMMAND) }))
    .filter((g) => g.hooks.length > 0)
  if (kept.length === 0) delete hooks.SessionStart
  else hooks.SessionStart = kept
  writeSettings(settings, mode)

  const { others } = rebaselineSelfEdit(isOurHookRemove, opts.now)
  process.stdout.write('Removed SessionStart hook and trusted only that change.\n')
  reportPending(others)
}
