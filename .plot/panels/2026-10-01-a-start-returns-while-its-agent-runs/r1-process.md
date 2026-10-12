# Juror r1 — process-lifecycle lens

Position: amend

The cause is right, the order is right, and both slices are needed. Three things in the plan are wrong or missing: one Done-when item fails after the slice it belongs to, slice 2's named mechanism does not give the result the plan describes, and the Linux supervisor kills agents through a path that a process group does not reach.

All measurements: macOS 15 (Darwin 24.6.0), `/bin/bash` 3.2.57 and `/opt/homebrew/bin/bash` 5.3.15 (the script's `#!/usr/bin/env bash` resolves to the second). Scripts and the runner live in `/private/tmp/.../scratchpad/fork-1144/jurors/process/` (`form-*.sh`, `run.mjs`). `run.mjs` is a copy of `runProcess`: `spawn(..., {detached: true, stdio: ['ignore','pipe','pipe']})`, SIGKILL to `-pid` on a timer, result on `close`. Linux was not measured.

## 1. The cause

Right, and complete for the caller's streams. Read at `plot-dispatch.sh:1472-1536`: `( cd "$wt" && { …; } && VARS… nohup sh -c '…' >"$log" 2>&1 </dev/null & )`. The redirect covers only `nohup`. The brief launch at `:801-806` ends `& ) 2>/dev/null`, so stdout is still held. `--restart` (`:1914`) and the free start (`:2455`) both go through `start_worker`. No third launch site exists: `grep -n 'nohup\|& )\|setsid\|set -m'` over `skills/plot/scripts/*.sh` finds only `:804/806` and `:1502/1536`. The monitors and the loop's hops run inside the wrapper, whose fds 0-2 are the log and `/dev/null`, so they hold nothing of the caller's.

The repo has measured this before. `test/reconcile/dispatch.test.mjs:3351-3366` (`runDetached`) says: "`--start 1` with a `Worker command: sleep 300` returned in 4 ms to a file and blocked for the full 300 s to `| tail`" (2026-09-05). The test suite works around the defect rather than asserting it. Slice 1 makes that doc comment false, so slice 1 must rewrite it.

Slice 2's second consequence is right too. `runProcess` (`run-script.ts:93-131`) clears its timer in `finish`, so the group kill fires only when `close` is late. `close` is late exactly when the stream is held. A second killer exists in the same function: the `maxBuffer` path at `:113-118` also calls `killGroup`.

## 2. The slices, measured

| form | close | wrapper PPID / PGID | agent after 2 s timeout |
|---|---|---|---|
| today's shape, outer redirect only (slice 1) | 5 ms | PPID = forked bash 51949, PGID = dispatcher 51944 | alive, but in the dispatcher's group |
| `set -m` added, no outer redirect (slice 2 alone) | **8017 ms** | new group | ran its 8 s |
| `set -m` + outer redirect (both) | 6-8 ms | PPID = forked bash, **PGID = forked bash (30242), not the wrapper (30244)** | alive |
| **no AND-list**: `( cd . \|\| exit 1; set -m; VARS nohup sh -c '…' >log 2>&1 </dev/null & )`, no outer redirect | 5 ms (3.2), 9 ms (5.3) | **PPID 1, PGID = wrapper** (2638/2638; 3118/3118) | alive |

What the table shows:

- **The order is right.** Slice 2 alone does not shorten the return. `close` waited the agent's whole 8 s, because the held bash moved into the new group with the agent.
- **`set -m` does not make the wrapper the group leader.** The plan says "The wrapper starts as the leader of a new process group." With today's AND-list, `set -m` makes the *forked bash* the leader, and the wrapper is its child. `--stop` (`:1790-1797`) still works, because it signals `-pgid` read from the recorded pid. But "the wrapper leads its group" is false, and so is any test or doc that assumes `pgid == wrapperPid`.
- **The AND-list is the root cause, and removing it fixes both slices at the source.** If `cd`, the `PLOT_CAPABILITIES` export and `set -m` run as separate statements inside the subshell, the `&` applies to the simple command `nohup …` alone. Bash's child then execs `nohup` with the redirects already applied. No intermediate bash exists, nothing holds the caller's stdout even without the outer redirect, and the wrapper is the group leader with PPID 1. Both bash versions behave the same.
- **`set -m` under a terminal.** Run under `script -q /dev/null` (a pty), neither bash printed a job-control warning. The agent stayed in state `S`, not `T`. Opening `/dev/tty` gave `Device not configured` once the pty closed. Without the AND-list the group's leader is reparented to PID 1, so the group is orphaned: POSIX turns SIGTTIN/SIGTTOU into EIO for an orphaned group, and the group does not stop. With the AND-list kept, the leader's parent is the subshell, which exits at once, so the result is the same in practice.
- **Behaviour change to name.** A `Ctrl-C` during an operator's `--start 3` today reaches the foreground group, which includes the agents already started. After slice 2 it reaches only the dispatcher. That matches the `nohup` intent, but the plan should state it.

What slice 2 does not reach: **systemd kills by cgroup, not by process group.** `skills/plot/units/plot-registryd.service` sets `Type=simple`, `Restart=always` and no `KillMode`, so the default `control-group` applies. On Linux, every `systemctl --user stop|restart plot-registryd`, and every exit of the main process before `Restart=always` brings it back, sends SIGTERM to every agent the supervisor started. A new process group stays in the same cgroup. The plan's sentence "a signal to the starter's group never reaches an agent" is true for `runProcess` and false for the supervisor's own lifecycle on Linux. launchd is different: `runProcess` spawns detached, so the dispatcher's group is not registryd's, and launchd's group kill on job exit misses it. That was not measured.

Effects on existing consumers, read rather than run:

- **`--stop`** (`:1783-1805`): the `stop_pgid != stop_own_pgid` guard now always chooses the whole group, which is the #1084 intent. The comment at `:1787-1789` ("a worker started without job control shares its starter's group") becomes the old shape and needs one line updated.
- **`plot-worker-state.sh:159-214`** reads the manifest pid and its `lstart`. Neither changes.
- **The manifest stamp** (`:1502-1535`) writes `$$` and `$!` from inside the wrapper. Neither changes. `dispatch.test.mjs:1595-1604` asserts that the recorded wrapper is the agent's parent, and that still holds.
- **The monitors** are backgrounded by a non-interactive `sh`, so they stay in the wrapper's group. `plot-worker-monitor.sh:361` checks `kill -0 $pid` by pid. `plot-worker-loop.sh:1433` `_kill_tree` walks `pgrep -P`, not groups.
- **`plot-reap.sh`** contains no `kill` or `pgid` (grep). It reads liveness only.
- **`test/reconcile/reap-agent-liveness.test.mjs:226-247`** builds its own detached wrapper (`setsid`) and asserts "whole process group <wrapper.pid>". It does not run the real launch, so it does not break. It describes the shape slice 2 produces only if the AND-list is removed.

## 3. Done-when items

- **Slice 1, "returns within 5 s through a pipe, `summary: agents=1`, agent alive":** fails today (`runDetached`'s measured 300 s block) and passes after. Good.
- **Slice 1, "No process with the dispatcher's command line remains as the wrapper's parent":** **fails after slice 1 as designed.** Measured: with only the outer redirect, the wrapper's PPID is the forked bash, whose command line is the dispatcher's. The outer redirect frees the stream but keeps that process. The item passes only if the AND-list goes.
- **`--restart` and the brief launch, "the same test":** discriminating. The brief test needs a `Brief command` that outlives the read.
- **Slice 2, "alive after a 2 s timeout fires":** **not discriminating once slice 1 has landed.** `--start 1` then closes in milliseconds, `finish` clears the timer, and the group kill never fires. The test passes with or without slice 2. Its other clause, "PGID differs from the dispatcher's", does discriminate. The kill must be forced, not raced against a timer.
- **Slice 2, "`--stop` ends it":** passes today and after. That is right for a regression lock, but it is not a test that fails today.

## 4. Repo rules

The plan follows them. No decision moves, so no domain rule is owed. No new `plot-*.sh`. `runProcess` and `killGroup` stay as they are, and the scripts are still reached through `performer-shell.ts:93`. A `'plot': patch` changeset is owed and the plan does not mention it; the CI gate catches that anyway.

## Exact changes

1. **Slice 1, Approach:** replace "redirect stdin, stdout and stderr on the OUTER subshell" with: "Remove the AND-list. Inside the launch subshell, `cd "$wt" || exit 1`, the `PLOT_CAPABILITIES` export and the env prefix become separate statements, so the `&` applies to `nohup …` alone and bash forks no intermediate shell. Also redirect the outer subshell (`( … ) >/dev/null 2>&1 </dev/null`), so that output from the subshell itself before the launch cannot reach the caller." Do the same at the brief launch, `:801-806`. Measured: no AND-list returns in 5-9 ms with no outer redirect, and the wrapper's PPID is 1.
2. **Slice 1, tests:** rewrite `runDetached`'s doc comment (`dispatch.test.mjs:3351-3366`) so it describes the fixed behaviour. Make one existing `--start` test read through a pipe, so that the old workaround is the thing that breaks.
3. **Slice 2, mechanism:** replace "`set -m` in the launching subshell is the first candidate" with "`set -m` before the `nohup` statement, with no AND-list (slice 1), makes the wrapper its group's leader: measured `pgid == wrapperPid`, PPID 1, on bash 3.2 and 5.3. With the AND-list kept, the forked bash leads the group instead." Keep the Open Point for Linux only, and run the measurement in CI's ubuntu job.
4. **Done when, slice 1:** keep "no process with the dispatcher's command line remains as the wrapper's parent". That is only correct once change 1 is made. Without change 1, move the item to slice 2 or drop it.
5. **Done when, slice 2:** replace "alive after a 2 s timeout fires" with: "after `--start 1` prints its summary, the test sends SIGKILL to the dispatcher's group (`process.kill(-dispatcher.pid)`), as `killGroup` would. The agent is alive afterwards, and the agent's PGID equals the recorded `wrapperPid` and differs from the dispatcher's pid." This fails today and passes after slice 2, whatever the timing.
6. **What this does NOT do:** add "On Linux, systemd stops a service by cgroup (`plot-registryd.service` sets no `KillMode`, so the default is `control-group`). Stopping or restarting the supervisor still ends every agent it started. A process group does not change that, and it needs its own plan (`KillMode=process`, or starting agents through `systemd-run --user --scope`)." Add an issue reference if one is filed.
7. **Design, slice 2:** add one sentence: "A terminal `Ctrl-C` during `--start N` ends the dispatcher and no longer reaches the agents it already started."
8. **Slice 2:** update the comment at `plot-dispatch.sh:1787-1789`, because sharing the starter's group is no longer the normal case.
