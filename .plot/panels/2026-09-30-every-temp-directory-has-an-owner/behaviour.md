# Behaviour lens: every-temp-directory-has-an-owner

Position: refuted
Evidence: executed

Subject: `docs/plans/2026-09-30-every-temp-directory-has-an-owner.md` on `main` at `ea6925ad`, PRs #1102, #1110 and #1114 (all MERGED). All runs used Node 24, with `TMPDIR`, `HOME` and `PLOT_BUDGET_HOME` set inside `/Users/jwloka/tmp-juror/beh.8HMjDm`. `plot-reap.sh` ran without `--yes`.

Two deliverables are refuted. Every other behaviour I ran held.

## Refuted

1. **The inventory gate does not exist (Layer 5, assigned to slice #1114).** The plan says: "The inventory gate and its manifest of globs" and gives the Done-when line "The inventory gate fails on an undeclared state path". #1114's file list contains no manifest and no inventory test. `git grep -i inventory` outside `docs/` finds only comments and briefs. `scripts/owned-run.sh:100` says "slice 3's inventory gate reads them", but slice 3 is #1110, merged before #1114, and it has no inventory gate either. Each brief assigns the gate to the other slice: `.plot/briefs/every-state-file-declares-its-bound.md:50` gives it to the-suites-own-their-temp-root, and `.plot/briefs/the-suites-own-their-temp-root.md:81` gives it to slice 3. Nothing gates the sentence "every file Plot writes declares its bound". (Read)

2. **`pnpm run test:contracts` does not fail when a test leaves an entry.** `owned-run.sh` carries `ceiling="${PLOT_LEAK_CEILING:-390}"`. Executed:
   - `TMPDIR=$S/leak ./scripts/owned-run.sh sh -c 'mkdir "$TMPDIR/plot-leaky-AbC123"'` printed `1 entry left in the run's TMPDIR (ceiling 390, target 0) ... at or under the ceiling, so this run is not failed on it` and exited **0**.
   - The same command with `PLOT_LEAK_CEILING=0` printed `above the ceiling of 0: plot-leaky-AbC123 (prefix plot-leaky-)` and exited **1**.

   The plan accepts a temporary allow list "only when it names each file with its measured count and can only shrink". The shipped mechanism is one total count. It names no file, and an environment variable can raise it. Nothing enforces "can only shrink", because the ceiling is a default inside the script and no gate holds it. Commit `e4fb57db` records this deviation on purpose: 390 entries from about 23 files that were not migrated. So the Done-when line "fails when a test leaves an entry" holds only with the override. The fixture test `owned-run.test.mjs` passes because it sets `PLOT_LEAK_CEILING: '0'`. The plan's own new tests also leak. `budget-rotation.test.mjs`, run alone, left **18** `plot-budget-rot-*`/`plot-budget-cat-*` entries, and `log-rotation.test.mjs` left **6** `plot-log-rot-*` entries. A second run in the same directory doubled the log-rotation listing to 12.

## Supported (executed)

3. **Gate `scripts/check-temp-paths.sh`.** On `main` it printed `temp-path sites in the exception list: 1` and `Temp paths: clean.`, exit 0. Against a fixture root it exited 1 and named `[mktemp]`, `[tmp-literal]` (the `tmp="/tmp/plot-host-prlist-err.$$"` assignment shape), `[trap]`, `[substitution]` (`$(plot_tmpdir`), `[rm-glob]` (`rm -rf "$(getconf DARWIN_USER_TEMP_DIR)"tmp.*`) and `[find-delete]`. A quoted `"$TMPDIR/tmp.*"` and `"${TMPDIR:?}/plot-foo.$$"` passed. The exception list holds only `plot-reap.sh`, so the `plot-update-board.sh:66` entry was removed as planned. CI runs the gate at `ci.yml:483`.
4. **`plot-tmp.sh` registers in the calling shell.** A script made one `plot_tmpdir` in the main shell, one inside `$(…)` and one `plot_tmpfile` inside `( … ) &`, sourced the helper a second time, and exited 7. Both paths existed before exit. The exit status was **7** and the `TMPDIR` was empty afterwards.
5. **The signal semantics hold.** I spawned a script from node, with `sleep 5` after the `plot_tmpdir` call. SIGTERM ended it with `signal=SIGTERM`, and SIGINT ended it with `signal=SIGINT`. In both cases `TMPDIR` was empty and the `echo AFTER-SIGNAL` line did not run. From bash, `kill -TERM` gave `$?=143`. `kill -INT` on a bash background job gave 0, which is the documented SIGINT-ignored case.
6. **The sweep (dry-run is the default).** The fixture held old `plot-host-pTFuyG`, `plot-run.x`, `tmp.AbCdEf`, `plotter-old` and `plot`, a young `plot-young`, a dead-pid memo `999991` and a live-pid memo. The sweep printed `would remove` for `plot-host-pTFuyG`, `plot-run.x` and `memo/999991` only, then `temp-summary: swept=3 removed=0 kept_live=1 bound_hours=24 ... dry_run=1`. Nothing was removed.
7. **The registryd `--sweep-temp` flag.** Both units pass it (`plot-registryd.service:56`, `com.plot-pm.registryd.plist:41`). The vitest run of `registryd-main.test.ts` and `registryd-units.test.ts` gave 86/86 passed, including "sweeps no temp path unless asked" and "runs at most once an hour".
8. **The fleet scan leaves nothing.** `TMPDIR=<empty> plot-fleet-scan.sh --json` left 0 entries in `TMPDIR`. It added no `plot-*`/`tmp.*` entry of its own to `getconf DARWIN_USER_TEMP_DIR` or `/tmp`. The three entries newer than my marker belonged to pid 39132, the live board's own `--stream` scan, and already carry the `plot-fleet-host-state.*` and `plot-reg.<pid>` names.
9. **`host.test.mjs` is clean.** Run directly with an empty `TMPDIR`, it passed 268/268 and left **0** entries. Run through `owned-run.sh` with a fake operator `HOME` holding an empty `~/.plot/state/budget.tsv`, it passed 268/268, the ledger still had **0** lines, and no `slots/` directory appeared.
10. **The `owned-run.sh` signals hold.** SIGTERM to the wrapper gave status 143 at once and left nothing. SIGKILL gave status 137 and left exactly one `plot-run.u7dL3A`. The registry check ran with the original environment and printed `registry-leak: none (...)`.
11. **Ledger rotation.** The ledger's first line was 25 h old. Three `budget_append` calls rotated it: `budget.tsv` had 3 lines, `budget.tsv.1` had 1 line and `budget.gen` read 2. `budget_rate_read` answered `"read":4`. With `budget.tsv` absent it read `.1` (`"read":1`; spent 0 is correct, because that line is outside the window). With `.1` absent it answered `spent 3, "read":3`, not 0.
12. **Contract and unit tests, each run alone with scratch env vars.** `tmp-helper` 9/9, `temp-paths-gate` 29/29, `reap-sweep-temp` 4/4, `scan-temp-counts` 2/2, `budget-rotation` 18/18, `log-rotation` 9/9, `owned-run` 14/14. Domain vitest (`temp-sweep`, `budget-file`, `budget`, `spend-rate`): 85/85. These cover the stale-lock, concurrent-breaker and log-rotation cases that I did not reproduce by hand.

## Read only, not executed

- The board-cache move: `plot-update-board.sh:73-75` uses `${GIT_DIR}` or `~/.plot/state/board-cache`, and contains no `/tmp`.
- The reconcile-scan footer keys `temp_sweepable=`, `legacy_tmp_caches=`, `broken_locks=` (`plot-reconcile-scan.sh:3075-3098`). Their test passed (item 12), but I did not run the scan itself.
- Removal of `truncate()`: only historical comments remain in `ports/budget.ts:32` and `budget-file.ts:148`.
- Not run: the GNU `mktemp` measurement, the four long scan suites (`fleet`, `fleetrefplans`, `fleetclaimable`, `fleetderived`) and a full `pnpm run test:contracts`.

Note: to clean up after the SIGKILL case I ran `pkill -f 'sleep 20' -u <me>` to end the orphaned `sleep 20` child. That pattern could also match an unrelated `sleep 20` belonging to this user.
