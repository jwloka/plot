# Changelog lens — the-refs-corpus-test-fails-when

Position: supported
Evidence: executed

## Findings

1. **The plan's `## Changelog` entry matches the diff.** It says the pinned clone supplies its own branch with one changed path. PR #1408 adds `FIXTURE_BRANCH = 'infra/plot-corpus-fixture'` and `FIXTURE_PATH = 'docs/plans/zzz-plot-corpus-fixture.md'` to `packages/domain/corpus/pin-clone.ts`, builds one commit with `git commit-tree ... -p <pinned>` in `source.git` (`fixtureCommit`), and pushes `create refs/heads/${FIXTURE_BRANCH}` next to the pin. `refs.corpus.test.ts` replaces the count `wireBranches.filter(... changed_paths.length > 0).length > 0` with `expect(fixture?.changed_paths).toEqual([FIXTURE_PATH])`.
2. **Each changeset claim has a matching hunk.** "one commit on top of the pin" = `commit-tree -p pinned`; "names itself in a fixture plan's Slices section" = `FIXTURE_PLAN`'s `## Slices` lists `${FIXTURE_BRANCH}`; "assert on by name" = `wireBranches.find((branch) => branch.branch === FIXTURE_BRANCH)`. `PIN` still points at `pinned`, so `read_ref` keeps matching. That is consistent with the plan's open question about option (b): the fixture plan is committed on the fixture branch, not on the pin.
3. **Package name and shape pass the gate.** The frontmatter is `'@plot-pm/board': patch`, the description comes first, and the `plan:` line sits in a trailing comment block. `./scripts/check-changeset-packages.sh` exits 0: "All changesets name workspace packages and say what changed. changesets naming a plan: 5 of 5".
4. **The package choice is the repo convention, not a mislabel.** The diff touches only `packages/domain/corpus/`, and `@plot-pm/domain` is `"private": true`. CLAUDE.md allows only `plot` or `@plot-pm/board`. Of the domain-touching changesets in history, 14 name `@plot-pm/board`, including one that touches only `packages/domain`. A board patch bump for a test-only domain change is that convention's known cost.
5. **The changeset has already shipped.** Release commit `2d88d940f` ("release: 2.24.2", on `origin/changeset-release/main`, not yet on main) deletes the changeset and writes its text as the #1408 entry in `packages/board/CHANGELOG.md`. The text is unchanged. The changeset says nothing false about the diff.
6. **Minor nit (does not change the verdict).** Both texts state outcomes, and the diff's hunks back them. The changeset gives a file name (`refs.corpus.test.ts`) and no line number, so it does not go stale.

## Executed

- `gh pr view 1408`, `gh pr diff 1408` — PR merged 2026-10-08T23:53:47Z; 3 files: changeset, `pin-clone.ts` (+94/-7), `refs.corpus.test.ts` (+8/-4).
- `./scripts/check-changeset-packages.sh` under Node v24.21.0 — exit 0.
- `pnpm --filter @plot-pm/domain exec vitest run --config vitest.corpus.config.ts corpus/refs.corpus.test.ts` on main — 1 file, 8 of 8 tests passed in 37 s. This includes the pin-guard test, on an estate where the plan says no remote branch carries unmerged changes.
- `gh pr checks 1408` — `corpus` pass (3m23s), `validate` pass.
- `git show 2d88d940f` — the release commit consumes the changeset into `packages/board/CHANGELOG.md` (1 match for 1408) and not into the root `CHANGELOG.md` (0 matches).
- A history scan of the package names in added changesets against the paths those commits touched.

## Read only

- The plan file `docs/plans/2026-10-09-the-refs-corpus-test-fails-when.md`, `.changeset/config.json`, the header of `scripts/check-changeset-packages.sh`, `packages/*/package.json` names and the private flag.
