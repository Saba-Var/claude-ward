---
description: Brainstorm an idea into a reviewed design spec for claude-ward
argument-hint: [what you want to build]
---

Start spec-driven design for: $ARGUMENTS

Use the `superpowers:brainstorming` skill (if available) to turn this into a design
through one-question-at-a-time dialogue. Otherwise, do it by hand: explore the relevant
code first, propose 2-3 approaches with a recommendation, then present the design in
sections and get approval as you go.

When the design is settled, write it to
`docs/superpowers/specs/<today>-<topic>-design.md`, do a self-review for placeholders,
contradictions, and ambiguity, then ask me to review the written spec before moving on.

Respect claude-ward's hard constraints throughout (read-only on monitored files, never
store secret values, zero network in core, state isolated in `~/.claude-ward/`). Do not
write any implementation code in this phase.
