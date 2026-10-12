# Round 1 — skeptic

Subject: `docs/plans/2026-10-01-waiting-on-you-counts-tickets-as-tickets.md` at `63893100`. Lens: measure `sectionTally` and every caller against origin/main.

Position: amend

## What I ran

A scratch vitest file in a detached worktree at `63893100`, calling the shipped `sectionTally` (removed afterwards with `trash`):

| Input | Result |
|---|---|
| 3 plans × 2 slices, `issueCount` 15, section `waiting-on-you` | `{"plans":18,"slices":21,"differ":true}` |
| 1 plan-less branch row, `issueCount` 2 | `{"plans":3,"slices":3,"differ":false}` → renders `(3)` |
| no rows, `issueCount` 0 (a section holding only a stopped agent) | `{"plans":0,"slices":0,"differ":false}` → renders `(0)` |

The first row reproduces #1146 exactly. The third confirms the plan's stopped-agent claim, which the plan marked as read and not reproduced: `countOf` (`AgentList.tsx:1033-1037`) includes `brokenRows`, so `countOf + issues.length > 0` (`:1186`) holds and the label prints `(0)` above one row.

## What the plan gets wrong or leaves out

1. **A plan-less branch row becomes "1 plan".** The second case is what `unplanned-issues.browser.test.ts:328-338` pins (`(3)` for one branch row and two issues). Under the plan's rule the row counts as a plan line, `plans === slices` no longer applies because tickets are non-zero, and the label reads `(1 plan · 1 slice · 2 tickets)`. A plan-less row is not a plan; `a-plan-less-row-is-not-a-plan` was fixed for NOT STARTED and this reintroduces the wording in WAITING ON YOU.
2. **That browser test is not named.** The plan names only `a-plan-less-row-is-not-a-plan.browser.test.ts`, whose fixture is NOT STARTED and carries no tickets. The test that will fail is `unplanned-issues.browser.test.ts:328` (*counts issue rows in the section tally*), and its assertion must be rewritten, not "checked".
3. **The signature change has eight unit call sites.** `agent-list.test.ts:411, 3855, 3864, 3881, 3898, 3920, 3927, 3929` pass a number as the fourth argument. The plan names one of them.

The diagnosis is right and the approach is sound; the label rule needs a case for plan-less rows and the test list needs the real failing test.
