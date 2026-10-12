# Round 2 — skeptic

Subject: `docs/plans/2026-10-01-waiting-on-you-counts-tickets-as-tickets.md` at `dbd9f97a`. Lens: run the amended rules against the shipped `sectionTally` in a scratch copy. Round 1 asked for a plan-less-row case and the real failing tests.

Position: proceed

## What I ran

A scratch vitest file in a detached worktree at `dbd9f97a` (removed afterwards with `trash`). It prototypes the amendment on top of the shipped `sectionTally`: rows with a plan go through `sectionTally` for `plans` and `slices`, the plan-less bucket through it again for `branches`, and the label follows the plan's rules.

| Case | Label |
|---|---|
| 3 plans × 2 slices, 15 tickets | `(3 plans · 6 slices · 15 tickets)` |
| 15 tickets | `(15 tickets)` |
| 1 stopped agent | `(1 stopped agent)` |
| 1 plan-less branch + 2 tickets | `(1 branch · 2 tickets)` |
| NOT STARTED: 1 plan over 2 slices + 2 plan-less rows | `(1 plan · 2 slices · 2 branches)` |
| 2 ungrouped plan lines + 1 ticket | `(2 plans · 1 ticket)` |
| QUIET empty | `(0)` |
| DONE, 2 plans, 1 slice each | `(2)` |

Every example in the plan reproduces. `branches` from `sectionTally` over the plan-less bucket equals that bucket's row count (2 for 2), so the plan's "each renders as one line" holds.

## Round 1, answered

- The plan-less case is decided and consistent with #973's thesis; `a-plan-less-row-is-not-a-plan.browser.test.ts:108` is named as rewritten.
- `unplanned-issues.browser.test.ts:328` and the eight unit call sites are named.

## Residuals, not blocking

1. **One plan whose two rows carry no slice reads `(2 plans · 1 ticket)`.** The plan states this as the unchanged fold rule under "What this does NOT do", so it is a declared limit, not a gap.
2. **A section holding only a draft plan reads `(1 plan)`, while a section of one grouped plan reads `(1)`.** The bare form needs `plans === slices`, and a draft has no slice. Both are true; a worker should keep it and not special-case it.
