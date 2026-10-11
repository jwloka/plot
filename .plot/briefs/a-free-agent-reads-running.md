## Implementation brief — the-fleet-closes-its-review-findings (wave A free agent reads running)

- **Plan (canonical):** `docs/plans/2026-10-10-the-fleet-closes-its-review-findings.md` on main
- **Approved:** 2026-10-10, Jan Wloka, plan-PR #1499 merged
- **Branch:** `bug/a-free-agent-reads-running` (base: `main`)
- **Ends as:** one PR to main
- **Review of the code:** repo convention (CI green + review, `Review: pr`)

Second wave. `bug/an-unknown-supervisor-keeps-the-scan` (#1514) merged
(`f95512490`), so this branch starts from a main where `fleetOwnsScan`
already reads `unknown` correctly. Slices 9, 10, 11 and 12 also touch
`plot-fleetctl.sh` and cannot start until this one merges — the plan runs
one heading at a time because every pair sharing a file would collide.

### What to build

**The fleet has three separate readings of "is an agent running on this
desk", and a free agent in its wait loop fails one of them.** `#1450`.

1. `--status` (`plot-fleetctl.sh:894`, `desk_running` at `:576`) asks
   `plot_worker_state`, which for a live wrapper with no agent child falls
   through to `plot_worker_task_state` (`plot-worker-state.sh:1170-1189`),
   which calls `plot-task.mjs`. That rule's whole logic is `hasPr →
   finished; blocked → waiting; dirty/unpushed → stalled; else finished`
   — it has **no free-wait case at all**, so a free agent (no PR, no
   claim, clean detached tree) falls through to the `else` and reads
   `finished` while its loop is very much alive, polling for a hand-over.
2. `plot-dispatch.sh --start`'s running count (`:2341-2348`, numbered
   `2337-2346` in the plan from an earlier line count) does not call
   `plot_worker_state` at all — it loops every worktree, reads
   `.plot-worker.pid` directly, and counts it with a bare `ps -p`. No
   manifest, no staleness check, no free-wait read.
3. `--restart`'s refusal (`plot-dispatch.sh:1933-1937`, `handover_refusal`
   at `:1031-1036`) asks `worker_state` → `plot_worker_state`, the same
   path as #1 — so it refuses a free agent's desk for the wrong reason
   too (it thinks nothing is running there, or thinks something unnamed
   is, depending on how `finished` is read upstream), rather than
   refusing it for the right reason (a live loop that is correctly idle).

Make all three ask one domain reading: a desk whose loop pid is alive
*and* which holds a current `.plot-worker.freewait` record reads
`running`, named as a free wait rather than confused with real work.

### The decisions the plan settles — do not re-derive them

**The domain rule already exists and is already proven — write no new
rule.** `deskLoopAlive` and `FREE_WAIT_FILENAME`
(`packages/domain/src/rules/desk-loop-alive.ts`) ship today with full
test coverage (`packages/domain/test/desk-loop-alive.test.ts`, 13 cases)
and one live caller: `packages/fleet/src/shared/continuation.ts:657-666`.
That caller is the pattern to copy, not a file to touch for its own sake:

```ts
const manifestAnswer = deskManifestFor(opts.repoRoot, worktree, opts);
const loopPids: DeskPidReading[] = [
  { source: '.plot-worker.pid', pid: await readDeskPid(worktree) },
  ...(manifestAnswer.kind === 'named' ? recordedLoopPids(manifestAnswer.path) : []),
];
const loop = deskLoopAlive({ pids: loopPids, alive: pidAliveEverywhere });
const loopWaitsFree = loop.kind === 'alive' && deskWaitsFree(deskFreeWait(worktree), loop.pid);
```

`pidAliveEverywhere` reads `EPERM` as alive (a wrong "not alive" would
start a second loop on an occupied desk — the worse failure); a plain
`kill -0`/`ps -p` check does not make that distinction, which is part of
why the three call sites disagree today. Reuse `pidAliveEverywhere`'s
bias, not a fresh `ps` check.

**This is a wiring slice, not a design slice.** The only genuinely new
code is the glue that makes `plot-task.mjs` (or whatever shell/JS
boundary `--status` crosses) *receive* a free-wait reading as an input,
because today nothing upstream of it reads `.plot-worker.freewait` at
all — `plot_worker_task_state`'s four inputs are `has_pr`, `blocked`,
`dirty`, `unpushed`, and free-wait is a fifth fact none of them carry.
Decide where that reading is taken (shell, inside `plot-worker-state.sh`,
alongside the existing manifest/pid reads) and pass it through rather
than inventing a second rule beside `deskLoopAlive`/`deskWaitsFree`.

**`--start`'s count is the one call site with no shared helper to
extend** — it never called `plot_worker_state` and has no task-state
detour to fix. Point it at the same domain reading directly (loop-alive
+ free-wait), not at `plot_worker_state`'s full state machine, which
answers more questions than "is this desk occupied" and would reintroduce
the `finished`-for-a-free-agent problem one layer up.

**`--restart`'s refusal changes its *reason*, not its outcome for a busy
desk.** A desk genuinely mid-task must still refuse `--restart` exactly
as before; only a free-waiting desk's refusal text and classification
change (from "nothing running, so this looked safe to restart" or
"something unclear is running" to "a free agent is waiting here —
confirm before replacing it"). Do not relax the refusal itself.

### Done when

The plan's `## Done when` entry for this slice: *`--status` reports a
desk with a live loop and `.plot-worker.freewait` as running, and
`--start` and `--status` count the same agents on one fixture.* Build the
fixture so it actually distinguishes the three readings rather than
agreeing by accident: one worktree with a live wrapper pid, a current
`.plot-worker.freewait` naming that pid, no PR, no claim, clean tree —
today `--status` reads it `finished` and `--start`'s count treats it as
running (bare `ps -p` on the pid file succeeds), so a passing fixture
before this slice's fix would mean the fixture itself is not
disagreement-shaped (per `mutation-test-fixtures-must-make-arms-disagree`
in project memory). After the fix, assert both `--status` and `--start`
read it `running`, and `--restart` refuses it by name as a free wait.

Add the missing direct test for `continuation.ts`'s `deskLoopAlive`/
`deskWaitsFree` wiring while here if none exists in
`packages/fleet/test/` — a search during brief-writing found none, only
the 13 cases on the rule itself in isolation.

Plus: the repo's gates. Before each push, run
`node skills/plot/scripts/board/plot-local-checks.mjs` (resolved from the
repo root — this skill directory is `skills/plot-implement/`) and run
exactly what it prints: the tests naming each changed file, the related
tests and typecheck of `packages/domain` and `packages/fleet` (this
slice touches rules in both), and the gate tests and `scripts/check-*.sh`.
The suites under the `CI suites` config key run in CI on every PR — do
not run them locally as a matter of course; a failure there comes back
as a correction, not a blocker now.

Name the shell gate explicitly because this slice touches `.sh`:
`scripts/check-shell-lines.sh` refuses a PR whose shell under `skills/`
grew past its merge-base line count. Wiring three call sites to one
reading should net-shrink `plot-fleetctl.sh` and `plot-dispatch.sh` (the
`--start` count's inline `ps -p` loop goes; `plot_worker_task_state`'s
call site gains at most a short free-wait check) — if it does not, pay
for the growth by removing an equal number of lines elsewhere in the
same change.

### Bookkeeping

Open the PR through the controller once there is a first real commit:

```bash
../plot/scripts/plot-open-pr.sh          # while still in draft
../plot/scripts/plot-open-pr.sh --draft  # or draft explicitly while work moves
```

Do not run `gh pr create` — it has no access to which plan and wave this
branch belongs to and would title the PR from the last commit subject.
Once the PR exists, append `→ #<number>` to this branch's line under the
plan's `## Slices` → `### A free agent reads running` heading, and push
the first real commit as soon as it exists so the branch is visible
rather than silent.

### Scope guard

This branch owns: `plot_worker_task_state`'s call site and its inputs in
`skills/plot/scripts/plot-worker-state.sh`; the `--status` enumeration
(`desk_running`, the loop at `plot-fleetctl.sh:885-936`); the `--start`
running count (`plot-dispatch.sh:2337-2349`); and `--restart`'s refusal
path (`handover_refusal`, `plot-dispatch.sh:1017-1047`, `:1933-1937`).
It may also touch `continuation.ts`'s free-wait wiring in
`packages/fleet/src/shared/continuation.ts` only to add the missing test
coverage named above — not to change its behaviour, which is already
correct and is the pattern this slice copies elsewhere.

Leave `packages/domain/src/rules/desk-loop-alive.ts` and its test alone:
it is fully built and proven; this slice is a consumer, not a designer,
of that rule. Leave `scan-owner.ts` alone — slice 1 (merged) and slice 13
(later) own it, and this slice's file list does not overlap theirs.

Later branches from this plan touch `plot-fleetctl.sh` again (slices 9,
10, 11, 12, each its own heading) and `plot-dispatch.sh`'s neighbourhood
indirectly — none run until this slice merges, so there is no live
collision to track now, only the ordering: this slice lands before any
of those branches are created.

If you find something the plan did not anticipate, report it rather than
improvising outside scope.
