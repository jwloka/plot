# Round 1 — Bitbucket operator

Position: amend
Evidence: executed

Juror lens: Bitbucket Cloud estate, default branch `develop`, GitFlow, frequent HTTP 429. Read against `origin/main` at `ea8f88d5` (worktree in scratch). Two scratch vitest cases ran against `packages/board/src/server/queue-reading.ts` on that commit; both passed and are described below.

## Verdict in one paragraph

The direction is right. Plot must read the `Merged in <branch> (pull request #N)` subject, and the plan correctly finds that the measured hold is the supervisor's and not the scan's. But the plan does not make my fleet keep dispatching through a throttled host. The fix moves slice 1 to `merged`, and then the next slice is asked the same per-branch host question that returned 429 in #1139. I ran that case: the next slice is held `merge-unknown`. The slice-2 test as written stubs only the listing, so it passes while the field failure stays. The plan also leans on `claimed` as the "no ref" restriction, and `claimed` is a sentinel `{'*'}` that excludes nothing when the ref list is unreadable.

## 1. Factual claims in Motivation and Design

All checked line references hold on `ea8f88d5`:

- `plot-fleet-scan.sh:2183-2185` `merged_by_subject`, GitHub form only. True.
- `plot-fleet-scan.sh:492` `MERGE_DETECT`, GitHub form only, so a Bitbucket estate reads `merge_detect=none`. True.
- `plot-fleet-scan.sh:3353` subject lookup inside the no-ref arm. True.
- `plot-fleet-scan.sh:439-446` first-parent measurement and its GitFlow break; `:463-464` 7.7 ms / 11.8 ms. True.
- `rules/branch-state.ts:189` `if (readings.mergeSubjectFound) return 'merged'`; `:170-182` the ref-first comment. True.
- `queue-reading.ts:237` `world.mergedBranches()` then `queueOfPlan(plan, claimed, merged)` at `:245`. True. `queueOfPlan` reads no subject. True.
- `6c66b389` dated 2026-08-16, "recognise a branch merged with its ref deleted". True.
- `plot-reconcile-scan.sh:2795` and `:2836` read `"Merge pull request #"*`. True.
- `docs/domain/desk-root.md` exists. True.

Claims that are imprecise:

- "`develop` carries ... one of 1720 such subjects." The issue's count is `git log origin/develop --grep='^Merged in '` with no `--merges`. That count includes one-parent squash commits, if the estate has any. The plan's walk uses `--merges`, so the number of subjects the design will actually see is unmeasured. The plan should give the `--merges` count, and the `--no-merges` count beside it.
- "makes the next slice claimable" (slice 2) and "the next slice `eligible`" (slice 1). Both are wave-verdict claims. Neither means the slice is dispatched. See §2.
- "The supervisor applies the same restriction through `claimed`." It does not hold when the ref list fails. See §3.

## 2. Does it fix the measured failure in both readers?

**Supervisor (`readQueue`): partly.** Slice 1 leaves the queue as settled. Slice 2 becomes `claimable` and briefed. `readQueue` then asks `world.queuedHasLanded(slice2)` (`queue-reading.ts:251-255`). That is `host.prMerged` (`registryd-main.ts:542-543`, `:624-649`), which is exactly the `plot-host.sh pr-merged` call that returned HTTP 429 in #1139. A 429 maps to `unaskable` → `unknown` (`rules/landed.ts:60-68`) → hold `merge-unknown` (`rules/queue.ts:207`). `landedWithoutListing` does not save it: a never-started branch has no index row and no PR number, so it is "left to the per-branch question" (`queue-reading.ts:313-327`).

Executed. A scratch test fed `readQueue` the plan's best case: slice 1 already in `merged` (the effect of the plan's union), the listing `whole: false`, `prIndexRows` empty, `viewLanded` and `queuedHasLanded` answering `unknown`. Result: the only queued slice is `feature/ewzkus-3845-next` with `whyNotReady` = `merge-unknown`. The test asserted that and passed.

So under a sustained 429 the plan replaces "slice 1 held `merge-unknown`, slice 2 `not-claimable`" with "slice 2 held `merge-unknown`". That is an improvement: before, slice 2 needed the whole listing to answer; after, it needs one per-branch answer. Under intermittent 429 my fleet recovers sooner. Under sustained 429 it still does not dispatch. The plan's Changelog ("a throttled host no longer holds the slices behind it") overclaims.

The slice-2 test says "the listing refused by HTTP 429". It must also refuse the per-branch question, because that is what #1139 measured. With both refused, the test as specified ("holds nothing on `merge-unknown`") fails against the design.

**Fleet scan: partly, the same way.** The next slice's branch has no ref and no subject, so the scan asks the host (`merged_by_host`, `plot-fleet-scan.sh:1315-1329`). Under 429 `hostReach` is `throttled` and the branch reads `unknown` (`rules/branch-state.ts:198-205`). The wave verdict reads `eligible`, but `--next` and `--list-eligible` offer only `open` (`plot-fleet-scan.sh:3390-3393`), so `plot-dispatch.sh` and the board's `auto-dispatch.ts` `isStartable` (`open`/`wip` only) offer nothing. Slice 1's test asserts the wave verdict, which proves less than "dispatchable".

**Third reader.** Every dispatch path asks the host about the unstarted next branch: the supervisor's `queuedHasLanded`, the scan's `merged_by_host` behind `--next`/`--list-eligible` (read by `plot-dispatch.sh` and `auto-dispatch.ts`). None of them reads a subject for an unstarted branch, and no subject can prove "unstarted". So the hold that remains is not a missing reader of the subject; it is the per-branch host question on the next slice. The plan must name it and decide it (see the changes below).

**Scan cost under 429.** The scan calls `merged_by_host` for a refless branch even when `_bs_subject=true` (line after `:3353`, unconditional). Under 429 no terminal answer is cached, so a proven branch still costs a host call on every scan. The board polls the scan every 5 s. The plan keeps this. On my estate that is wasted budget against the limit that caused the defect.

## 3. Can the subject move a branch to `merged` wrongly, and does it reach a destructive decision?

**Wrong `merged`, cases on a GitFlow Bitbucket estate:**

- Backward merges: Bitbucket's "sync" writes `Merged develop into feature/x`; a PR from `develop` into a feature writes `Merged in develop (pull request #N)`. Neither names the plan branch with the anchored form. Safe.
- Hotfix on `master` back-merged into `develop`, or a stacked PR A→B with B later merged: the subject names A and A's work is an ancestor of `develop`. Correct answer.
- Release branches: work merged into `release/x` and not yet into `develop` is not reachable. Safe.
- Edited merge message in the Bitbucket merge dialog, fast-forward strategy, or squash strategy (one parent, excluded by `--merges`): no match, falls through to the host. Safe direction, lost throughput only.
- Bitbucket Data Center writes `Merge pull request #N in PROJ/repo from <branch> to develop`. `plot-host.sh` drives only `bitbucket.org` (`plot-host.sh:932`, `:2682`), and an unnamed host defaults to `github` (`:2685-2687`). No match, falls through. Safe, but the plan should say the `bitbucket` form is Cloud's.
- **Name reuse across plans.** A slice whose branch name equals an earlier, already-merged and deleted branch reads `merged` before anybody starts it. On my estate branch names carry the Jira key (`feature/ewzkus-3845-…`), so a second plan for a reopened ticket reuses names. The host has the same flaw (`pr-merged` reads any merged PR, `plot-dispatch.sh:1984`), so the subject is not worse. But the plan now sends this wrong answer into the supervisor, which dispatches. A cheap guard exists: the subject's commit must not be an ancestor of the commit that added the plan file. Then a merge older than the plan cannot settle its slice.
- **Unreadable ref list.** `claimedBranches` returns `new Set(['*'])` on failure (`registryd-main.ts:556-560`), and nothing in `packages/` reads `'*'` (`git grep "has('\*')"` → no hit). Executed: a scratch test with `claimedBranches` = `{'*'}` and a two-slice plan offered `feature/a` as ready. The comment "AN UNREADABLE REF LIST QUEUES NOTHING" is false on `main`; that is a pre-existing defect outside this plan. Its consequence for this plan: "restricted to branches with no ref ... through `claimed`" restricts nothing when the ref read fails. A recreated, in-flight branch named by an old subject then reads `merged`, and its plan's next slice opens on unlanded work. The union must run only when the ref list was read.

**Destructive decisions.** I traced every consumer I found:

- `sliceHasMerged`, `free.ts`, `plot-reap.sh`, `plot-release-refs.sh`, `plot-dispatch.sh --release` (`:1974-2000`), the worktree-reuse gate (`plot-dispatch.sh:3690`): all read `pr_merged`/`host.prMerged`. The subject cannot reach them.
- Delivery: `auto-deliver.ts:251-255` counts scan branches in state `merged`, so a subject-proven branch is a delivery *trigger*. The decision is `plot-deliver.sh:146-154` → `plot-ask.mjs deliverable` → `controllers/deliverability.ts:80-92`, which asks `host.prMerged` per branch and counts `unknown` as not merged. So the subject triggers delivery and cannot license it. The plan's boundary list omits `auto-deliver.ts` and `deliverability.ts`; it should name both. On a throttled Bitbucket estate the trigger will start `plot-deliver.sh` for fully subject-proven plans, and each run asks the host again.
- `auto-dispatch.ts:159-166` `mergedBranches(pulse)` feeds `isFree`. A branch an agent holds has a ref, so the subject is not reached. Not destructive.

**Is the boundary enforceable?** Today it is structural and unguarded. The union lives in a local `merged` in `readQueue`, and the scan's state never flows into a destructive script. But the plan states the boundary in prose only (CLAUDE.md and the Concept file). Under "Gates Over Rules" the plan should add a check: `mergedBySubject` and `mergeSubjects` are imported only by `readQueue` and the bundle entry, and `rules/landed.ts`, `mayRemove` and the shell `pr_merged` never read a subject. A grep gate or an import-graph test does this in a few lines.

## 4. Buildable, in order, each green?

- **Vendor-name gate** (`ci.yml:299-311`): greps `packages/domain/src/` for `bitbucket|github` outside `adapters/`, comments excluded. `rules/merge-subject.ts` can hold no vendor word in code; the form table in `adapters/host/merge-subjects.ts` is allowed. Domain tests live in `packages/domain/test/`, outside the grep. Buildable.
- **Script-name gate** (`scripts/check-script-names.sh`, `ALLOWED=9`): the plan names no `plot-*.sh` from `packages/*/src` outside adapters. Clean.
- **Actor-name gate**: no `Worker` identifier is needed. Clean.
- **Spawn ratchet** (`ci.yml:338`): `mergeSubjects` lives in the refs git adapter, which may spawn. No count moves outside `adapters/`. Clean.
- **Bundles**: `plot-merge-subject.mjs` must be added to the board build entries, be marked as generated (`ci.yml:536`), resolve beside its script (`check-bundle-resolution.sh`), and gain a row in CLAUDE.md "Helper Scripts". The plan names none of these. It should import the rule by subpath, as `entry/branch-state.ts` does, so it does not pull the adapters barrel.
- **Backend word in the scan**: the bundle takes "the backend" as an argument, but the scan reads no backend today (`grep HOST_BACKEND\|plot-host.sh backend` in the scan → no hit). `plot-host.sh backend` is a local read (`:2656-2690`). The plan should name that source.
- **Order**: slice 1 then slice 2 works; slice 2 needs `mergedBySubject` and the forms from slice 1. Slice 2 is independently mergeable after slice 1.
- **Domain coverage 100%**: the rule is small and pure; reachable.
- **Test sufficiency**: not sufficient. Slice 1 asserts the wave verdict, not what `--list-eligible` offers. Slice 2 stubs only the listing as 429. Neither test reproduces #1139, where the per-branch question also returned 429. Neither tests an unreadable ref list. Neither tests a subject older than the plan.
- **Union placement**: "adds ... to the `merged` set before `queueOfPlan`" must also be before `landedWithoutListing` (`queue-reading.ts:239-241`), or a proven branch with a known PR number still costs a `viewLanded` call. "Spends no host call on the proven branch" depends on this.

## 5. Missing, or to cut

Missing:

- A decision about the next slice's per-branch host question under 429 (the real remaining hold).
- Skip `merged_by_host` in the scan when the subject proved the branch.
- The `--merges` versus `--no-merges` count of `Merged in` subjects on `ewz-kus-portal`, before the squash Open Point is left open. On a GitFlow estate that squashes feature PRs into `develop`, the design proves nothing.
- The truncation note for my estate: `--merges` on `develop` also counts Bitbucket sync merges, so a repository with 1720 `Merged in` commits probably passes the cap of 2000 and reads `merge_detect=truncated`. Recent branches are still found. The plan should state this expectation.

Cut or move:

- The GitHub owner restriction (second Changelog bullet, `<owner>` placeholder). It fixes no measured failure: the GitHub juror found 0 false positives. It adds an `origin` URL parser, and it rejects legitimate merges recorded under a predecessor owner (`eins78` ×20), which then cost a host call each. Move it to its own plan with its own measurement, or keep it and state the throughput cost.

## What the plan must change

1. State the remaining hold. Under a sustained 429 the next slice is held `merge-unknown` by `queuedHasLanded` (supervisor) and reads `unknown` in the scan. Either decide how a refless, subject-less, index-less branch behind a subject-proven slice reads under 429, or narrow the Changelog to "one per-branch host answer releases the next slice, where the whole listing was needed before".
2. Make the slice-2 test reproduce #1139: the listing AND `queuedHasLanded` refuse with 429. Assert the next slice's hold word explicitly (whatever item 1 decides). Make the slice-1 test assert `--list-eligible`/`--next` output, not only the wave verdict.
3. Apply the subject union only when the ref list was read. `claimedBranches` answers `{'*'}` on failure, and `'*'` excludes no branch. Add a test with an unreadable ref list and a subject for an in-flight branch name.
4. Reject a subject whose merge commit is an ancestor of the commit that added the plan file, so a reused branch name (Jira-keyed names on GitFlow estates) does not settle a slice nobody started. Add a fixture for it.
5. Place the union before `landedWithoutListing`, and in the scan skip `merged_by_host` when `merged_by_subject` answered yes.
6. Name `auto-deliver.ts` (trigger) and `controllers/deliverability.ts` (decision, host only) in the "No destructive decision reads the subject" list, and add a gate that keeps `mergedBySubject`/`mergeSubjects` out of `landed.ts`, `mayRemove`, `sliceHasMerged` and the shell `pr_merged`.
7. Name the bundle chores: build entry, generated marker, bundle-resolution check, Helper Scripts row, subpath import, and `plot-host.sh backend` as the scan's backend source. Say that the `bitbucket` form is Bitbucket Cloud's default message.
8. Measure `git log origin/develop --merges --grep='^Merged in '` against the `--no-merges` count on `ewz-kus-portal` and record both, so the squash Open Point carries a number.
