# Round 1 — skeptic

Position: amend
Evidence: executed

## Reproduction

I copied the helpers from `test/reconcile/second-slice.test.mjs:1-218` into a scratch test. Its fake prompt commits one file, writes 3 untracked files, prints `You've hit your session limit · resets 5:20pm (Europe/Zurich)` and exits 1. On origin/main the loop ran the prompt 4 times in 974 ms, exited 1, and wrote `reason: unstarted, actor: agent`. The `PLOT-BLOCKED.md` said "Nothing was implemented … fix the invocation in the prompt file". The desk held commit `part 1` above the claim commit and 3 dirty files. #1141 reproduces exactly. The limit line went to the prompt's stdout, not stderr.

## 1. Claims checked

- True: the non-zero branch is at `skills/plot/scripts/plot-worker-loop.sh:2008-2021`, and `continue` runs with no delay (measured).
- True: `START_ATTEMPT_BUDGET` defaults to 3 at `:366`.
- True: `bash -c '. "$1"' _ "$prompt_file" &` is at `:1675`. Only `_prompt_status` (`:1719`) is kept.
- True: the "untouched" and "never worked" sentences are constants (`:2012`, `:2015`, `:2019`).
- True: `EndingReasonSchema` is at `packages/domain/src/entities/ending.ts:55`. The `unstarted`-only check is at `packages/domain/src/transitions/agent.ts:390`.
- True: `harness="${PLOT_HARNESS:-claude}"` is at `skills/plot/templates/worker-prompt.sh:136`.
- **False:** "the loop already asks `plot-prompt.mjs` once per pass (`:1106`)". `resolve_prompt_file` is called once, at `:1281`, before the pass loop (`while true` at `:1879`). The call runs once per agent start, not once per pass. The cost argument survives (failure path only), but its premise is wrong.
- **Misleading:** "through the sourced `plot-desk-dirt.sh`". The loop does not source that file. It reads dirt through `plot_worker_dirty` (`plot-worker-state.sh:389`, sourced at `:712`), which applies a different filter.

## 2. Does it fix #1141 end to end

**Not as written.** The adapter is "keyed by the `PLOT_HARNESS` value". `plot-dispatch.sh:892` sets `launch_harness=""`, and `:1491` exports `PLOT_HARNESS="$launch_harness"`. A charter-less launch therefore gives the loop an empty value. CHANGELOG #910 says charter-less is the whole estate. The template turns `""` into `claude` (`:136`), but the plan says that "a harness the adapter does not know supplies no patterns". An implementer who passes the raw variable gets `unstarted` for the exact #1141 message, and every test with `PLOT_HARNESS=claude` set still passes. With the harness resolved, the design covers all three false statements.

## 3. Gaps an implementer hits

- **Which stream holds the message.** Capture both stdout and stderr, and keep both in `.plot-worker.log` (tee, not redirect). Pass only the last N lines to the bundle.
- **"One wait per slice" against "right after a wait".** Session limits reset about every 5 h, and the default `Worker bound` is 28800 s. A resumed prompt that works 5 h and hits the limit again is a legitimate second limit. The plan does not say whether that second limit ends the worker. Define the reset condition, for example "a prompt after the wait ran longer than X" or "exited 0".
- **Bound 0.** `:130` accepts 0, which disables the floor. "No more than `Worker bound` away" then forbids every wait. Decide what happens.
- **The claim commit.** "Commits beyond the claim commit" has no reader in the loop. `desk_reset_refusal` counts `@{upstream}..HEAD` (`:789`), which misses the pushed commits #1141 measured. `plot-dispatch.sh:2049-2056` uses `$MAIN..branch -- .` to skip the empty claim commit. Name that reading.
- **The sleep and `--stop`.** Reuse the `_wait_sleep_pid` pattern (`:1398`, `:1597-1599`) so the trap reaps the sleep. Do not use a bare foreground `sleep`.
- **A reset just past.** A message read seconds after `5:20pm` resolves 24 h ahead and ends the worker. Allow a small grace window.

## 4. Slices

Slice 1 can be built and tested. "Its entry" also touches `packages/board/build.mjs:263`, `packages/board/src/contract/bundles.generated.ts:58` and `.gitattributes:59`. Slice 2 names `workerloop.test.mjs`, but the existing start-failure fixture lives in `second-slice.test.mjs:370-440`. A fake harness that sleeps cannot test a 60 s margin, so the plan needs a test seam for the margin and for "now". `PLOT_START_ATTEMPT_BUDGET` (`:366`) is the precedent. Each "done" can be checked from assertions, not prose.

## Required change

Key the harness adapter on the effective harness `${PLOT_HARNESS:-claude}`, the same default the template applies. Add a slice-2 case where `PLOT_HARNESS` is set and empty and the #1141 line still produces `limited`.
