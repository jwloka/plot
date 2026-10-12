# Round 2 — skeptic (reproduces)

Position: amend

## What I ran

I ran the real script from `origin/main` 19fcf482 (`git archive skills/plot/scripts`) in sandbox repositories, with a bare origin, a clone, and a stub loop that runs `exec sleep N`. I issued one `plot-state-receipt.sh` per run and unset `PLOT_REPO_ROOT` and `PLOT_UNATTENDED`. The tests ran on macOS with bash 5.3.15. I ran three copies of the script: today's; slice 1 alone (`exec` plus the outer redirect at both sites); and the plan's form (slice 1 plus `set -m`). No sandbox process survives.

| Measurement | Today | Slice 1 | Plan |
|---|---|---|---|
| `--start 1 \| cat`, end-of-file (agent sleeps 20 s) | 20.39 s | 1.12 s | 0.48 s |
| Wrapper's PPID | forked `bash <script>` | 1 | 1 |
| Wrapper's PGID | caller's | caller's | its own pid |
| `--no-start` claim path with a `Brief command` that sleeps 20 s, through a pipe | 22.40 s | — | 1.52 s, brief PGID = own pid, PPID 1 |
| SIGKILL to a detached dispatcher's group after `summary:` | agent dead | — | agent alive |

The manifest's `wrapperPid` equals the wrapper pid under `exec`, and all four monitor pids are filled. The env prefix therefore still reaches the wrapper.

## Rubric

1. **Round 1 carried.** Every request is in the text. `exec` is chosen over removing the AND-list, with a reason. Nothing is dropped.
2. **Facts.** Line numbers hold: `:801-806`, `:1283-1287`, `:1472-1536`, `:1783-1806`, `:3995`, `performer-shell.ts:93`, `claim.ts:54`, `plot-fleetctl.sh:1065-1067`. `runDetached` ends at `:3382`, not `:3381`. `claim.ts:162-165` calls `scriptsFor(opts).awaited`, which calls `runProcess` (`scripts-shell.ts:117-124`). The plan's "under a 60 s `runProcess`" is true in effect. My timings agree with the plan's 1.15 s and 0.72 s.
3. **Order and callers.** Slice 1 alone frees the pipe and removes the forked bash. Slice 2 then moves the group. Existing tests that use a wrapper pid still hold, because the wrapper writes `$$` and that is still the agent's parent (`dispatch.test.mjs:1654-1671`, `:2956`). No existing test kills a dispatcher group.
4. **Done-when.** Two items do not yet fail today in the form a test would naturally take. See the next section.
5. **New errors.** None in the mechanism.

## The `--stop` sibling test can pass today

`--stop` signals the pid alone when the agent's group equals `--stop`'s own group (`:1795-1798`). I ran `--start 2`, put a branch in each desk, and ran `--stop` on one branch:

- **`--start` and `--stop` in one group, today:** `signalled pid 97990 alone`. The sibling stayed alive. The test passes today.
- **`--start` in its own group (`setpgrp`), today:** `signalled its whole process group 99689`. Both agents died. This is the failure.
- **Plan, either setup:** `signalled its whole process group`. Only the stopped agent died.

Every existing test calls the dispatcher with `spawnSync` or `execFileSync`, without `detached`. Those calls put `--start` and `--stop` in the test runner's group. A sibling test written that way passes before slice 2 and proves nothing.

## The forced group kill can throw after slice 2

After slice 2 the dispatcher exits right after `summary:`, and no process remains in its group. In my run, `kill -KILL -- -<dispatcher>` returned 1. Node's `process.kill(-child.pid)` throws `ESRCH` in that case, so the test errors after the fix instead of passing.

## Exact changes

1. Slice 2, sibling test: "`--start 2` runs in its own process group (spawned `detached`), and `--stop` runs from the test's group. Run in one group, today's `--stop` signals the pid alone (`:1795-1798`) and the test passes before the fix."
2. Slice 2, forced kill test: "`process.kill(-child.pid, 'SIGKILL')` tolerates `ESRCH`, because after slice 2 the dispatcher's group can be empty when `summary:` arrives."
3. Slice 2, brief test: the stand-in `Brief command` writes its own `$$` to a file, so the test can read the brief's pid and PGID. The brief has no pid file of its own.
4. Motivation: change `dispatch.test.mjs:3350-3381` to `:3350-3382`.
