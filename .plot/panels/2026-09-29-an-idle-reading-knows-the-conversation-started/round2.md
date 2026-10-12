Position: amend
Evidence: executed

Lens: does the new instrument work? The rewrite's new central claim is *"the MANIFEST's mtime marks this slice's start"*. That claim is false. `update_manifest_on_hop` is one of seven writers of the manifest, and three of them fire inside a slice or between slices. On those writes, the proposed comparison answers `unstarted` for a conversation that has already spoken.

## What I ran and what it showed

**Every writer of the agent manifest** (grep over `skills/plot/scripts/` and `packages/`, origin/main `6e54cc8b`):

| writer | where | when it fires | the slice has started? |
|---|---|---|---|
| launch pid stamp (awk) | `plot-dispatch.sh:1438-1471` | once, when the wrapper launches | no (correct) |
| `performerShell.assignSlice` | `packages/domain/src/adapters/performer/performer-shell.ts:71` | supervisor tick, hands a free agent a branch | no (correct) |
| `update_manifest_on_hop` | `plot-worker-loop.sh:301`, called `:2314` | every hop | no (correct) |
| `raise_manifest_attempts` | `plot-worker-loop.sh:398`, called `:2015` | the prompt exited non-zero, and the loop retries | not yet, if it never ran |
| `raise_manifest_corrections` | `plot-worker-loop.sh:465`, called `:2080` | **mid-slice**: the build failed, and the SAME conversation is handed back (`--resume`, `:2066-2072`) | **yes** |
| `clear_manifest_branch` | `plot-agent-manifest.sh:47`, called `:2133` | **end of slice**, before `wait_for_work` | **yes** |
| `writeManifestStamp` | `packages/board/src/server/continue.ts:566` | `/api/continue` restarts an agent on its existing desk | depends |

**The proposed comparison, driven in a sandbox** against the real `update_manifest_on_hop`, `raise_manifest_corrections`, `raise_manifest_attempts` and `clear_manifest_branch` (extracted from the loop and sourced), and the real `plot_transcript_quiet_seconds`. `proposed` is the plan's rule: newest desk transcript older than the manifest's mtime means `unstarted`.

```
== A: hop — previous slice transcript 3000s old, hop rewrites manifest now
before hop: quiet=3000 proposed=3000
hop rc=0 resumeId=  "resumeId": "9a2521c1-48b9-40d8-8a96-0689362ea81a",
after hop:  quiet=3000 proposed=unstarted
== B: operator typed AFTER the hop, 1000s ago, in another session
proposed=1000  (number => still idle-eligible past 900)
== C: mid-slice CORRECTION — slice's own transcript last wrote 1200s ago, loop raises corrections
before: proposed=1200 corrections=0
after raise: proposed=unstarted corrections=1  <- the SAME conversation, resumed, which HAS spoken
== D: start retry — raise_manifest_attempts
after raise: proposed=unstarted
== E: end of slice — clear_manifest_branch, agent waits for work
after clear: proposed=unstarted branch=  "branch": "",
== G: same-second tie — first transcript line lands in the hop's second
tie: m(manifest)=1790754662 m(new)=1790754662 proposed=0
```

The hop case (A) and the operator case (B) behave as the plan says. Cases C and E contradict the plan's own definition of `unstarted`.

**Can the monitor reach the manifest?** The monitor can reach it through the environment, and it cannot reach it through the finder.

- `plot-dispatch.sh:1431` sets `PLOT_MANIFEST_FILE="$manifest_dir/$session.json"` on the wrapper `sh -c`, and the monitor is that shell's child, so the monitor inherits the variable. `plot-worker-monitor.sh` reads it **nowhere today**: `grep PLOT_MANIFEST_FILE` returns 0 lines in the script and in its test file, and `usage()` (`:175-187`) does not list it.
- `plot_manifest_for_worktree` (`plot-worker-state.sh:121`), which the monitor already sources, derives the directory as `$(git -C "$wt" rev-parse --show-toplevel)/.plot/agents`. Its comment says this returns the MAIN repo. Measured on a live desk, it returns the desk:

```
$ git -C .worktrees/free-c7b58b4f rev-parse --show-toplevel
/Users/jwloka/Quatico/Agentic-Tools/plot/.worktrees/free-c7b58b4f
$ ls .worktrees/free-c7b58b4f/.plot/agents
ls: .worktrees/free-c7b58b4f/.plot/agents: No such file or directory
```

  The finder also ignores the `Agent registry` config key. A builder who reaches for the helper that is already sourced gets "no manifest" on every desk. The plan's own Done-when then maps that to *"answers as it does today"*, so the fix becomes inert a second time and every test still passes.

**#1067 precondition.** `1427ccc2` (Merge #1077) is an ancestor of `origin/main`. `291ce603` added `resume_id=$(plot_session_id)` to `update_manifest_on_hop`. Sandbox A shows a hop to a different branch minting a fresh `resumeId`, and `session_flag` (`:748`) then answers `--session-id` because no `$dir/<resumeId>.jsonl` exists. **So a hop does write a separate transcript file.** Confirmed.

**Copies and test path.** `cmp skills/plot/scripts/plot-worker-monitor.sh packages/board/plot-worker-monitor.sh` reports the two files as IDENTICAL. `node --test test/reconcile/workermonitor.test.mjs` under Node v24.21.0 reports `tests 36, pass 36, fail 0`. Confirmed.

## What a measurement contradicts

1. **The claim "the manifest's mtime marks the slice's start".** The claim is true for 3 of 7 writers. `raise_manifest_corrections` rewrites the manifest mid-slice and then resumes the same session into the same `.jsonl`. So a correction reads as `unstarted` (case C) until the resumed conversation writes its first line. A `--resume` reload is exactly the slow-start shape #1074 was filed from, measured there at 2 770 s. The plan protects the hop from that shape and applies the same suppression to a conversation that has already spoken.

2. **`unstarted` suppresses `idle` with no end, and the plan does not state the cost.** "No grace period" plus "publishes NOTHING" means a conversation that hangs before its first line is never reported idle. That holds on a hop and, by (1), on every correction. Only `Worker bound` (28 800 s) ends it. The `unavailable` branch states this exact cost at `plot-worker-monitor.sh:487-493` (*"a genuinely stuck agent then holds a desk for up to 8 hours"*). This plan adds a second path to the same cost and says nothing about it. The Motivation's line *"a defect only reachable under load fires when the fleet is busiest"* now applies to the fix in the opposite direction.

3. **The word `unstarted` is already taken.** `EndingReasonSchema` (`packages/domain/src/entities/ending.ts:55`) is `['bound', 'quiet', 'unreadable', 'spent', 'unstarted']`. The loop writes `write_ending … unstarted agent` at `plot-worker-loop.sh:2021`, where it means *the prompt exited without running, N times*. So one word would carry two facts: an ending, and a non-finding the monitor stays silent on. `agent.ts:390` gives `unstarted` special actor rules. A reader grepping `unstarted` in a log cannot tell which fact is meant.

4. **The same-second tie is unspecified.** Case G: the manifest and the first transcript line share one epoch second, because `stat` resolution is 1 s. The sandbox's strict `<` reads that as started, which is correct. The plan says "predates" and does not assert the tie.

5. **A hop that CREATES a desk moves the agent and does not move the monitor.** `plot-worker-loop.sh:2233/2247` cuts `plot-wt-<suffix>` when the reset is refused. The monitor's `worktree` is fixed at launch (`plot-worker-monitor.sh:212`), so from then on it reads the old desk's transcripts and commits against a manifest that names the new desk. The proposed rule then answers `unstarted` on the old desk for the rest of the agent's life. The cause is a stale subject, not a slice that has not started. This defect predates the plan, but the plan's rule turns it into a permanent silence.

## What it must say before someone builds it

- **Take the instrument that answers the question, and it already exists.** *Has THIS slice's conversation written?* is answered by whether `$(plot_transcript_dir "$wt")/<resumeId>.jsonl` exists. The loop asks exactly that at `session_transcript_exists` (`:699`) to choose `--session-id` or `--resume`. Proposed rule: **`unstarted` when the manifest names a `resumeId` and no transcript file with that id exists yet; otherwise the unchanged desk-wide number.** Checked against the cases:
  - Hop: a new id and no file, so `unstarted`.
  - Correction and same-branch hop: the file exists, so a number.
  - Start retry that never ran: no file, so `unstarted`, which is correct.
  - End-of-slice wait: the file exists, so behaviour is as today.
  - Operator typing after the start: the worker's file exists, so a number.

  The id enters as an existence test, and the quiet NUMBER is still the desk-wide maximum. That keeps the header's argument at `plot-transcript-quiet.sh:27-35`. One probe with two readers is better than a second instrument that the next manifest writer breaks. If the plan keeps mtime instead, it must list all seven writers and assert C and E.
- **Name the input.** The monitor reads `PLOT_MANIFEST_FILE`, which it already inherits. Add the variable to `usage()`, and state that `plot_manifest_for_worktree` must not be used, because it resolves to the desk (measured above). Add a Done-when assertion: a monitor started through `start_worker`'s env sees the manifest. A unit fixture that sets the path by hand does not prove this.
- **Choose a word that is not an EndingReason**, for example `unspoken` or `not-yet`, or state why sharing `unstarted` is safe across `ending.ts:55` and `agent.ts:390`.
- **State the cost**: a conversation that hangs before its first line is ended only by `Worker bound`, 8 h. Then either accept that in writing or add a bound. A bound is a measurement, not a timer, if it reads the file's absence across N passes.
- **Assert the tie** (same second means started), **and assert the correction case** as a negative: a resumed conversation after `raise_manifest_corrections` must still answer a number.
- **File the created-desk hop** (point 5) as its own finding against the monitor's subject, and do not fold it in.

## What executing revealed that reading would not

- The plan names one writer. `grep` finds seven. Only running `raise_manifest_corrections` and `clear_manifest_branch` against a real manifest showed that the comparison flips to `unstarted` for a conversation mid-slice and after the slice (cases C and E). Reading `update_manifest_on_hop` in isolation makes the instrument look sound.
- The finder comment says `--show-toplevel` returns the main repo. Run on a live desk, it returns the desk. So the obvious way to "reach the manifest" silently finds nothing, and the plan's "no manifest behaves as today" clause hides that.
- `unstarted` collides with an existing EndingReason. This shows only when grepping the estate for the word, not when reading the plan.
- #1077 is on main and does mint a per-slice id (sandbox A). That makes the per-id existence test available, so the plan does not need a second instrument.
