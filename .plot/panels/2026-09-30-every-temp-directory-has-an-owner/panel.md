# Delivery panel: every-temp-directory-has-an-owner

Caller: `/plot-deliver`, 2026-10-01, unattended. Subject: `docs/plans/2026-09-30-every-temp-directory-has-an-owner.md` at `ea6925ad`. Evidence: PRs #1102, #1110, #1114, all MERGED.

Reconcile: `unanimous refuted deliverable,behaviour,changelog`. Each juror committed `Evidence: executed`.

## Findings all three lenses share

1. **The inventory gate is absent.** The plan's Layer 5 specifies a checked-in manifest of globs, one bound per glob, and a test that lists every file under the sandbox's `HOME/.plot/` after the contract suite. The Done-when item at plan line 288 reads "The inventory gate fails on an undeclared state path". No PR adds a manifest, an inventory test or the fixture. The re-cut on 2026-09-30 (plan line 303) moved the gate to `bug/the-suites-own-their-temp-root` (#1114). `scripts/owned-run.sh:100` still names "slice 3's inventory gate", and the two briefs each assign it to the other slice, so neither slice built it. The plan's changelog entry "every file Plot writes declares its bound" therefore describes work no PR contains.
2. **The leak gate is a 390-entry ceiling, not a failure on any leak.** `owned-run.sh:294` defaults `PLOT_LEAK_CEILING` to 390. The behaviour juror ran a one-entry leak: exit 0 at the default, exit 1 at ceiling 0. The plan allows a temporary allow list only if it "names each file with its measured count and can only shrink" (plan line 204). The shipped count names no file, an environment variable raises it, and no gate holds the shrink. #1114 states the deviation (`e4fb57db`). The plan's own new tests from #1110 leave 24 entries, 18 from `budget-rotation` and 6 from `log-rotation`, and the gate passes them.

## Findings from one lens only

- Changelog lens: CI's board job runs `vitest` directly (`ci.yml:909`, `:948`) and not `pnpm run test:board`, so the board suites in CI run outside `owned-run.sh`. The #1114 changeset says both suites run in an owned root.
- Deliverable lens: the per-file leak fixes are partial. About 23 contract files remain unmigrated, and the ceiling is what keeps them passing.

## Supported, with executed evidence

The temp helper (`plot-tmp.sh`, registry, re-raising traps: exit 143 on TERM, empty `TMPDIR`), the `check-temp-paths.sh` gate and its fixtures, the `--sweep-temp` dry-run and its exclusions, the registryd flag in both units (86/86), a fleet scan that leaves 0 entries, two-generation ledger rotation and its reads, log rotation, and the board-cache move (read only).

## What the lenses had in common

All three read the same plan and the same three diffs, and all three reached the two refutations through the same Done-when text. None ran a full `pnpm run test:contracts`, and none ran the four long scan suites (`fleet`, `fleetrefplans`, `fleetclaimable`, `fleetderived`). A defect in those suites is outside what this panel measured.

The behaviour juror ended an orphaned child with `pkill -f 'sleep 20' -u <user>`. That pattern can also match an unrelated `sleep 20` process belonging to the same user.

## Decision owed to a person

Choose one of three ways to clear the two refutations:

- Build the inventory gate and a shrink-only, per-file leak allow list as a fourth slice.
- Defer both with a `<!-- deferred: -->` slice line pointing to a follow-up plan, and rewrite the two changelog entries to describe what shipped.
- Deliver as is, with the two refutations accepted on the record.

Nothing was delivered. The plan stays `State: Approved`.
