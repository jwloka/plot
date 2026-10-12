# Deliverable lens: every-temp-directory-has-an-owner

Position: refuted
Evidence: executed

Subject: `docs/plans/2026-09-30-every-temp-directory-has-an-owner.md`, read against PRs #1102, #1110 and #1114 (all MERGED) and against `main` at `ea6925ad`.

## Executed

- `bash scripts/check-temp-paths.sh` on main: exit 0, "Temp paths: clean.", one exception-list entry.
- `scripts/owned-run.sh node --test` over `tmp-helper`, `temp-paths-gate`, `reap-sweep-temp`, `scan-temp-counts`, `budget-rotation`, `log-rotation` and `owned-run` test files: 85 of 85 pass. The wrapper reported "24 entries left in the run's TMPDIR (ceiling 390, target 0)" and exited 0.
- The same run with `PLOT_LEAK_CEILING=0`: exit 1. The 24 entries are 17 `plot-budget-rot-*`, 6 `plot-log-rot-*` and 1 `plot-budget-cat-*`, all from the two test files PR #1110 added.
- `PLOT_LEAK_CEILING=0 scripts/owned-run.sh node --test test/reconcile/host.test.mjs`: 268 of 268 pass, no leak lines, exit 0. The operator's `~/.plot/state/budget.tsv` grew 12 lines during the run; all 12 are `github jwloka graphql` lines from the live board, not fixture accounts.
- Greps on main for `mktemp`, raw `trap … EXIT|INT|TERM` and `/tmp/` in `skills/plot/scripts/*.sh`: only comments and the `plot-reap.sh` `case` pattern remain.

## Read only

PR file lists and bodies (`gh pr view`), `scripts/owned-run.sh`, `package.json`, `skills/plot/scripts/plot-budget.sh`, `plot-update-board.sh`, `packages/board/src/server/process-log.ts`, its two callers, both unit files, `plot-reconcile-scan.sh` section 25, and the test files named below.

## Findings per deliverable

1. **`plot-tmp.sh` helper (assign by name, file registry, source-time traps, re-raise, load-once guard): SUPPORTED.** PR #1102 adds `skills/plot/scripts/plot-tmp.sh` (+108). `test/reconcile/tmp-helper.test.mjs` covers `$(…)`/`( … ) &` registration, double source, the stale registry, TERM 143 and INT 130. All passed when executed.
2. **Migration of the 14 `mktemp` sites, the nine fixed `/tmp` paths and the 8 traps: SUPPORTED.** The PR #1102 diff touches the named scripts. The gate and the greps on main find no remaining site.
3. **Layer 1 grep gate with exception list and glob-`rm`/`find -delete`/`xargs rm` refusals: SUPPORTED.** `scripts/check-temp-paths.sh` (+251) is wired in `ci.yml`. `test/reconcile/temp-paths-gate.test.mjs` holds the `getconf` incident form, the `:578` assignment shape, `find … -delete` and `xargs rm`, plus the passing `${TMPDIR:?}` forms. Executed green. PR #1110 removes the `plot-update-board.sh:66` exception as planned.
4. **Fleet-scan cache renamed `plot-fleet-host-state.*` and removed on exit: SUPPORTED.** `test/reconcile/fleetrefplans.test.mjs:307` asserts the name and an empty `TMPDIR` afterwards.
5. **`plot-reap.sh --sweep-temp` and the `Temp sweep after` key: SUPPORTED.** `plot-reap.sh` +84, `plot-config.sh`. `reap-sweep-temp.test.mjs` asserts removal of `plot-host-pTFuyG`, `plot-run.x` and a dead-pid memo, and keeps `tmp.*`, `plotter-old`, `plot` and the live/young entries. Executed green.
6. **registryd `--sweep-temp`, hourly, in both units: SUPPORTED.** `registryd-main.ts` +41, the `temp-sweep` port, rule and adapter in `packages/domain`, `--sweep-temp` in `com.plot-pm.registryd.plist:41` and `plot-registryd.service:56`.
7. **Reconcile advisory counts: SUPPORTED.** Section 25 at `plot-reconcile-scan.sh:3094` emits `temp_sweepable=`, `legacy_tmp_caches=` and `broken_locks=`. `scan-temp-counts.test.mjs` executed green.
8. **`scripts/owned-run.sh` with private `TMPDIR`, `HOME`, `PLOT_BUDGET_HOME` and `PLOT_PR_INDEX_HOME`, registry check with the original environment, signal traps: SUPPORTED.** PR #1114 adds the script (+315), and `package.json:18-19` wraps both `test:board` and `test:contracts`. `owned-run.test.mjs` covers INT 130, TERM 143, SIGKILL leaving one `plot-run.*`, and the registry check under the original `os.tmpdir()`. Executed green.
9. **Layer 4 leak gate, "`pnpm run test:contracts` fails when a test leaves an entry": REFUTED as specified.** `owned-run.sh` fails only above `PLOT_LEAK_CEILING`, default **390**. The plan allows a temporary allow list "only when it names each file with its measured count and can only shrink". The shipped ceiling is one count and names no file, so a newly leaking test passes while the total stays at or under 390. Executed evidence: the plan's own new test files from PR #1110 (`budget-rotation`, `log-rotation`) leak 24 entries, and the gate passes them. The fixture contract does hold at ceiling 0 (`owned-run.test.mjs:73`, `:125`). PR #1114 states the deviation and its reason.
10. **Per-file fixes so the leak gate passes: PARTIAL.** `host.test.mjs` leaves 0 (executed). The PR body lists `budget`, `state-gate`, `dispatch` and the four scan files at 0, and 7 board entries remaining. About 23 other contract files, 390 entries in total, stay unmigrated, and the gate passes only because of the ceiling.
11. **Inventory gate with a checked-in manifest of globs, one bound per glob ("The inventory gate fails on an undeclared state path"): REFUTED: absent.** None of the three PRs adds a manifest file, an inventory test or a fixture that writes an undeclared state path. `git grep -i inventory` outside `docs/` finds only `owned-run.sh:100`, a comment saying "slice 3's inventory gate reads them". The plan assigns that gate to the slice PR #1114 implements, and #1110 (slice 3) has no such file either. The PR #1114 body does not mention it. So the rule's third clause, "Every file Plot writes outside a temp root declares its bound", has no declaration and no gate.
12. **Budget ledger two-generation rotation, `budget.gen` counter, mkdir lock, stale-lock break with `budget-lock-broken.tsv`, exact sequence-lock reader with `read` and `rotating`: SUPPORTED.** `plot-budget.sh` +378 (`budget_gen_*`, `budget_lock_break`, `budget_lock_recover`, reader at :513-537). `budget-rotation.test.mjs` (+561) includes the FALLBACK_WINDOW_MS contract at :543. Executed green.
13. **Removal of `truncate()` / `truncationOwed()` from the port and adapter: SUPPORTED.** The `ports/budget.ts`, `budget-file.ts` and `rules/budget-record.ts` diffs remove them. Only history comments remain at `ports/budget.ts:32` and `budget-file.ts:148`.
14. **Process-owned log rotation for registryd and the board (10 MB, 3 kept, inherited stdout truncated): SUPPORTED.** `packages/board/src/server/process-log.ts` (+224) with `LOG_MAX_BYTES` and `LOG_KEPT_GENERATIONS = 3`, imported by `index.ts:36` and `registryd-main.ts:52`, plus `truncateInherited`. `log-rotation.test.mjs` executed green.
15. **Board-project cache moved to `~/.plot/state/board-cache/`: SUPPORTED.** `plot-update-board.sh` on main, at the lines following `set -euo pipefail`.
16. **"One run of `host.test.mjs` adds zero lines to the operator's `budget.tsv`": SUPPORTED** under the wrapper (executed; the 12 added lines are live-board lines). PR #1114 names a gap: `packages/domain/test/{host-shell,tracker-shell}.test.ts` run outside both wrapped scripts and still reach the operator's ledger.

## Conclusion

Layers 1, 2, 3 and 5's rotation and cache work are present in the merged diffs. Two named deliverables are not delivered as the plan defines them. The inventory gate and its manifest (finding 11) appear in no merged diff. The leak gate (finding 9) does not fail a run that leaves an entry: it fails only above a 390-entry total that names no file, which is the allow-list shape the plan rules out. On that evidence the plan is not delivered.
