import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { saveBaseline } from '../io/baseline.js';
import { paths } from '../io/paths.js';
import { takeSnapshot } from '../io/snapshot.js';

const HOOK_COMMAND = 'claude-ward scan --quiet';

interface HookCommand {
  type: 'command';
  command: string;
}
interface HookGroup {
  hooks: HookCommand[];
}
interface SettingsShape {
  hooks?: Record<string, HookGroup[]>;
  [k: string]: unknown;
}

function readSettings(): SettingsShape {
  try {
    return JSON.parse(readFileSync(paths.settings, 'utf8')) as SettingsShape;
  } catch {
    return {};
  }
}

function writeSettings(settings: SettingsShape): void {
  mkdirSync(dirname(paths.settings), { recursive: true });
  writeFileSync(paths.settings, JSON.stringify(settings, null, 2));
}

function hasOurHook(settings: SettingsShape): boolean {
  const groups = settings.hooks?.SessionStart ?? [];
  return groups.some((g) => g.hooks?.some((h) => h.command === HOOK_COMMAND));
}

async function confirm(question: string, assumeYes: boolean): Promise<boolean> {
  if (assumeYes) return true;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = (await rl.question(`${question} [y/N] `)).trim().toLowerCase();
  rl.close();
  return answer === 'y' || answer === 'yes';
}

export async function installHookCommand(opts: { yes?: boolean; now: string }): Promise<void> {
  const settings = readSettings();
  if (hasOurHook(settings)) {
    process.stdout.write('SessionStart hook already installed.\n');
    return;
  }
  const ok = await confirm(
    `This will add a SessionStart hook ("${HOOK_COMMAND}") to ${paths.settings}.\nThis is the only write claude-ward makes to a watched file. Continue?`,
    Boolean(opts.yes),
  );
  if (!ok) {
    process.stdout.write('Aborted.\n');
    return;
  }
  settings.hooks ??= {};
  settings.hooks.SessionStart ??= [];
  settings.hooks.SessionStart.push({ hooks: [{ type: 'command', command: HOOK_COMMAND }] });
  writeSettings(settings);

  // We just edited a watched file on purpose; re-baseline so this never self-triggers.
  saveBaseline(takeSnapshot().state, opts.now);
  process.stdout.write('Installed SessionStart hook and re-baselined the change.\n');
}

export async function uninstallHookCommand(opts: { now: string }): Promise<void> {
  const settings = readSettings();
  const groups = settings.hooks?.SessionStart;
  if (!groups) {
    process.stdout.write('No SessionStart hook to remove.\n');
    return;
  }
  for (const g of groups) g.hooks = (g.hooks ?? []).filter((h) => h.command !== HOOK_COMMAND);
  settings.hooks!.SessionStart = groups.filter((g) => (g.hooks ?? []).length > 0);
  if (settings.hooks!.SessionStart.length === 0) delete settings.hooks!.SessionStart;
  writeSettings(settings);

  saveBaseline(takeSnapshot().state, opts.now);
  process.stdout.write('Removed SessionStart hook and re-baselined the change.\n');
}
