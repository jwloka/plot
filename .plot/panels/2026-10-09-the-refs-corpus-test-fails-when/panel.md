# Delivery panel: the-refs-corpus-test-fails-when

- **Caller:** `/plot-deliver`, 2026-10-09
- **Evidence:** PR #1408 (merged 2026-10-08T23:53:47Z, merge commit `e4251bfbf`)
- **Reconcile:** `unanimous supported deliverable,behaviour,changelog`
- **Evidence line:** `executed` for all three jurors

## Deliverables

| # | Deliverable | Status | Evidence |
|---|---|---|---|
| 1 | `pinClone` adds one fixture branch with one changed path | Done | `pin-clone.ts`: `FIXTURE_BRANCH`, `fixtureCommit` via `commit-tree`, `create refs/heads/infra/plot-corpus-fixture` |
| 2 | The guard at `refs.corpus.test.ts:538` asserts on that branch by name | Done | `refs.corpus.test.ts:541-542`: `fixture?.changed_paths` equals `[FIXTURE_PATH]` |
| 3 | The corpus job passes on an estate with no open changed branch | Done | 8/8 locally on `9a0688653`; CI `corpus` green on `e4251bfbf` (run 37861930833) |

## What each juror looked at

- **Deliverable** read the diff against the plan and ran the refs corpus test (8/8). It traced the other branch-counting assertions (lines 322, 354, 363, 549, 584) and found the fixture enters both readings, so they still hold.
- **Behaviour** ran the test and a mutation: with the fixture line commented out, the guard failed with `expected undefined to deeply equal [ Array(1) ]`. The file was restored with `git checkout`.
- **Changelog** ran `./scripts/check-changeset-packages.sh` (exit 0) and compared the plan's Changelog and the changeset text with the diff. The changeset names `@plot-pm/board` because `@plot-pm/domain` is private.

## Shared blind spot

No juror executed the broken-pin case — a pin that reads `unknown` and so yields an empty `changed_paths` for the fixture. All three reasoned it from `toEqual`; the separate `read_ref` assertion covers the same failure. The mutation run proves only the absent-fixture case.

## Housekeeping

The plan's four Open Questions are still unticked, although the implementation answers each: option (b) above the pin is avoided by adding the fixture plan on the fixture branch itself, so `PIN` stays at `pinned`.
