# Round 1 — moderation

Subject: `docs/plans/2026-10-01-the-queue-reads-the-order-the-scan-reads.md` at `00fd35b0`. Lenses: `round1-skeptic.md`, `round1-operator.md`, `round1-layering.md`. Gate: `committed skeptic amend`, `committed operator amend`, `committed layering amend`. Reconcile: `unanimous amend skeptic,operator,layering`.

## How the panel ran

One agent applied the three lenses in sequence; it ran as a fork that may not start agents. The lenses share one reader, so their agreement is weaker evidence than three independent jurors, and the next round should use separate agents.

## Evidence each lens used

- **Skeptic: executed.** Read the two `settled` joins against the scan's rule, read the existing `queueOfPlan` tests (none covers a claimed first slice), and measured tick cost over 7 167 ticks here (83 over 300 s, 1.2%) and 1 592 on `ewz-kus-portal` (8 over 300 s, 0.5%).
- **Operator: read.** The running supervisor (pid 10942, 33 h old), the held briefs, the tick line.
- **Layering: read.** Where the changed decision lives, against CLAUDE.md's layering rule.

## Agreed

The diagnosis is right on both issues, and the slice order is right. `waitVerdict` is reused rather than re-implemented, `remoteHead` is a git call that spends no API budget, and the five-minute bound withholds about 1% of ticks.

## Changes, each from one lens and contested by none

1. **Move the fold into the domain** (layering). `queueOfPlan`'s order and `waits:` decisions go to `rules/queue.ts` as a pure function; `queue-reading.ts` keeps the reads. One exported `settled` predicate serves the fold and `blockingBranches` (`:144-145` and `:307` today).
2. **Define the `waits:` answer under a partial listing** (skeptic): named by the merged set after the fallback is `merged`; otherwise `unreachable` on a listing that is not whole and `unmerged` on a whole one; with a unit case.
3. **Put the agreement test in the corpus tier** (skeptic): add the queue as a third surface to `packages/domain/corpus/eligible.corpus.test.ts`.
4. **State the rollout** (operator): the fix takes effect only after the supervisor restarts, and the plan names when that is safe (#1144, #1148).
5. **Name the owner of the held briefs** (operator): who moves `.plot/briefs/held/*` back, and when.
6. **Name the held-list line for `waits`** (operator), and **put the 300 s evidence in the Design** (skeptic, layering).

## Disagreements

None. The six changes touch different parts of the plan.

## Shared blind spot

All three lenses read the supervisor's queue. None checked whether another path hands a slice to an agent from a reading of the same age: the board's auto-dispatch (`packages/board/src/server/auto-dispatch.ts`) and `/api/claim` (`claim.ts`). If either decides from the fleet payload and then hands over, it can hand out a merged slice the same way. The amendment should state that it searched those paths and what it found.

## What an amendment changes

The fold and its `settled` predicate in `rules/queue.ts`; the partial-listing rule for `waits:`; the corpus test; the rollout and the held-brief owner; the held-list line; the bound's evidence; and the search of the other hand-over paths.
