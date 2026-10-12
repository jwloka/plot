# Round 3 — process-lifecycle juror

Position: proceed

Subject: the plan at `07a1d883`. One agent applied the three round-3 lenses in sequence.

## Round 2 asks

1. Sibling test: `--start 2` spawned with `detached: true`, `--stop` from the test's group, the condition in Done-when. Carried, with the measured reason (`:1795-1798`).
2. The own-group guard at `:1790-1796` stays; the rewritten `:1783-1789` comment names agents started before the change; "What this does NOT do" carries the line. Carried.
3. The SIGINT disposition sentence is scoped to macOS, which matches the round 2 measurement (on Debian both forms ended under `kill -INT`). Carried.
4. The brief comment at `:786-789` is rewritten to name `set -m`. Carried; checked that the comment still says `setsid` is not used because macOS lacks it.

## Residual

The Linux claim still rests on a copy of the form in Docker, which the plan's Open Point states and CI's ubuntu runner settles. No new process-group or signal claim was added without a measurement behind it.
