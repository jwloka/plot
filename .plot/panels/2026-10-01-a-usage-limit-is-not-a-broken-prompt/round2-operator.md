# Round 2 — operator lens (unattended fleet)

Position: amend
Evidence: executed

Subject: `docs/plans/2026-10-01-a-usage-limit-is-not-a-broken-prompt.md` at `e0758939` (origin/main `19fcf482`). I traced the worker monitor, the loop's watcher, `--stop`, the supervisor, the reaper and `plot-fleetctl.sh --status` by reading origin/main. I executed one thing: a bash demonstration in my scratch dir of what `$!` and `wait` return when a backgrounded prompt is piped through `tee` (finding 3b). I ran no loop, monitor or harness.

## 1. Round-1 changes

- Item 1, harness default: **yes.** "The loop sends `${PLOT_HARNESS:-claude}` to the bundle" (Approach), and slice 2 tests "the same case with `PLOT_HARNESS` set and empty still reads `limited`".
- Item 2, the monitor during the wait: **yes.** "While the file names an instant, `sample_verdict` measures transcript silence from the later of the newest transcript line and that instant. During the wait the verdict is `busy`, so no `idle` is published." Slice 2 runs the monitor beside the loop and requires that no `idle` is published and that the resumed prompt runs to exit 0. The monitor stays the only writer of the findings file. My round-1 blocker is answered.
- Item 3, the wait count: **yes.** "Any other limit resets the count". Only a limit that returns within 600 s of a wait, with no new commit, ends the worker.
- Item 4, desk sentences and false premises: **yes.** The plan reads with `plot_worker_dirty` and `git rev-list --count "origin/$main_branch..HEAD" -- .`. The per-pass precedent is now `plot-slice-spend.mjs` (`:1011`, `:2114`).
- Item 5, layering, fallback and sleep: **yes.** "`promptExit` takes the patterns as an argument", "The adapter is data only", "An unaskable bundle is today's path", "sleeps in steps of at most 60 s … as `_wait_sleep_pid`".
- Single-juror findings: **yes** for all of them: `tee` of both streams, `Worker bound` 0, the 120 s grace window, the fixture in `second-slice.test.mjs`, the clock and margin seams, `ending.test.ts:45`, the bundle touchpoints, the desk-local fact (`.plot-worker.limited`), clock-checked steps, and the `--restart` desk reading.
- Shared blind spot, exit 0: **yes.** "The rule is asked on every exit, not only a non-zero one", plus an Open Point to record the observed status. A slice-2 test covers "a limit line with status 0 waits rather than clearing the branch".

## 2. Added claims against origin/main

- `plot-dispatch.sh:892` `launch_harness=""`, `:1491` `PLOT_HARNESS="$launch_harness"`, `:1502` the wrapper starts the worker monitor: **true**.
- `plot-worker-monitor.sh:14-16` and `:594-600`, the four `idle` conditions: **true**. The quiet window is `PLOT_MONITOR_QUIET_SECONDS` (900, `:299`) and `idle` needs two passes (`:595`).
- `plot-worker-loop.sh:142` poll of 5 s, `:1494-1503` `monitor_says_idle` reads only the last WorkerMonitor line: **true**.
- `plot-worker-loop.sh:1398` `_wait_sleep_pid`, and the trap reaps it at `:1599`: **true**. The existing wait (`:1859-1862`) is `sleep & wait`, which a TERM interrupts, so "`--stop` ends a waiting agent at once" holds for that pattern.
- `plot-worker-loop.sh:125-130` (bound 0 disables the floor), `:366` budget 3, `:73` `plot-tmp.sh` sourced, `:712` `plot-worker-state.sh` sourced: **true**.
- `plot-worker-state.sh:89` `PLOT_WORKER_RECORD='\.plot-worker\.'` and `:389` `plot_worker_dirty`: **true**. The monitor's tree fingerprint drops `.plot-worker.` too (`plot-worker-monitor.sh:419-420`), so writing `.plot-worker.limited` cannot change the tree between passes.
- `plot-worker-loop.sh:1011`, `:2114` `plot-slice-spend.mjs`: **true**.
- `packages/domain/vitest.config.ts:71` 100% on `src/!(adapters)/**`: **true**. `rules/listing-page.ts` and `adapters/host/listing-paging.ts` exist: **true**. `test/ending.test.ts:45` pins the five reasons: **true**. `skills/plot/templates/worker-prompt.sh:136`: **true**.
- "the reading `plot-dispatch.sh:2049-2056` uses": **misleading**. That reading is `refs/remotes/origin/$MAIN..refs/remotes/origin/$br -- .`, which counts remote refs only. The plan's `origin/$main_branch..HEAD -- .` shares the `-- .` filter and nothing else. The plan's own reading is correct for a desk; only the citation overstates the match.
- "During the wait the verdict is `busy`": **misleading as a mechanism**. If the implementation subtracts a future instant, the silence is negative and `sample_verdict`'s `*[!0-9]*` arm (`:533`) answers `unknown`, not `busy`. Neither verdict publishes, so the slice-2 assertion ("no `idle` is published") holds either way. A test that asserts `busy` would fail for the wrong reason.

Operator trace. The supervisor answers `leave` for any live worker before it reads anything else (`rules/supervision.ts`, "A LIVE WORKER IS ANSWERED FIRST"). The reaper refuses a live pid. The loop's `Worker bound` watchdog is armed per prompt inside `run_bounded`, so a wait outside it is never killed by the bound. The AgentMonitor reports "holds unlanded work" during the wait, which is true. These parts of the trace hold.

## 3. New defects

a. **`/plot-fleet --status` keeps saying the agent waits after the agent resumes.** The plan prints *"waiting on a usage limit until <time>"* "for an agent whose desk holds the file". It also says the loop "removes it when the slice ends, the agent hops, or the worker ends". The file must stay after the reset, because the monitor measures silence from its instant. So at 09:00 the operator reads "waiting on a usage limit until 17:20" for an agent that resumed at 17:21 and has worked, or got stuck, for 15 hours. That is the waiting-versus-stuck confusion the line exists to remove. `plot-fleetctl.sh:768-796` already reads each desk and the clock (`now=$(date +%s)`), so the fix is a comparison: print the waiting line only while the instant is in the future.

b. **No test proves the `--status` line.** The Changelog promises "`/plot-fleet --status` names the reset time", and slice 2's done names the wiring, but none of the nine slice-2 test cases asserts a `--status` output. As written, that promise is checked by prose only.

c. **"piped through `tee -a`" invites a construction that loses the prompt.** Executed in scratch: `bash -c '…; exit 7' 2>&1 | tee -a f &` then `wait $!` returns 0. `$!` names `tee`, and the prompt is not a descendant of `$!`. `run_bounded` stores `$!` as `_prompt_child` (`:1676`), reads `_prompt_status` from `wait` (`:1719`), and the bound and monitor traps `_kill_tree "$_prompt_child"` (`:1595`). A pipeline would read every failure as exit 0 and make the bound and the `quiet` ending kill `tee` while the agent runs on. Process substitution (`> >(tee -a "$f") 2>&1 &`) keeps `$!` on the prompt; in the same demonstration, `wait $!` returned 7. The slice-2 test "a plain failure keeps today's three retries" catches the lost status. No listed test catches the wrong kill target.

## 4. Buildability

Slice 1 can be built and its done is a closed list of domain cases under the 100% gate. Slice 2 can be built, and eight of its nine cases are assertions on loop output, the findings file, the manifest and the marker. The `--status` line (3b) is the gap. The `tee` hazard (3c) needs one sentence that names how `_prompt_child` stays the prompt's pid, plus one case: a bound or `quiet` ending with output capture on kills the prompt.

## 5. Required change

`plot-fleetctl.sh --status` prints the waiting line only while the instant in `.plot-worker.limited` is later than now. Slice 2 adds a test that runs `--status` over a desk whose file names a future instant and over a desk whose file names a past instant. The first must print the line and the second must not.
