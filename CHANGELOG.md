# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
