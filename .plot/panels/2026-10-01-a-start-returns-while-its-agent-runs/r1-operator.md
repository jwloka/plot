# Juror r1 — the fleet operator

Position: amend

The cause is right, the order is right, and both slices are needed. Three statements in the plan are false or untestable as written, and each one changes what an operator sees. The changes below fix them without changing the plan's shape.

## 1. The cause, and what else holds the caller

**The stated cause holds.** `plot-dispatch.sh:1472-1536` redirects only the `nohup` command (`>"$log" 2>&1 </dev/null & )`), and `:801-806` redirects only stderr on the outer subshell (`& ) 2>/dev/null`). Nothing else in the launch path holds a stream: `performer-shell.ts:93` reads stdout through `runProcess` (`run-script.ts:98-130`, `detached: true`, `killGroup` on timeout, answer on `close`); `scripts-shell.ts:132-149` (the board's dispatch button and auto-dispatch) writes to a log fd and has no timeout, so it neither blocks nor group-kills.

**The cause is not new.** `test/reconcile/dispatch.test.mjs:3350-3381` (`runDetached`) records it on 2026-09-05: *"`--start 1` with a `Worker command: sleep 300` returned in 4 ms to a file and blocked for the full 300 s to `| tail`"*. The test suite routes around the defect instead of failing on it. The plan does not cite this.

**A caller the plan does not name: `/plot-fleet --start`.** `plot-fleetctl.sh:1064-1067` runs `plot-dispatch.sh --start` inline. Run from a Claude Code Bash tool (stdout is a pipe), the tool call waits for the agents to exit, and a tool timeout then kills the group the agents share.

**The outer redirect alone leaves the dispatcher-named parent in place.** I measured four forms of the launch in `fork-1144/jurors/operator/` (agent `sleep 8`, read with `out=$(bash formX.sh)`):

| form | returns | wrapper's parent | wrapper PGID |
|---|---|---|---|
| A: outer redirect (Slice 1 as written) | 0 s | `bash formA.sh`, PPID 1 | the caller's (84714) |
| B: A + `set -m` | 0 s | `bash formB.sh`, PPID 1, **group leader** | 85224 = the forked bash |
| C: A + `exec nohup` | 0 s | launchd | the caller's (84714) |
| E: A + `set -m` + `exec nohup` | 0 s | launchd | 86105 = **the wrapper itself** |

Form A fixes the stream, but the forked bash with the dispatcher's command line still lives for the agent's whole life. To `ps`, an operator still sees `plot-dispatch.sh --start 1` with PPID 1 for hours. That is the exact symptom that raised #1144. Only `exec` removes that process; `VAR=x exec nohup …` works with the env prefix (form C). `:1283-1287` explains why that subshell exists (the env prefix stops bash collapsing the list) and must be rewritten when it goes.

## 2. Do the slices fix it, and what breaks

**The `--stop` claim is false.** The plan says *"`--stop` and the monitors find the wrapper by its recorded pid, not by its group, so they are unchanged."* `plot-dispatch.sh:1790-1805` reads the agent's PGID and sends `kill -TERM -<pgid>` (#1084). Pinned by `test/reconcile/reap-agent-liveness.test.mjs:226-247`. The fallback to a single pid applies only when the group is this run's own.

**That makes Slice 2 a behaviour change to `--stop`, and an improvement.** Today every agent that one `--start N` starts shares the dispatcher's group (form A: PGID = the caller's). `start_worker` runs once per agent in one shell (`:2455`). So after `/plot-fleet --start 3`, `--stop` on one agent that has since taken a branch signals the shared group and ends all three. After Slice 2 (form E), each agent's group is its wrapper, so `--stop` ends one wrapper, its three monitors and its agent, and nothing else. The #1084 test fixture already makes the wrapper its own leader (`detached`), so it stays green. The plan must state the change and test it.

**Nothing else breaks.** `plot-worker-state.sh`, `plot-reap.sh` and `plot-worker-monitor.sh` use `kill -0 <pid>` only (`plot-worker-state.sh:840,1027`, `plot-worker-monitor.sh:361`; grep for `pgid` in them finds nothing). The manifest pid fields are written by the wrapper from `$$` and `$!` inside `sh -c` (`:1502-1535`), and `exec` does not change those values. `plot-worker-loop.sh` kills by tree, not by group (`_kill_tree`, `:1432-1440`). `runProcess` stays unchanged, as the plan says.

**Slice 2 names the wrapper only.** The brief launch at `:801-806` starts a `claude -p` in the dispatcher's group the same way. It needs the same `set -m` and `exec`.

## 3. Are the Done-when items tests that fail today and pass after?

- Slice 1, pipe EOF in 5 s with `summary: agents=1`, agent alive: **fails today, passes after.** Measured in the 2026-09-05 helper comment and in form A.
- Slice 1, *"No process with the dispatcher's command line remains as the wrapper's parent"*: **fails today and still fails after Slice 1 as designed** (form A). It passes only with `exec`.
- Slice 2, *"alive after a 2 s `runProcess` timeout"*: **passes WITHOUT Slice 2 once Slice 1 lands.** With the stream returned, `close` comes in milliseconds (the issue measured 7 ms), so the timeout never fires and the agent survives by default. The test does not discriminate. Its PGID clause discriminates; the survival clause does not.
- Slice 2, *"`--stop` ends it"*: passes today and after. That is a regression lock, which is fine, but it does not test the new behaviour.

## 4. Repo rules

The plan follows them. No decision moves, so no domain rule is owed. It adds no `plot-*.sh`. The script stays reached from the `performer` adapter. `runProcess` keeps its timeout and group kill. The one gap is a rule the plan's own Approach states: *"the slice confirms that by test"*. That confirmation is the false `--stop` claim above.

## Exact changes

1. **Slice 1 Approach:** put `exec` before `nohup` at both launch sites as well as the outer redirect: `( cd … && VARS… exec nohup sh -c '…' >"$log" 2>&1 </dev/null & ) >/dev/null 2>&1 </dev/null`. Rewrite the comment at `:1283-1287`, which explains the forked subshell this removes.
2. **Motivation:** cite `test/reconcile/dispatch.test.mjs:3350-3381` as the 2026-09-05 measurement of the same defect. Add `plot-fleetctl.sh:1064-1067` (`/plot-fleet --start`) as a caller that blocks.
3. **Slice 1 tests:** rewrite the `runDetached` docstring, which states the defect as a property of the spawn. Add one test that runs `plot-fleetctl.sh --start`'s dispatch hop (or `--start 1` directly) through a pipe.
4. **Slice 2 Approach:** replace *"`--stop` and the monitors find the wrapper by its recorded pid, not by its group, so they are unchanged"* with: *"`--stop` signals the agent's process group (`:1790-1805`, #1084). Today that group is the dispatcher's, shared by every agent one `--start N` started, so stopping one stops all of them. After this slice the group is the wrapper's, so `--stop` ends that agent's wrapper, monitors and agent, and no sibling."* State the mechanism as measured on macOS: `set -m` together with `exec nohup` makes the wrapper the leader. `set -m` alone makes the forked bash the leader (form B). Linux remains to measure.
5. **Slice 2 scope:** apply the same mechanism to the brief launch at `:801-806`.
6. **Slice 2 tests and Done-when:** replace the 2 s `runProcess` timeout test with one that does not depend on timing. Spawn the dispatcher detached, read until `summary: agents=1`, send `SIGKILL` to the dispatcher's group (`process.kill(-child.pid)`), and assert the agent is alive and its PGID equals its wrapper's pid. Add: two agents from one `--start 2` have different PGIDs, and `--stop` on one leaves the other running. Both fail today.

## Evidence I ran

- `gh issue view 1144 -R plot-pm/plot --comments` — the measured cause.
- Read `plot-dispatch.sh:760-817`, `:1064-1539`, `:1720-1816`, `:2440-2466`; `performer-shell.ts:80-128`; `run-script.ts` (grep: `detached: true` :98, `killGroup` :117,:130); `scripts-shell.ts:132-149`; `plot-fleetctl.sh:1050-1150`; `plot-worker-loop.sh:1405-1440`.
- Grep across `skills/plot/scripts/*.sh` for `kill|pgid|setsid|set -m`: the only group signal is `--stop` at `plot-dispatch.sh:1790-1797`.
- Forms A, B, C and E in my scratch directory, as tabulated above. Each run started its own `sleep 8`, which exited by itself. I signalled no process.
