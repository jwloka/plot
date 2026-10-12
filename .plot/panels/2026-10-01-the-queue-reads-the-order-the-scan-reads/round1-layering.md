# Round 1 — domain and layering

Position: amend

## What I read

`queueOfPlan` and `landedWithoutListing` in `packages/board/src/server/queue-reading.ts`, `rules/queue.ts`, `rules/eligible.ts`, `ports/plan-store.ts`, `adapters/plan-store/plan-store-shell.ts`, and CLAUDE.md's layering rule (*"No domain-specific code or behaviour lives outside the domain"*).

## What must change

1. **The decision this plan changes lives in the board.** `queueOfPlan` decides slice order and, after slice 1, the `waits:` hold — both are domain decisions, and the file holding them is `packages/board/src/server/`. Slice 1 moves the fold into `packages/domain/src/rules/queue.ts` as a pure function over `PlanRecord`, the claimed set and the merged set (readings as values, as the rest of the file is), and `queue-reading.ts` keeps only the reads. The domain coverage gate then covers the new branches, which it does not today.
2. **One `settled` predicate, not two.** `:144-145` and `:307` each spell the join. After the move, export one predicate (`advancesOrder(branch)` or a `settled` reading) that both the fold and `blockingBranches` use, so the two cannot drift again — they drifted once already, in the same direction.
3. **`handOverCheck`'s `stale` threshold is a domain constant;** export it from `rules/queue.ts` with the evidence in the commit, and keep `startAgents` free of the comparison.

## What holds

`remoteHead` on the refs port with a git adapter; `PlanRecordBranch.waitsOn` as a port field; `waitVerdict` reused rather than re-implemented.
