Position: proceed
Evidence: executed

Lens: build the plan exactly as written and decide whether a worker who reads only the plan ships it correctly. Juror r4-1073, 2026-09-30, against `824f778c` (origin/main, the round-3 amendment). Scratch worktree cut detached at `origin/main` under the session scratchpad. `packages/board/node_modules/@plot-pm/domain` is a workspace link to `../../../domain`, and the domain `exports` map points at `./src/*.ts`, so the board typecheck read the edited type with no re-pointing. Node v24.21.0. Worktree removed afterwards (`git worktree list | grep -c r4-1073` → `0`).

## What I ran and what it showed

**Baseline before any edit:** `domain-base=0`, `board-base=0` (`tsc --noEmit` in each package).

**The build, from the Slices line alone.** Four files, the edits the plan names and nothing else:

- `gates.ts`: `export type DeskMergeReading = MergeReading | 'not-asked';`, `DeskReadings.merge: DeskMergeReading`, and an arm directly after the `merged` arm that returns *"This desk holds no branch, so no PR was asked about. This is not a report that no PR merged — there was no question to ask."*
- `supervisor.ts:18` and `registryd-main.ts:22`: the import switches to `DeskMergeReading` from `@plot-pm/domain/rules/gates`, and `Promise<MergeReading>` becomes `Promise<DeskMergeReading>` at `supervisor.ts:56`, `supervisor.ts:278` and `registryd-main.ts:398`.
- `registryd-main.ts:398`: `if (branch === '') return 'not-asked';` as the first line of `prMerged`, above `tally.calls += 1`.

```
 packages/board/src/server/entry/registryd-main.ts |  5 ++-
 packages/board/src/server/supervisor.ts           |  6 +--
 packages/domain/src/rules/gates.ts                |  8 +++-
domain=0
board=0
reapable-diff-exit=0          # git diff --quiet -- packages/domain/src/rules/reapable.ts
```

**The Done-when tests, written as the bullets specify.**

```
 ✓ test/gates.test.ts > prGate — a question nobody asked (r4 juror) > names the absence of a branch, and borrows neither existing sentence
 ✓ test/gates.test.ts > prGate — a question nobody asked (r4 juror) > is unchanged for the three existing words
 ✓ test/supervision.test.ts > a dead branch-less agent (r4 juror) > defers with the not-asked message when no progress was made
 ✓ test/supervision.test.ts > a dead branch-less agent (r4 juror) > is corrected with the not-asked message when progress was made
 ✓ test/supervision.test.ts > a dead branch-less agent (r4 juror) > a live free agent is left before any gate
 ✓ test/unit/registryd-main.test.ts > a free agent is not asked about (r4 juror) > answers not-asked for '' and spends nothing
 ✓ test/unit/registryd-main.test.ts > … > still answers merged for a real branch and counts one call
 ✓ test/unit/registryd-main.test.ts > … > still answers not-merged for a real branch and counts one call
 ✓ test/unit/registryd-main.test.ts > … > still answers unreachable for a real branch and counts one call
```

The producer test calls `world.merge('')` on `worldForRepo(dir, dir, tally)`, the way the `:1035` neighbour calls `world.merge('feature/a')`. The stub `plot-host.sh` appends its argv to `calls.log`. For `''` the log file does not exist and `tally.calls` is `0`. For each real-branch case the log exists and `tally.calls` is `1`.

**The `madeProgress` split, read from `supervise` directly** (dead, branch-less, `declaration: absent`, `headroom: clear`, `attempts: 0`):

```
madeProgress: true  → correct declaration-absent
[
 "This desk holds no branch, so no PR was asked about. This is not a report that no PR merged — there was no question to ask.",
 "No changeset was added for ``. …",
 "No plan names `` in its `## Branches` section. …",
 "No declaration was written for ``. …"
]
madeProgress: false → defer no-progress
```

This matches bullet 4 in both cases. The three other lines are the sibling messages the plan names as out of scope.

**Every test discriminates.**

```
# guard removed from prMerged:
     × answers not-asked for '' and spends nothing 12ms
AssertionError: expected 'merged' to be 'not-asked' // Object.is equality
      Tests  1 failed | 3 passed | 60 skipped (64)

# prGate's not-asked arm removed:
domain-tsc-without-arm=0
board-tsc-without-arm=0
     × names the absence of a branch, and borrows neither existing sentence
     × defers with the not-asked message when no progress was made
     × is corrected with the not-asked message when progress was made
      Tests  3 failed | 2 passed | 56 skipped (61)
```

The second block confirms the plan's *"A green build is not evidence that this slice is done"*: without the arm, both packages still typecheck, and only the tests catch it.

**The TS2322 probe** (an uncommitted `src/rules/zz-probe.ts` that assigns a `DeskMergeReading` to a `MergeReading`):

```
src/rules/zz-probe.ts(4,14): error TS2322: Type 'DeskMergeReading' is not assignable to type 'MergeReading'.
  Type '"not-asked"' is not assignable to type 'MergeReading'.
probe-exit=2
```

**Nothing existing breaks.**

```
domain, full suite:   Test Files  116 passed (116)   Tests  2772 passed (2772)
board, registryd-main + registryd-tick + registryd-units + supervisor-reading + gate-asks-once-per-estate:
                      Test Files  5 passed (5)       Tests  162 passed (162)
```

**Citations.** I opened each one at `824f778c`.

| cited | found |
|---|---|
| `reapable.ts:13` | `export type MergeReading = 'merged' \| 'not-merged' \| 'unreachable';` |
| `gates.ts:20`, `:104-110` | `merge: MergeReading;`, `prGate` with three arms and a bare fallthrough `return` |
| `supervisor.ts:18`, `:56`, `:278`, `:332` | the `reapable` import, `merge(...)`, `prMerged(...)`, `merge: (branch) => options.prMerged(branch)` |
| `registryd-main.ts:22`, `:398`, `:432-434` | the `reapable` import, `prMerged: async (branch): Promise<MergeReading> => { tally.calls += 1;`, the `<base>..HEAD` progress read |
| `supervision.ts:274`, `:284` | `leave/worker-alive` before gates, `gateFailures(readings.desk, …)` |
| `free.ts:65-67`, `acting.ts:117` | `state !== 'running'` then `branch === ''`; `if (branch === '') {` |
| `queue-reading.ts:226`, `supervision-report-reading.ts:109` | both guard `''` |
| `entities/worktree.ts:30`, `:126`, `:136` | `ReapRefusalSchema = z.enum([`, `reapProblems({`, two-valued `merge` |
| `transitions/worktree.ts:294` | `reapProblems(input.readings)` |
| `reapable.ts:113`, `:235`, `:269`, `:454` | the three `merge` reads and `firstRefRefusal` |
| `plot-release-refs.sh:202`, `:212-213`, `:281` | `[ -n "$br" ] \|\| continue`, `merge=not-merged` / `pr_merged … && merge=merged`, `finishedWith({` |
| `plot-reap.sh:636-659`, `6455c0e5` | `merge=not-merged` … `merge=merged; why="detached, nothing to land"`; *"plot: the reaper reaches a detached desk"* |
| `plot-pr-merged.sh:123`, `:132` | `_plot_merged_lookup()`, `_plot_open_lookup()` |
| `plot-quiet-stretch.sh:157`, `plot-dispatch.sh:3562` | `[ -n "$br" ] \|\| continue`, `pr_merged "$br" && return 1` |
| `registryd-main.test.ts:1035` | `it('adds one per host call, answered or not, across both worlds'` |
| **`plot-reap.sh:921`** | **an empty line.** The `''` guard is `:923` (`[ -n "$br" ] \|\| continue`) |

## What a measurement contradicts

No claim that a worker builds from. One citation and one quoted message are inexact, and neither changes what gets built:

- `plot-reap.sh:921` is a blank line. The guard is at `:923`. This citation is in *The shell twin is #1082*, which this slice does not touch.
- The plan quotes the probe error as ``TS2322: Type '"not-asked"' is not assignable to type 'MergeReading'``. `tsc` prints that text as the second, elaborating line. The first line reads `Type 'DeskMergeReading' is not assignable to type 'MergeReading'`. A reviewer who greps for `TS2322` or for `"not-asked"` finds both.

## What it must say before someone builds it

Nothing blocking. Two optional corrections for the record: change `plot-reap.sh:921` to `:923`, and quote both lines of the TS2322 output. The worker also needs a changeset, and the plan does not name one. `@plot-pm/domain` is not a valid changeset package (only `plot` and `@plot-pm/board` are), so the changeset is `'@plot-pm/board': patch`. The repo's conventions and `check-changeset-packages.sh` already cover this, so the plan does not have to say it.

## What executing revealed that reading would not

- **The Slices line is enough on its own.** I edited the four files in the order it names them and changed nothing else. Both packages typecheck, `reapable.ts` shows no diff, and every Done-when bullet is a passing test or a review criterion that holds.
- **The compiler guards exactly the boundary the plan says, and no other.** With the `prGate` arm removed, both packages still exit 0 while three tests fail. The TS2322 probe fires. So the plan's two claims about the compiler, *names no reading site* and *refuses `not-asked` into the reap rules*, are both true at the same time.
- **The guard's position is what the tally test measures.** Without the guard, a stub host answers `merged` for `''`, the same permissive answer #1082 describes for the real `gh pr list --head ""`. The guard sits before `tally.calls` and before `merges.ask`, so the stub records no call.
- **The corrected-prompt case is what bullet 4 predicts.** The not-asked line comes first, followed by the three out-of-scope sibling lines that name ``` `` ```. The plan explicitly accepts that.
- A process note, not a plan finding: `cp` on this machine is aliased to `cp -i`, and the prompt it raised stalled one restore step until I used `/bin/cp -f`. The mutation check was re-run from a verified baseline (`grep -c "return 'not-asked'"` → `1` before the arm mutation).
