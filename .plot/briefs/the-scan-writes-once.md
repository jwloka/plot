## Implementation brief — the-fleet-closes-its-review-findings (wave: The scan writes once)

- **Plan (canonical):** [docs/plans/2026-10-10-the-fleet-closes-its-review-findings.md](../../docs/plans/2026-10-10-the-fleet-closes-its-review-findings.md) on `main`
- **Approved:** 2026-10-10, Jan Wloka, plan-PR #1499 merged
- **Branch:** `bug/the-scan-writes-once` (base: `main`)
- **Ends as:** one PR to `main`
- **Review of the code:** PR (per `## Plot Config` — `Review: pr`)

This slice touches `packages/fleet/src/shared/fleet-clock.ts` and its test, which no other slice in this plan touches — checked 2026-10-11, no local or remote ref for `bug/the-scan-writes-once` yet. This brief and its `Started:` record claim no branch, per `--brief-only`.

### What to build

**The fleet's own clock writes the bridge twice per scan — once thin, from the shell script, once full, from TypeScript — and the fix is one word.** `fleetScan` (`packages/fleet/src/shared/fleet-clock.ts:104`) calls `scanOnce(world, state, { record: true })`. `scanOnce` (`fleet-scan.ts:350-369`) always runs `plot-fleet-scan.sh --stream`, and its `env` is built as:

```ts
env: {
  PLOT_TERMINAL_CACHE: state.terminal,
  PLOT_PR_LISTING: reusing ? state.listing : '',
  ...(options.record ? {} : { PLOT_SCAN_RECORD: '0' }),
},
```

`record: true` makes that spread contribute nothing, so `PLOT_SCAN_RECORD` is absent from the child's environment. Inside `plot-fleet-scan.sh`, the `--stream` arm (`:313`) reads `[ "${PLOT_SCAN_RECORD:-1}" = 0 ] || record=1` — with the variable unset, `${PLOT_SCAN_RECORD:-1}` is `1`, the `=0` test fails, and `record=1` is set. So every fleet-clock tick makes the shell script write its own (thin) bridge file, and then `fleetScan` (`fleet-clock.ts:105`) calls `writeScan`, which writes the full six-field bridge over it. `writeScan`'s own TSDoc already says the quiet part out loud: *"the script's own write, which a `record` scan leaves thin, is replaced by this one"* — that sentence describes today's behavior as if it were intended; it is the defect. The fix is `record: false` at `fleet-clock.ts:104`, so `PLOT_SCAN_RECORD=0` reaches the shell script and `--stream` never sets `record=1` on a fleet-driven scan.

### The decisions the plan settles — do not re-derive them

- **`writeScan` stays the fleet's one writer — this slice does not touch it.** The fix is entirely the `record: true` → `record: false` flip in `fleetScan`'s call to `scanOnce`. Do not add a second code path, a flag threaded further down, or a change to `ScanOptions` itself — the option already does exactly what is needed; `fleetScan` is just passing the wrong literal.
- **`--log-pulse` is not part of this defect and must not be touched.** The plan's heading cites "#1445 M1, L6 (`--log-pulse`)" together, but they are different claims about different callers. `--log-pulse` (`plot-fleet-scan.sh:295`, unconditional `record=1`) is `/plot-pulse`'s own flag for a standalone, boardless caller with no fleet behind it — it is supposed to record its own bridge, and `test/reconcile/fleet.test.mjs:393-414` ("`--log-pulse` appends one line to the plan, clean pulses included") already covers that path and must keep passing unchanged. The L6 finding about `--log-pulse` is about something else — re-read #1445 L6 on the issue itself before writing any line here; this brief's "Done when" section below covers only the fleet-clock double-write, which is the M1 half.
- **`--stream` is the board's own flag and is unaffected by this fix in the board's own use.** The board calls `scanOnce` (via whatever path it uses) however it already does; this slice changes only the fleet's call site in `fleet-clock.ts`. If the board also passes `record: true` deliberately (it is not a fleet, so it may legitimately want the shell script's own write), do not change that call — grep for other `scanOnce(` callers before assuming this is fleet-only, and leave any caller alone whose `record: true` is not the fleet-clock's.
- **The existing clock test has the right title and the wrong assertion — fix the assertion, not the title.** `packages/fleet/test/unit/fleet-scan-clock.test.ts:85-94`, `'asks the scan to record nothing of its own'`, currently asserts `expect(seen[0]?.PLOT_SCAN_RECORD).toBeUndefined()`. That assertion is satisfied by today's defective code (`record: true` → env key absent → `toBeUndefined()` passes) and is backwards from what the test's own name claims: "recording nothing of its own" means the script received `PLOT_SCAN_RECORD=0`, not that the key was never set. After the fix, the correct assertion is `expect(seen[0]?.PLOT_SCAN_RECORD).toBe('0')`. Confirm this test fails against unfixed `main` before changing it (it currently passes, for the wrong reason), then flip the assertion so it fails on `main` and passes on this branch — matching the plan's `## Done when` instruction that each test "fails on `origin/main` today."

### Done when

The plan's `## Done when` list does not name this slice's test directly (it is covered implicitly by "each test below fails on `origin/main` … today" plus the local-checks line). The specification for this slice:

- `fleet-scan-clock.test.ts`'s `'asks the scan to record nothing of its own'` asserts `PLOT_SCAN_RECORD` is `'0'`, not `undefined` — proving the shell script is told not to record, and that `writeScan` is the sole writer.
- The two other tests in that `describe` block (`'reads one scan and writes one bridge'`-style and `'leaves the previous bridge byte-identical when a scan ends without a pulse'`, `fleet-scan-clock.test.ts:71-83`) must keep passing unchanged — they test byte-identity across failed scans and are orthogonal to which env var reaches the child process.
- No test in `test/reconcile/fleet.test.mjs` or elsewhere that exercises `--log-pulse` or `--stream` directly changes — this fix is scoped to the fleet-clock's call site, not the shell script's flag semantics.

Plus: run `node skills/plot/scripts/board/plot-local-checks.mjs` before each push and run what it prints. This slice touches `packages/fleet/src/shared/fleet-clock.ts` and its test, so expect `pnpm --filter @plot-pm/fleet exec vitest related --run {changed}` and `pnpm --filter @plot-pm/fleet exec tsc --noEmit -p .` in its output, plus the repo-wide `check-*.sh` gates. The suites in the `CI suites` config key run in CI on every pull request; a failure there comes back as a correction. Do not run `test:e2e` locally — it dispatches real workers into sandbox repos and is CI's gate, not a local one.

**This slice touches no `.sh` file.** The fix is a one-line TypeScript change (`record: true` → `record: false`) plus a test-assertion fix; `scripts/check-shell-lines.sh` is not implicated. If investigation turns up a reason the shell script itself needs a change, that gate refuses a pull request whose shell under `skills/` grows past its merge base — pay for growth by removing shell elsewhere in the same change.

### Bookkeeping

- Push the first real commit as soon as it exists.
- Open the PR with `../plot/scripts/plot-open-pr.sh` (add `--draft` while the work moves). Do not run `gh pr create`.
- When the PR exists, append `→ #<number>` to this branch's line under `## Slices` in the plan.

### Scope guard

This branch owns:

- `packages/fleet/src/shared/fleet-clock.ts` — the `record: true` → `record: false` change at `fleetScan`'s call to `scanOnce` (`:104`)
- `packages/fleet/test/unit/fleet-scan-clock.test.ts` — the assertion fix at `'asks the scan to record nothing of its own'` (`:85-94`)

It does not touch `packages/fleet/src/shared/fleet-scan.ts` (`ScanOptions`, `scanOnce`, `writeScan` stay as they are — only their caller's argument changes), `skills/plot/scripts/plot-fleet-scan.sh` (no `.sh` change expected), `packages/board/src/server/fleet.ts` (slice "The board writes no index" owns #1445 M2/M3/L4), or anything in the other eleven slices' scope. No sibling branch shares this slice's files, so no collision is possible today — re-check with `git log --oneline -- packages/fleet/src/shared/fleet-clock.ts` before trusting that if time has passed.

If you find something the plan did not anticipate, report it rather than improvising outside scope.
