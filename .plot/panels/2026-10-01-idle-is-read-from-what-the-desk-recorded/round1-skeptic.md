# Round 1 — skeptic (measures against origin/main at 3d88d90c)

Position: amend

## Measured

- **Directory mtimes carry the tree reading.** In a scratch directory on macOS: a rename moved the parent directory's mtime and kept the file's own mtime; a removal moved the parent directory's mtime. So "newest of HEAD time, dirty-path mtimes, parent-directory mtimes" sees adds, removals and renames, which the plan claims. `git status --porcelain` lists a rename as the old and the new path, so both parents are read.
- **The two-sample rule is in the shell, not behind the bundle.** `plot-worker-monitor.sh:592-606` applies `prev_verdict` and `prev_tree` itself. `skills/plot/scripts/board/plot-monitor.mjs` is committed but no build emits it (`packages/board/src/contract/schema.ts:2116-2119`: *"no `outfile` names it — nothing rebuilds it"*), and no script calls it (`git grep plot-monitor.mjs` finds only the entry's own comment, the schema comment and two tests that refuse it as an artifact). The plan's "asked through the existing bundle `plot-monitor.mjs`" is false.
- **`PLOT_MONITOR_ENDS_WORKER=0` loses `idle` entirely after slice 2.** The watcher is started only when the flag is `1` (`plot-worker-loop.sh:1701`), and the flag's own comment says `0` *"leaves the finding published"* (`:145-147`). With the WorkerMonitor gone and the watcher not started, nothing publishes `idle` under `0`.
- **The process count after the plan is `1 + 3N`, not `1 + 2N`.** The wrapper starts three monitors today (`plot-dispatch.sh:1451-1458`: worker, agent and build), and `DESIGN-process.md:115` states `1 + 4N`. Removing the WorkerMonitor leaves the worker, the AgentMonitor and the BuildMonitor per agent. #1041 says #741 merged the Agent and Build monitors; on origin/main they are still two processes. (Also measured by a second agent on the same task.)
- Citations checked true: `sample.ts:106-117`, `:133`; `plot-worker-monitor.sh:429-444`, `:491-492`, `:617-618`; `registryd.ts:178-197`; `supervision.ts:61`, `:274`; `attention.ts:94-95`; `DESIGN-process.md:31`, `:43`, `:78`; `plot-dispatch.sh:1535` (`wait "$agent"`).

## Required

1. Replace the bundle premise: either give `entry/monitor.ts` an `outfile` and have the shell call it (and state the per-pass `node` cost against `docs/shell-and-domain.md` §1), or keep the rule in shell as a declared duplicate with a corpus test pairing it to `idleNow`.
2. Correct the count to `1 + 3N` in the Changelog, Motivation, the table and Done when, and drop the claim that the plan reaches the design's `1 + 2N`; reaching it needs the Agent and Build monitors merged, which is a separate change.
3. The watcher runs whatever `PLOT_MONITOR_ENDS_WORKER` says; only the signal to the loop is gated by it. A slice-2 test with the flag at `0` asserts `idle` is published and the prompt is not ended.
