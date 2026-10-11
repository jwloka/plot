## Implementation brief — the-tests-and-gates-close-their-review-findings (wave: Reaper readings)

- **Plan (canonical):** `docs/plans/2026-10-10-the-tests-and-gates-close-their-review-findings.md` on main
- **Approved:** 2026-10-10, Jan Wloka, plan-PR #1495 merged
- **Branch:** `bug/the-reaper-reads-what-the-shell-read` (base: `main`)
- **Ends as:** one PR to main
- **Review of the code:** PR

No wave above this one is still open — "Group signal after exit", "Board
test signals" and "Kill test readiness" have all merged into `main`. Three
waves remain after this one ("Merged heads answer", "Decision table
reading", "Bundle declaration pairing", "Gate exit wording" — four, not
three), and none of them touches `reap.ts`, so this branch has no
ordering dependency either way.

### What to build

Three independent findings in `packages/board/src/server/entry/reap.ts`,
all from issue #1433:

1. **The dirty-tree kind (Kind 4, `runDirtyKind`, around `:1013`) reads the
   wrong filter.** It calls `ctx.trees.dirtyPaths(tree.path)` — the
   worker-record/editor-leftover filter meant for a monitor comparing two
   passes (`packages/domain/src/ports/trees.ts:99`). The reap **loop**
   elsewhere in this file (around `:617`) calls
   `ctx.trees.dirtyPathsWithStatus(tree.path)` instead — the filter that
   excludes Plot's own `.plot/state` pulse fixture and named cleanup files,
   and keeps the porcelain status code. Change `runDirtyKind` to call
   `dirtyPathsWithStatus` and strip the two-byte status code before it
   counts (the loop already shows the pattern: `dirtyPaths.value.find((p)
   => !p.includes('PLOT-BLOCKED'))` reads a status-coded line). The old
   shell this code replaced read `desk_dirt` (`plot-reap.sh:1216` at
   `58a886039^`), which is what `dirtyPathsWithStatus` is for — so this is
   a parity fix, not a design change.
2. **`--sweep-temp` treats an empty `TMPDIR` as the filesystem root.**
   `runSweepTemp` (`:404`) reads `process.env.TMPDIR ?? '/tmp'`. `??` only
   catches `undefined`; `TMPDIR=''` (a real, if unusual, environment) gives
   `root = ''`, and `''.replace(/\/$/, '')` is still `''` — the sweep then
   walks from the filesystem root. The shell this replaced used
   `${TMPDIR:-/tmp}`, which treats empty-and-unset the same way. Match that:
   treat `''` as unset.
3. **`ownedByMe` (`:420-427`) answers true on no evidence.** It returns
   `true` when `me === ''` (neither `USER` nor `LOGNAME` set) or when
   `process.getuid === undefined`, and also on a `stat` throw. The shell
   used `find -user "$me"`, which answers by uid alone and needs no
   `$USER`. `process.getuid()` needs no `USER`/`LOGNAME` either — so stop
   gating on those env vars and answer by uid alone. On a `stat` throw,
   answer `false` (unowned, do not sweep), matching the issue's reading
   that "unproven" must not default to "proceed with deletion".

### The decisions the plan settles — do not re-derive them

**Two kinds, two filters, and that is not the bug.** `dirtyPaths` and
`dirtyPathsWithStatus` are deliberately different operations
(`trees.ts:99` vs `:117`) — one strips the status code for a monitor doing
pass-to-pass comparison, the other keeps it for a reaper's human-facing
refusal text. The bug is that `runDirtyKind` picked the wrong one, not that
two filters exist. Do not unify them or delete either operation; change
only the one call site.

**No test exists for the dirty-tree kind today.** `git grep -n
runDirtyKind packages/board/test` returns nothing. The plan's design note
says: hold a desk whose only dirt is a path that `desk_dirt` excuses and
`plot_worker_dirty` does not, and assert the dirty-tree kind does not
report it. Write that test — it is the one that would have caught this
finding, and its absence is why the finding shipped.

**`stat` throwing is not proof of non-ownership, and it is not proof of
ownership either.** The plan's wording is "answers false when `stat`
throws" — read that as the conservative default for a function whose
`true` answer causes deletion elsewhere in the sweep path, not as a new
invariant to generalize beyond this one function.

### Done when

The plan's `## Done when` is the issue's own finding list, restated as
code:

- `runDirtyKind` counts a desk as dirty using the same filter the reap
  loop uses (`dirtyPathsWithStatus`), with the status code stripped before
  counting
- a unit test holds a desk whose only dirt is `desk_dirt`-excused but
  `plot_worker_dirty`-caught, and asserts the dirty-tree kind reports
  nothing for it — this is the assertion a naive fix (swap the function
  call, nothing else) would still need, because it is what proves the
  *filter*, not just the call site, is now right
- `TMPDIR=''` sweeps `/tmp`, not `/`
- `ownedByMe` answers by uid alone (`process.getuid()`), with no `USER`/
  `LOGNAME` gate, and answers `false` — not `true` — when `stat` throws

Plus: run `node skills/plot/scripts/board/plot-local-checks.mjs` before
each push and run what it prints — it names the related `vitest` run and
`tsc --noEmit` for `packages/board/src/**`. The suites in the `CI suites`
config key run in CI; a failure there comes back as a correction. Do not
run `test:e2e` locally. This slice changes `packages/board/src/server/entry/reap.ts`,
which is shipped code, so it carries a `plot` patch changeset with the
description first and the `bumps:` block last — and because the change
rebuilds `board/plot-reap.mjs`, the PR must carry no bundle diff
(`scripts/check-no-bundle-diff.sh`); run `pnpm build:board` only to check
locally, never commit the rebuilt artifact.

This slice should touch no `.sh` file. If it does,
`scripts/check-shell-lines.sh` refuses a pull request whose shell under
`skills/` is longer than at its merge base; pay for growth in the same
change by removing shell elsewhere, or write the rule in the domain and
ask it through a bundle. The gate stores no number and has no override.

### Bookkeeping

Open the PR through the controller, not `gh pr create`:

```bash
skills/plot/scripts/plot-open-pr.sh
```

It reads the plan that names this branch and titles the PR from this
wave's heading. When the PR exists, append `→ #<number>` to this branch's
line in the plan's `## Slices` section, under "Reaper readings". Push the
first real commit as soon as it exists — do not hold commits back until
the branch is finished.

### Scope guard

This branch owns `packages/board/src/server/entry/reap.ts` and its test
file under `packages/board/test/`. It does not touch
`skills/plot/scripts/plot-pr-merged.sh`, `plot-host.sh`,
`scripts/check-decision-count.sh`, `scripts/check-shell-lines.sh`,
`skills/plot/scripts/plot-install-hooks.sh`, or any `run-script.test.ts`,
`continue-route.test.ts`, or `own-process.mjs` file — those belong to the
plan's other waves, all of which touch disjoint files per the plan's
"Approach" section. The three waves ahead of this one in document order
have already merged into `main`; nothing here depends on the three
waves still behind it.

If you find something the plan did not anticipate, report it rather than
improvising outside scope.
