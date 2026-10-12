# Round 2 — skeptic

Position: amend
Evidence: executed

Subject: `docs/plans/2026-10-01-a-usage-limit-is-not-a-broken-prompt.md` on origin/main `19fcf482` (the plan is unchanged since `e0758939`). I worked in a detached worktree of origin/main and in scratch repositories. I ran no real harness and spent no usage.

## What I executed

- **The pipe the plan names breaks the loop's kill.** `bash -c '…' 2>&1 | tee -a f &` makes `$!` the pid of `tee`, not of the prompt. With the loop's own `_kill_tree` (`plot-worker-loop.sh`, `pgrep -P` walk), killing that pid left the prompt's `sleep 30` running, and `wait` returned 137 at once. The status survives only because the loop runs `set -uo pipefail` (`:70`): `wait` returned 7 for a prompt that exited 7, under bash 3.2.57 and bash 5. With process substitution (`cmd > >(tee -a f) 2>&1 &`) `$!` is the prompt and `wait` returns 7; the temp file held the line right after `wait` in 200 of 200 runs. The existing test `worker-loop: no stray sleep after a timeout` (`test/reconcile/workerloop.test.mjs:386`) asserts the prompt's sleep dies, so the naive pipe fails CI rather than shipping. It is a trap for the implementer, not a blocker.
- **The desk readings are correct.** On a scratch desk with an empty claim commit, one pushed commit, one unpushed commit, one untracked file and a `.plot-worker.limited` file: `git rev-list --count origin/main..HEAD -- .` gave 2 (3 without the pathspec), and `plot_worker_dirty` gave only `d`. `PLOT_WORKER_RECORD='\.plot-worker\.'` (`plot-worker-state.sh:89`) drops the new file as the plan says.
- **The harness strings.** In `~/.local/share/claude/versions/2.1.286`: `You've hit your ` (11 hits), `session limit` (12), `weekly limit` (12), `Opus limit` (2), and *"Claude Code exited during the wait, so the task will not resume on its own"* (2). The binary also holds `You've hit your fast limit` and `You've hit your monthly spend limit`, which the plan does not name.
- **The #1141 baseline** was reproduced in round 1 (4 runs in 974 ms, false marker). I did not re-run it.

## 1. Round-1 changes

1. **Harness default: yes.** *"The loop sends `${PLOT_HARNESS:-claude}` to the bundle"*, and slice 2 tests *"the same case with `PLOT_HARNESS` set and empty still reads `limited`"*.
2. **Monitor during the wait: yes.** *"While the file names an instant, `sample_verdict` measures transcript silence from the later of the newest transcript line and that instant"*, with the slice-2 test that runs the monitor beside the loop with a 1 s window. The plan prevents the `idle` rather than clearing it after the fact; that answers the defect.
3. **What resets the count: partly.** *"A limit is without progress when the prompt that returned it started after a wait, ran less than 600 s, and the desk gained no commit"*. Round 1 asked for a commit **or a transcript write**. A resumed prompt that edits files for 5 minutes without a commit and meets the limit again ends the worker. The marker then names the dirty paths and the `--restart`, so nothing is lost, but the plan should say this is a choice.
4. **Desk readings and false premises: yes.** `plot_worker_dirty` and `-- .` are named; the per-pass precedent is now `plot-slice-spend.mjs` (`:1011`, `:2114`), both true.
5. **Layering, fallback, steps: yes.** Patterns as an argument, data-only adapter, unaskable bundle is today's path, steps of at most 60 s as `_wait_sleep_pid`.
- **Single-juror findings: yes** for `tee` of both streams, `Worker bound` 0, the 120 s grace, `_wait_sleep_pid`, the fixture in `second-slice.test.mjs:370-440`, the clock and margin seams, `ending.test.ts:45`, `build.mjs`, `bundles.generated.ts`, `.gitattributes`, the desk-local fact and the clock-checked sleep.
- **Exit 0 blind spot: yes.** *"The rule is asked on every exit, not only a non-zero one"*, with an Open Point to record the real status. This answer creates the defect in section 3.

## 2. Added claims against origin/main

- True: `plot-dispatch.sh:892` `launch_harness=""`; `:1491` `PLOT_HARNESS="$launch_harness"`; `:1502` the wrapper starts `$PLOT_WORKER_MONITOR`.
- True: `plot-worker-monitor.sh:14-16` and `:594-600`, the four `idle` conditions.
- True: `monitor_says_idle` (`plot-worker-loop.sh:1494`) reads the last `WorkerMonitor` line with no time check, and the watcher polls every `PLOT_MONITOR_POLL_SECONDS` (default 5, `:142`). An `idle` published during a wait would end the resumed prompt.
- True: `plot-tmp.sh` sourced at `:73`; `Worker bound` 0 kept at `:125-130`; `_wait_sleep_pid` at `:1398`, reaped at `:1599`; `plot_worker_dirty` at `plot-worker-state.sh:389`, sourced at `:712`; `plot-dispatch.sh:2049-2056` uses `-- .`; `worker-prompt.sh:136`; `vitest.config.ts:71` covers `src/!(adapters)/**`.
- True: `ending.test.ts:45` pins the five reasons.
- **Misleading:** *"The entry `entry/prompt-exit.ts` joins the table to the rule, as `rules/listing-page.ts` and `adapters/host/listing-paging.ts` do"*. `packages/domain/src/entry/` does not exist; bundle entries live in `packages/board/src/server/entry/`. The cited pair has no entry: `listingPagingFor` has no production caller (only `test/listing-page.test.ts` and the corpus test), and it holds branching logic inside `adapters/`, which is the opposite of the data-only rule the plan cites it for.
- **Misleading:** *"The 2.1.286 binary holds `You've hit your ` and the three limit names"*. It holds at least two more, `fast limit` and `monthly spend limit`. A `fast limit` message reads `unstarted` and takes today's false path. The Open Point covers unmeasured shapes, but the claim reads as complete.

## 3. New defects

- **A status-0 exit that quotes the limit line reads as a limit.** The rule now runs on every exit, over the last 200 lines, and matches *"a limit line for this harness, whatever the status"*. A `claude -p` result is the agent's final message. On this estate the plans, panel files and slice-2 fixtures carry the literal `You've hit your session limit · resets 5:20pm (Europe/Zurich)`, so the agent that builds slice 2 is likely to quote it, often on a line of its own inside a code block. That finished prompt then reads `limited`: the loop waits until the next 5:20pm plus 60 s, holds the agent and the slice for up to 24 h, and resumes a finished slice. The plan accepts *"one prompt"* as the cost of a false wait; the real cost is the wait. No listed test sends a status-0 output that quotes the line and expects `ran`.
- **The pipe construct is unspecified** (section "What I executed"). The existing suite catches it, so this is a note.

## 4. Slices

Both slices can be built. Slice 1's outcomes are checked by domain tests under the 100% branch gate. Slice 2's cases are each an assertion on exit code, ending reason, marker text, `attempts` and the findings file. The message carries minutes, not seconds, so *"a reset 2 s ahead"* must come from `PLOT_LIMIT_CLOCK_OFFSET_SECONDS` placing now at 17:19:58 Zurich; the seam allows this. Name where `entry/prompt-exit.ts` lives.

## 5. Required change

On a status-0 exit, read `limited` only when the limit line is the last non-empty line of the output and matches the whole line from its start; keep the current rule for a non-zero exit. Add a slice-1 test in which a status-0 output quotes the #1141 line before a final line of other text, and the answer is `ran`.
