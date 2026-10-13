# Panel round 1 — the-fleet-writes-the-design

Reconciliation: unanimous amend (estate, contradiction, deliverable, cost). Each juror read the plan against main at 2026-10-13, after #1634 (spike dispatch) and #1635 (auto-verify) merged. All four read code; none ran tests.

## What all four found

- **The spike rule exists twice and the dispatch change is incomplete.** Since #1634, `sliceVerdict` admits only the approved spike of a Design plan (`rules/eligible.ts:127-134`). The plan's `dispatch-spike` arm of `designWork` restates that rule, and the spike slice widens only 2 of the 6 `plan.phase !== 'approved'` filters in `rules/auto-dispatch.ts` (`:531`, `:582`; not `:617`, `:656`, `:733`, `:798`). Because `dispatchCandidates` (`:798`) feeds `findMissingBriefs`, a spike with no brief could start (all four; estate A1, contradiction A1–A2, deliverable A2–A3). Drop the arm, widen all six filters, let the verdict decide, and test that a briefless spike is reported `no-brief`.
- **The spec run is unbounded and unswitched.** Every Design plan with an empty spec starts one Opus `Idea command` run, with no on/off key, no time bound, no worktree (today's commission route runs in `repoRoot`), no retry limit and no way for a person to re-run it once the *Commission design* button is gone (cost A1–A4, estate A3, contradiction A4–A5, A8, deliverable A8). Build it on the auto-verify shape shipped in #1635: a key that defaults off, a start rule beside `verifyStart`, `startBoardRun` with `Worker bound`, a failure store, a *Waiting on you* row and a restart command.
- **No `## Acceptance`** (estate A8, deliverable A1).

## Where they differ in weight, not in position

- Estate and cost find that the "plan PR's head branch" destination never fires: under D13 the fleet reads plans on the default branch only, so a `Review: pr` plan in Design on an open PR is invisible (estate A2, cost A5). Contradiction and deliverable did not test it. The moderation adopts it.
- Contradiction alone raises Manifesto Principle 1: the one-run record lives in machine-local state, so two machines each start a spec agent; it asks for a ref-push claim or a record in the plan (A3). Cost asks only for the record's file (deliverable A8). Both need one answer.
- Contradiction alone ties the key to the one-capability-one-key rule in `implement-run.ts:22-33` (`Design command`, absent starts nothing) (A5).

## Shared blind spot

All four accepted that the fleet should write the spec at all; none asked whether D3 ("a person decides design") is met when the fleet writes the spec unasked. The plan says the person still approves; a round 2 should state in the Design section where the person's decision sits.

## Amendments for round 2

1. Drop `dispatch-spike` from `designWork`; widen all six auto-dispatch filters to admit a Design plan and let the scan verdict decide; test the briefless spike.
2. Build the spec run on the auto-verify shape: `Design command` (or a stated key), default off; its own worktree; `Worker bound`; failure store with a stop after 3; a *Waiting on you* row and a restart command.
3. Put the one-run fact where every machine sees it (a claim ref or a plan record), or state the one-machine rule and what refuses a second.
4. Drop or justify the plan-PR-head destination under D13.
5. Reuse `specOf`/`SPEC_PLACEHOLDER` for `specIsEmpty`; give `designWork` an explicit readings signature.
6. List the whole removal surface of *Commission design*, or split it into its own slice; split `### The fleet acts` into one branch per heading.
7. Add `## Acceptance`; replace "Delivery tab" with the sections on main or wait on `the-board-has-three-tabs`; refresh the stale line references.
