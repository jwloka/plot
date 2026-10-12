# Juror r1 — the skeptic who reproduces

Position: amend

The diagnosis is right and I reproduced both effects. The two slices are the right fix in the right order. Three things need to change before approval. First, slice 1's own Done-when item fails against slice 1's design. Second, the plan's statement about `--stop` is wrong, and the error hides a third effect of the same defect. Third, slice 2's timeout test cannot fail once slice 1 has landed.

## Reproduction

I copied the launch form from `plot-dispatch.sh:1472-1536` into `form.sh` in my scratch directory. The copy keeps the bash outer subshell, the `cd && { …; } && VARS… nohup sh -c '…' >"$log" 2>&1 </dev/null &` AND-list, a background monitor, `( cmd ) & agent=$!`, the pid files, and `wait "$agent"`. I ran four variants: `cur` (today), `outer` (the plan's slice 1), `outer_m` (slice 1 plus `set -m`), and `outer_exec_m` (slice 1 plus `set -m` plus `exec nohup`). I did not run the real script in a sandbox repository. `test/reconcile/dispatch.test.mjs:3350-3365` already records the same hang at script level (see A6).

**The hang.** I ran `out=$(MODE=… bash form.sh)` with the agent set to `sleep 6`/`4`:

| shell | cur | outer | outer_m | outer_exec_m |
|---|---|---|---|---|
| macOS bash 5.3.15 | 6 s | 0 s | 0 s | 0 s |
| macOS /bin/bash 3.2.57 | 4 s | 0 s | 0 s | 0 s |
| Debian bash 5.2.15, /bin/sh → dash (node:24-bookworm) | 4 s | 0 s | 0 s | 0 s |

**The timeout kill.** I used a node copy of `runProcess` (`spawn` detached, pipes, `process.kill(-pid,'SIGKILL')` at 2 s) with the agent set to `sleep 10`:

```
cur:          close at 2305 ms code=0 summary=true agent 88769 alive=false
outer:        close at  309 ms code=0 summary=true agent 89600 alive=true
outer_m:      close at  309 ms code=0 summary=true agent 89879 alive=true
outer_exec_m: close at  310 ms code=0 summary=true agent 90149 alive=true
```

The 300 ms includes a 300 ms settle delay. Linux gave the same result: `cur` closed at 2317 ms and its agent was dead, and the three variants closed at about 309 ms with the agent alive. Today the runner reports `code=0` and `summary: agents=1` for an agent it has just killed. That confirms the issue comment.

**Who is whose parent, and which group each process is in**, read with `ps -o pid,ppid,pgid,command` after the launch returned:

```
outer:        70270  1     70244 bash form.sh        <- forked bash survives, caller's group
              70273  70270 70244 sh -c printf …      <- wrapper
outer_m:      71710  1     71710 bash form.sh        <- forked bash is the GROUP LEADER
              71711  71710 71710 sh -c printf …
outer_exec_m: 72823  1     72823 sh -c printf …      <- wrapper is the leader; no bash parent
              72829  72823 72823 sleep 30            <- agent in the wrapper's group
```

The same three shapes appeared on bash 3.2 and on Debian bash 5.2.

## 1. Is the cause right and complete?

The cause is right. In the launch path, nothing else holds the caller:

- `start_worker` has two callers, `--restart` (`plot-dispatch.sh:1914`) and `--start` (`:2455`). Both reach the one launch at `:1472-1536`, so one fix covers both.
- The brief launch at `:801-806` has the same shape and redirects only stderr. I found no other `& )`, `nohup` or `setsid` in the scripts. `plot-boardctl.sh:420-427` `exec`s with its own redirect and holds nothing.
- `plot-worker-loop.sh` runs inside the wrapper, whose stdout and stderr are the log. Its background jobs (`:1675`, `:1686`, `:1710`, `:1858`) therefore hold the log and not the caller.
- `performer-shell.ts:93` runs `--start 1` through `runProcess`, which waits for `close` and so waits for both pipes (`run-script.ts:132-134`).
- `scripts-shell.ts:132-148` `start` sends the output to a log file or `ignore` and waits for `exit`, so it is not held. Two other callers wait on pipes with a timeout: `/api/claim` uses `scripts.awaited` with `CLAIM_TIMEOUT_MS = 60_000` (`claim.ts:54`, `:162-165`) to run `--no-start <slug>`. `--no-start` does not gate `request_brief` (`plot-dispatch.sh:3995` runs whatever `no_start` is). A claim on a slice that has no brief therefore holds the same pipe until the 60 s timer fires, and the group kill then ends the brief's `claude -p`. The plan says the brief launch "has the same shape" but names no caller that is hurt. This is that caller.
- `plot-fleetctl.sh:1065` runs `--start` directly, so `/plot-fleet --start` from a Claude Code Bash tool hangs the same way. Slice 1 fixes it and needs no change there.

**The cause is incomplete in one respect: the shared group has a third effect.** Every agent from one dispatcher run shares that run's group. `--stop` signals the group (`plot-dispatch.sh:1782-1797`, since #1084), not the pid. I started two agents from one process, the way `--start 2` calls `start_worker` twice, and sent one `kill -TERM -<pgid>` to the first agent's group, as `--stop` does:

```
outer (today's grouping):  agent1 pgid=7053 agent2 pgid=7053 → both dead
outer_exec_m:              agent1 pgid=8443 agent2 pgid=8445 → agent1 dead, agent2 alive
```

Free agents get a branch later through the manifest (`performer-shell.ts:50-70`). After that, `--stop <branchA>` also ends every sibling from the same `--start N`. When the starter was a shell, the group also holds every other process in that shell's job: here the group was my Bash tool's pgid, 70244. Slice 2 fixes this too, but the plan does not say so, and no test covers it.

## 2. Do the slices fix it, in order, without breaking anything?

The order is right. Slice 1 removes the hold, so the timeout no longer fires on a normal start. Slice 2 then covers the cases where the dispatcher itself runs past a timeout after it has started an agent: a slow second desk in `--start N`, a `maxBuffer` kill, or `/api/claim`'s 60 s.

What breaks or is missing:

- **`--stop` changes, and the plan says it does not.** The plan says "`--stop` and the monitors find the wrapper by its recorded pid, not by its group, so they are unchanged". `--stop` reads the pid from worker state and then signals `-$(ps -o pgid= -p $pid)` (`:1782-1797`). After slice 2 that group is the wrapper's: the wrapper, its three monitors (started with `&` inside a `sh -c` that has no job control, so they stay in the wrapper's group), the loop, and `claude`. That is the intended set, and it is narrower than today's. The existing test `reap-agent-liveness.test.mjs:226` already models a wrapper that leads its own group, so it should keep passing. The comment at `:1782-1788` ("a worker started without job control shares its starter's group") becomes false and must be rewritten.
- **`plot-worker-state.sh`, `plot-reap.sh` and the monitors read pids, ppid trees and `kill -0`, never a pgid.** The only pgid reader in `skills/plot/scripts` is `--stop`. In `packages/*/src`, the only `process.kill` other than `killGroup` is `kill(pid, 0)` (`registry.ts:146`, `fleet.ts:1977`, `interrogate.ts:140`, `slots-file.ts:85`). Neither slice changes the manifest pid fields. With `exec` (A1), `wrapperPid` stays `$$` of the wrapper, and that pid then equals the pid of the bash that was forked. Nothing reads that pid separately.
- **`set -m` placement.** `set -m` must go in the bash launching subshell and never in the `sh -c` wrapper. I measured on Debian: `sh -c "set -m; sleep 2 &"` under dash prints `sh: 1: set: can't access tty; job control turned off` and the job stays in the shell's group (pgid 1). Under bash with no tty, the same command gives the job its own group (`119 119 sleep 2`).
- **No existing test should break.** The `--start` tests read through `runDetached` (`dispatch.test.mjs:3369-3381`), which writes to a file. A faster return does not change what they assert.

## 3. Is each Done-when item a test that fails today and passes after?

Slice 1:

- "`--start 1` … returns within 5 s through a pipe, prints `summary: agents=1`, agent still running": this fails today (4–6 s in my copy, and unbounded with a loop that never exits) and passes after (0 s).
- "`--restart` and the brief launch pass the same test": these fail today and pass after, because they use the same launch shape.
- **"No process with the dispatcher's command line remains as the wrapper's parent": this fails today and STILL FAILS after slice 1 as designed.** In the `outer` rows above, `bash form.sh` with PPID 1 is the wrapper's parent on all three shells. The outer redirect frees the streams but leaves the forked bash in place. Only `exec` removes it (see `outer_exec_m`).

Slice 2:

- "alive after the 2 s timeout fires": this fails today. Once slice 1 has landed, the dispatcher closes in about 10 ms and the timer never fires, so the test passes with slice 2 absent. It therefore does not prove slice 2.
- "its PGID differs from the dispatcher's": this fails today and passes after. It is the item that proves slice 2.
- "`--stop` ends it": this passes both before and after. It is a regression guard, which is fine, but it is not proof of the change.

## 4. Does the plan follow the repo's rules?

Yes. No decision moves, so the domain is not involved. The plan adds no `plot-*.sh` script. The fix stays inside the script that `performer-shell.ts` already reaches as an adapter. `runProcess` stays as it is, which is right: its group kill is correct for its other callers.

## Amendments (exact changes)

**A1. Slice 1: `exec` the wrapper at both launch sites.** In `start_worker` (`:1502`) and the brief launch (`:804`), change `nohup sh -c …` to `exec nohup sh -c …`, and keep the outer redirect `( … & ) >/dev/null 2>&1 </dev/null`. I measured this on all three shells: the prefix assignments still reach the wrapper (it wrote its pid files), the forked bash disappears, and the wrapper is reparented directly. Without this change, keep the redirect and delete the Done-when item about the dispatcher's command line, because it cannot pass.

**A2. Slice 2: close the Open Point with the measured mechanism and name the leader.** Replace the Open Point with: "`( set -m; cd … && … exec nohup sh -c '…' >"$log" 2>&1 </dev/null & ) >/dev/null 2>&1 </dev/null` makes the wrapper the group leader (pgid == wrapper pid), measured on macOS bash 3.2.57 and 5.3.15 and on Debian bash 5.2.15. `set -m` goes in the bash subshell and never in the `sh -c` body: dash refuses it without a tty." Without `exec`, `set -m` makes the forked bash the leader, not the wrapper as the slice text says.

**A3. Correct the `--stop` sentence in Approach.** Replace "`--stop` and the monitors find the wrapper by its recorded pid, not by its group, so they are unchanged" with: "`--stop` signals the process group of the recorded pid (`plot-dispatch.sh:1782-1797`). Today that group is the starter's, which every agent from one `--start N` shares. After this slice it is the wrapper's group only. The monitors read pids and are unchanged." Add to Motivation: "One `--stop` ends every agent started by the same `--start N`: measured in a copy of the form, one group signal killed both of two agents launched by one process." Rewrite the comment at `:1782-1788`.

**A4. Slice 2: replace the non-discriminating timeout test.** Replace the slice's first test and the first Done-when clause with these two tests:

- (a) After `--start 1`, `ps -o pgid= -p <manifest pid>` equals the manifest's `wrapperPid` and differs from the dispatcher's pid.
- (b) Start the dispatcher detached through `runProcess`, keep it alive past the timeout after the first agent is up (for example `--start 2` with a second desk that blocks), and assert that the first agent survives the group kill.

Add a third test: `--start 2`, give both manifests a branch and check that branch out in each desk, then `--stop` one branch and assert that the other agent is still alive. That test fails today.

**A5. Slice 2 names the brief launch.** Add to slice 2: "The brief launch starts its `sh -c` as a group leader in the same way. `/api/claim` runs `--no-start` under a 60 s `runProcess` (`claim.ts:54`, `:162-165`), and `--no-start` does not suppress `request_brief` (`:3995`)." Add a test: a claim on a slice that has no brief, with a `Brief command` that never exits, returns before the timeout, and the brief process is in its own group.

**A6. Slice 1 rewrites the test helper that records this defect.** `runDetached` in `test/reconcile/dispatch.test.mjs:3350-3365` (#708) says: "Measured 2026-09-05: `--start 1` with a `Worker command: sleep 300` returned in 4 ms to a file and blocked for the full 300 s to `| tail`." After slice 1 that docstring describes behaviour that no longer exists. Slice 1 rewrites it, or the slice 1 test replaces it. Motivation should also cite it as the first measurement of the hold, 26 days before #1144.
