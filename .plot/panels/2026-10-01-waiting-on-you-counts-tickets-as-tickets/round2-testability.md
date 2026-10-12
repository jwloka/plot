# Round 2 — domain and testability

Subject: `docs/plans/2026-10-01-waiting-on-you-counts-tickets-as-tickets.md` at `dbd9f97a`. Lens: CLAUDE.md *Every rendered state is a domain property*; the tests the plan names. Round 1 asked for the invariant test and the `EXPECTED_TESTS` statement.

Position: amend

## What I looked at

The amended Slices and Done-when, `sections.ts:395-452`, `agent-list.test.ts:395-412` and `:3832-3935`, and `sprint-exempt.browser.test.ts:205-220`. Read, not executed.

## Round 1, answered

- `EXPECTED_TESTS` is stated unchanged, and no browser test is added.
- `tallyLabel` and `unfilteredNote` are pure functions in `sections.ts`, so every wording case is a unit test.
- `sprint-exempt.browser.test.ts:214-218` reads `data-sprint-unfiltered` and the phrase `not sprint-filtered`; the amended note keeps both, so that test survives unchanged. The plan should say so in its test list, because it is the one test a worker will wonder about.

## What blocks

**The invariant test has no independent source.** The plan asks one unit test to assert "collapsed visible lines equal `plans + branches + tickets + agents`". In a unit test the only count of visible lines is `sectionTally`'s own `planLines`, which is how the figures are computed. Asserted that way the test compares the function with itself and passes whatever the render does. It needs a source the tally does not share. Two options, each cheap:

1. In the unit test, count lines the way the component renders them: `groupByPlan`, then for each group one line where `showPlanHeading` or the plan-head rule holds, else `sliceGroupsFor` plus `ungroupedRows`, plus tickets, drafts and stopped agents. This is a second derivation, so it can disagree.
2. In the browser test the plan already rewrites (`unplanned-issues.browser.test.ts:328`), count the section's top-level rows and assert they equal the sum of the header's figures. This adds no browser test, so `EXPECTED_TESTS` stays.

Option 2 measures the render itself and is the stronger of the two. Either one turns the invariant from a sentence into a gate.
