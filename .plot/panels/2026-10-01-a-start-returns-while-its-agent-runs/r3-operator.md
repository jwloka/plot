# Round 3 — the fleet and supervisor operator

Position: proceed

Subject: the plan at `07a1d883`. One agent applied the three round-3 lenses in sequence.

## Round 2 asks

- The Ctrl-C paragraph now states today's behaviour as measured: the wrapper, monitors and loop ignore SIGINT, `claude` exits on its own handler, and after slice 2 `Ctrl-C` reaches no agent. Carried.
- One sentence states the SIGINT disposition change and that no Plot code sends SIGINT. Checked: no `kill -INT` or `SIGINT` send in `skills/plot/scripts/*.sh`, `packages/board/src` or `packages/domain/src`; `--stop` sends TERM (`:1797`), `killGroup` sends KILL. Carried.
- The claim-return assertion moved to slice 1; slice 2 keeps only "the brief leads its own group". Carried.
- The `ESRCH` tolerance: carried.

## Callers

Unchanged from round 2 and still true: the supervisor tick, `/plot-fleet --start`, `/plot-fleet --stop`, `/api/claim`, the board's dispatch paths. The new "What this does NOT do" line tells an operator that agents already running keep the old group, which is what `/plot-fleet --stop` on today's fleet will still show.
