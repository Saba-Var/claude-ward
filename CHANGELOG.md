# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0](https://github.com/Saba-Var/claude-ward/compare/v0.1.7...v0.2.0) (2026-06-08)


### Features

* detect credentials in MCP endpoint URL query params ([9131a9c](https://github.com/Saba-Var/claude-ward/commit/9131a9ce982c063cececd8b62cd77dd317fdf719))


### Bug Fixes

* exit non-zero when a watched file is unreadable ([65b0c06](https://github.com/Saba-Var/claude-ward/commit/65b0c06d62dfaa7cc1f293f16383edf80bcf24d3))

## [0.1.7](https://github.com/Saba-Var/claude-ward/compare/v0.1.6...v0.1.7) (2026-06-07)


### Bug Fixes

* trust the in-place hook migration during install ([#28](https://github.com/Saba-Var/claude-ward/issues/28)) ([260746b](https://github.com/Saba-Var/claude-ward/commit/260746b01a29c5fe6dfe4e83444e7c5d22659ce9))

## [0.1.6](https://github.com/Saba-Var/claude-ward/compare/v0.1.5...v0.1.6) (2026-06-07)


### Bug Fixes

* make the SessionStart hook actually reach the user ([#26](https://github.com/Saba-Var/claude-ward/issues/26)) ([2c500ff](https://github.com/Saba-Var/claude-ward/commit/2c500ff4f0b087b089896965887486f8f433ec8a))

## [0.1.5](https://github.com/Saba-Var/claude-ward/compare/v0.1.4...v0.1.5) (2026-06-07)


### Bug Fixes

* route hook-mode alerts to stderr so SessionStart shows them ([#24](https://github.com/Saba-Var/claude-ward/issues/24)) ([36c87f6](https://github.com/Saba-Var/claude-ward/commit/36c87f62908a156aefb187d72df6f09dbd0ad39c))

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
