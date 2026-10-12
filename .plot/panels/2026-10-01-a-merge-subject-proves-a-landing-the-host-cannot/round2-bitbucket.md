# Round 2 — Bitbucket operator

Position: amend
Evidence: executed

Juror lens: Bitbucket Cloud estate, default branch `develop`, GitFlow, Jira-keyed branch names, frequent HTTP 429. I read the plan at `cc1559c2` in a detached worktree inside my scratch directory, and checked each line reference there. I ran read-only `git log` measurements on `ewz-kus-portal` (`origin/develop`, 16570 commits) and on the Plot repository (`origin/main`, 5416 commits). I did not call `bb`, `gh`, or any host write.

## Verdict in one paragraph

The amendment answers all eight changes I asked for in round 1, and the 1723 / 0 count is true. My fleet still gets what #1139 needs: a merged and deleted predecessor no longer waits on the host, and the Changelog now states that the next slice needs one host answer about itself. The new age rule (`^<added>`) is the right guard for reused Jira-keyed names, and my estate reuses them: 87 branch names appear in two or more `Merged in` subjects on `develop`. But the rule as written has three defects that block implementation. It does not say which path is "the plan file", and the path the scan holds is often a symlink under `active/` or `delivered/`. On my estate that path loses every subject for a delivered plan. It also costs two git spawns per plan, where one walk for all plans costs about 0.1 s. Finally, the supervisor has no port operation that answers the adding commit. The import gate also contradicts slice 1. Each fix is small.

## 1. Round-1 changes from this lens

| # | Round-1 change | Status | Evidence at `cc1559c2` |
|---|---|---|---|
| 1 | State the remaining hold under a sustained 429 | Answered | Changelog bullet 1; Motivation "What remains held after this plan" names `queuedHasLanded` (`queue-reading.ts:255`) and `merged_by_host`, and defers a host-free answer to #1094 |
| 2 | Slice-2 test refuses the listing and `queuedHasLanded`; slice-1 asserts the offered list | Answered | Slice 2: "the listing **and** `queuedHasLanded` refusing with 429 … next slice is held on `merge-unknown`", plus the `not-landed` arm that hands the slice out. Slice 1: `--list-eligible` names nothing for the unstarted next slice. `--next` is no longer read by the worker loop (`plot-worker-loop.sh:2209-2213` comment), so leaving it out is correct |
| 3 | Union only when the ref list was read | Answered | "The union applies only when the ref list was read", with the `{'*'}` test in slice 2. Sentinel confirmed at `registryd-main.ts:560` |
| 4 | Reject a subject older than the plan | Answered, with defects | The `^<added>` walk. See §3 |
| 5 | Union before `landedWithoutListing`; skip `merged_by_host` for a proven branch | Answered | Both named. `landedWithoutListing` is at `queue-reading.ts:241`, `queueOfPlan` at `:245` |
| 6 | Name `auto-deliver.ts` and `deliverability.ts`; add a gate | Answered, gate has a defect | Boundary table and import test. See §3 |
| 7 | Bundle chores, backend source, Cloud form | Answered | `build.mjs` entry, `.gitattributes` line (precedent `.gitattributes:51`), Helper Scripts row, subpath export, `plot-host.sh backend` (`plot-host.sh:3216`), "Bitbucket Cloud's default merge message" |
| 8 | `--merges` against `--no-merges` count | Answered | Measured again today: 1723, 0, and 2289 merges in all |

## 2. Factual claims checked

True at `cc1559c2`:

- `queue-reading.ts:27` `QueueWorld`, `:145` `claimed || merged`, `:237` `mergedBranches()`, `:241` `landedWithoutListing`, `:245` `queueOfPlan`, `:255` `queuedHasLanded`.
- `registryd-main.ts` lives at `packages/board/src/server/entry/registryd-main.ts`. `:554-560` is the `{'*'}` sentinel and `:607` is `host.backend()`.
- `ports/refs.ts:339` `remoteUrl`. `refs-git.ts:380` runs `--no-merges` in `commitsSync`.
- `plot-fleet-scan.sh:474-480` is the capped walk, `:492` the GitHub-only `MERGE_DETECT`, `:2183-2186` `merged_by_subject`, `:3353` the call in the no-ref arm, and `:3531-3533` the exit 2 for a missing `plot-branch-state.mjs`. No `unaskable` word exists in the scan yet.
- `skills/plot-pulse/SKILL.md:176` introduces `merge_detect`.
- `auto-deliver.ts:252-255` `landedBranches`, `deliver.ts:230` `allSlicesMerged`, `plot-deliver.sh:179-180` `plot-ask.mjs deliverable`, `controllers/deliverability.ts:86` `host.prMerged`, `plot-release-refs.sh:213` `pr_merged`, `auto-dispatch.ts:159` `mergedBranches`, `rules/landed.ts:108` `mayRemove`.
- `fleet.ts:5106` `'merged — slice still open'`.
- `branch-state.corpus.test.ts:226-230` holds the third copy of the GitHub regex.
- `packages/domain/package.json:13` exports `./rules/*` and no `./adapters/*`, so slice 1 must add that export, as the plan says.
- All 1723 `Merged in` subjects fall inside the first 2000 merges: `git log origin/develop --merges --max-count=2000 | grep -c '^Merged in '` returns 1723.

Imprecise:

- The worker-loop line references are swapped. `plot-worker-loop.sh:594` is the `--offline --why-nothing` call, and `:2209-2213` is the comment about the former `--next`.
- "13 backward `Merge remote-tracking branch 'origin/develop'` merges": I count 15 with `grep -c "^Merge remote-tracking branch 'origin/develop'"`. The difference does not change the design.
- "One git call per plan" is two calls: one `--diff-filter=A` lookup and one `^<added>` merges walk.
- "only for such plans" covers almost every plan. The scan keeps delivered plans in its loop, except `docs` and `infra` types (`plot-fleet-scan.sh:3640-3645`), and every slice of a delivered plan is refless.
- The cost line under "Nothing is cached" (7.7 ms, 11.8 ms) measures the one walk that this design replaces with per-plan walks. The plan states no cost for the new shape.
- With 2289 merges on `develop` against a cap of 2000, the footer on my estate reads `truncated` today. The plan does not say what the footer means once the walk runs per plan.

## 3. New defects in the amended design

**3a. "The plan file" is undefined, and the symlink path loses every subject of a delivered plan.** The scan holds a plan by the path it found: a symlink under `$ACTIVE_DIR` or `$DELIVERED_DIR` (`plot-fleet-scan.sh:3703` `plan_files+=("$plan")`), an absolute resolved path (`:2988`), or the plan file read from a ref (`:3701`). Delivery moves the symlink as a git rename. Measured on `ewz-kus-portal`:

| Plan | Adding commit of symlink | Adding commit of target | `Merged in feature/<key>` after symlink add | after target add |
|---|---|---|---|---|
| `delivered/ewzkus-3697-uc1-auszug-bekannt.md` | `6cb45034de` 2026-09-24 (bulk active→delivered move) | `97ed26e789` 2026-07-16 | 0 | 4 |
| `active/ewzkus-3845-gpsync-abloesen.md` | `0a08b71102` 2026-09-24 | `0a08b71102` 2026-09-24 | 14 | 14 |

That one commit, `6cb45034de`, moved 13 symlinks. If the walk reads the symlink, each of those 13 delivered plans gets no subjects, and its branches go back to the host on every scan, under the throttle this plan tries to relieve. A plan that moves from `delivered` back to `active` would lose the proof for its merged slices in the same way, and its next slice would then wait on the host, which is #1139 again. The plan must say: the plan's own file, resolved through any symlink, repository-relative, on `origin/<main>`. The command as written also names no ref (`git log --diff-filter=A --format=%H -1 -- <plan file>`), so it reads `HEAD`. A scan run from a checkout on a feature branch then reads whatever that branch holds.

**3b. Renames reset the age.** `--diff-filter=A` with a pathspec and no `--follow` returns the commit that renamed the file into its current name. The Plot repository has 4 retitled plans on `docs/plans/20*` (for example `2026-09-07-three-services-three-ports.md` → `2026-09-07-the-build-pipeline-is-its-own-connector.md`, R069). A plan retitled after a slice merged loses that slice's proof. The direction is safe (the branch goes to the host), so this needs a stated consequence and one fixture, or `--follow`. It does not need a new mechanism.

**3c. A plan added on a side branch works, with one stated window.** All 34 plan files on `ewz-kus-portal` were added on a side branch: the adding commit is never on the first-parent chain of `develop`. `^<added>` then excludes only the merges reachable from that side commit, that is, the merges before the idea branch forked. The #1139 tracer (`Merged in feature/ewzkus-3845-contractaccount-bykey-tracer (pull request #3644)`) is inside `develop ^0a08b71102`, so the measured case is proven. A reused name merged between the fork and the plan's own merge still counts. The plan should state that window. It does not block.

**3d. The per-plan walk costs seconds, and one walk costs 0.1 s.** Measured with commit-graphs present:

- Plot repository, 392 plan files: 140 per-plan `--diff-filter=A -1` lookups took 5.23 s (6 to 37 ms each). One `git log origin/main --diff-filter=A --name-only --format=@%H -- docs/plans/` for all plans took 0.105 s.
- `ewz-kus-portal`, 34 plan files: both per-plan calls together took 0.48 s.

The board polls the scan every 5 s, and the scan header says it walks "~40 plans". The supervisor's comment at `queue-reading.ts:220-226` counts 136 multi-slice plans. A per-plan design adds seconds to every scan and every tick on the Plot repository itself. That slows the reader that dispatches my fleet, which is the opposite of this plan's goal. A batched shape exists: one walk for the adding commits of all plan files, one `git log <main> --merges --format='%H %s'` walk, and an ancestry test (`git merge-base --is-ancestor <merge> <added>`) only for a subject that names a refless branch of some plan. On my estate that is a few ancestry tests per scan. The plan must pick the batched shape, or measure the per-plan shape and state the number.

**3e. The supervisor cannot compute `<added>`.** `mergeSubjects(ref, since, max)` takes `since`, but no refs-port operation answers "the commit that added this file". The port's operations (`ports/refs.ts:85-352`) include `commitFiles`, `showFile` and `branchDates`, and none of them does this. `PlanRecord.file` (`ports/plan-store.ts:12`) gives the path. Slice 2 must name the operation, its git and fixture adapters, and its failure answer ("no subjects for this plan").

**3f. The import gate contradicts slice 1.** The gate says `mergedBySubject` and `ownerOfRemote` "are imported only by the bundle entry and `entry/registryd-main.ts`". Slice 1 replaces the corpus copy with a call to `mergedBySubject` (`branch-state.corpus.test.ts`), and the rules need their own unit tests for 100% coverage. As written, the gate fails on the plan's own slice 1. Scope it to `packages/*/src/`, or list the test roots it exempts.

**3g. The `{'*'}` skip is correct.** Skipping the union under the sentinel keeps today's queue, and today's queue is the pre-existing defect the plan files separately. The slice-2 test covers it.

## 4. What blocks implementation

3a, 3d and 3e block implementation. An implementer cannot write the walk without knowing which path and which ref it reads. The supervisor half has no port to call. As specified, the cost lands on every 5 s poll. 3f breaks CI on slice 1. 3b, 3c and the factual fixes in §2 are documentation.

Nice to have, not blocking: a scan fixture where the host refuses the listing but answers "no PR" for the next branch, and `--list-eligible` then offers it. That is the scan's half of slice 2's `not-landed` arm.

## What the plan must change

1. Define "the plan file" for the age rule: the plan's own file, resolved through any `active/` or `delivered/` symlink, repository-relative, read on `origin/<main>` and not `HEAD`. Add a fixture where a plan is read through a symlink that moved after its first slice merged, and assert that the slice still reads `merged`. Measured reason: `delivered/ewzkus-3697-uc1-auszug-bekannt.md` keeps 4 of 4 subjects through its target and 0 of 4 through its symlink.
2. Replace the two per-plan git calls with one batched reading: one `--diff-filter=A --name-only` walk over the plan directory for all adding commits (0.105 s for 392 plans, against 5.23 s for 140 per-plan lookups), one merges walk with `%H %s`, and an ancestry test only for a subject that names a refless plan branch. State the measured cost in place of the 7.7 ms / 11.8 ms line, and state what `merge_detect` reports when the walk is capped (my estate has 2289 merges against the cap of 2000).
3. In slice 2, name the refs-port operation that answers a plan file's adding commit, its git and fixture adapters, and its failure answer (no subjects, so the branches go to the host).
4. Scope the import-graph gate to `packages/*/src/`, so that the corpus test and the rule tests in slice 1 may import `mergedBySubject` and `ownerOfRemote`.
5. State two consequences in the design text: a renamed plan file restarts the age at the rename (or use `--follow`), and a reused name merged between the idea branch's fork and the plan's merge still counts.
6. Correct the small facts: the worker-loop call is `plot-worker-loop.sh:594` and the comment is `:2209-2213`; "one git call per plan" is two; delivered plans are in the scan's loop (`plot-fleet-scan.sh:3640-3645`); the backward-merge count reads 15 with `grep -c "^Merge remote-tracking branch 'origin/develop'"`.
