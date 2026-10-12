# Round 1 — moderation

Subject: `docs/plans/2026-10-01-a-usage-limit-is-not-a-broken-prompt.md` at `d9731992`.

Gate: `committed skeptic amend`, `committed operator amend`, `committed layering amend`. Reconcile: `unanimous amend`.

## Evidence

- **Skeptic: executed.** It reproduced #1141 on origin/main with a fake harness (4 prompt runs in 974 ms, ending `unstarted`, the false marker, with a commit and 3 dirty files in the desk).
- **Layering: executed.** It ran `desk_dirt` and `plot_worker_dirty` on a scratch repository and got different answers.
- **Operator: read.** It traced the monitor through `plot-dispatch.sh` and `plot-worker-monitor.sh`, and ran nothing.

## Agreement

- **All three: the fix is inert under the default launch.** `plot-dispatch.sh:1491` exports `PLOT_HARNESS` empty unless a charter names a harness. The template applies `claude` at `skills/plot/templates/worker-prompt.sh:136`; the loop does not. A loop that passes the raw variable sends an unknown harness to the rule, and the #1141 message reads as today. Tests that set `PLOT_HARNESS=claude` hide it. Required by skeptic and layering: pass `${PLOT_HARNESS:-claude}` and test with the variable empty or unset.
- **All three: "one wait per slice" is undefined.** A 5-hour session window inside an 8-hour `Worker bound` makes a second, legitimate limit normal. The plan must say what resets the count.
- **Skeptic and layering: two false premises.** `plot-prompt.mjs` is asked once per agent start (`:1281`), not once per pass, and the real per-pass precedent is `plot-slice-spend.mjs` (`:2114`); the conclusion survives. The loop does not source `plot-desk-dirt.sh`; it reads dirt through `plot_worker_dirty` (`plot-worker-state.sh`), which drops the loop's own `.plot-worker.*` files. Using `desk_dirt` would count those files as work on an adopting repository and create a new false sentence.

## Disagreement

The jurors do not disagree on the position. They disagree on **which defect blocks approval**:

- **Operator:** the worker monitor, not the harness key. The monitor runs for the agent's whole life (started by the wrapper, `plot-dispatch.sh:1502`), so the plan's Open Point is false. During a multi-hour sleep it sees a live loop, a silent transcript and commits on the branch, which is its `idle` row; the resumed prompt's watcher reads that last line and ends the slice as `quiet` seconds after the reset. Neither other juror examined the monitor, so this finding stands on one reading and is not contradicted.
- **Skeptic and layering:** the harness default, as above.

These are independent defects. Both block, and an amendment carries both.

## Further gaps named by one juror

- Skeptic: capture stdout and stderr with `tee` so the log keeps both (the limit line arrived on stdout); `Worker bound` 0 forbids every wait; a reset seconds in the past resolves 24 h ahead, so a grace window is needed; the sleep must use the `_wait_sleep_pid` pattern so `--stop` reaps it; the start-failure fixture lives in `second-slice.test.mjs:370-440`, not `workerloop.test.mjs`; the 60 s margin and `now` need test seams.
- Layering: the rule takes the patterns as an argument and the entry joins adapter and rule (`listing-paging.ts` + `listing-page.ts` precedent); the adapter is data only, or matching escapes the 100% coverage gate; an unaskable bundle falls back to today's `unstarted` path; `test/ending.test.ts:45` pins the reason list; slice 1 also touches `build.mjs`, `bundles.generated.ts` and `.gitattributes`.
- Operator: a desk-local "limited until" fact so `/plot-fleet` and the reaper can tell a waiting agent from a stuck one; sleep in short steps checked against the clock, because `sleep` does not count a suspended laptop.
- Skeptic and layering: "commits since the claim" needs a named reading; `$MAIN..branch -- .` skips the empty claim commit, and a `--restart` desk has no claim commit from this process.

## Shared blind spot

All three read the loop's **non-zero** exit path. None asked whether the harness can report a usage limit and exit 0, for example after the agent finished part of a turn. The rule is asked only on a non-zero status, so such an exit would read as a finished slice: the branch is cleared and the slice is handed back with uncommitted work in the desk. The amendment should state the observed exit status as a measured fact, or ask the rule on every exit that carries a limit line.

## What an amendment changes

1. The loop passes `${PLOT_HARNESS:-claude}`; slice 2 adds a test with the variable empty.
2. A decided rule for the worker monitor during the wait (the loop writes a `waiting` or `clear` finding before it resumes, or the monitor reads a desk-local "limited until <instant>" and publishes nothing while it holds), with a slice-2 test in which the findings file ends in `idle` during the wait and the resumed prompt runs to exit 0.
3. The wait count resets after a prompt that made progress (a new commit or transcript write since the wait); only a limit that returns without progress ends the worker.
4. The desk sentences use `plot_worker_dirty` and `$MAIN..branch -- .`; the false premises about `plot-prompt.mjs` and `plot-desk-dirt.sh` are corrected.
5. The rule takes patterns as an argument, the adapter is data, an unaskable bundle falls back to `unstarted`, and the sleep runs in clock-checked steps reaped by the loop's trap.
