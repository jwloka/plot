# Panel round 2: a-start-returns-while-its-agent-runs

**Subject:** `docs/plans/2026-10-01-a-start-returns-while-its-agent-runs.md` (Draft, `19fcf482`)
**Commitment:** `Position: proceed | amend | reject`
**Mechanism:** `divided amend=skeptic,process proceed=operator`

| Juror | Position | What it looked at |
|---|---|---|
| skeptic (reproduces) | amend | The REAL script from `19fcf482` in sandbox repositories, three copies (today, slice 1, plan), macOS bash 5.3.15: pipe EOF, PPID, PGID, the `--no-start` brief path, a forced group kill, and `--stop` on one of two agents in two group setups. |
| operator | proceed | Every caller of `--start`, `--restart`, `--no-start` and `--stop` read on origin/main; copies of both launch forms sent SIGINT on macOS. |
| process | amend | Copies of the slice 2 form on macOS bash 3.2.57 and 5.3.15, Debian bash 5.2.15 with dash in docker, and under a pty; a copy of the `--stop` logic driven from node. |

## Agreed by all three

- **Round 1 is fully carried**, including `exec` with its reason, and every cited line number holds (the skeptic notes `runDetached` ends at `:3382`, not `:3381`).
- **The mechanism works on the real script.** The skeptic measured `--start 1 | cat` at 20.39 s today, 1.12 s after slice 1 and 0.48 s with the plan's form; the wrapper's PGID equals its pid only with `set -m`; the `--no-start` brief path drops from 22.40 s to 1.52 s with the brief in its own group; a forced group kill after `summary:` leaves the agent alive. Debian bash 5.2.15 gives the same groups (process juror).
- **The forced group-kill test must tolerate `ESRCH`.** After slice 2 the dispatcher's group is often empty when `summary:` arrives, so `process.kill(-pid)` throws (skeptic measured `kill` returning 1; operator points to `killGroup`'s own catch at `run-script.ts:65-69`).
- **`set -m` changes the wrapper's SIGINT disposition on macOS.** Today a non-interactive `&` leaves SIGINT ignored in the wrapper; with `set -m` it is not. Measured by the operator and the process juror. No Plot code sends SIGINT (`--stop` sends TERM, `killGroup` sends KILL), and the plan must say so.

## Disagreements

1. **Whether the remaining defects need another round.** The operator says the corrections are wording and test placement, fixable in the approval pass. The skeptic and the process juror say the `--stop` sibling test, as written, passes today and therefore proves nothing, which is a Done-when defect, not wording. Both measured it: when `--start` and `--stop` run in one process group, as every existing test's `spawnSync`/`execFileSync` does, today's `--stop` takes the own-group fallback (`:1795-1798`), signals the pid alone, and the sibling survives. The test fails today only when `--start` is spawned `detached`, as `runProcess` does. The operator did not run the test.
2. **The Ctrl-C paragraph.** The operator measured that today `Ctrl-C` does not end "the agents already started" as a whole: the wrapper, monitors and loop ignore SIGINT, and only a program with its own handler (`claude`) exits. The process juror confirmed the terminal side: after slice 2 the foreground group stays the dispatcher's and SIGINT reaches no wrapper. The plan's sentence overstates today; neither juror disputes the after-state.

## Single-juror findings

- **Agents started before slice 2 keep their starter's group until they exit** (34513's and 84589's agents among them). `--stop` still ends their siblings, so the own-group guard at `:1790-1796` stays, and the rewritten comment and "What this does NOT do" must say so. (process)
- **The brief comment at `:786-789`** says `setsid` is not used because macOS lacks it; after slice 2 `set -m` is the group mechanism and the comment is rewritten. (process)
- **The slice 2 claim-return assertion duplicates slice 1's brief test**; only "the brief leads its own group" discriminates slice 2. (operator)
- **The brief has no pid file**, so the stand-in `Brief command` writes its own `$$` for the test to read. (skeptic)

## What the three lenses shared

All three read or measured the launch and the signal paths; none read what the board or `plot-worker-state.sh` render for an agent whose wrapper now leads its own group. The skeptic's run shows the manifest's `wrapperPid` and monitor pids are filled as before, which is the field those readers use, so this is a gap in the evidence rather than a finding.

## What an amendment changes

- Slice 2's sibling test spawns `--start 2` `detached: true` and runs `--stop` from the test's group; the Done-when line names that condition.
- The forced-kill test treats `ESRCH` as an empty group.
- The brief test's stand-in writes its own `$$`; the claim-return assertion moves to slice 1 or is dropped from slice 2.
- The Ctrl-C paragraph states today's behaviour as measured, and one sentence states the SIGINT disposition change and that nothing sends SIGINT.
- The own-group guard stays; the rewritten `:1783-1789` comment and "What this does NOT do" name the agents already running in their starter's group. The brief comment at `:786-789` is rewritten.
- Motivation cites `:3350-3382`.
