# Round 1 — fleet operator

Position: amend

## What I read

The plan against what an operator does on the day it merges: the supervisor process (pid 10942, started 2026-09-30 09:23, running an artifact older than today's merges), the three briefs held in `.plot/briefs/held/` (`19f662d1`), and the tick line an operator reads.

## What must change

1. **The fix does nothing until the supervisor restarts.** `plot-registryd.mjs` is loaded once; the running daemon on this machine is 33 hours old. The plan must name the rollout: rebuild, then restart the supervisor with `/plot-fleet --stop` / `--start` once no agent's work would be lost (#1144 and #1148 describe why a restart can end agents in the supervisor's group). Without it, Done-when passes in CI and the fleet keeps handing out second slices.
2. **The held briefs need a named owner.** The workaround in Motivation moves three briefs to `held/`. Say who moves them back and when: each returns when its first slice merges, or all return once slice 1 of this plan is running in the supervisor — whichever the plan intends. Otherwise three slices stay invisible to the queue after the fix lands.
3. **A `waits` hold must say what it waits for where an operator looks.** The tick line counts `waits=N`; the held list names the branch. State the exact held-list line, for example `bug/x: held — waits on bug/y (not merged)`, so the line can be grepped.

## What holds

The stale bound's direction (withhold, re-derive next tick), and keeping the stale-claim message for #1152.
