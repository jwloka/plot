# Round 2 — moderation

Subject: `docs/plans/2026-10-01-a-usage-limit-is-not-a-broken-prompt.md` at `e0758939`.

Gate: `committed skeptic amend`, `committed operator amend`, `committed layering amend`. Reconcile: `unanimous amend skeptic,operator,layering`.

## Evidence

- **Skeptic: executed.** It ran the capture constructs under bash 3.2.57 and bash 5, ran the desk readings on a scratch desk (claim commit, pushed and unpushed commits, untracked file, `.plot-worker.limited`), and searched the 2.1.286 harness binary.
- **Operator: executed in part.** It ran one bash demonstration of `$!` and `wait` under a `tee` pipeline, and traced the monitor, watcher, `--stop`, supervisor, reaper and `plot-fleetctl.sh --status` by reading.
- **Layering: executed in part.** It ran two shell probes of the kill path under bash 5.3.15 and read the layering documents.

## Round 1 answered

All three jurors find every round-1 item answered: the harness default, the monitor rule during the wait, the progress reset, the desk readings, the rule-input shape, the unaskable fallback, the clock-checked steps, and the exit-0 blind spot. The skeptic marks the progress reset *partly*: round 1 asked for a commit **or a transcript write**, and the plan counts commits only. A resumed prompt that edits files without committing and meets the limit within 600 s ends the worker; the marker still names the dirty paths, so nothing is lost, but the plan should state this as a choice.

## Agreement

- **The `tee` pipeline moves `$!` off the prompt (all three, executed by all three).** `bash -c … 2>&1 | tee -a f &` makes `$!` the pid of `tee`. `run_bounded` stores `$!` as `_prompt_child` (`:1674-1676`), and the bound, the idle watcher and the `--stop` trap end the prompt through `_kill_tree "$_prompt_child"` (`:1595`). The prompt is a sibling of `tee`, not its child, so the kill misses it. The exit status survives only because the loop runs `set -o pipefail` (`:70`). Process substitution, `> >(tee -a "$out") 2>&1 &`, keeps `$!` on the prompt; the skeptic measured the captured file complete after `wait` in 200 of 200 runs. The layering juror requires the construct to be named and a slice-2 test in which the bound ends a captured prompt and the prompt process is gone. The skeptic notes `workerloop.test.mjs:386` (no stray sleep after a timeout) would catch the naive pipe; the layering juror notes the plan's own `--stop` test would not, because no prompt runs during the wait.
- **A status-0 exit that quotes the limit line reads as a limit (skeptic and layering).** The rule reads the last 200 lines on every exit and answers `limited` whatever the status. A `-p` run prints the agent's final message, and plans, panel files and fixtures on this estate carry the #1141 line verbatim. A finished slice that quotes it would wait until the next reset, up to 24 h, holding the agent and the slice. Both require a positional condition on status 0: the limit line is the last non-empty line and matches from its start. A slice-1 test: a status-0 output quotes the line before a final line of other text, and the answer is `ran`.
- **`entry/prompt-exit.ts` is placed in a directory that does not exist (skeptic and layering).** Bundle entries live in `packages/board/src/server/entry/`. The cited precedent pair has no entry either, and `listingPagingFor` holds branching inside `adapters/`, which is the opposite of the data-only rule it is cited for.

## Single-juror findings

- **Operator (required):** `/plot-fleet --status` prints the waiting line for any desk holding `.plot-worker.limited`, and the file must outlive the reset because the monitor measures silence from its instant. The next morning an operator reads *"waiting until 17:20"* for an agent that resumed at 17:21. Print the line only while the instant is in the future (`plot-fleetctl.sh:768-796` already reads the clock), and add a slice-2 test over a future and a past instant. The Changelog's `--status` promise has no test today.
- **Operator:** *"During the wait the verdict is `busy`"* is misleading as a mechanism: subtracting a future instant gives a negative silence, which `sample_verdict`'s `*[!0-9]*` arm (`:533`) answers `unknown`. Neither publishes, so the slice-2 assertion holds; a test asserting `busy` would fail for the wrong reason. The plan should state `busy` is computed by clamping, or assert "no finding published" only.
- **Operator:** the `plot-dispatch.sh:2049-2056` citation shares only `-- .` with the plan's desk reading; the plan's reading is correct, the citation overstates the match.
- **Skeptic:** the binary also holds `You've hit your fast limit` and `You've hit your monthly spend limit`. The plan's claim reads as a complete list; it should name them, and decide whether they are limits.
- **Layering:** the cost argument cites `plot-slice-spend.mjs` as asked "at this exact point", but `record_slice_spend` runs once at slice end on the success path. `docs/shell-and-domain.md` §1 and `CLAUDE.md` still name `plot-worker-loop.sh` as the per-pass case that duplicates. The plan should amend `docs/shell-and-domain.md` §1 in slice 1 to record this exception and its cost argument, rather than contradict the settled document.
- **Layering:** three decisions stay in the shell: whether the wait is allowed (reset against `Worker bound`, bound 0), whether a limit came without progress (600 s, commits since the wait), and which ending follows. The bundle is already asked at this point; passing the bound, the seconds since the last wait and the commit count would let one answer (`wait <epoch>`, `end-limited`, `unstarted`, `ran`) carry all of it under the 100% gate.
- **Layering:** the answer format is unstated. Write epoch seconds beside the ISO instant in the answer and in `.plot-worker.limited`, so the loop, the monitor and `plot-fleetctl.sh` compare integers and avoid BSD/GNU `date` parsing.

## Disagreement

The jurors do not disagree on the position or on any finding; each required change is different, and none contradicts another. They disagree on weight: the skeptic calls the `tee` hazard *"a trap for the implementer, not a blocker"* because the existing suite catches it, while the layering juror makes it the required change because the `--stop` path is not caught. Both name the same fix, so an amendment that names the construct and adds the bound test settles it either way.

## Shared blind spot

All three lenses read the loop, the monitor and the shell around them. None read the board: what a row shows for an agent whose desk holds `.plot-worker.limited`. The plan defers the board label, and the operator's first view of a waiting agent is the board, which today shows a running agent with no child as healthy or as idle depending on the monitor's last finding. The amendment should state what the board shows during a wait, even if the answer is "running, with no label until a follow-up".

## What an amendment changes

1. Slice 2 starts the prompt with `> >(tee -a "$out") 2>&1 &`, says `_prompt_child` stays the prompt's pid, and adds a test in which the bound ends a captured prompt and the prompt process is gone.
2. The rule reads `limited` on status 0 only when the limit line is the last non-empty line and matches from its start; slice 1 tests a quoted line that answers `ran`.
3. `--status` prints the waiting line only while the instant is in the future; slice 2 tests a future and a past instant.
4. The answer and `.plot-worker.limited` carry epoch seconds beside the ISO instant.
5. The wait-allowed and without-progress decisions move into the rule, with the bound, the seconds since the last wait and the commit count as arguments.
6. Slice 1 amends `docs/shell-and-domain.md` §1 to record the per-exit call and its cost argument.
7. Corrections: the entry lives in `packages/board/src/server/entry/`; the `listing-paging` precedent is dropped or stated accurately; `busy` is a clamp or the test asserts no finding; the `plot-dispatch.sh:2049-2056` citation is narrowed to `-- .`; the fast and monthly-spend limit lines are named and decided; the commit-only progress rule is stated as a choice; the board's view of a waiting agent is stated.
