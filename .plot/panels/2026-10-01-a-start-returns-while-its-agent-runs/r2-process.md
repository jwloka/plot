# Round 2 — process-lifecycle juror

Position: amend

Subject: `docs/plans/2026-10-01-a-start-returns-while-its-agent-runs.md` at `19fcf482`. Lens: exec + `set -m`, process groups, job control without a tty, signals, Linux.

## 1. Round 1 requests carried

All carried, including the reason for `exec` over the AND-list split, both outer redirects, `runDetached`, the forced group kill, the `--stop` sentence and comment, `Ctrl-C`, the Motivation callers and #1148.

## 2. Factual claims

The line numbers I checked are correct: `:1472`-`:1536`, `:801`-`:806`, `:1283`-`:1287`, `:1783`-`:1789`, `:3995`, test `:3350`-`:3381`.

I measured a copy of the slice 2 form (`( set -m; cd … && export … && VARS exec nohup sh -c '…' >log 2>&1 </dev/null & ) >/dev/null 2>&1 </dev/null`), launched twice:

- macOS `/bin/bash` 3.2.57 and bash 5.3.15: the pipe closed at 0.03 s and 0.08 s. Each wrapper had PPID 1 and PGID equal to its own pid. The prefixed and exported variables reached the wrapper.
- Debian bookworm, bash 5.2.15, dash as `/bin/sh`, `docker --init`: each wrapper led its own group. `kill -TERM -<wrapper1>` left group 1 empty and group 2 with 2 processes.
- Under a pty (`script -q /dev/null`), 3.2 and 5.3: the terminal's foreground group stayed the dispatcher's before and after the launch, so `set -m` does not take the terminal. A SIGINT to the foreground group left the wrapper running. The `Ctrl-C` paragraph is true.

The orphaned-group case is safe. Once the subshell exits, the wrapper's group has no parent in the session. The kernel then discards stop signals for that group, and `nohup` ignores SIGHUP.

## 3. Order and callers

The order is right. After slice 1 alone, the agent is still in the dispatcher's group, so the forced-kill test still fails and discriminates slice 2.

## 4. Done-when items that do not fail today

**The `--stop` sibling test passes today under the suite's spawn shape.** `runDetached` uses `spawnSync` without `detached`, and the existing `--stop` test (`:1122`) uses `execFileSync`. Both run in node's process group. Today the agents share that group too, so `--stop` sees its own group, takes the fallback and signals the wrapper pid alone. The sibling survives. I measured a copy of the `--stop` logic from node. With `--start` not detached, the target was the pid (`agent pgid 93780, mine 93780`) and the sibling was alive. With `--start` spawned `detached: true`, the target was `-94193` and the sibling was dead. The test fails today only if `--start` runs in a group other than the `--stop` caller's.

## 5. New issues

- **`set -m` removes an inherited SIGINT ignore on macOS.** Today bash's job-control-off async child sets SIGINT to ignored, and `nohup` and `sh` inherit that. With `set -m` this does not happen. Measured on 3.2 and 5.3: the old-form wrapper survived `kill -INT`, and the new-form wrapper died. On Debian both forms died, and the wrapper's own `&` children ignore SIGINT and SIGQUIT in both forms (mask `0x7`). No Plot script sends SIGINT, but the plan must state it.
- **The rewritten `--stop` comment must keep the guard's reason.** Agents started before slice 2 stay in their starter's group until they exit, for example the agents of 34513 and 84589. For these agents `--stop` still ends their siblings. The plan does not say this.
- **The brief comment at `:786`-`:789`** says `setsid` is not used because macOS lacks it. After slice 2, `set -m` gives the group that `setsid` would give. Slice 2 should rewrite that comment too.

## Exact changes

1. Slice 2's `--stop` sibling test: spawn `--start 2` with `detached: true`, in its own process group as `runProcess` does, and run `--stop` from the test's group. Add that condition to the Done-when line.
2. Slice 2: keep the own-group guard at `:1790`-`:1796`. The rewritten `:1783`-`:1789` comment says that agents started before this change still share their starter's group. Add one "What this does NOT do" line: agents that are already running keep the old group until they exit.
3. Slice 2: add one sentence that, on macOS, the wrapper no longer inherits an ignored SIGINT, and that no Plot script sends SIGINT.
4. Slice 2: rewrite the brief-launch comment at `:786`-`:789` to name `set -m` as the group mechanism.
