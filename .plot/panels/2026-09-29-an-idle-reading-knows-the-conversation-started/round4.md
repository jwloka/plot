Position: proceed
Evidence: executed

Lens: build it exactly as written, and ask whether a worker who reads only this plan ships it correctly. I built it from the plan text alone in a scratch worktree at `2ec84580` (origin/main), and I removed the worktree afterwards. Every non-e2e Done-when bullet is assertable, and each one held against the real helpers. The citations hold, apart from two line numbers that are off by one or two. The e2e engagement test fits `worker-monitor-samples.test.mjs`. The plan leaves three mechanics of that test unstated, and a worker can find each of them in the suite's own code. None of this refutes the design. The notes below are text fixes, not amendments.

## What I ran and what it showed

**1. The design, built literally.** I made the edits with a script and did not hand-tune them:
- `manifest_resume_id` and `session_handle` were cut from `plot-worker-loop.sh` and appended to `plot-agent-manifest.sh`.
- `session_transcript_exists` moved to `plot-transcript-quiet.sh` as `plot_transcript_exists`, and `session_flag` calls it.
- The monitor sources `plot-agent-manifest.sh`, gets `monitor_conversation_spoken` (0/1/2), and `sample_verdict` answers `unspoken` on rc 1, only past the window. It has the stderr line, and `usage()` lists both variables.
- `drive()` sets `PLOT_SESSION_ID: ''` and `PLOT_MANIFEST_FILE: ''` after `...process.env`.

```
 skills/plot/scripts/plot-agent-manifest.sh   | 29 ++++++++++++++++++++++++
 skills/plot/scripts/plot-transcript-quiet.sh | 14 ++++++++++++
 skills/plot/scripts/plot-worker-loop.sh      | 33 +--------------------------
 skills/plot/scripts/plot-worker-monitor.sh   | 34 +++++++++++++++++++++++++++-
 test/reconcile/workermonitor.test.mjs        |  2 ++
$ grep -n 'session_transcript_exists\|^manifest_resume_id' skills/plot/scripts/plot-worker-loop.sh | wc -l
       0
```

**2. The drive() insulation claim, reproduced both ways (Node v24.21.0).**

```
fixed drive, unset: ℹ tests 36 ℹ pass 36 ℹ fail 0
fixed drive, set:   ℹ tests 36 ℹ pass 36 ℹ fail 0      (PLOT_SESSION_ID=ffff-worker-ambient PLOT_MANIFEST_FILE=/nonexistent/x.json)
old drive, set:     ℹ tests 36 ℹ pass 28 ℹ fail 8      (HEAD's drive(), new monitor)
✖ two consecutive idle samples over an unchanged tree report idle
✖ it is called idle and never stalled
✖ past the window, a live pid with NO child is idle
✖ it publishes the moment a finding holds and nothing when nothing changed
✖ a finding that stops holding is published as clear      ← the :305 clearing test, as the plan says
✖ every finding carries finding, since, evidence and measuredAt
✖ a genuinely stopped agent is still ended
✖ the window boundary is the measured maximum, with margin
```

The plan's "8 of 36" is exact, and so is the claim that the clearing test is among them.

**3. Neighbouring suites that source the moved functions, each with the variable unset and set:**

```
workerloop [unset]:    tests 36 pass 36 fail 0
workerloop [set]:      tests 36 pass 35 fail 1   ✖ a gone finding does not end the worker   (load avg 22)
  → alone, 3× on this branch and 3× on pristine main: pass 1 fail 0 each
  → full suite re-run [set], concurrency 2, load 6.7: tests 36 pass 36 fail 0
workermonitor [unset/set]: 36/36, 36/36
second-slice  [unset/set]: 5/5, 5/5
correction    [unset/set]: 12/12, 12/12
marker-writer [unset/set]: 5/5, 5/5
```

The one red test is a `sleep 3` timing test. It uses a hand-written findings file and no real monitor. It failed once under load, and it passes on both trees when run alone.

**4. The Done-when cases.** I wrote them as `test/reconcile/workermonitor-unspoken.test.mjs`. They use the real `plot_transcript_quiet_seconds` under `PLOT_TRANSCRIPT_HOME`, the real manifest, and the real `update_manifest_on_hop`, `raise_manifest_corrections` and `clear_manifest_branch` (via `PLOT_WORKER_LOOP_SOURCED=1`). They also use the real `monitor_pass` and `publish`. Only pid, CPU, fingerprint and commit count are stubbed.

```
✔ control: before the hop, the own file 3000 s old reaches idle
✔ a hop answers unspoken and two passes publish nothing
✔ the first line ends unspoken; idle fires two quiet passes later
     verdicts [unspoken, unspoken, quiet, quiet], published-count [0,0,0,1], findings [idle]
✔ the same-second tie reads as started (touch -t)          manifest mtime == file mtime asserted
✔ the correction case answers a number and reaches idle   resumeId unchanged by raise_manifest_corrections
✔ the end-of-slice case is unchanged by clear_manifest_branch   rows before == rows after
✔ the operator at the desk: three readings decided by the handle   busy / busy / unspoken
✔ a hand-started monitor with no handle writes the stderr line and behaves as today
✔ the loop and the monitor share one probe: session_flag follows plot_transcript_exists   --session-id → --resume
ℹ tests 9  pass 9  fail 0        (identical with PLOT_SESSION_ID unset and set)
```

**5. The cases discriminate.** I replaced the `unspoken` return with `: mutant` and nothing else:

```
✔ control …                      ✖ a hop answers unspoken …
✖ the first line ends unspoken … ✔ same-second tie / correction / end-of-slice / hand-started / probe
✖ the operator at the desk …
ℹ pass 6  fail 3
```

The three positive cases fail without the arm. The negative cases (correction, end-of-slice, tie) pass either way, which is what they are for: they prove the rule does not over-fire.

**6. The build.** I ran `pnpm build:board`: `vite build` and then `node build.mjs`, run directly because corepack's `packageManager`/`devEngines` check refused the nested `pnpm` call on this machine, a tool problem that has nothing to do with this plan.

```
Vendored … plot-worker-monitor.sh, plot-worker-state.sh, plot-transcript-quiet.sh, plot-state-receipt.sh, plot-agent-manifest.sh → package root (npm standalone)
plot-worker-monitor.sh identical to source
plot-transcript-quiet.sh identical to source
plot-agent-manifest.sh identical to source
git status: only the 5 source edits + the new test; no packages/board file appears (gitignored)
```

`packages/board/package.json` `files` already lists `plot-agent-manifest.sh`, so the monitor's new `source` line resolves in the npm layout.

**7. Citations checked.** All of the following hold:
- `plot-transcript-quiet.sh:105-106`, `:27-35`, `:36-41`
- `plot-worker-monitor.sh:175-187`, `:212`, `:254-256`, `:341-419`, `:487-493`, `:545-551`, `:560-562`
- `plot-worker-loop.sh:92`, `:301`, `:333`, `:398`, `:465`, `:648`, `:698-705`, `:720`, `:749`, `:928`, `:2013-2021`, `:2080`, `:2133`, `:2233`, `:2247`, `:2277`, `:2314`
- `plot-dispatch.sh:1426`, `:1431`, `:1438`, `:1438-1471`
- `plot-agent-manifest.sh:47`, `ending.ts:55`, `transitions/agent.ts:390`, `performer-shell.ts:71` (under `packages/domain/src/adapters/performer/`), `continue.ts:558`, `:566`
- `plot-worker-state.sh:129-131`, `:779`, `:986`
- `.gitignore:22-24`, `ci.yml:206`

`git grep -w unspoken origin/main -- skills packages docs` returns nothing outside this plan.

## What a measurement contradicts

Nothing in the design. Two line numbers are slightly off:

- `build.mjs:960` for `plot-agent-manifest.sh` is `:961`.
- `build.mjs:961-966` "copies them" is really two things: the list entries at `:938` (monitor) and `:946` (transcript-quiet), and the copy loop at `:963-968`.

## What it must say before someone builds it

These are text fixes for the e2e bullet. A worker can recover each one from the suite, but the plan should not leave them to be rediscovered:

1. **The worker writes the handle's file, not the test.** The handle is minted inside the launch (`plot_session_id`), and `staffDesk` returns through `plot-dispatch.sh --restart`. The suite records that dispatch returns only after the worker has finished (its comment at `:166`). So the "present" run needs a worker command that creates `$PLOT_SESSION_ID.jsonl` itself, with an old mtime, then commits a file and sleeps past two passes. The command should be a script file, because the suite forbids `$` in an inline `Worker command` (`:198`, `:261`).
2. **"Publishes nothing" means no `idle`, not an empty file.** The worker exits at the end, and the monitor then correctly publishes `gone`. The healthy-worker test already excludes `gone` (`:319`). The engagement test must do the same, or it fails against a correct build.
3. **`PLOT_TRANSCRIPT_HOME` and `PLOT_MONITOR_QUIET_SECONDS` travel through `staffDesk`'s `env`.** They reach the monitor by inheritance through the wrapper, the way `PLOT_MONITOR_INTERVAL` already does. The transcript slug must use the RESOLVED worktree path, because dispatch resolves `/var` → `/private/var` on macOS (`:117-121`).

Two smaller items:

- `sample_verdict`'s header comment (`→ gone | quiet | busy | unknown`) should gain `unspoken`.
- The stderr line prints once per sourced monitor, so with `drive()` blanking both variables the unit suite emits 33 copies of it to stderr. That is harmless, but the plan could say that the line prints on load, which is what lets the unit suite assert it by sourcing. It could also say that `drive()` may discard stderr.

## What executing revealed that reading would not

- **The insulation fix is necessary and sufficient.** Without it, 8 of 36 tests fail in a worker's environment. With it, 36 of 36 pass either way.
- **The corepack refusal is a machine problem.** `pnpm build:board` under `corepack pnpm` exits 1 on the `packageManager`/`devEngines` mismatch, even with `--pm-on-fail=ignore`, because the nested `pnpm --filter` does not inherit the flag. Running the two package scripts directly works. A worker on this machine hits this before the plan's own step, and it says nothing about the plan.
- **The only red test was load.** At load average 22, `workerloop`'s `a gone finding does not end the worker` failed once. It passes on both the branch and pristine main when run alone, and the full suite passes when re-run at lower load.
- **Only the positive cases catch a missing arm.** The negative cases (correction, end-of-slice, same-second tie) pass with the `unspoken` arm deleted. The hop, first-line and operator cases are the ones that turn red. So a builder who ships only the negative cases ships a vacuous suite. The plan lists all of them, and that is correct.

Artifacts, kept outside the repository:
- `scratchpad/r4-1074.diff` (210 lines)
- `scratchpad/r4-1074-unspoken.test.mjs`
