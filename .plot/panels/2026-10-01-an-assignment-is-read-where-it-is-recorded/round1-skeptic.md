# Round 1 — skeptic (measures against origin/main)

Subject: `docs/plans/2026-10-01-an-assignment-is-read-where-it-is-recorded.md` at `cff4c03f`.

Position: amend

## What I measured

- `readQueue` (`queue-reading.ts:209-276`) uses `entries` only to build `agents` (`:262-273`); the queue is `queueOfPlan(plan, claimed, merged)` (`:245`). Confirmed: no manifest reaches the queue.
- `claimedBranches` reads `refs/remotes/origin` (`refs-git.ts:149-156`). Confirmed.
- After a rejected claim push the loop prints the violation line and runs `continue` (`plot-worker-loop.sh:2290-2292`). It writes nothing to the manifest on that path.
- `registryd.log:23794-23833`: the tick handed `bug/a-closed-sprint-stops-filtering` to `8111e3ec`, and two ticks later `bug/the-tally-names-its-tickets` to the same agent. Confirmed.
- `sliceHasMerged` asks the host by branch (`registryd-main.ts:617-622`); `bug/a-closed-sprint-stops-filtering` had no PR, so it answered `false`.

## The gap

`isAgentFree` (`free.ts:64-67`) answers free only for an empty manifest branch or a merged slice. The slice had not merged. So at the second hand-over the manifest of `8111e3ec` named no branch, and the plan does not say which writer emptied it. The rejected-push path does not write the manifest. Motivation step 3 is the plan's strongest evidence for #1039 and no slice addresses its mechanism: `assigned` holds a SLICE named by a live manifest, and here the manifest named nothing.

## Required

1. Find the writer that emptied `8111e3ec`'s manifest branch between the two ticks (the loop's next-branch path after `continue`, a `--release` clearing it, or the free-agent wait), from the manifest history or a reproduction, and state it.
2. Either fix that writer in a slice, or state that the tally hand-over was caused by `--release` clearing the manifest (`plot-dispatch.sh:2103-2117`) and test that slice 2's refusal prevents it.

The orphaned-claim report and `claimAnswer` table are sound as designed.
