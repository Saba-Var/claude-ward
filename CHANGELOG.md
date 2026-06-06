# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0](https://github.com/Saba-Var/claude-ward/compare/claude-ward-v0.1.2...claude-ward-v0.2.0) (2026-06-06)


### Features

* add sha256 helper ([3d6ac83](https://github.com/Saba-Var/claude-ward/commit/3d6ac83fe4e6178d24ee02856cf530db63ecf6c9))
* add ward config with allowlist derivation ([daf81d8](https://github.com/Saba-Var/claude-ward/commit/daf81d8006044e8d16e80af30a69b8ce2be01713))
* broadened-permissions detection rule ([85cfc42](https://github.com/Saba-Var/claude-ward/commit/85cfc4247e847c5a6cf64f47a8fd051108727004))
* build current tracked state from disk (hash-only credentials) ([f02e9a4](https://github.com/Saba-Var/claude-ward/commit/f02e9a46db2c8b5ad6cbedbb19d295e6a8b7a5f9))
* **core:** shared host canonicalization to close loopback evasions ([40913f1](https://github.com/Saba-Var/claude-ward/commit/40913f162376b1ead434875a85bdfd68741a1992))
* credentials tamper detection rule ([1267b2c](https://github.com/Saba-Var/claude-ward/commit/1267b2c8bd831245366b21edfdbd07488ce8cff8))
* debounced chokidar watcher over tracked files ([8eca5c9](https://github.com/Saba-Var/claude-ward/commit/8eca5c9c7d14e5c85938541a8300337200b1750c))
* define core state, change, and finding types ([c1074db](https://github.com/Saba-Var/claude-ward/commit/c1074dbac611bcea3b2a1edeaeb741c554366ca8))
* desktop notifications with terminal fallback ([6d26fe4](https://github.com/Saba-Var/claude-ward/commit/6d26fe43371aa97e18b65004cac83a9709ec36d6))
* env redirect detection rule ([715c4bf](https://github.com/Saba-Var/claude-ward/commit/715c4bffc097d4ad3c825ec91b8a02ae6e19f6ab))
* expose core engine as library exports ([421fd29](https://github.com/Saba-Var/claude-ward/commit/421fd295bd8b77bdf81de0d4c7efda11d1de73be))
* hook detection rules (sessionstart injection, new/modified hooks) ([a494902](https://github.com/Saba-Var/claude-ward/commit/a494902175b676f4325bac914535fa26613fbdab))
* init (baseline + allowlist) and approve commands ([d10fe50](https://github.com/Saba-Var/claude-ward/commit/d10fe50282364c4b40fc0a3f8633f582febe7329))
* install/uninstall SessionStart hook with auto re-baseline ([a731804](https://github.com/Saba-Var/claude-ward/commit/a7318049104ceeb92efecec612aa411eecb45c1a))
* **io:** atomic state writes, owner-only perms, baseline validation ([8842838](https://github.com/Saba-Var/claude-ward/commit/88428380280af1b4d9022b31a85b253810f068a2))
* marketplace/plugin source detection rule ([f41cc0a](https://github.com/Saba-Var/claude-ward/commit/f41cc0ae786c53d31d19efeae412f8c6cb0cae16))
* mcp detection rules (localhost repoint, remote exec, host allowlist) ([f0b0940](https://github.com/Saba-Var/claude-ward/commit/f0b094061da4ccd59ca2275d59463480f0997dc6))
* normalize raw claude config into tracked state ([0b92b16](https://github.com/Saba-Var/claude-ward/commit/0b92b1620df9bf6ab183c3da19cc5632527b3d43))
* obfuscation detection rule (base64/hex blobs, homoglyphs) ([1fbe7ef](https://github.com/Saba-Var/claude-ward/commit/1fbe7ef9f500f951f681be806d133d1ca0b970b1))
* persist baseline and ward config under ~/.claude-ward ([9ed503a](https://github.com/Saba-Var/claude-ward/commit/9ed503ad6263d3864dfaa3839accae1d2e6073cf))
* pure diff engine with applyChange ([ad6165a](https://github.com/Saba-Var/claude-ward/commit/ad6165a34bb00e2bc6fa7cf0f7c474d58166bafb))
* resolve config and state file paths ([8a44e34](https://github.com/Saba-Var/claude-ward/commit/8a44e34ca8687594dfe37e0e7a8f17095dc8ce7b))
* rule orchestrator with INFO fallback and fixture coverage ([2efb748](https://github.com/Saba-Var/claude-ward/commit/2efb7483ddd6b308fa34cd030c830b0ebc46feb2))
* **rules:** broaden detection coverage against selected-on-purpose evasions ([eff7e96](https://github.com/Saba-Var/claude-ward/commit/eff7e963c9ade9be602ff72aa760460bd766a93c))
* safe json/file reading with explicit result states ([a47aefb](https://github.com/Saba-Var/claude-ward/commit/a47aefbb32ab55080ba26ae432c092ebe75ed51c))
* scan, diff, and status commands ([3be8d9e](https://github.com/Saba-Var/claude-ward/commit/3be8d9e513f04a61bae3e237be3944e83a41e1d4))
* terminal report formatting and severity summary ([68427f5](https://github.com/Saba-Var/claude-ward/commit/68427f5aabf937dab83fd5c622286a2879be22a2))
* wire commander cli and live watch command ([06dcaa3](https://github.com/Saba-Var/claude-ward/commit/06dcaa3790d63c191f512d3f494b8485b4bb1b07))


### Bug Fixes

* **commands:** make install-hook a safe, surgical write ([4f44274](https://github.com/Saba-Var/claude-ward/commit/4f442743625c0350d5b27eb9d4716ddb351d25f5))
* **core:** injective diff keys to prevent collision-based evasion ([2d6d9f2](https://github.com/Saba-Var/claude-ward/commit/2d6d9f2d8b7431f474ec224f3246bf47b4bd08e2))
* **core:** strip URL secrets before storage, mask obfuscation blobs ([3a4625e](https://github.com/Saba-Var/claude-ward/commit/3a4625e0669c9f7253fdcadd21da1e308677df97))
* guard against undefined after in SessionStart rule ([0ecd474](https://github.com/Saba-Var/claude-ward/commit/0ecd474a8054ab20ef0c0c41772fce07458ffda1))
* harden mcp rules — IPv6 loopback, more shells, base64 -D ([e02e660](https://github.com/Saba-Var/claude-ward/commit/e02e660a0992425ced30706e598360f4dfd18215))
* **io:** harden the watcher and notifier against silent failure ([8980688](https://github.com/Saba-Var/claude-ward/commit/8980688d37646e70581b8a06867890598611850e))
* **io:** treat an unreadable credential file as tamper, surface warnings ([861a693](https://github.com/Saba-Var/claude-ward/commit/861a6939a7f7dcea43f2d526a6048df0cf9625b5))
* never persist raw secret values in the baseline ([b8b0df3](https://github.com/Saba-Var/claude-ward/commit/b8b0df31091113d9c44972e96fdfb7c51c070af6))

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
