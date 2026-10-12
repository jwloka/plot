# Changelog lens: every-temp-directory-has-an-owner

Position: refuted
Evidence: executed

Juror: changelog lens, 2026-10-01. Subject: `docs/plans/2026-09-30-every-temp-directory-has-an-owner.md`, PRs #1102, #1110, #1114, all merged; main at `ea6925ad`.

## Executed

- `./scripts/check-temp-paths.sh` on main: `Temp paths: clean.`, exit 0, 1 exception-list site.
- `node --test` (Node 24.21.0) over `tmp-helper`, `temp-paths-gate`, `reap-sweep-temp`, `budget-rotation`, `log-rotation` and `owned-run` in `test/reconcile/`, with `TMPDIR` set to a private scratch directory: 83 of 83 pass. **That scratch directory then held 24 entries**: 17 `plot-budget-rot-*`, 1 `plot-budget-cat-*`, 6 `plot-log-rot-*`. All 24 come from the two test files #1110 added.
- `plot-fleet-scan.sh --json` with `TMPDIR` set to an empty directory: exit 0, 0 entries left in `TMPDIR`, `tmp.*` count in `getconf DARWIN_USER_TEMP_DIR` unchanged at 1892 before and after.
- I removed both scratch directories with `trash`, each by the exact path `mktemp` returned.

## Read

- The three PR file lists, the bodies of #1110 and #1114, the three `.changeset/*.md` files, `scripts/owned-run.sh`, `package.json` scripts, `.github/workflows/ci.yml` test steps, and `git grep` for an inventory gate or a manifest of bound globs.

## Per-claim findings: plan `## Changelog`

1. **Entry 1, "helper scripts create every temporary path under `TMPDIR` through one helper": SUPPORTED.** `skills/plot/scripts/plot-tmp.sh` (+108, #1102). `grep mktemp` over `skills/plot/scripts/*.sh` outside the helper finds only comments, and no raw `EXIT`/`INT`/`TERM` trap remains. The gate `scripts/check-temp-paths.sh` passes (executed).
2. **Entry 1, "one exit registry removes them": SUPPORTED.** The file-backed registry is in `plot-tmp.sh`, and `tmp-helper.test.mjs` passes (executed). A fleet scan leaves 0 entries (executed).
3. **Entry 1, "a signal still stops the script": SUPPORTED.** `tmp-helper.test.mjs` covers exit 130 on INT and 143 on TERM, and it passes (executed).
4. **Entry 2, "contract suites run inside a private temp root and a private `HOME`": SUPPORTED, with a scope limit.** `package.json` wraps `test:contracts` and `test:board` in `scripts/owned-run.sh` (#1114). CI runs `pnpm run test:contracts` (`ci.yml:186`), so CI's contract run is wrapped. CI's board job runs `pnpm --filter @plot-pm/board test` and `vitest run` directly (`ci.yml:909`, `:948`), not `test:board`, so CI's board suites run without the wrapper. The `#1114` changeset says "The contract and board suites run in a temp root they own", and that is true only for a local `pnpm run test:board`.
5. **Entry 2, "CI fails a test that leaves an entry behind": REFUTED.** `scripts/owned-run.sh:294` sets `ceiling="${PLOT_LEAK_CEILING:-390}"`, and a count at or under 390 exits with the suite's own status (`:295-299`). A run that leaves 1 to 390 entries passes. My executed run shows #1110's own new tests leave 24 entries, and CI does not fail on them. The Design allowed a temporary allow list only if it "names each file with its measured count and can only shrink". The build is one global count with no file names, and nothing in the code stops a raise of the default. #1114's body states the ceiling openly. The plan's changelog line and the #1114 changeset sentence "An entry left in that root fails the run" both describe the intent, not the built gate.
6. **Entry 3, "the budget ledger rotates into two generations without losing an append or miscounting a read": SUPPORTED.** `plot-budget.sh` (+378 −19), `budget-file.ts`, `truncate()` removed from `ports/budget.ts` (#1110). `budget-rotation.test.mjs` passes (executed).
7. **Entry 3, "supervisor and board logs rotate by size": SUPPORTED.** `packages/board/src/server/process-log.ts` (+224), wired at `registryd-main.ts:1298-1299` and `server/index.ts:104`. `log-rotation.test.mjs` passes (executed).
8. **Entry 3, "every file Plot writes declares its bound": REFUTED.** That claim depends on Layer 5's inventory gate, a checked-in manifest of globs where each glob declares one bound (*overwritten*, *spent*, *window*, *rotated*, …). No PR contains it. `git grep -i 'inventory gate'` outside `docs/plans/` and `.plot/` matches only `scripts/owned-run.sh:100`, a comment: "slice 3's inventory gate reads them". No manifest file exists, and no test lists `HOME/.plot/` after a run. The plan's slice text puts the gate in `bug/the-suites-own-their-temp-root` (#1114), and both briefs say the same. The comment in #1114 sends it to slice 3, and #1110 does not contain it. The work went to neither slice. The Done-when item "the inventory gate fails on an undeclared state path" has no test. Only one path got a new declared home: the board cache, `plot-update-board.sh`, moved to `~/.plot/state/board-cache/`.

## Changesets

9. **All three PRs carry a changeset, and each names the plan on a `plan:` line**: `scripts-share-one-temp-helper.md` (patch), `every-state-file-declares-its-bound.md` (minor), `the-suites-own-their-temp-root.md` (patch). The changesets for #1102 and #1110 match their diffs. The #1110 changeset does not claim the inventory gate, although its file name ("every state file declares its bound") does. The #1114 changeset overstates the gate (see finding 5) and the board-suite scope (see finding 4). No changeset mentions the inventory gate, which agrees with its absence from the code.

## Verdict

6 of 8 changelog claims hold against the merged code, and the tests I ran confirm them. Two claims describe intent that nobody built. The first is "every file Plot writes declares its bound": the inventory gate and its manifest are in no PR. The second is "CI fails a test that leaves an entry behind": the gate fails only above a 390-entry ceiling, and the plan's own new tests leave 24 entries. The plan is not delivered as its changelog states. To clear this, build the inventory gate or move it to a new plan, and rewrite the changelog line about the leak gate as a ratchet with a ceiling.
