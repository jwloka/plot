# Round 1 — fleet operator

Subject: `docs/plans/2026-10-01-an-assignment-is-read-where-it-is-recorded.md` at `cff4c03f`.

Position: proceed

## What I read

The tick line format (`registryd-main.ts:1203`, `:1301`), the `--release` refusals (`plot-dispatch.sh:2031-2046`), and today's incident in `registryd.log:23786-23883`.

## Findings

- The `assigned` hold covers a `waiting` agent (one that wrote `PLOT-BLOCKED`), so its slice stays held until a person answers. That is what the three wave-2 agents needed this afternoon, and the tick names the agent, so an operator can find the desk.
- `orphaned-claims=N` with the release command is the line that would have saved the 2026-09-29 hours (`handed=0 idle=3 not-claimable=318`) and this afternoon's empty refs. It reports every tick; at 60 s that is noise only while a claim stays orphaned, which is the point.
- The `--release` refusal names the agent id and desk. With that, a release can no longer clear a manifest under an agent that was just handed the branch.
- The `stale-claim` message replaces a false `REGISTRY LOCK VIOLATION` with the command an operator runs.

## Notes, not blocking

- The board does not show `assigned` or orphaned claims. #1150 (`a-handed-slice-reads-as-taken`) owns the board's reading of a held claim; the plan should cite it in "What this does NOT do".
- `orphaned-claims` should exclude a claim younger than one tick interval, or say why not: an agent that pushed seconds ago but whose manifest write lags reads orphaned for one tick.
