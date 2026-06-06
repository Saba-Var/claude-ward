# claude-ward

A read-only tripwire that watches Claude Code's local config (`~/.claude.json`,
`~/.claude/settings.json`, hooks, the OAuth credential file) and reports suspicious
changes. It is a security tool, so its own behavior must stay boring and verifiable.

## Dev commands

| Command              | What it does                |
| -------------------- | --------------------------- |
| `npm test`           | Run the Vitest suite once   |
| `npm run test:watch` | Vitest in watch mode        |
| `npm run typecheck`  | `tsc --noEmit` (strict)     |
| `npm run lint`       | ESLint + `prettier --check` |
| `npm run format`     | `prettier --write`          |
| `npm run build`      | Bundle to ESM with tsup     |

A husky `pre-commit` hook runs `lint-staged` (eslint `--fix` + prettier) on staged
files. Do not bypass it with `--no-verify`.

## Architecture

A pure core with thin I/O edges. Data flows one direction:

```
io/read (fs) -> io/snapshot -> core/collect (pure) -> core/diff (pure) -> core/rules (pure) -> io/report + io/notify + exit code
```

- `src/core/` - pure, deterministic, fully unit-tested. No I/O, no network, no clock.
- `src/io/` - every filesystem and notification side effect. Read-only on watched files.
- `src/commands/` - one file per CLI command; share an `evaluate()` helper.
- `src/cli.ts` - commander wiring. `src/index.ts` - library exports.

TypeScript strict, ESM (`NodeNext`), Node 20+. Use `.js` extensions on relative
imports in source. See the directory-level `CLAUDE.md` files in `src/core/`,
`src/core/rules/`, `src/io/`, and `test/` for rules that apply only there.

## Hard constraints (trust-critical - never weaken these)

1. **Read-only on every monitored file.** The only write is `install-hook` /
   `uninstall-hook`, and only after explicit user consent.
2. **Never store secret values.** The credential file and any token/API-key env value
   are recorded as a SHA-256 hash plus metadata (mode, size), never in plaintext. Only
   the URL-valued endpoint keys the rules must inspect are kept verbatim.
3. **Zero network calls and zero telemetry in the core.** Everything runs locally.
4. **State isolation.** claude-ward's own state lives in `~/.claude-ward/`, separate
   from the files it watches.
5. **Always degrade gracefully.** If the desktop notifier is unavailable, fall back to
   terminal output. The notifier must never throw.

Any change that touches these gets called out explicitly in review.

## Spec-driven development

Non-trivial work goes through phases. Use the slash commands, which wrap the
superpowers skills:

1. `/spec <idea>` - brainstorm, then write a design to `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`. Get it reviewed before planning.
2. `/plan <spec>` - turn the approved spec into a step-by-step plan in `docs/superpowers/plans/`.
3. `/build <plan>` - execute the plan task-by-task with the `implementer` and `reviewer`
   subagents, test-first, committing per task.

TDD throughout: write the failing test, watch it fail, write the minimal code, watch it
pass, commit. The rule engine is pure and must stay fully unit-tested.

## Conventions

- Conventional commits, written like a person (`feat:`, `fix:`, `chore:`, `docs:`).
  Commit or push only when asked; branch before working off `main`.
- DRY, YAGNI. Comments only where the code is not self-explanatory.
- Match the style of surrounding code.

## Voice (docs, comments, output strings, commit bodies)

This project must not read as machine-generated.

- Use a regular hyphen `-`, never an em-dash `—` or en-dash `–`.
- Banned words: powerful, robust, seamless, comprehensive, cutting-edge, blazing-fast,
  effortless, game-changing, leverage, delve, unlock, supercharge.
- Avoid the "not just X - it's Y" construction. Vary sentence length.
- Claims stay honest and modest. At most one or two emoji, usually none.
