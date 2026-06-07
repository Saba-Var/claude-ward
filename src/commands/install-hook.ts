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

const HOOK_COMMAND = 'claude-ward scan --hook'
// Commands earlier versions installed. install/uninstall recognise these so an
// upgrade migrates cleanly instead of leaving a stale, silent hook behind.
const LEGACY_HOOK_COMMANDS = ['claude-ward scan --quiet']

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

function hasCommand(settings: SettingsShape, cmd: string): boolean {
  return (settings.hooks?.SessionStart ?? []).some((g) =>
    (g.hooks ?? []).some((h) => h.command === cmd),
  )
}

function hasOurHook(settings: SettingsShape): boolean {
  return hasCommand(settings, HOOK_COMMAND)
}

function hasLegacyHook(settings: SettingsShape): boolean {
  return LEGACY_HOOK_COMMANDS.some((c) => hasCommand(settings, c))
}

// Drop the named SessionStart commands, pruning any group left empty so we do
// not leave dangling `{ hooks: [] }` entries behind.
function stripCommands(settings: SettingsShape, cmds: string[]): void {
  const groups = settings.hooks?.SessionStart
  if (!settings.hooks || !groups) return
  const kept = groups
    .map((g) => ({ ...g, hooks: (g.hooks ?? []).filter((h) => !cmds.includes(h.command)) }))
    .filter((g) => g.hooks.length > 0)
  if (kept.length === 0) delete settings.hooks.SessionStart
  else settings.hooks.SessionStart = kept
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

function isLegacyHookRemove(c: Change): boolean {
  return (
    c.category === 'hook' &&
    c.kind === 'removed' &&
    c.before?.event === 'SessionStart' &&
    c.before?.source === 'settings' &&
    typeof c.before?.command === 'string' &&
    LEGACY_HOOK_COMMANDS.includes(c.before.command)
  )
}

// An in-place upgrade (legacy command rewritten to ours at the same position)
// shows up as a single `modified` change, not a remove + add. Trust it too, or
// the migration leaves its own edit pending as a CRITICAL hook change.
function isOurHookMigrate(c: Change): boolean {
  return (
    c.category === 'hook' &&
    c.kind === 'modified' &&
    c.after?.event === 'SessionStart' &&
    c.after?.source === 'settings' &&
    c.after?.command === HOOK_COMMAND &&
    typeof c.before?.command === 'string' &&
    LEGACY_HOOK_COMMANDS.includes(c.before.command)
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
  const migrating = hasLegacyHook(settings)
  const ok = await confirm(
    `This will ${migrating ? 'update' : 'add'} a SessionStart hook ("${HOOK_COMMAND}") in ${paths.settings}.\nThis is the only write claude-ward makes to a watched file. Continue?`,
    Boolean(opts.yes),
  )
  if (!ok) {
    process.stdout.write('Aborted.\n')
    return
  }
  // Replace any older command in the same write so an upgrade never leaves two
  // claude-ward hooks behind.
  stripCommands(settings, LEGACY_HOOK_COMMANDS)
  settings.hooks ??= {}
  settings.hooks.SessionStart ??= []
  settings.hooks.SessionStart.push({ hooks: [{ type: 'command', command: HOOK_COMMAND }] })
  writeSettings(settings, mode)

  const { others } = rebaselineSelfEdit(
    (c) => isOurHookAdd(c) || isLegacyHookRemove(c) || isOurHookMigrate(c),
    opts.now,
  )
  process.stdout.write(
    `${migrating ? 'Updated' : 'Installed'} SessionStart hook and trusted only that change.\n`,
  )
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
  if (!hasOurHook(settings) && !hasLegacyHook(settings)) {
    process.stdout.write('No SessionStart hook to remove.\n')
    return
  }
  stripCommands(settings, [HOOK_COMMAND, ...LEGACY_HOOK_COMMANDS])
  writeSettings(settings, mode)

  const { others } = rebaselineSelfEdit(
    (c) => isOurHookRemove(c) || isLegacyHookRemove(c),
    opts.now,
  )
  process.stdout.write('Removed SessionStart hook and trusted only that change.\n')
  reportPending(others)
}
