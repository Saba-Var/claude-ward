---
description: Execute a claude-ward plan task-by-task with implementer and reviewer subagents
argument-hint: [path to plan]
---

Execute this implementation plan: $ARGUMENTS

If no path is given, use the most recent plan in `docs/superpowers/plans/`.

Use the `superpowers:subagent-driven-development` skill (if available). Work on a branch,
not `main`. For each task, in order:

1. Dispatch the `implementer` subagent with the full task text and the context it needs
   (do not make it read the plan file).
2. When it reports `DONE`, dispatch the `reviewer` subagent. Fix any blocking issues by
   re-dispatching the implementer, then re-review. Do not move on with open issues.
3. Mark the task complete and continue. Run continuously - do not stop to check in
   between tasks unless you are genuinely blocked.

Every task must keep claude-ward's hard constraints intact: read-only on monitored
files, never persist secret values, pure deterministic core, zero network. After the
last task, do a final whole-diff review, then use
`superpowers:finishing-a-development-branch`.
