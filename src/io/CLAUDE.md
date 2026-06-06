# src/io - the edge zone

All filesystem, notification, and process side effects live here. The core stays pure;
this layer does the dirty work.

- **Read-only on monitored files.** Reading `~/.claude.json`, `~/.claude/settings*.json`,
  and the credential file is fine. Writing to them is not. The single exception is
  `install-hook` / `uninstall-hook` editing `~/.claude/settings.json`, and only after
  explicit user consent. Writes for claude-ward's own state go to `~/.claude-ward/` only.
- **Never read secret contents into the baseline.** The credential file is read as raw
  bytes and reduced to `{ present, hash, mode, size }` in `snapshot.ts`. Do not
  `JSON.parse` it or keep its contents.
- **Robust reads.** Use the `ReadResult` discriminated union (`ok` / `missing` /
  `malformed` / `denied`). Missing and denied files are normal - never throw.
- **Notifier must never throw.** `notify.ts` dynamically imports `node-notifier` inside
  try/catch and falls back to stderr. A missing notification backend must not break a
  scan.
- **Partial writes.** The watcher uses chokidar `awaitWriteFinish` plus a debounce so a
  half-written JSON file does not trigger a false reading.

When in doubt, ask: could this code modify a file Claude Code owns, or persist a secret?
If yes, it does not belong here in that form.
