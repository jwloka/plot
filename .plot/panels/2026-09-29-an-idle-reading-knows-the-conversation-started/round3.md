Position: amend
Evidence: executed

Lens: is the plan buildable exactly as written, and does the new rule hold against the runtime? The rule holds, and every case in the plan passes when built as the plan says. Three corrections to the text are needed before a worker builds it. One of them is a test failure that a dispatched worker hits in its own environment, and CI does not hit.

## What I ran and what it showed

**1. The runtime, measured directly (Claude Code 2.1.285, `claude -p --model haiku` in a scratch git dir).** A fresh `--session-id <id>` creates `<id>.jsonl`, and a `--resume <id>` appends to that same file. No second file is created.

```
ID=3b3bfb04-f23f-4e79-a3df-2051d398759c
file appeared after 5.96s
ONE
prompt took 8.60s
--- files after fresh:
-rw-------@ 1 jwloka staff 357661 Sep 30 10:04 3b3bfb04-f23f-4e79-a3df-2051d398759c.jsonl
TWO
--- files after resume:
-rw-------@ 1 jwloka staff 366020 Sep 30 10:04 3b3bfb04-f23f-4e79-a3df-2051d398759c.jsonl
...: 52 lines, sessionIds: 52 "sessionId":"3b3bfb04-f23f-4e79-a3df-2051d398759c"
```

A second resume, with stdin redirected, appended in 1.56 s. The first lines it wrote were queue and user lines, before the assistant line:

```
resume first append after 1.56s
2026-09-30T08:04:47.155Z queue-operation enqueue
2026-09-30T08:04:47.156Z queue-operation dequeue
2026-09-30T08:04:48.840Z user  user
2026-09-30T08:04:49.786Z assistant  assistant
```

**2. The live estate agrees.** No manifest is live (`.plot/agents/` is empty), so I read transcript directories. In `free-c7b58b4f` (10 files) and `free-0d934050` (11 files), every line of every file carries the file's own name as its `sessionId`, which gives 0 mixed files. Each file's first line is `queue-operation enqueue`, and its timestamp comes before any assistant line:

```
fc4f1048 lines=1277 first=queue-operation ids=fc4f1048(self):1277 span=09-29T10:37..09-29T11:21
95175683 lines=234  first=queue-operation ids=95175683(self):234  span=09-30T07:53..09-30T08:03
   2026-09-29T10:37:17.496Z queue-operation enqueue
```

Of those files, 7 in `free-c7b58b4f` are 3-line side sessions. Their user text begins *"Context: This summary will be shown in a list…"* and they run on `claude-haiku-4-5`. They are not `agent-` prefixed, so the desk-wide number already counts them.

**3. The environment reaches the monitor.** `start_worker` (`plot-dispatch.sh:1409-1438`) puts `PLOT_SESSION_ID="$session"` (`:1426`) and `PLOT_MANIFEST_FILE="$manifest_dir/$session.json"` (`:1431`) as assignment prefixes on `nohup sh -c`. The wrapper then starts `"$PLOT_WORKER_MONITOR" &` as its child. I reproduced that shape with a monitor that only dumps its environment:

```
PLOT_MANIFEST_FILE=/private/tmp/.../scratchpad/agents/sess-1.json
PLOT_SESSION_ID=sess-1
```

`plot-worker-monitor.sh` has no other launch site: `git grep PLOT_WORKER_MONITOR` finds only `plot-dispatch.sh:1433/1438` and tests. The loop overrides `PLOT_SESSION_ID=$(session_handle)` for the prompt only (`plot-worker-loop.sh:1631-1632`), so the monitor's inherited value stays the launch id. The monitor's `session_handle` reads the manifest first, so it gets the same handle the prompt carries.

**4. The rule, built in a scratch worktree** (`git worktree add --detach … origin/main`, at `074105bd`, removed afterwards). I built it the way the plan describes:
- `manifest_resume_id` and `session_handle` moved into `plot-agent-manifest.sh`.
- `session_transcript_exists` moved into `plot-transcript-quiet.sh` as `plot_transcript_exists`, and `session_flag` calls the new name.
- The monitor sources `plot-agent-manifest.sh` and gets a port `monitor_conversation_spoken`, asked only after `quiet >= PLOT_MONITOR_QUIET_SECONDS`, which returns `unspoken` on rc 1.
- One stderr line at start when both variables are unset.

The diff is 58 lines added and 32 removed across 4 scripts. `grep -n 'session_transcript_exists\|^manifest_resume_id' plot-worker-loop.sh` returns 0 lines.

```
node --test test/reconcile/workermonitor.test.mjs   → tests 36, pass 36, fail 0   (Node v24.21.0, clean env)
node --test test/reconcile/workerloop.test.mjs      → tests 36, pass 36, fail 0
second-slice + declaration-hop + free-window        → tests 7,  pass 7,  fail 0
```

**5. The plan's cases, driven against the real `plot_transcript_quiet_seconds`, the real `update_manifest_on_hop`, the real `raise_manifest_corrections` and the real `clear_manifest_branch`.** Transcript files and ages are real, under `PLOT_TRANSCRIPT_HOME`. Only pid, CPU, fingerprint and commit count are stubbed. Each row is three `monitor_pass` calls:

```
0 baseline (first slice, own file 3000s old) -> quiet=3001 verdicts: quiet quiet quiet | findings: idle
   hop minted resumeId=94bcb14a (launch a0000000); session_flag=--session-id
A hop, new id, no file                       -> quiet=3002 verdicts: unspoken unspoken unspoken | findings: clear
B first line written 5s ago                  -> quiet=6    verdicts: busy busy busy
B' first line then 1200s silence             -> quiet=1201 verdicts: quiet quiet quiet | findings: idle
   tie: m(man)=1790755689 m(file)=1790755689
G same-second tie                            -> verdicts: busy busy busy   (reads as started)
   corrections raised; flag=--resume
C correction, resumed file 1200s old         -> quiet=1201 verdicts: quiet quiet quiet | findings: idle
E after clear_manifest_branch                -> quiet=1202 verdicts: quiet quiet quiet | findings: idle
O1 operator file 60s old, own file absent    -> quiet=61   verdicts: busy busy busy
O2 operator file 1000s old, own file absent  -> quiet=1001 verdicts: unspoken unspoken unspoken
O3 own file 2000s old, operator 30s old      -> quiet=32   verdicts: busy busy busy
H hand-started, no handle                    -> quiet=1206 verdicts: quiet quiet quiet | findings: idle
```

In row A, the only publication is `clear` of the previous slice's `idle`, because the monitor publishes only on a change. No `idle` is published on the hop. Every Done-when case reads as the plan says. The hand-started monitor prints:

```
plot-worker-monitor: no session handle (PLOT_SESSION_ID and PLOT_MANIFEST_FILE unset) — idle is judged on the desk alone
```

**6. The same suite, run the way a dispatched worker runs it:**

```
PLOT_SESSION_ID=deadbeef-… node --test test/reconcile/workermonitor.test.mjs
✖ two consecutive idle samples over an unchanged tree report idle
✖ it is called idle and never stalled
✖ past the window, a live pid with NO child is idle
✖ it publishes the moment a finding holds and nothing when nothing changed
✖ a finding that stops holding is published as clear
✖ every finding carries finding, since, evidence and measuredAt
✖ a genuinely stopped agent is still ended
✖ the window boundary is the measured maximum, with margin
ℹ pass 28
ℹ fail 8
```

Stubbing the new port in `QUIET` still left 1 failure, because `a finding that stops holding is published as clear` (`:305`) builds its own ports. Adding `PLOT_SESSION_ID: ''` and `PLOT_MANIFEST_FILE: ''` to `drive()`'s env, before `...env`, fixes both runs:

```
tests 36 pass 36 fail 0  <- ambient PLOT_SESSION_ID=''
tests 36 pass 36 fail 0  <- ambient PLOT_SESSION_ID='deadbeef-…'
```

**7. Citations.** All but two check out: `plot-transcript-quiet.sh:27-41, 105-106`; `plot-worker-monitor.sh:212, 254-256, 487-493, 545-551` (`:560-562` is the comment above the no-op arms, which is close enough); `plot-worker-loop.sh:92, 301-306, 333, 398, 465, 648, 698-705, 720, 749, 928, 2013-2021, 2080, 2133, 2233, 2247, 2314`; `plot-agent-manifest.sh:47`; `plot-worker-state.sh:121-131, 779, 986`; `build.mjs:960-966`; `.gitignore:22-24`; `ending.ts:55`; `continue.ts:558, 566`; `performer-shell.ts` (`assignSlice` at `:50`, the write at `:71`). `git grep -w unspoken` over `skills packages docs`, excluding this plan, returns 0 lines.

## What a measurement contradicts

1. **"Any slow start reaches that state: a cold model, a machine under load."** A cold model does not reach it. The runtime writes `queue-operation enqueue` and attachment lines BEFORE its first model call: 1.56 s after a resume starts, and 5.96 s after a fresh start with stdin left open, where 3 s of that is the runtime's own stdin wait. So `unspoken` lasts from the hop's manifest write until the process's first line: the loop's own work between `:2314` and the prompt, plus process start. It does not cover the wait for the model. A model that hangs after the enqueue line makes the NEW file go quiet, and the existing rule handles that correctly. The on-branch `has_commits` also refuses on a fresh hop branch whose only commit is the claim. The rule is still correct. Its reach is smaller than the Motivation says, and so is its cost. "Only `Worker bound` ends a start that hangs" now describes a process that never writes one line, not a slow model.

2. **"`plot-dispatch.sh:2074` writes the claim as `commit --allow-empty`."** `plot-dispatch.sh` contains no `--allow-empty`, and `:2074` is a comment. The claim commit is `plot-worker-loop.sh:2277`: `git -C "$hop_wt" commit --allow-empty -m "plot: claim $next_branch"`. The reading does not change (`monitor_has_commits` `:438` still uses `-- .`), but the citation is wrong.

3. **"`agent.ts:390`"** is `packages/domain/src/transitions/agent.ts:390`. `packages/domain/src/entities/agent.ts` has 195 lines. The plan's other domain citation, `entities/ending.ts:55`, points a reader to the wrong directory.

4. **"`node --test test/reconcile/workermonitor.test.mjs` stays green"** holds only in an environment with no `PLOT_SESSION_ID`. The slice is `Impl: own branches` and will be built by a dispatched worker, and a dispatched worker always has `PLOT_SESSION_ID` and `PLOT_MANIFEST_FILE` in its environment (item 3 above). `drive()` spreads `process.env` (`workermonitor.test.mjs:58-66`), so the new probe finds a handle, finds no `<handle>.jsonl` under the temp desk, and answers `unspoken`. That is 8 of 36 tests red on the builder's machine and green in CI. This is the same shape as the existing `PLOT_UNATTENDED` poisoning of the e2e suite.

## What it must say before someone builds it

- **In Done-when, next to the 36-test line:** "`drive()` sets `PLOT_SESSION_ID: ''` and `PLOT_MANIFEST_FILE: ''` before `...env`, and the suite is green with `PLOT_SESSION_ID` set in the ambient environment." The new tests pass the handle explicitly. Stubbing the probe in `QUIET` alone is not enough, because `:305` builds its own ports (measured: 35/36).
- **Make the probe a port** (`monitor_conversation_spoken`, beside the other six `monitor_*` ports), so the unit tests can drive `unspoken` without a transcript directory. The header of `workermonitor.test.mjs` names the ports it replaces. A seventh is the least surprising shape.
- **Restate what `unspoken` covers:** the interval from the manifest's new `resumeId` to the runtime's first line. That line is written at process start, before any model call (measured 1.56–5.96 s on 2.1.285). Remove "a cold model" from the Motivation. Rewrite the cost paragraph to say that the unbounded case is a process that never writes a line.
- **Fix the two citations:** `plot-worker-loop.sh:2277` for the claim commit, and `transitions/agent.ts:390`.
- **Name the file for the engagement test.** The only suites that launch a real wrapper today are `test/e2e/monitors-attached.test.mjs`, `monitors-end.test.mjs` and `worker-monitor-samples.test.mjs`. They are CI-only by CLAUDE.md, so a builder cannot see that test go red locally. Either put the engagement assertion in one of those and say so, or name a reconcile-tier test that runs the wrapper's `sh -c` with a stub command. Item 3 above shows that the second option is a few lines.

## What executing revealed that reading would not

- Only running the runtime showed that the transcript file exists before the model is asked. The plan and all three earlier rounds read "the conversation has not written" as "the model has not answered". The file answers a narrower question, *has the process started*, and that question is the correct one for this defect.
- Only running the suite with a worker's environment showed the 8 red tests. A juror in a clean shell, and CI, see 36/36. The worker who builds this slice would be the first to see them, and would face a choice between "fixing" the probe and fixing the harness.
- The seven manifest writers, the tie, the correction case and the operator trio all behave as the plan's table says when the real functions drive real files. The design needs no further change. The remaining changes are to the text and the test harness.
