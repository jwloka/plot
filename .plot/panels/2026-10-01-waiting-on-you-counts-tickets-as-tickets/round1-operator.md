# Round 1 — operator

Subject: `docs/plans/2026-10-01-waiting-on-you-counts-tickets-as-tickets.md` at `63893100`. Lens: the operator reading every section header on the board.

Position: amend

## What I looked at

The plan's label rule against the headers I read on 2026-10-01 (`WAITING ON YOU (18 plans · 21 slices)` over 3 plans, 6 slices and 15 tickets; `(21 plans · 24 slices)` with 18 tickets), and the rule's output for the shapes WAITING ON YOU actually holds. Read, not executed.

## Findings

1. **The redundancy rule covers only the no-extras case.** `(N)` is kept when there are only plan lines and `plans === slices`. With one ticket added, every ungrouped section prints both figures even when they are equal: `(2 plans · 2 slices · 1 ticket)`. The header I read most often is WAITING ON YOU with tickets, so this is the common case, not the edge. Print the slice figure only where it differs from the plan figure.
2. **A branch with no plan must not read as a plan.** A PR row for a branch no plan names sits in WAITING ON YOU every day (a release PR, a sprint PR). Counting it under `plans` puts a wrong noun in front of me. It needs its own unit (for example `branch`), or it counts as a line under a neutral word.
3. **The order is right.** Plans, slices, tickets, stopped agents matches the render order of the rows, so the figures read top to bottom.
4. **Draft plans are counted as plans,** which is correct: they render as plan lines. The three Draft plans of this sprint show as `PLAN` heads with their slices, so `draftRows` is empty for them (`draftPlanRows` drops plans that have rows), and the plan's arithmetic holds.

The change is the right one. It needs the two label cases above before a worker implements it, because both are wording a person reads every day.
