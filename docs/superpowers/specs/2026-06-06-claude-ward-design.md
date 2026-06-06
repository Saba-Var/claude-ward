# claude-ward — Design

Date: 2026-06-06
Status: Approved

## What it is

A tamper-detection tripwire for Claude Code's local configuration. It watches the
files Claude Code (the CLI) reads for trust-sensitive settings, takes a baseline of
their relevant contents, and alerts when something changes them in a way that matches
a known attack signature.

Open source, MIT licensed, published to npm, runnable via `npx claude-ward`. Secondary
bin alias: `cward`.

## Positioning

Targets Claude **Code** (the CLI), not Claude Desktop. The adjacent project
Claude-Defender guards the Desktop GUI's MCP config via an overlay; claude-ward is
CLI-native, hook-integrated, npm-installable, and guards a different set of files. It
does one thing: detect suspicious changes to Claude Code's local config. It is not a
general "AI security suite".

## Threat model (motivation)

Claude Code stores config in plaintext. `~/.claude.json` controls MCP server endpoints
and holds OAuth tokens for connected services; `~/.claude/settings.json` holds hooks,
plugins, marketplaces, and permissions. Two documented incidents motivate the tool:

- **Mitiga MitM (April 2026):** a malicious npm package's postinstall hook silently
  rewrites `~/.claude.json`, repointing MCP traffic through an attacker proxy and
  intercepting OAuth tokens. Anthropic reviewed it and declared it out of scope (the
  user "consented"), so there is no native fix. Source:
  mitiga.io/blog/claude-code-mcp-token-theft-mitm
- **Shai-Hulud / Mini Shai-Hulud npm campaigns (2026):** worms that harvest
  `~/.claude.json` and MCP configs and inject `.claude/settings.json` SessionStart
  hooks for persistence, across hundreds of packages.

Firewalls and EDR treat "a program wrote a JSON file" as normal, so this tampering
goes unnoticed. claude-ward is the missing local tripwire.

## Hard constraints

These are non-negotiable; a security tool that breaks them is worthless.

- **Read-only** on every monitored file. The only write to anything outside
  `~/.claude-ward/` is the explicit `install-hook` / `uninstall-hook` command, with
  consent.
- **Never store secret values.** For token fields and `~/.claude/.credentials.json`,
  store only a SHA-256 hash plus metadata (file mode, size, mtime) — enough to detect
  change, never enough to leak the secret.
- **Zero network calls, zero telemetry** in the core. Everything runs locally. Stated
  visibly in the README.
- claude-ward's own state lives in `~/.claude-ward/`, separate from what it watches.
- **Cross-platform** (macOS, Linux, Windows). Always fall back to terminal output if a
  notifier backend is unavailable.

## Stack

TypeScript (strict), Node 20+. CLI via `commander`, file-watching via `chokidar`,
desktop notifications via `node-notifier`. ESLint + Prettier. Tests via Vitest. Build
via tsup to ESM. Committed lockfile. `engines`, `bin`, `files`, `exports` configured so
`npx claude-ward` works and the published package is lean.

## What is monitored

`~/.claude.json`:

- top-level `mcpServers` and per-project `projects.<path>.mcpServers` — each server's
  `command` / `args` / `url` / `env`
- any `hooks`

`~/.claude/settings.json` and `~/.claude/settings.local.json`:

- `hooks` (all event types)
- `enabledPlugins`
- marketplace sources
- `permissions`
- `env`

`~/.claude/.credentials.json`:

- hash + file mode + size + mtime only — contents never read into the baseline.

## Architecture

Pure center, side effects at the edges.

```
io/read (fs) ──raw──> core/collect (pure) ──TrackedState──> core/diff (pure)
                                                                   │
                                                              Change[]
                                                                   │
                                                          core/rules (pure)
                                                                   │
                                                              Finding[]
                                                                   │
                              report / notify / exit-code (edges) ─┘
```

1. `io/read` performs all filesystem access and handles missing files, malformed JSON,
   partial writes, and permission errors, returning a Result rather than throwing.
2. `core/collect` is pure: raw parsed JSON → a normalized `TrackedState`. MCP servers
   are flattened (scope + name → command/args/url/env). Hooks are grouped by event
   type. Plugins, marketplaces, permissions, and env are extracted. Credentials become
   `{ hash, mode, size, mtime }` only — contents never enter the state.
3. `core/diff` is pure: `diff(baseline, current) → Change[]`, each change tagged
   `added` / `removed` / `modified` with a path and before/after values.
4. `core/rules/*` are pure: `runRules(changes, config) → Finding[]`. One file per rule
   family. A Finding carries id, severity, ruleId, human message, and evidence.
5. Edges format and deliver: `report` (terminal), `notify` (node-notifier with terminal
   fallback), and the process exit code.

`collect` is deliberately pure (no fs inside) so fixtures exercise the real extraction
path, not a mock.

### Module layout

```
src/
  cli.ts                 commander entry (bin: claude-ward, cward)
  index.ts               library exports
  commands/              init watch scan status diff approve install-hook uninstall-hook
  core/
    model.ts             types: TrackedState, Change, Finding, Severity
    collect.ts           pure: raw JSON -> TrackedState
    diff.ts              pure: baseline vs current -> Change[]
    hash.ts              sha256 helper
    config.ts            ward allowlist config (load + defaults)
    rules/
      index.ts           runRules orchestrator
      mcp.ts             localhost-repoint, remote-exec/pipe-to-shell, host allowlist
      hooks.ts           SessionStart injection, new/changed hooks
      env.ts             ANTHROPIC_BASE_URL / OTEL endpoint redirect
      credentials.ts     hash/mode change
      obfuscation.ts     base64/hex blobs, unicode homoglyphs
      permissions.ts     broadened allow-list
      plugins.ts         marketplace / plugin source
  io/
    paths.ts             resolve ~/.claude.json, ~/.claude/*, ~/.claude-ward/
    read.ts              safe read -> Result (missing / malformed / partial / perms)
    baseline.ts          load / save baseline in ~/.claude-ward/
    watcher.ts           chokidar + debounce / retry
    notify.ts            node-notifier + terminal fallback
    report.ts            format findings
test/
  fixtures/              clean, localhost-repoint, curl-pipe, sessionstart-hook,
                         new-hook, marketplace, broadened-perms, benign
  *.test.ts
```

### State files (`~/.claude-ward/`)

- `baseline.json` — serialized `TrackedState`. Secrets present only as hashes.
- `config.json` — ward config including the host allowlist, auto-populated by `init`.

## Detection rules

The rule engine is the heart of the product: a pure, fully unit-tested module with no
side effects. It diffs current state vs baseline, then classifies each change
deterministically (no LLM). Severities:

**CRITICAL**

- An MCP endpoint repointed to localhost / 127.0.0.1 / 0.0.0.0 + port (the Mitiga
  signature).
- An MCP `command` / `args` now contains remote-exec / pipe-to-shell patterns:
  `curl … | sh`, `wget … | bash`, `| sh`, `eval`, `base64 -d`.
- A new SessionStart hook was injected (the Shai-Hulud persistence signature).

**HIGH**

- An MCP endpoint host not in the user's known-good allowlist.
- Any other new hook, or a modified existing hook command.
- A new or changed env var that can redirect traffic (`ANTHROPIC_BASE_URL`,
  `OTEL_EXPORTER_OTLP_ENDPOINT` pointing to a non-allowlisted host).
- `~/.claude/.credentials.json` hash changed unexpectedly, or its mode became
  group/world-readable.
- Obfuscation red flags in any value: long base64/hex blobs, unicode homoglyphs in a
  URL or host.

**MEDIUM**

- New marketplace source; new plugin from a non-known marketplace; broadened
  `permissions` allow-list (e.g. added `Bash`, `Bash(*)`, broad globs).

**INFO**

- Any other tracked-field change, so nothing slips by silently.

## CLI commands

- `init` — confirm current state is trusted, write baseline + a starter
  `~/.claude-ward/config.json` with the allowlist auto-populated from current hosts.
- `watch` — live foreground watcher; `--quiet` drops INFO.
- `scan` — one-shot; non-zero exit on HIGH/CRITICAL. Intended for a SessionStart hook.
- `status` — show baseline summary and last result.
- `diff` — show current changes vs baseline.
- `approve [--all | <id>]` — accept change(s), update baseline.
- `install-hook` / `uninstall-hook` — wire a SessionStart hook running `claude-ward
scan`. Since this edits a watched file, auto-re-baseline that single change so it
  never self-triggers.

## Error handling

- Missing file: treated as absent state, not an error (config files are optional).
- Malformed JSON / partial write: debounce and retry; report a parse warning rather
  than crashing or producing a false diff.
- Permission errors: report clearly, continue with the files that are readable.

## Testing

Unit tests for the diff engine and every rule, with fixtures: clean config,
localhost-repoint (CRITICAL), curl-pipe-shell command (CRITICAL), injected SessionStart
hook (CRITICAL), generic new hook (HIGH), new marketplace (MEDIUM), broadened
permissions (MEDIUM), and a benign change (INFO). The rule engine must be 100%
deterministic. `collect` tested against raw-JSON fixtures. `io/read` tested against
missing / malformed / partial / permission-denied cases.

## Build order

1. `core/model`, `core/collect`, `core/diff`, `core/rules/*` + their tests — green first.
2. `io/*` (read, baseline, watcher, notify, report) and `commands/*`, `cli.ts`.
3. Repo-hygiene files (README, LICENSE, CONTRIBUTING, SECURITY, CHANGELOG, CI,
   issue/PR templates) last, once the tool works.

## Repository hygiene

- `README.md` — one-line description; CI / npm / license badges only; concrete threat
  intro with the Mitiga + Shai-Hulud links; 30-second quickstart
  (`npx claude-ward init` → `claude-ward install-hook`); "How detection works" in plain
  language; honest "Limitations" section; local-only / no-telemetry promise; positioning
  vs generic file-integrity tools and vs Claude-Defender; contributing pointer; the
  disclaimer "Not affiliated with, endorsed by, or sponsored by Anthropic."; a marked
  placeholder near the top for a demo GIF/asciinema; a short "Why I built this" stub.
- `LICENSE` (MIT).
- `CONTRIBUTING.md` — short and concrete: run, test, commit convention, PRs welcome
  (especially new detection signatures).
- `SECURITY.md` — real threat model: what it protects against, what it does not, how to
  report a vuln.
- `CHANGELOG.md` — Keep a Changelog format; follow semver.
- `.github/workflows/ci.yml` — typecheck, lint, tests on push/PR.
- `.github/ISSUE_TEMPLATE/` — bug report + new-signature request; PR template.
- Conventional commits, written like a person (varied, specific).

## Voice

All prose written like a working developer, not a content generator. No emoji-spam (at
most one or two anywhere). No marketing adjectives (powerful, robust, seamless,
comprehensive, etc.) or hype verbs (leverage, delve, unlock, supercharge). Avoid the
"not just X — it's Y" construction and heavy em-dash habit. Plain prose over tables.
Lead with the concrete attack, not an abstract intro. Keep every claim accurate and
modest; the limitations section is part of that. Comments only where logic is
non-obvious.

## Out of scope

- Claude Desktop (the GUI app).
- Real-time blocking or remediation — claude-ward detects and alerts; it does not
  prevent writes or roll back changes.
- Any network feature, cloud sync, or telemetry.
- LLM-based classification — all detection is deterministic.
