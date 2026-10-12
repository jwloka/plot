# Behaviour lens — the-refs-corpus-test-fails-when

Position: supported
Evidence: executed

## Deliverables

The plan names one slice with two deliverables: (1) `pinClone` adds one fixture branch with one changed path to the clone; (2) the guard formerly at `refs.corpus.test.ts:538` asserts on that branch by name. A third, behavioural claim follows from the Changelog: the refs corpus test no longer fails on an estate where no open branch carries unmerged changes.

- (1) Found on main: `packages/domain/corpus/pin-clone.ts` exports `FIXTURE_BRANCH = 'infra/plot-corpus-fixture'` and `FIXTURE_PATH = 'docs/plans/zzz-plot-corpus-fixture.md'`; `fixtureCommit` builds the commit with `commit-tree` over a throwaway index; `pinClone` pushes `create refs/heads/${FIXTURE_BRANCH} ...` into `source.git`. The fixture plan names the branch in `## Slices` (option b, but on the fixture branch itself, so `PIN` stays at `pinned`).
- (2) Found on main: `refs.corpus.test.ts:541-542` — `wireBranches.find((b) => b.branch === FIXTURE_BRANCH)` and `expect(fixture?.changed_paths).toEqual([FIXTURE_PATH])`; `:540` keeps the `read_ref` pin check.
- (3) Executed: passes locally and in CI (below).

## Commands and output

1. `nvm use` -> Node v24.21.0; node_modules present.
2. `pnpm --filter @plot-pm/domain exec vitest run --config vitest.corpus.config.ts corpus/refs.corpus.test.ts` on main `9a0688653` -> `Test Files 1 passed (1)`, `Tests 8 passed (8)`, 38.16s.
3. `gh pr view 1408` -> MERGED 2026-10-08T23:53:47Z, merge commit `e4251bfbf`, files: `.changeset/the-pin-carries-its-own-branch.md`, `packages/domain/corpus/pin-clone.ts`, `packages/domain/corpus/refs.corpus.test.ts`. `git merge-base --is-ancestor e4251bfbf HEAD` -> true.
4. `gh run list --branch main --workflow ci.yml` and `gh run view <id> --json jobs`:
   - run 37861930833 on `e4251bfbf` (the merge itself): `corpus success`.
   - runs on every later main commit listed (c2e9836cf .. db82b5898) concluded success, except 71d8d9e9b, ead770076, 1e6123c94, whose only failed job is `validate`, not `corpus`.
   - run 37894534514 on `db82b5898`: `corpus completed success`; run 37896134179 on `9a0688653` (HEAD, still in progress overall): `corpus completed success`.
5. Mutation (guard power): commented out the `creates.push(... FIXTURE_BRANCH ...)` line in `pin-clone.ts`, ran `vitest ... -t 'pinned the clone'` -> `× pinned the clone, so the two scans were asked about one estate`, `AssertionError: expected undefined to deeply equal [ Array(1) ]`, `Tests 1 failed | 7 skipped (8)`. Restored with `git checkout -- packages/domain/corpus/pin-clone.ts`; `git status --porcelain --untracked-files=no` printed nothing.

## Executed versus read

- Executed: the refs corpus test on main (8/8 pass); the CI corpus job lookups for the merge commit and HEAD (success); the fixture-branch removal mutation (guard fails, restored, tree clean).
- Read: the plan, `pin-clone.ts`, and the guard lines in `refs.corpus.test.ts`; the PR's file list. I did not mutate the pin itself (for example `read_ref: unknown`); the plan's claim that a broken pin also empties the fixture's `changed_paths` is read, not executed — `:540`'s `read_ref` check covers that case independently.
- Not a deliverable gap but noted: the plan's four Open Questions remain unchecked `[ ]` in the plan file, although the code answers questions 1 and 4 implicitly.
