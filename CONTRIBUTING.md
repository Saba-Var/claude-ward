# Contributing

Thanks for considering a contribution. The most useful ones are new detection signatures —
read to the end for what those look like.

## Running the project

Requires Node 20 or newer.

```sh
npm install
npm test          # vitest
npm run typecheck # tsc --noEmit
npm run lint      # eslint + prettier --check
npm run build     # tsup -> dist/
```

`npm run format` applies Prettier if the lint check complains about style.

## How the code is laid out

The detection logic is pure and lives in `src/core`:

- `collect.ts` turns raw parsed JSON into a normalized `TrackedState`.
- `diff.ts` compares two states into a list of changes.
- `rules/` holds one file per rule family, plus `rules/index.ts` which orders the rules and
  runs them. Each rule is a pure function `(change, config) => Finding | null`.

Everything that touches the filesystem, the network of notification backends, or the
terminal lives in `src/io` and `src/commands`. Keep the core free of side effects — that's
what lets the rules be tested against fixtures with no mocks.

## Adding a detection signature

This is the contribution we most want. A good signature PR:

1. Adds or extends a rule in `src/core/rules/`. If it's a new family, add a new file and
   register it in the ordered list in `rules/index.ts` (order matters — the first matching
   rule wins per change, so place it by severity).
2. Ships with a unit test for the rule and a fixture in `test/fixtures/states.ts` that the
   end-to-end engine test exercises. A signature without a test won't be merged, because we
   can't keep it from regressing.
3. Explains the threat in the PR description, ideally with a link to a real incident or
   writeup. Say what severity you chose and why.

Keep rules deterministic: no network, no clock, no randomness. Same input, same finding,
every time.

## Commit messages and PRs

Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `chore:`, `style:`). Write them
like a human explaining the change to a colleague — what and why, not a restatement of the
diff.

Before opening a PR, run `npm test && npm run lint && npm run typecheck` and update
`CHANGELOG.md` under the `Unreleased` heading.

## Reporting bugs and requesting signatures

Use the issue templates. For a suspected vulnerability in claude-ward itself, follow
[SECURITY.md](./SECURITY.md) instead of opening a public issue.
