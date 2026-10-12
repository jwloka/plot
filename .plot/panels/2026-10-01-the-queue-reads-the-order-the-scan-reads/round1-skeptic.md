# Round 1 — skeptic (measures against origin/main at 00fd35b0)

Position: amend

## What I ran

- Read `queueOfPlan` (`queue-reading.ts:125-175`) and `landedWithoutListing` (`:296-331`) against the scan's settled rule (`plot-fleet-scan.sh:233-236`, `:3887-3900`). The diagnosis holds: the queue folds order over `claimed || merged` at `:144-145` and again at `:307`; the scan over merged only.
- Read `packages/board/test/unit/queue-reading.test.ts:31-80`. Four cases cover merged and unstarted first slices. **None covers a claimed, unmerged first slice**, so the defect was never pinned by a test.
- Measured supervisor tick cost from `.plot/logs/registryd.log`: this repository 7 167 ticks, median 14.4 s, p95 115 s, 83 ticks (1.2%) over 300 s, maximum 2 479 s; `ewz-kus-portal` 1 592 ticks, median 20.2 s, p95 103 s, 8 (0.5%) over 300 s, maximum 4 692 s (#1149's tick). A five-minute bound withholds about 1% of ticks' hand-overs, so it keeps the fleet live.

## What must change

1. **The `waits:` answer under a partial listing is undefined.** The plan names *merged set* and *unreadable listing*, but `mergedBranches` also answers `whole: false` with rows (`queue-reading.ts:85-90`), and `landedWithoutListing` adds answers to `merged`. State the rule: a prerequisite the merged set (after the fallback) names is `merged`; otherwise, on a listing that is not whole, `unreachable`; on a whole listing, `unmerged`. Add the not-whole unit case.
2. **The agreement test belongs in the corpus tier.** `packages/domain/corpus/eligible.corpus.test.ts` already compares the board's verdicts with `--next` over the estate; the queue is a third surface acting on the same answer. Name that file and add the queue as its third surface, rather than a one-fixture scan run in a unit test.
3. **Name the stale bound's measured cost** in the Design (the numbers above), so the 300 s constant carries its evidence.

## What holds

Slice order, the `waitVerdict` reuse, the order of `handOverCheck`'s tests, and `remoteHead` as a git call.
