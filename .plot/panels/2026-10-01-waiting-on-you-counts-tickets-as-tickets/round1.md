# Round 1 — moderation

Subject: `docs/plans/2026-10-01-waiting-on-you-counts-tickets-as-tickets.md` at `63893100`. Jurors: `round1-skeptic.md`, `round1-operator.md`, `round1-testability.md`. Gate: all three committed (`plot-panel.mjs check`). Reconcile: `divided amend=skeptic,operator proceed=testability`.

**How the panel ran.** One agent wrote all three verdicts in sequence, because the session that ran it could not start subagents. The lenses are therefore not independent readings, and that limits what agreement between them proves.

## Evidence each juror used

- **Skeptic: executed.** A scratch vitest file against the shipped `sectionTally` at `63893100`: 3 plans, 6 slices and 15 issues give `{"plans":18,"slices":21}`, which is #1146 exactly; one plan-less branch row plus 2 issues gives `(3)`; no rows give `(0)`, which confirms the stopped-agent claim the plan marked as not reproduced.
- **Operator: read.** The label rule against the headers read on the board on 2026-10-01.
- **Testability: read.** `sections.ts`, the call site, the tally tests and the browser-test count pin.

## Agreed

- The diagnosis is right, and `tallyLabel` as a pure function is the right shape (all three).
- Draft plans count as plans; `draftPlanRows` drops plans that have rows, so the arithmetic holds (operator, testability).
- No browser test is added, so `EXPECTED_TESTS` does not move; the plan should say so (testability, unopposed).

## Disagreement, named

**Whether two label cases block the design or are found by the gates.**

- **Skeptic and operator (amend):** a plan-less branch row counts as `1 plan` under the new rule, so one branch row plus two tickets reads `(1 plan · 1 slice · 2 tickets)`. That is the wording `a-plan-less-row-is-not-a-plan` removed from NOT STARTED. Separately, the rule keeps `(N)` only with no extras, so an ungrouped section with one ticket prints equal plan and slice figures side by side. Both are words a person reads every day, so the plan must decide them before a worker does.
- **Testability (proceed):** the browser test that pins `(3)` (`unplanned-issues.browser.test.ts:328`) and the eight unit call sites of the old signature fail `test:board` and `typecheck` at once, so a worker meets both.

The gates catch the omissions, but they do not choose the wording; a worker fixing a red test picks a label nobody decided. That is why the amendment carries both cases.

## Shared blind spot

No lens asked how screen readers or narrow widths render a four-figure header, and none checked the `not sprint-filtered` suffix, which repeats the ticket and stopped-agent counts in different words beside the new figures.

## What an amendment changes

1. A plan-less branch row counts under its own unit (for example `branch`) or under no plan figure, with a unit case for one branch row plus two tickets.
2. The slice figure prints only where it differs from the plan figure, whatever the extras.
3. The test list names `unplanned-issues.browser.test.ts:328` as rewritten, the eight unit call sites, and states that `EXPECTED_TESTS` is unchanged.
4. One unit test asserts the invariant: visible top-level lines equal the sum of the figures with every head collapsed.
