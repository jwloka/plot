# Deliverable lens — the-refs-corpus-test-fails-when

Position: supported
Evidence: executed

## Deliverables

The plan names one slice (`feature/the-refs-corpus-test-fails-when`, PR #1408, merged 2026-10-08T23:53:47Z as `e4251bfbf`) with two deliverables. Both are in the merged diff.

1. **`pinClone` adds one fixture branch with one changed path.** Present. `packages/domain/corpus/pin-clone.ts` exports `FIXTURE_BRANCH = 'infra/plot-corpus-fixture'` and `FIXTURE_PATH = 'docs/plans/zzz-plot-corpus-fixture.md'`; `fixtureCommit` builds the commit with `hash-object`, a throwaway `GIT_INDEX_FILE`, `write-tree` and `commit-tree -p <pinned>` in `source.git`, with a fixed identity and date; `pinClone` pushes `create refs/heads/${FIXTURE_BRANCH} ${fixtureCommit(source, pinned)}` beside the pin (diff hunk at old line 107). No working tree, no checkout, ROOT untouched — as the Approach required.
2. **The guard asserts on that branch by name.** Present. `refs.corpus.test.ts:541-542` replaces the count `wireBranches.filter(... changed_paths.length > 0).length > 0` with `wireBranches.find(b => b.branch === FIXTURE_BRANCH)` and `expect(fixture?.changed_paths).toEqual([FIXTURE_PATH])`. A missing fixture (undefined) fails `toEqual`, so a pin that reads nothing still fails the guard.

The Changelog line is carried by `.changeset/the-pin-carries-its-own-branch.md`, which names the plan on a `plan:` line after the description.

## Open Questions

The plan's four checkboxes remain `[ ]` in the plan file — the answers live in the code and the changeset, not in the plan. This is a documentation gap, not a missing deliverable.

- **Q1 (which plan names the branch):** neither (a) nor (b) as written. The fixture plan is added ON the fixture branch itself (`FIXTURE_PATH` is the branch's one changed path), so `PIN` stays at `pinned` and the `read_ref` startsWith check keeps holding. It does not depend on the estate's plan list.
- **Q2 (does `conflicts_known` become true):** answered by execution — the scan reports `changed_paths` for the fixture, otherwise `toEqual([FIXTURE_PATH])` would fail against `undefined`/`[]`.
- **Q3 (does the extra branch disturb other branch-counting assertions):** no. The fixture adds one plan and one branch to BOTH readings, because both the adapter (`refsGit(shellContext(CLONE))`, line ~295) and production (`readFleetScan({ root: CLONE })`) read the same clone. `pulse.plans.length toBe raw.plans.length` (`:322`), the per-plan `slices.length` / `branches.length` comparisons (`:354`, `:363`), `summary.branches > 0` (`:549`) and the `moved` floor `compared.length > branches.length / 2` (`:584`) all still pass in my run. The fixture SHA is fixed, so it never enters `moved`.
- **Q4 (does `readFleetScan` run against the clone):** yes, `readFleetScan({ root: CLONE } satisfies Estate)` in `beforeAll`.

No other corpus test calls `pinClone` (grep: only `pin-clone.ts` and `refs.corpus.test.ts`), so the fixture reaches no other suite.

## Executed vs read

Executed:
- `gh pr view 1408`, `gh pr diff 1408` — 3 files: changeset, `pin-clone.ts` (+94/-7), `refs.corpus.test.ts` (+8/-4).
- Under Node v24.21.0: `pnpm exec vitest run --config vitest.corpus.config.ts corpus/refs.corpus.test.ts` in `packages/domain` on main — **1 file, 8 of 8 tests passed** (38 s), on an estate where #1403's failure condition was the reason for the plan.
- `gh pr checks 1408` — `corpus` job **pass** (3m23s).
- `grep` for `pinClone` users and for branch-counting assertions in the test file.

Read only:
- The guard-power claim (a broken pin still fails) — reasoned from `toEqual([FIXTURE_PATH])` against `undefined`/`[]`; I did not mutation-test it (no tracked-file edits allowed here).
- Main-branch CI runs after `e4251bfbf`: the two newest runs were still in progress; the three before them were `success`.

## Note on the shared tree

After my run, `git status` showed `packages/domain/corpus/pin-clone.ts` modified with the fixture `creates.push` line commented out as `// MUT ...` — another juror's mutation test, not my edit. I left it untouched. My 8/8 pass ran against the unmutated file: under that mutation the fixture is absent and `toEqual([FIXTURE_PATH])` would fail.
