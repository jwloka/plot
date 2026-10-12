# Round 2 — layering juror

Position: amend
Evidence: executed

Subject: `docs/plans/2026-10-01-a-usage-limit-is-not-a-broken-prompt.md` as committed at `e0758939` (unchanged at `origin/main` `19fcf482`). Line references below are on `origin/main`, read in a detached worktree. Two shell probes ran in my scratch dir under GNU bash 5.3.15.

## 1. Round-1 changes

| Asked for | Answered | Plan sentence |
|---|---|---|
| 1. `${PLOT_HARNESS:-claude}` and a test with the variable empty | yes | *"The loop sends `${PLOT_HARNESS:-claude}` to the bundle"*; slice 2: *"the same case with `PLOT_HARNESS` set and empty still reads `limited`"* |
| 2. A decided monitor rule during the wait, with a test | yes | *"`sample_verdict` measures transcript silence from the later of the newest transcript line and that instant"*; slice 2: *"no `idle` is published during the wait, and the resumed prompt runs to exit 0"* |
| 3. The wait count resets after progress | yes | *"Any other limit resets the count"*, with *without progress* defined as started after a wait, under 600 s, no new commit |
| 4. `plot_worker_dirty`, `$MAIN..branch -- .`, false premises corrected | yes | *"Uncommitted paths: `plot_worker_dirty` (`plot-worker-state.sh:389` …)"*; the `plot-prompt.mjs` premise is gone and `plot-slice-spend.mjs` is cited instead |
| 5. Patterns as argument, data-only adapter, unaskable falls back, clock-checked steps reaped by the trap | yes | *"`promptExit` takes the patterns as an argument; it imports no adapter"*, *"The adapter is data only"*, *"An unaskable bundle is today's path"*, *"Each step runs as `_wait_sleep_pid`"* |
| Skeptic: `tee` both streams | partly | *"stdout and stderr piped through `tee -a`"*. The mechanism breaks the loop's kill path; see section 3 |
| Skeptic: `Worker bound` 0, 120 s grace, test seams, fixture location | yes | *"A bound of `0` disables … this cap"*, *"A reset up to 120 s in the past is now"*, `PLOT_LIMIT_CLOCK_OFFSET_SECONDS`, `PLOT_LIMIT_MARGIN_SECONDS`, *"`test/reconcile/second-slice.test.mjs:370-440`"* |
| Layering: `ending.test.ts:45`, `build.mjs`, `bundles.generated.ts`, `.gitattributes` | yes | slice 1 names all four |
| Operator: desk-local "limited until" fact, suspended-laptop sleep | yes | `.plot-worker.limited`; *"sleeps in steps of at most 60 s and compares the clock after each step"* |
| Shared blind spot: exit 0 | yes, by asking on every exit | *"The rule is asked on every exit, not only a non-zero one"*. This creates two new problems; see section 3 |

## 2. Added factual claims

- True: `plot-dispatch.sh:892` sets `launch_harness=""`; `:1491` exports `PLOT_HARNESS="$launch_harness"`; `:1502` starts `$PLOT_WORKER_MONITOR` in the wrapper.
- True: `worker-prompt.sh:136` reads `harness="${PLOT_HARNESS:-claude}"`.
- True: `plot-worker-monitor.sh:14-16` and `:594-600` state the four `idle` conditions; `sample_verdict` is at `:502`.
- True: `plot-worker-loop.sh:73` sources `plot-tmp.sh`; `:125-130` treats bound 0 as no bound; `:142` sets the 5 s poll; `:1494-1503` is `monitor_says_idle`; `:1398` declares `_wait_sleep_pid`; `:1597-1599` reaps it in the trap; `:1011` is the slice-spend bundle and `:2114` calls it; the three sentences sit at `:2012`, `:2015`, `:2019`.
- True: `PLOT_WORKER_RECORD='\.plot-worker\.'` at `plot-worker-state.sh:89`; `plot_worker_dirty` at `:389`; `.plot-worker.limited` matches the pattern.
- True: `plot-dispatch.sh:2049-2056` counts with `-- .` and says why.
- True: `vitest.config.ts:71` holds `'src/!(adapters)/**/*.ts'` at 100% on all four metrics.
- True: `test/ending.test.ts:45` pins the five reasons; `transitions/agent.ts:390` admits `agent` for `unstarted` only.
- Misleading: *"The estate already pays that cost at this exact point: the loop asks `plot-slice-spend.mjs` once per finished slice"*. `record_slice_spend` runs on the success path at slice end, not after every prompt exit, and nothing in `docs/shell-and-domain.md` or `CLAUDE.md:501` records it as an exception. Both still say `plot-worker-loop.sh` is the per-pass case that *"duplicates the rule"*. The plan now asks on every exit, so it is exactly that case. The argument (39 ms after a prompt that ran minutes) is sound, but the plan contradicts the settled doc without amending it.
- Misleading path: *"The entry `entry/prompt-exit.ts`"* sits in a list of domain paths, but `packages/domain/src/entry/` does not exist. Entries live in `packages/board/src/server/entry/` (`prompt.ts`, `slice-spend.ts` and 33 others). An implementer can resolve this, so it does not block.

## 3. New defects

- **`tee` breaks the kill path (executed).** `run_bounded` keeps `_prompt_child=$!` (`:1674`), and the bound, the idle watcher (`USR1`) and the `--stop` trap all end the prompt through `_kill_tree "$_prompt_child"` (`:1595`). With `bash -c … 2>&1 | tee -a f &`, `$!` names `tee`, and the prompt is its sibling, not its child. My probe killed `$!` and the prompt process survived (`prompt 41902 survives killing $!=41903`). The exit status survives (`wait` returned 1 under `pipefail`), so every slice-2 test listed still passes while `--stop`, the bound and the idle ending stop reaching the agent. The plan's own test *"`--stop` during a wait ends the loop within one step"* does not catch it, because no prompt runs during the wait.
- **A status-0 exit that quotes the line becomes a wait.** The rule reads the last 200 lines on every exit and answers `limited` *"whatever the status"*. A `-p` run prints the agent's final text on stdout, and an agent that works on this very feature, or summarises a limit it saw in a log, can print `You've hit your session limit · resets …` in a finished slice. The loop then sleeps until that time. The resumed prompt finds nothing to do, returns in under 600 s with no new commit, and, if it repeats the line, ends the worker as `limited`. Slice 1 lists *"a limit line with status 0"* but no case for a quoted line. The rule needs a positional condition on status 0, such as the limit line being the last non-empty line of output.
- **Decisions sit in the shell.** The plan puts the classification in the rule, but the next three decisions stay in `plot-worker-loop.sh`: whether the wait is allowed (reset against `Worker bound`, bound 0), whether the limit came *without progress* (600 s, commits since the wait), and which ending follows. The Layering Rule says no domain behaviour lives outside the domain, and the bundle is already asked at this exact point. Passing the bound, the seconds since the last wait and the commit count as arguments would let one answer (`wait <epoch>`, `end-limited`, `unstarted`, `ran`) carry all of it under the 100% gate, where the plan now tests these branches only through slow fixture runs.
- **The answer format is unstated.** *"One answer line on stdout"* does not say whether the reset is an epoch or ISO text. The loop must compute a sleep, and the monitor and `plot-fleetctl.sh` must compare `.plot-worker.limited` against the clock in shell, where `date` parses ISO differently on BSD and GNU. Writing epoch seconds beside the ISO instant avoids a portability branch in three scripts.

## 4. Slices

Slice 1 is buildable, and its done is test assertions: the eight listed rule cases, the enum test, and the bundle and attribute gates. Slice 2 is buildable once the capture is fixed. Its done is assertions on the fixture, but it needs one more case: a prompt killed by the bound or the idle watcher while its output is captured, so that the kill provably reaches the prompt.

## 5. Required change

Capture the prompt's output without moving `$!` off the prompt: start it as `bash -c '. "$1"' _ "$prompt_file" > >(tee -a "$out") 2>&1 &`, or redirect it to the temp file and read the log from there. Add a slice-2 test in which the bound ends a prompt whose output is captured and the prompt process is gone afterwards.

Also recommended, not required: add a status-0 positional condition to the rule, move the wait and no-progress decisions into it, and amend `docs/shell-and-domain.md` §1 in slice 1 to record the per-pass exception and its cost argument.
