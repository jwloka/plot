# Round 1 — operator lens (unattended fleet)

Position: amend
Evidence: read

## Claims checked on origin/main

- True: the non-zero path at `skills/plot/scripts/plot-worker-loop.sh:2008-2021` raises `attempts` and runs `continue` with no delay; `START_ATTEMPT_BUDGET` is 3 at `:366`; the three sentences are constants at `:2012`, `:2015`, `:2019`.
- True: the prompt starts at `plot-worker-loop.sh:1675` and only `_prompt_status` survives (`:1712`).
- True: `EndingReasonSchema` at `packages/domain/src/entities/ending.ts:55` has no limit reason; `endingIsAttributable` refuses actor `agent` for any reason except `unstarted` (`packages/domain/src/transitions/agent.ts:390`).
- True with a wrong path: the harness read is at `skills/plot/templates/worker-prompt.sh:136`, not `templates/worker-prompt.sh:136`.
- False (Open Points premise): "the wait happens outside `run_bounded`, so the monitor is not running". The worker monitor is not started by `run_bounded`. The dispatch wrapper starts it for the agent's whole life (`skills/plot/scripts/plot-dispatch.sh:1502`), and the pid it watches is the Worker command, that is the loop itself (`plot-dispatch.sh:1502`, `agent=$!`). Only the loop's watcher subshell is per-prompt (`plot-worker-loop.sh:1700-1711`).

## Findings

1. The wait itself produces an `idle` verdict that kills the resumed prompt. During a multi-hour sleep the monitor sees a live pid (the loop), a silent transcript, no child on a core (`sleep`), an unchanged tree, and commits on the branch — the #1141 desk had two. That is the `idle` row (`plot-worker-monitor.sh:14-16`, `:594-600`). The monitor publishes `clear` only on a later pass after the condition stops holding (`:625-634`), every 30 s (`:218`). The resumed prompt's watcher polls every 5 s (`plot-worker-loop.sh:142`) and reads only the last line (`:1494-1503`), which is still `idle`. In the morning the operator finds the slice ended as `quiet` by the monitor seconds after the reset, plus a board that showed the agent as idle all night. The design fixes the instant retries and then loses the same desk one step later.

2. The default fleet sends no harness name. `plot-dispatch.sh:1491` exports `PLOT_HARNESS="$launch_harness"`, which is empty unless a charter names a harness (`plot-fleetctl.sh:897-901`); the prompt template falls back to `claude` itself (`worker-prompt.sh:136`). If slice 2 passes `$PLOT_HARNESS` raw, the bundle sees an unknown harness, matches nothing, and every limit reads as today. The plan must state that the loop applies the same `claude` default.

3. "One wait per slice" is undefined for the common overnight case. A long slice works through one 5-hour window, waits, works through the next and hits the limit again hours later. If the count is per slice, the second limit ends the worker at 03:00 with work in the desk; if it means "the prompt right after a wait", the plan must say how the loop tells the two apart (for example: the limit came back without a new commit or transcript write since the wait). Slice 2's test "a second limit after a wait ends with `limited`" fixes only one reading.

4. The board and supervisor see nothing. A sleeping loop is `running` with no child; the plan defers the label ("a follow-up"). The operator lens needs at least the log line plus a desk-local fact (for example the reset instant in the manifest or a file) so `/plot-fleet` and the reaper can tell a waiting agent from a stuck one.

5. The wall-clock sleep is unspecified. A single `sleep N` on a macOS laptop does not count suspended time, so a lid closed overnight resumes hours late. The plan should require short steps checked against `date +%s`.

6. Slices are otherwise buildable. Slice 1 is pure domain with a closed test list. Slice 2's done holds by test, but its case list has no fixture for finding 1: a monitor findings file whose last line is `idle` when the resumed prompt starts.

## Required change

Before approval, replace the Open Point with a decided rule for the monitor during the wait, and add the test for it to slice 2. Either the loop writes its own `clear` (or a `waiting` line the watcher ignores) to `.plot-worker.monitor.worker.jsonl` before it resumes, or the monitor reads a desk-local "limited until <instant>" fact and publishes nothing while it holds. The test: a fake harness prints the limit with a near reset, the findings file ends in `idle` during the wait, and the resumed prompt must run to exit 0.
