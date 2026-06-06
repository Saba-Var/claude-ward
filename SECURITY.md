# Security

## Threat model

claude-ward exists to shorten the time between someone tampering with Claude Code's local
configuration and you finding out. It is a detection tool, not a prevention or remediation
tool.

### What it is designed to catch

After you establish a baseline with `init`, claude-ward detects changes to the files it
tracks that match known attack patterns:

- An MCP endpoint in `~/.claude.json` repointed at localhost or another address - the
  man-in-the-middle proxy technique documented by Mitiga.
- An MCP server whose `command`/`args` were changed to fetch and execute remote code
  (pipe-to-shell, `base64 -d`, `eval`).
- A `SessionStart` (or other) hook injected into `~/.claude/settings.json` for
  persistence - the Shai-Hulud technique.
- MCP hosts and traffic-redirecting environment variables (`ANTHROPIC_BASE_URL`,
  `OTEL_EXPORTER_OTLP_ENDPOINT`) pointed at hosts you have not allowlisted.
- The OAuth credential file changing unexpectedly, or its permissions loosening to be
  readable by other users.
- New marketplace sources, plugins from unknown marketplaces, and broadened permission
  allow-lists.

### What it explicitly does not protect against

- **Anything that happened before `init`.** The baseline is your declaration of trust. If
  the machine was already compromised, the compromise is what gets trusted. Take the
  baseline on a clean machine.
- **An attacker who can also write to claude-ward's own state** (`~/.claude-ward/`) or
  replace the installed binary. If an adversary can edit the baseline, they can make
  malicious config look unchanged. Protect `~/.claude-ward/` with the same care as the
  rest of your home directory.
- **Tampering while claude-ward is not running.** A one-shot `scan` only compares against
  the last baseline. Continuous detection requires the `SessionStart` hook or a running
  `watch`. A change made and reverted between checks can go unseen.
- **Root- or kernel-level attackers.** Anyone with that level of access can defeat a
  user-space file watcher.
- **Evasion of the heuristics.** The signatures are pattern matches. A determined attacker
  can craft a payload that avoids them. claude-ward raises the cost of a quiet compromise;
  it does not make one impossible.

## Secrets

claude-ward never stores secret values. The credential file is recorded only as a SHA-256
hash plus its file mode and size. Token and API-key values found in `env` blocks are
hashed before they reach the baseline. The baseline in `~/.claude-ward/baseline.json`
contains enough to detect change and not enough to leak a credential.

## claude-ward's own supply chain

The irony of a tool that defends against npm supply-chain attacks shipping as an npm
package is not lost on us. Mitigations: dependencies are kept few and are pinned by a
committed lockfile; the core (snapshot, diff, rules) makes no network calls. The one
heavier transitive dependency is `node-notifier` (desktop notifications); if you would
rather not pull it in, the notifier is optional at runtime - claude-ward falls back to
terminal output and still functions fully without a working notification backend.

## Reporting a vulnerability

Please do not open a public issue for a security vulnerability in claude-ward itself.

Report it privately to **vartasashvili94@gmail.com** with steps to reproduce and the
version (`claude-ward --version`). You can expect an acknowledgement within a few days. If
a fix is warranted, it will be released and the report credited unless you prefer
otherwise.

For a vulnerability in Claude Code or the Anthropic platform, report it to Anthropic
directly - claude-ward is an independent project and cannot act on those.
