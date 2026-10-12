# Round 2 — moderation

Subject: `docs/plans/2026-10-01-waiting-on-you-counts-tickets-as-tickets.md` at `dbd9f97a`, amended after round 1. Jurors: `round2-skeptic.md`, `round2-operator.md`, `round2-testability.md`. Gate: all three committed (`plot-panel.mjs check`). Reconcile: `divided proceed=skeptic,operator amend=testability`.

**How the panel ran.** As in round 1, one agent wrote the three verdicts in sequence. The session that ran the panel is a fork, and a fork may not start subagents, so the three lenses are not independent readings. Agreement between them is weaker evidence than three separate jurors.

## Evidence each juror used

- **Skeptic: executed.** A scratch vitest prototype of the amended rules on top of the shipped `sectionTally` at `dbd9f97a`. Every label the plan names reproduces: `(3 plans · 6 slices · 15 tickets)`, `(15 tickets)`, `(1 stopped agent)`, `(1 branch · 2 tickets)`, `(1 plan · 2 slices · 2 branches)`, `(2 plans · 1 ticket)`, `(0)`.
- **Operator: read.** The amended wording against the headers read on the board on 2026-10-01, and the «Sprint only» bar.
- **Testability: read.** The amended test list, `sections.ts:395-452`, the tally tests and `sprint-exempt.browser.test.ts:205-220`.

## Round 1, answered (all three)

The plan-less row counts as `branch`, consistent with #973; the slice figure prints only where it differs; the two browser tests and the eight unit call sites are named; `EXPECTED_TESTS` is stated unchanged; the `not sprint-filtered` note no longer repeats a number; narrow width is stated.

## Disagreement, named

**Whether the invariant test proves anything.** The testability juror shows that a unit test asserting "collapsed visible lines equal the sum of the figures" has only `sectionTally`'s own `planLines` to count visible lines with, so it compares the function with itself. The skeptic and operator did not examine that test. This is not a disagreement about the design; it is one Done-when line that, as written, cannot fail. The fix is one sentence: assert the invariant in the rewritten `unplanned-issues.browser.test.ts:328` by counting the section's top-level rows, which adds no browser test.

## Notes that do not block

- The `sprint-exempt.browser.test.ts:214-218` test survives the new note unchanged; the test list should say so (testability).
- One plan whose rows carry no slice reads as several plans; the plan declares this as the unchanged fold rule (skeptic).
- A section of only a draft plan reads `(1 plan)` while one grouped plan reads `(1)`; both are true (skeptic).
- With the filter on, the header's `2 branches` and the bar's `2 shown without a plan` name the same rows in two words; the bar is outside this bug (operator).

## Shared blind spot

All three lenses read WAITING ON YOU and NOT STARTED. None checked a DONE or QUIET header on the live estate after the change: `sectionTally` serves all five branch sections, so every plan-less merged PR row in DONE now adds a `branches` figure there. The amendment should state the expected DONE header on this estate, or one sentence that DONE is affected and how.

## What an amendment changes

1. The invariant is asserted in the rewritten `unplanned-issues.browser.test.ts:328` against the section's rendered top-level rows (or a second, render-shaped derivation in the unit test).
2. The test list names `sprint-exempt.browser.test.ts:214-218` as surviving unchanged.
3. One sentence on the DONE and QUIET headers, which gain a `branches` figure wherever plan-less rows sit.
