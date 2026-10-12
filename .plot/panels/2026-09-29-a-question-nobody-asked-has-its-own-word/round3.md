Position: amend
Evidence: executed

Lens: is the plan buildable exactly as written, by a worker who reads only the plan? Juror r3-1073, 2026-09-30, against `48476e3b` (origin/main). Scratch worktree cut detached at `origin/main` under the session scratchpad, with `packages/board/node_modules/@plot-pm/domain` re-pointed at the scratch domain so the board typecheck read the edited type. Node v24.21.0. Worktree removed afterwards (`git worktree list | grep -c r3-1073` → `0`).

## What I ran and what it showed

**Citations.** I opened each one.

| cited | found |
|---|---|
| `reapable.ts:13` | `export type MergeReading = 'merged' \| 'not-merged' \| 'unreachable';` — correct |
| `gates.ts:104-110` | `prGate`, three arms, the last a bare `return` — correct |
| `registryd-main.ts:398-407` | `prMerged: async (branch): Promise<MergeReading> => { tally.calls += 1; …` at `:398`/`:399` — correct |
| `queue-reading.ts:226` | `sliceHasMerged: entry.branch === '' ? false : await world.sliceHasMerged(entry.branch)` — correct |
| `supervision-report-reading.ts:109` | `if (row.branch === '') continue;` — correct |
| `supervisor.ts:332` | `merge: (branch) => options.prMerged(branch),` — correct |
| `supervision.ts:274` / `:284` | `if (readings.workerAlive) return at('leave', 'worker-alive', …)` / `gateFailures(readings.desk, …)` — correct |
| `free.ts:65-67`, `acting.ts:117` | both test `branch === ''` — correct |
| `entities/worktree.ts:136` | `merge: evidence.hasMergedPr ? 'merged' : 'not-merged',` — correct |
| `entities/worktree.ts:30` | `export const ReapRefusalSchema = z.enum([` — correct |
| `plot-reap.sh:636-659` | `merge=not-merged` … `merge=merged; why="detached, nothing to land"` — correct; `6455c0e5` is *"plot: the reaper reaches a detached desk"* |
| `plot-release-refs.sh:212-213` | `merge=not-merged` / `pr_merged "$br" && merge=merged` — correct |
| `plot-release-refs.sh:199` (*"the loop skips `""`"*) | **`:199` is a comment.** The skip is `:202`, `[ -n "$br" ] \|\| continue` |
| `reapable.ts:113`, `:235`, `:269`, `:454` | `reapProblems`, `refDeletionProblems`, `firstRefRefusal`, `finishedWith` arms — correct |
| `registryd-main.test.ts:1035` | `it('adds one per host call, answered or not, across both worlds'` — correct |

**The build as written.** Three edits: the fourth word on `reapable.ts:13`, a `not-asked` arm in `prGate` directly after the `merged` arm, and `if (branch === '') return 'not-asked';` above `tally.calls += 1`.

```
 packages/board/src/server/entry/registryd-main.ts | 1 +
 packages/domain/src/rules/gates.ts                | 3 +++
 packages/domain/src/rules/reapable.ts             | 2 +-
domain=0
board=0
```

**The five Done-when tests**, written as the bullets specify:

```
 ✓ test/gates.test.ts > prGate — a question nobody asked (r3 juror) > names the absence of a branch, and borrows neither existing sentence
 ✓ test/gates.test.ts > prGate — a question nobody asked (r3 juror) > is unchanged for the three existing words
 ✓ test/supervision.test.ts > a dead branch-less agent (r3 juror) > defers with the not-asked message when no progress was made
 ✓ test/supervision.test.ts > a dead branch-less agent (r3 juror) > a live free agent is left before any gate
 ✓ test/unit/registryd-main.test.ts > a free agent is not asked about (r3 juror) > answers not-asked for '' and spends nothing
 ✓ test/unit/registryd-main.test.ts > … > still answers merged for a real branch and counts one call
 ✓ test/unit/registryd-main.test.ts > … > still answers not-merged for a real branch and counts one call
 ✓ test/unit/registryd-main.test.ts > … > still answers unreachable for a real branch and counts one call
```

The producer test discriminates. With the guard deleted it fails:

```
     × answers not-asked for '' and spends nothing 12ms
AssertionError: expected 'merged' to be 'not-asked' // Object.is equality
      Tests  1 failed | 3 passed | 60 skipped (64)
```

**Nothing existing breaks.**

```
domain, full suite:            Test Files  116 passed (116)   Tests  2772 passed (2772)
board registryd-main, registryd-tick, supervisor-reading,
  gate-asks-once-per-estate, queue-reading:
                               Test Files  5 passed (5)       Tests  151 passed (151)
```

**The review criterion, against the build as written:**

```
$ git diff --quiet origin/main -- packages/domain/src/rules/reapable.ts; echo reapable-diff-empty-exit=$?
reapable-diff-empty-exit=1
```

## What a measurement contradicts

**The plan asks for two things that cannot both hold.** `MergeReading` is declared in `reapable.ts` at line 13. The slice says *"Add `not-asked` to `MergeReading`"*. The review criterion says `git diff main -- packages/domain/src/rules/reapable.ts` is empty, and *What this does NOT do* says *"It does not change `reapable.ts`"*. A worker who follows the Slices line edits `reapable.ts:13` and fails the criterion (exit 1 above). A worker who follows the criterion cannot widen the type where it is declared. This is round 3's false claim: the plan says the file is untouched, but the design must edit that file.

**The plan's own intent is buildable without touching `reapable.ts`, and that build is stronger.** I reset `reapable.ts` and declared the wider type beside its only reader:

```ts
// gates.ts
export type DeskMergeReading = MergeReading | 'not-asked';
// DeskReadings.merge: DeskMergeReading
// supervisor.ts and registryd-main.ts import DeskMergeReading from '@plot-pm/domain/rules/gates'
```

```
domain=0
board=0
reapable-diff-empty-exit=0
      Tests  61 passed (61)     # gates + supervision, domain
      Tests  137 passed (137)   # registryd-main, registryd-tick, supervisor-reading, board
```

**The compiler then keeps `not-asked` out of the reap rules.** A probe file that assigns a `DeskMergeReading` to a `MergeReading`:

```
src/rules/zz-probe.ts(4,14): error TS2322: Type '"not-asked"' is not assignable to type 'MergeReading'.
exit=2
```

The plan's *The reap half is out of scope* says that a future producer feeding `not-asked` into `reapable.ts` must refuse and not return `[]`, and it leaves that as prose. With the wider type in `gates.ts`, the compiler refuses that producer. With the plan's build, `reapProblems`, `refDeletionProblems` and `finishedWith` all accept `not-asked` silently. Also, *The compiler names no site* stops being true for the reap side.

**Two smaller inaccuracies.**

- `plot-release-refs.sh:199` is a comment. The empty-branch skip is `:202`.
- *Where a reading is read* lists `reapProblems`'s callers as `entities/worktree.ts:126` and `plot-reap.sh`. There is a third: `transitions/worktree.ts:294` (`observeWorktreeState`). A grep over `packages/*/src`, `packages/board/src` and `skills/plot/scripts` finds no production caller for it outside `index.ts`'s re-export, so the conclusion *"none of them can receive `not-asked`"* holds. The list is incomplete.

## What it must say before someone builds it

1. **Settle where the fourth word lives.** Choose one of these and delete the other:
   - (a) Recommended: declare `DeskMergeReading = MergeReading | 'not-asked'` in `gates.ts`, type `DeskReadings.merge` with it, and import it in `supervisor.ts:18` and `registryd-main.ts:22` in place of `reapable`'s `MergeReading`. `reapable.ts` stays unchanged, the review criterion holds, and `tsc` refuses a `not-asked` that reaches a reap rule. With this choice, the Slices line and the Design's `export type MergeReading = … | 'not-asked'` block must change to match.
   - (b) Keep widening `MergeReading` in `reapable.ts`. Then replace the review criterion with *"the diff to `reapable.ts` is the one union line"*, and replace *"It does not change `reapable.ts`"* with *"it changes only the type's union"*.
2. **Name the file sites in the Slices line**: `gates.ts` (type and arm), `supervisor.ts:18` and `registryd-main.ts:22` (imports), `registryd-main.ts:398` (guard). A worker who reads only the Slices line today edits three files. With option (a) there are four, and the two import changes are what make the board typecheck pass.
3. **Done-when bullet 1 names a member the world does not expose.** `worldForRepo` returns a `SupervisorWorld`, and a test reaches the producer as `world.merge('')`, the same way the neighbouring test at `:1035` calls `world.merge('feature/a')`. Write `world.merge('')` or *"the world's `merge`"*.
4. **Done-when bullet 4 must state `madeProgress: false`.** `supervise` defers only when a bound refuses. With `madeProgress: true` and clear headroom, the same dead branch-less agent is corrected, and the correction prompt is addressed to an empty branch:

   ```
   R3-VERDICT correct declaration-absent [
    "This desk holds no branch, so no PR was asked about. …",
    "No declaration was written for ``. …"
   ]
   ```

   In production a free desk cut at `origin/<main>` reads `madeProgress` false (`registryd-main.ts:432-434`: no commits in `<main>..HEAD`), so *defers* is the common case. A detached desk that carries commits is corrected. The bullet must name the reading it depends on. If *corrected with a prompt about ``* is acceptable, the plan must say so. If it is not, that is the fourth sibling message and belongs with the other three.
5. Correct `plot-release-refs.sh:199` to `:202`, and add `transitions/worktree.ts:294` to the `reapProblems` caller list with *"no production caller"*.

## What executing revealed that reading would not

- **The contradiction appears only when the change is made.** Read side by side, *"add `not-asked` to `MergeReading`"* and *"`reapable.ts` is unchanged"* look like two separate facts. `git diff --quiet` → `1` shows they are one file.
- **The fix the plan needs is also a gate it does not have.** Declaring the wider type in `gates.ts` turns *"a later producer must refuse on `not-asked`"* from prose into `TS2322`. Rounds 1 and 2 both found that the compiler names no site. With the type split, it names the site that matters.
- **The producer guard works and is cheap.** The stub `plot-host.sh` logged no call for `''` (`existsSync(calls.log)` false), `tally.calls` stayed at `0`, and each real-branch answer still counts one. With the guard removed, the stub answers `merged` for `''`. So a stub host, like the real one in #1082, can report a merge for a branch that does not exist, and the guard must come before the call.
- **`supervise`'s verdict for a dead free agent depends on `madeProgress`**, which the Done-when bullet does not mention. The two readings give `defer` and `correct`.
