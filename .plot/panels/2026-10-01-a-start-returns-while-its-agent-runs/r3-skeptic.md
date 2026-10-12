# Round 3 — skeptic (reproduces)

Position: proceed

Subject: the plan at `07a1d883`. One agent applied the three round-3 lenses in sequence; it could not start separate juror agents.

## What I checked

The round 3 changes are test and wording changes; the mechanism is unchanged since round 2, where I measured it on the real script (`--start 1 | cat` 20.39 s today, 0.48 s with the plan's form; wrapper PGID equal to its pid only with `set -m`). I did not re-run the script this round. I checked the new claims against `origin/main`:

- `runDetached` spans `test/reconcile/dispatch.test.mjs:3350-3382` (docblock at 3350, closing brace at 3382). Correct.
- `--stop`'s own-group fallback is `:1795` and its message `:1802-1806`; the plan cites `:1795-1798` for the decision. Correct.
- `killGroup` (`run-script.ts:63-70`) catches any error from `process.kill(-pid)` at `:65-69` and falls back to the pid. The plan's "an `ESRCH` counts as an empty group, as `killGroup` treats it" is true in effect.
- No test in `dispatch.test.mjs` spawns with `detached: true`; all 93 dispatcher calls use `spawnSync` or `execFileSync` in the runner's group. The sibling test's stated condition is necessary.

## Round 2 asks

1. Sibling test spawned `detached`, `--stop` from the test's group, condition in Done-when: carried.
2. Forced kill tolerates `ESRCH`: carried.
3. Brief stand-in writes its own `$$`: carried.
4. `:3350-3382`: carried.

Every Done-when item now fails today and passes after its slice.
