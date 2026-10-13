# Panel round 2 — the-fleet-writes-the-design

Reconciliation: unanimous amend (estate, contradiction, deliverable, cost), read at main 553c4777b. Every juror confirms that its round-1 amendments were applied; the spike slice is sound. The remaining findings concern the spec run's success rule, its recovery, its reach, and its board row.

## What three or four jurors found

- **Success is "the branch reads `work`", not "a draft PR exists".** A run that pushes but whose `pr-create` fails, a run that reaches `Worker bound` after a partial commit, or a spec PR a person closed with its branch deleted all leave the plan with no failure record, no row and no stop; the last case starts a new Opus run every pass. `plot-design.mjs restart` has no arm for `work` with no PR (cost, deliverable, contradiction, estate). Fix: success means a draft PR exists (or fleetd opens the PR itself), and name what each `restart` arm does.
- **The board row has no owner and no domain rule.** The plan says the rows use sections that exist on main; the plan-level row kind does not exist — #1640 holds it, and `the-board-has-three-tabs` now builds it. No domain `specRow` beside `verificationRow` exists, so only a browser test would prove the rows (estate, cost, deliverable). Fix: a domain `specRow` with unit tests, rendered through the row the three-tabs plan builds; add that `waits:`.

## Raised by fewer jurors

- **The restart cannot lift the halt.** `restart` clears the plan's failure record, but the cross-plan `failedAt` stays and only a success moves `lastSuccessAt` (`auto-verify.ts:73-85`), so `specStart` keeps answering `halted` (cost). Fix: a person's restart may start a run under a halt; add an Acceptance case.
- **`Review: pr` Design plans.** This plan's own channel is `Review: pr`. Under D13 such a plan's spec run can start only after its spike is approved; a `Review: pr` Design plan with no spike never gets a fleet spec, because approval merges the plan PR and writes `Approved` in one act (`approve.ts:337-358`). D10 and Changelog item 2 state no such limit (contradiction).
- **Open Point 1's premise is false.** The scan reads plans from prefixed branches too (`plot-fleet-scan.sh:143-158`); the plan must say that a Design plan whose file is not on `origin/<main>` answers `none` (contradiction, estate).
- **An undeclared duplicate.** `auto-design.ts` "follows" the 593-line `auto-verify.ts`, and `specStart` repeats six of `verifyStart`'s refusals; name what is shared and what is copied (estate).
- **Settling a crashed run.** A crash leaves a `claim-only` ref and a worktree that nothing settles or reports; no port operation deletes a branch on origin (cost, estate).
- **Wording.** The cost line counts two host writes where a run makes three, and says "runs follow person acts only" against `retryVerdict`'s automatic retries; `CLAUDE.md` declares no `Design command` or `Auto-design`; `rows.tsx:524-526`, `:880`, `implement-run.ts:24-33` and `DESIGN-phases.md:40`, `:143`, `:268` still name *Commission design*; `commissionLogPath` lives in the board package that slice 4 removes; the tab is "Agents" here and "Delivery" in the sibling plan.

## Decision for the person

- **The reach of the spec run.** Either the spec run is limited to Design plans the fleet can read on `origin/<main>` (`Review: in-session`/`ballot`, or `pr` after a spike approval), and the Changelog says so; or the plan adds a reading of open plan PRs, at one host call per pass.

## Amendments for round 3

1. Success means a draft PR exists; define every `restart` arm, including `work` with no PR and a closed PR.
2. A person's restart may start a run under a halt.
3. A domain `specRow` with unit tests, rendered through the row `the-board-has-three-tabs` builds, with that `waits:`.
4. State the spec run's reach (decision above) and that an unreadable plan answers `none`.
5. Name what settles a crashed run's claim and worktree, and the port operation that deletes a remote ref.
6. Declare what `auto-design` shares with `auto-verify` and what it copies.
7. Fix the cost line, the config keys, the remaining *Commission design* references, `commissionLogPath`'s new home, and the tab name.
