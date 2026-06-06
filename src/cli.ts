#!/usr/bin/env node
import { Command } from 'commander'
import { VERSION } from './index.js'
import { approveCommand } from './commands/approve.js'
import { diffCommand } from './commands/diff.js'
import { initCommand } from './commands/init.js'
import { installHookCommand, uninstallHookCommand } from './commands/install-hook.js'
import { scanCommand } from './commands/scan.js'
import { statusCommand } from './commands/status.js'
import { watchCommand } from './commands/watch.js'

function nowIso(): string {
  return new Date().toISOString()
}

const program = new Command()
program
  .name('claude-ward')
  .description("Tripwire for Claude Code's local configuration.")
  .version(VERSION)

program
  .command('init')
  .description('Trust the current config and write the baseline + allowlist.')
  .option('--force', 'overwrite an existing baseline')
  .action((opts) => initCommand({ force: opts.force, now: nowIso() }))

program
  .command('scan')
  .description('One-shot check; exits non-zero on HIGH/CRITICAL.')
  .option('--quiet', 'suppress INFO findings')
  .action((opts) => scanCommand({ quiet: opts.quiet }))

program
  .command('diff')
  .description('Show current changes against the baseline.')
  .option('--quiet', 'suppress INFO findings')
  .action((opts) => diffCommand({ quiet: opts.quiet }))

program.command('status').description('Show baseline summary.').action(statusCommand)

program
  .command('approve')
  .description('Accept changes and update the baseline.')
  .option('--all', 'approve every pending change')
  .argument('[id]', 'finding id to approve')
  .action((id, opts) => approveCommand({ all: opts.all, id, now: nowIso() }))

program
  .command('install-hook')
  .description('Add a SessionStart hook that runs "claude-ward scan".')
  .option('--yes', 'skip the confirmation prompt')
  .action(async (opts) => installHookCommand({ yes: opts.yes, now: nowIso() }))

program
  .command('uninstall-hook')
  .description('Remove the SessionStart hook.')
  .action(async () => uninstallHookCommand({ now: nowIso() }))

program
  .command('watch')
  .description('Watch tracked files and alert on suspicious changes.')
  .option('--quiet', 'suppress INFO findings')
  .action((opts) => watchCommand({ quiet: opts.quiet }))

program.parseAsync().catch((err) => {
  process.stderr.write(`${String(err)}\n`)
  process.exitCode = 1
})
