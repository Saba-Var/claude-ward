# test - Vitest suite

The core is pure, so most tests call `collect` / `diff` / a rule directly and assert on
the result. No mocking framework needed for those.

- **TDD.** Write the failing test first, run it and watch it fail for the right reason,
  then write the minimal code to pass. Commit per green step.
- **No `as any`.** The lint config bans explicit `any`. Build fixtures as typed object
  literals and use `satisfies TrackedState` (or the relevant type) so the compiler
  checks their shape.
- **Assert the specifics.** For a rule test, assert the exact `severity` and `ruleId`,
  not just that something was returned. Cover a positive case and a negative case.
- **Deterministic.** No real filesystem, clock, or network in core tests. Pass any time
  value in explicitly. Tests must pass the same way every run and in any order.
- Run a single file with `npx vitest run test/<name>.test.ts`.
