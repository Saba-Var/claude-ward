# claude-ward

A tripwire that watches Claude Code's local config and tells you when something tampers with it.

[![CI](https://github.com/Saba-Var/claude-ward/actions/workflows/ci.yml/badge.svg)](https://github.com/Saba-Var/claude-ward/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/claude-ward.svg)](https://www.npmjs.com/package/claude-ward)
[![license](https://img.shields.io/npm/l/claude-ward.svg)](./LICENSE)

<!-- DEMO: replace with an asciinema cast or GIF of `init` then a `scan` catching a localhost repoint -->

## The problem

Claude Code keeps its configuration in plaintext. `~/.claude.json` holds the MCP server
endpoints it talks to and the OAuth tokens for connected services. `~/.claude/settings.json`
holds hooks, plugins, marketplace sources, and permissions. Nothing about those files is
signed or checked — whatever is on disk at startup is trusted.

That has already been abused.

In April 2026, Mitiga documented an attack where a malicious npm package's postinstall
script silently rewrites `~/.claude.json`, repointing MCP traffic through a proxy the
attacker controls and capturing the OAuth tokens as they pass through. Anthropic reviewed
the report and classified it as out of scope — the user "consented" by installing the
package — so there is no fix coming from the vendor.
(<https://www.mitiga.io/blog/claude-code-mcp-token-theft-mitm>)

Around the same time, the Shai-Hulud and "Mini" Shai-Hulud npm worms spread across
hundreds of packages. Among other things they read `~/.claude.json` and MCP configs to
harvest credentials, and they write a `SessionStart` hook into `~/.claude/settings.json`
so their code runs again every time a Claude Code session starts.

The reason these go unnoticed is mundane: to a firewall or an EDR agent, "a program wrote
a JSON file in the home directory" is the most ordinary thing in the world. There is no
signal there to alert on. claude-ward is the missing piece — a local tripwire that knows
what those specific files are supposed to contain and tells you when they change in a way
that matches a known attack.

## Quickstart

```sh
# Take a baseline of your current (trusted) config:
npx claude-ward init

# Wire a check into Claude Code's own startup so every session is scanned:
npx claude-ward install-hook
```

`init` records what your config looks like right now and treats it as the known-good
state. `install-hook` adds a `SessionStart` hook that runs `claude-ward scan` each time
you start Claude Code; if anything has changed in a way that looks suspicious, the scan
exits non-zero and prints what it found.

You can also check on demand:

```sh
claude-ward scan      # one-shot check, non-zero exit on HIGH/CRITICAL findings
claude-ward diff      # show every change against the baseline
claude-ward watch     # stay running and alert as files change
claude-ward status    # summarize the current baseline
```

When a change is legitimate (you added an MCP server on purpose, say), accept it:

```sh
claude-ward approve --all          # trust everything currently differing
claude-ward approve <finding-id>   # trust one specific change
```

The short alias `cward` works anywhere `claude-ward` does.

## How detection works

There are four steps, and only the last one makes judgements.

1. **Snapshot.** claude-ward reads `~/.claude.json`, `~/.claude/settings.json`,
   `~/.claude/settings.local.json`, and `~/.claude/.credentials.json`, and pulls out the
   fields that matter: MCP servers (command, args, url, env), hooks of every event type,
   enabled plugins, marketplace sources, permissions, and environment variables. The
   credential file is never read into memory beyond computing a hash of it.
2. **Diff.** It compares that snapshot against the baseline from `init` and produces a
   list of added, removed, and modified items.
3. **Classify.** Each change runs through a set of deterministic rules — no model, no
   network, same input always gives the same output — which assign a severity.
4. **Report.** Findings are printed, a desktop notification fires for the serious ones,
   and the exit code reflects the worst severity found.

The rules, briefly:

- **Critical** — an MCP endpoint repointed to localhost (the Mitiga signature); an MCP
  command that pipes a download into a shell or decodes and runs a payload
  (`curl … | sh`, `base64 -d`, `eval`, and similar); a newly injected `SessionStart` hook
  (the Shai-Hulud persistence signature).
- **High** — an MCP host you haven't allowlisted; any other new or modified hook; an
  `ANTHROPIC_BASE_URL` or OTEL endpoint pointed somewhere unexpected; the credential file
  changing unexpectedly or becoming readable by other users; obfuscated-looking values
  (long base64/hex blobs, non-ASCII lookalike characters in a URL).
- **Medium** — a new marketplace source, a plugin from a marketplace you don't know, or a
  broadened permission allow-list (a bare `Bash`, a `Bash(*)`, a wildcard scope).
- **Info** — every other tracked change, so nothing slips by silently.

## Local only, no telemetry

This is a security tool, so its own behavior should be boring and verifiable:

- It is **read-only** on every file it monitors. The single exception is `install-hook` /
  `uninstall-hook`, which edits `~/.claude/settings.json` only after you confirm, and then
  re-baselines that one edit so it never flags itself.
- It **never stores your secrets.** The credential file is recorded as a SHA-256 hash plus
  its mode and size — enough to notice a change, not enough to reconstruct anything. Token
  and API-key values in `env` blocks are hashed the same way before they touch the
  baseline; only the URL-valued endpoint keys it actually inspects are kept verbatim.
- It makes **zero network calls** and sends **no telemetry**. Everything runs on your
  machine. Its own state lives in `~/.claude-ward/`, separate from the files it watches.

## Limitations — what this does not protect against

A tripwire detects; it does not prevent. Be clear about the edges:

- It **alerts, it does not block or roll back.** By the time you see a finding, the write
  has already happened. claude-ward shortens the time-to-detection; it is not a sandbox.
- It **trusts the baseline you take at `init`.** If your machine was already compromised
  when you ran it, the malicious state becomes the "known-good" reference. Take the
  baseline on a machine you trust.
- It only sees changes **while it runs.** A one-shot `scan` catches what changed since the
  last baseline; continuous coverage means wiring the `SessionStart` hook or leaving
  `watch` running. Tampering that happens and is reverted between checks can be missed.
- The signatures are **heuristics.** They can be evaded — a download piped to a shell
  claude-ward doesn't list, a localhost form it doesn't normalize, a lookalike host that
  parses as plain ASCII — and they can be noisy. Host matching is exact, with no subdomain
  wildcards, so a new subdomain of a host you allowlisted is still reported. A long,
  legitimate base64 value can read as "obfuscated." This is deliberate: for a tripwire,
  a false positive you dismiss is cheaper than a false negative you never see.
- It watches a **fixed set of files**. Tampering through a path it doesn't track won't be
  seen. New attack signatures are the most welcome kind of contribution — see below.

## How it compares

Generic file-integrity tools (Tripwire, AIDE, `git` hooks over a dotfiles repo) alert on
any byte that changes. That's useful, but it can't tell a routine settings edit from an
MCP endpoint being repointed at a proxy, and it produces noise you learn to ignore.
claude-ward parses the files it watches and classifies changes by what they mean for
Claude Code specifically, which is what lets it call out the Mitiga and Shai-Hulud
patterns by name.

[Claude-Defender](https://github.com/) is the closest existing project, but it targets a
different product: the Claude **Desktop** GUI app, whose MCP configuration it inspects
through an overlay. claude-ward targets Claude **Code**, the CLI — it guards
`~/.claude.json`, `~/.claude/settings.json`, the hooks, and the credential file, installs
as an npm package, and integrates with Claude Code's own hook system. If you use both the
desktop app and the CLI, the two are complementary rather than competing.

## Why I built this

<!-- TODO(author): make this yours — a sentence or two on the moment you realized nothing
     was watching these files, and why a local tripwire was the answer you wanted. -->

## Contributing

New detection signatures, especially ones backed by a real incident, are the most valuable
contributions. See [CONTRIBUTING.md](./CONTRIBUTING.md) for how to run the project and what
a good signature PR looks like. Security reports go through [SECURITY.md](./SECURITY.md).

## License

MIT. See [LICENSE](./LICENSE).

---

Not affiliated with, endorsed by, or sponsored by Anthropic.
