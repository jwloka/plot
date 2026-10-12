# Panel round 1: a-start-returns-while-its-agent-runs

**Subject:** `docs/plans/2026-10-01-a-start-returns-while-its-agent-runs.md` (Draft, `ea8f88d5`)
**Commitment:** `Position: proceed | amend | reject`
**Mechanism:** `unanimous amend skeptic,operator,process`

| Juror | Position | What it looked at |
|---|---|---|
| skeptic (reproduces) | amend | Copies of the launch form, run on macOS bash 5.3.15, macOS `/bin/bash` 3.2.57 and Debian bash 5.2.15 with dash as `/bin/sh`. A node copy of `runProcess` with a forced timeout. A two-agent `--stop` reproduction. It did not run the real script in a sandbox repository. |
| operator | amend | The callers of `--start` (`performer-shell.ts:93`, `scripts-shell.ts:132-149`, `plot-fleetctl.sh:1064-1067`, `--stop` `:1790-1805`). Four launch forms measured on macOS. |
| process | amend | Four launch forms on bash 3.2 and 5.3. Behaviour under a pty. Read `plot-registryd.service` for systemd's kill mode. Linux not measured. |

## Agreed by all three

- **The cause is right.** One fix covers `--start` and `--restart` because both pass through `start_worker`. The brief launch at `:801-806` has the same shape.
- **The order is right.** Slice 2 alone does not shorten the return (process: `close` at 8017 ms).
- **The defect was measured before.** `test/reconcile/dispatch.test.mjs:3350-3381` (`runDetached`, 2026-09-05) records a 300 s block to `| tail` and works around it. Slice 1 must rewrite that helper, and Motivation must cite it.
- **One slice 1 Done-when item fails after slice 1 as designed.** The outer redirect frees the stream but keeps the forked bash, which carries the dispatcher's command line and has PPID 1. That is the symptom an operator reported. Only removing the forked bash makes the item pass.
- **The `--stop` sentence is false.** `--stop` signals the recorded pid's process group (`:1782-1805`, #1084), not the pid. Today that group is the starter's and every agent from one `--start N` shares it, so stopping one agent stops its siblings. The skeptic measured this with two agents and one group signal: both died. Slice 2 changes `--stop` to end one wrapper's group. That is the #1084 intent, but the plan must state the change and test it. The comment at `:1782-1789` must be rewritten.
- **`set -m` alone makes the forked bash the group leader, not the wrapper.** All three measured this. The wrapper leads its group only when the forked bash is gone.
- **The slice 2 timeout test does not discriminate.** Once slice 1 lands, `close` comes in milliseconds, the timer is cleared, and the agent survives with or without slice 2. The test must force the group kill after `summary:` (`process.kill(-dispatcher.pid)`) and assert `pgid == wrapperPid`.
- **The brief launch needs slice 2 too.**

## Disagreements

1. **How to remove the forked bash.** The skeptic and the operator write `exec nohup sh -c …` and keep the AND-list. The process juror removes the AND-list: `cd "$wt" || exit 1`, the export and `set -m` become separate statements, so `&` applies to `nohup` alone. Each measured that its own form leaves the wrapper as group leader with PPID 1. Neither measured the other's form against the comment at `:1283-1287`, which says the env prefix exists to stop bash collapsing the list. This is a choice between two measured mechanisms, not a dispute about the fault. The plan must name one and say why.
2. **Where the plan stops.** Only the process juror raises that systemd stops a unit by cgroup. `plot-registryd.service` sets no `KillMode`, so `systemctl --user stop|restart` ends every agent the supervisor started, whatever its process group. The other two did not look at the unit. The process juror asks for a "What this does NOT do" line and a separate issue. Nobody argues this belongs in this plan.
3. **Callers named.** The skeptic alone found `/api/claim`. It runs `--no-start` under a 60 s `runProcess` (`claim.ts:54`, `:162-165`), and `--no-start` does not suppress `request_brief` (`:3995`), so a claim on a slice with no brief holds the pipe, and the group kill then ends the brief's `claude -p`. The operator alone named `/plot-fleet --start` (`plot-fleetctl.sh:1064-1067`) as a blocking caller. These two facts do not conflict, and both belong in Motivation.

## What the three lenses shared

- **No juror ran the real `plot-dispatch.sh` in a sandbox repository.** Every measurement used a copy of the launch form. The copies match the script's text, but the env-prefix comment at `:1283-1287` describes a bash behaviour that a copy could reproduce wrongly. Slice 1's contract test is the first run of the real script, and the moderation records that the panel did not do it.
- **Linux was measured once, by the skeptic, in Docker and not under systemd.** The process-group claims for Linux rest on that run.
- **A changeset is owed** (process juror). CI enforces it, so the plan needs no change for it.

## What an amendment changes

- Slice 1 removes the forked bash, with the mechanism chosen in disagreement 1, as well as adding the outer redirect at both launch sites. It rewrites the `runDetached` helper and comment, and its pipe test runs the real script.
- Slice 2 names the measured mechanism: the wrapper leads its group once the forked bash is gone and `set -m` precedes the launch. It applies the same to the brief launch. It replaces the timeout test with a forced group kill and a `pgid == wrapperPid` assertion. It adds a `--start 2` and `--stop` sibling test, which fails today. It corrects the `--stop` sentence, rewrites the comment at `:1782-1789`, and states that `Ctrl-C` during `--start N` no longer reaches the agents already started.
- Motivation cites `runDetached` (2026-09-05), `/api/claim`, `/plot-fleet --start`, and the shared-group `--stop` effect.
- "What this does NOT do" names systemd's cgroup kill as a separate defect.
