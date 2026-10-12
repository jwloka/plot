# Round 1 — domain and testability

Subject: `docs/plans/2026-10-01-waiting-on-you-counts-tickets-as-tickets.md` at `63893100`. Lens: CLAUDE.md *Every rendered state is a domain property*; the existing tally tests; the browser-test count pin.

Position: proceed

## What I looked at

`sections.ts:395-450` (`sectionTally` and its doc comment), the call at `AgentList.tsx:1157-1165`, the describe block at `agent-list.test.ts:3832-3935`, and `stubbed-tests-start-no-board.test.ts`. Read, not executed.

## Findings

1. **The decision moves out of the component, which is what the rule asks.** Today the `(N)` versus `(N plans · M slices)` choice sits in `AgentList.tsx:1163-1165` and can only be seen by rendering. `tallyLabel` makes the header text a pure function's return value, so every wording case is a unit test.
2. **The home is acceptable.** `sectionTally` already lives in `packages/board/src/app/lib/agent-rows/`, which is pure and unit-tested without a browser. Moving it to `packages/domain` is a separate question about view vocabulary, and nothing in this bug needs it.
3. **No browser test is added**, so the count pin `EXPECTED_TESTS` does not move. The plan should say so in one sentence.
4. **The omissions are found by the gates.** The eight unit call sites fail `pnpm run typecheck` the moment the fourth argument changes type, and the browser test that pins `(3)` fails `pnpm run test:board`. A worker is told both by the tools before a reviewer reads the diff.
5. **The invariant is testable and should be asserted.** "Visible top-level lines equal `plans + tickets + agents` with every head collapsed" is stated in the doc comment; one unit test over a mixed section can assert it directly, and that test is what keeps the next count from folding one kind into another.

The plan is ready to implement. The skeptic's and operator's label cases are improvements a worker meets through the failing tests, not gaps that block the design.
