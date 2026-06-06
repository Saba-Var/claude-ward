# src/core/rules - the detection engine

Each rule is a pure function `(change: Change, cfg: WardConfig) => Finding | null`.

- **Guard on `change.category` first.** A rule returns `null` for any change it does not
  own, so rules never cross-fire. Check the category (and often `change.kind`) before
  doing anything else.
- **First match wins.** `index.ts` holds the `RULES` array ordered by severity
  (CRITICAL first). `runRules` returns the first non-null finding per change, falling
  back to an INFO finding. When you add a rule, insert it at the right severity position
  and keep the comment accurate.
- **Stable IDs.** `findingId(ruleId, change)` hashes the rule id and the change's
  injective `key` (set by `diff()`, falling back to the readable `path`), so two
  distinct entities can never collide on an id. Use a dotted `ruleId` namespace (e.g.
  `mcp.localhost-repoint`).
- **Never leak secrets.** A finding's `title`/`detail` is shown to the user and may be
  logged. Never put a raw token, credential, or redacted-but-reversible value in them.
- **Severities:** CRITICAL = active compromise signature (localhost MCP repoint,
  pipe-to-shell, injected SessionStart hook). HIGH = strong risk (unknown host, hook
  change, credential tamper, obfuscation). MEDIUM = trust broadening (new marketplace,
  broadened permission). INFO = any other tracked change.

Every rule needs a unit test with both a positive case (fires, correct severity) and a
negative case (stays silent). Add an edge case where the spec calls for one.
