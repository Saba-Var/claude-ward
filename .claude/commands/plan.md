---
description: Turn an approved claude-ward spec into a step-by-step implementation plan
argument-hint: [path to spec, or topic]
---

Turn this approved spec into an implementation plan: $ARGUMENTS

If no path is given, use the most recent spec in `docs/superpowers/specs/`.

Use the `superpowers:writing-plans` skill (if available). The plan must assume the
implementer has no prior context: exact file paths, the actual test and code for each
step, exact commands with expected output, and bite-sized TDD steps (write failing test
-> run -> minimal code -> run -> commit). No placeholders, no "similar to above".

Build the rule engine and its tests first (green) before watcher/CLI/notification work,
then repo hygiene last. Keep every step inside claude-ward's hard constraints.

Save to `docs/superpowers/plans/<today>-<feature>.md`. After writing, self-review for
spec coverage, placeholders, and type consistency, then offer execution via `/build`.
