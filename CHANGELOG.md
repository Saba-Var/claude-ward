# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.4](https://github.com/Saba-Var/claude-ward/compare/v0.1.3...v0.1.4) (2026-06-07)


### Bug Fixes

* point npm homepage at the landing site ([#22](https://github.com/Saba-Var/claude-ward/issues/22)) ([2e2ed0c](https://github.com/Saba-Var/claude-ward/commit/2e2ed0c66270dc055da392b99e43f3ac2e460396))

## [0.1.3](https://github.com/Saba-Var/claude-ward/compare/v0.1.2...v0.1.3) (2026-06-06)


### Bug Fixes

* roll back bad 0.2.0 release and correct release-please setup ([#16](https://github.com/Saba-Var/claude-ward/issues/16)) ([a3142c0](https://github.com/Saba-Var/claude-ward/commit/a3142c061d4c16428f7956d4460c91a775f9dc04))

## [Unreleased]

## [0.1.2] - 2026-06-06

### Fixed

- Quickstart installs the CLI globally (`npm i -g claude-ward`) so the `SessionStart`
  hook, which calls `claude-ward`, resolves on `PATH`. The previous `npx`-only steps left
  the installed hook failing with `command not found`.

## [0.1.1] - 2026-06-06

### Security

- Close loopback-repoint evasions: localhost detection now covers the whole
  `127.0.0.0/8` range, trailing-dot hosts, and IPv4-mapped IPv6, via a shared host
  canonicalizer the rules and the allowlist agree on.
- Make diff keys injective so a colliding decoy entry can no longer supply a fake
  "before" that suppresses a real CRITICAL finding.
- `install-hook` no longer overwrites a malformed `settings.json` and re-baselines only
  the hook line it wrote, instead of blanket-trusting every pending change.
- Flag a credential file that becomes unreadable as a tamper rather than reading it as a
  logout; strip userinfo and query strings from stored URLs; write ward state owner-only.

### Added

- Detection for in-place `SessionStart` hook rewrites (CRITICAL), bare MCP tool grants
  like `mcp__server` (MEDIUM), and more remote-exec forms (command substitution, pipe to
  an interpreter, `nc -e`).
- Atomic, validated baseline reads/writes; `diff` and `watch` now surface read warnings.
- npm release workflow with provenance, a Node 20/22/24 CI matrix, and dependabot.

### Changed

- `Change` is now a discriminated union keyed on category, removing unchecked casts
  across the rule engine.
- `--version` is read from `package.json` so it cannot drift.

## [0.1.0] - 2026-06-06

### Added

- Baseline, diff, and a deterministic rule engine over Claude Code's local config.
- Detection for: MCP endpoints repointed to localhost, pipe-to-shell / `base64 -d` MCP
  commands, injected `SessionStart` hooks, MCP hosts outside the allowlist,
  traffic-redirecting environment variables, credential-file tampering and permission
  loosening, obfuscated values (long base64/hex blobs, unicode homoglyphs in URLs), new
  marketplace sources and unknown-marketplace plugins, and broadened permission
  allow-lists.
- CLI commands: `init`, `watch`, `scan`, `status`, `diff`, `approve`, `install-hook`,
  `uninstall-hook`, with a `cward` alias.
- Secret-safe baseline: the credential file and token-valued env vars are stored as
  SHA-256 hashes, never in plaintext.
- Desktop notifications via `node-notifier` with a terminal fallback.
