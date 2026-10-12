# Round 1 — skeptic (reproduces against origin/main)

Subject: `docs/plans/2026-10-01-an-open-board-follows-a-sprint-change.md` at `63893100`.

Position: amend

## What I ran

A scratch browser test (`juror-1145-repro.browser.test.ts`, never committed) against the artifact built from `63893100` (`pnpm build:board` produced no diff). It uses the catalogue's `route` option with a mutable flag: the first `/api/fleet` carries `sprint-a` active with member row `bug/a`; the test checks `[data-sprint-toggle="sprint-a"]`; the next poll carries `sprint-b` active with rows `bug/a` and `bug/b`.

Observed: `toggleB=false hidden=2 shown=[]`. The defect reproduces on origin/main, and the cause the plan names (`AgentList.tsx:524` in-memory `Set`, `:570` filtering on `size`, the membership map built from active sprints only) is the cause.

## Findings

1. **The plan understates the symptom.** It says the new sprint's rows are hidden. Measured: every plan row is hidden, including `bug/a`, the closed sprint's own member, because `slugPassesSprintFilter` finds `sprint-a` in no membership entry once it leaves `fleet.sprints`. The browser test must carry a row of the closed sprint too and assert it is shown.
2. **The test shape works.** The catalogue's `route` option with a flag is the mechanism; name it in the slice so the implementer does not build a second stub server. Assert `data-sprint-hidden` is absent (or `0`), not only the header text.
3. **The cause correction is right.** `App.tsx:156` is the Plans tab's URL filter and is not involved.

## Commitment

Amend: findings 1 and 2 change the test the slice ships; the design stands.
