# Round 2 — layering juror

Position: amend
Evidence: executed

Subject: `docs/plans/2026-10-01-a-merge-subject-proves-a-landing-the-host-cannot.md` at `cc1559c2`. I read the plan and the code in a detached worktree at `cc1559c2`. I ran git measurements against that commit: the adding-commit lookup for the 108 plans in `docs/plans/active/`, and a rename sample over 49 dated plan files. I ran no vitest probe this round; the queue findings below follow from function signatures, and I quote them.

## Verdict in one paragraph

The amendment answers all seven of my round-1 changes, and the operator's three settlements are written in. The layering is now right: the rule and the owner parser sit in `rules/` with no vendor word, the forms sit in `adapters/host/`, the scan passes the raw `origin` URL to one parser, and `queue-reading.ts` receives a set and never a backend word. The new age rule (`^<added>`) brings four defects that block implementation. (1) The supervisor unions a per-plan proof into one global `merged` set, and that set is keyed by branch name only, so the old plan's proof settles the reused name in the new plan. That is the defect the age rule exists to prevent. (2) The walk runs per plan with no phase bound, and the adding-commit lookup costs about 30 ms per plan on this repository. (3) The supervisor has no port operation that finds `<added>`. (4) The import-graph gate contradicts slice 1's corpus call, and it guards an import edge, but the subject reaches delivery as data.

## 1. Round-1 changes, one by one

1. **Seam named.** Answered. `QueueWorld` (`queue-reading.ts:27`), `queueWorldForRepo` (`registryd-main.ts:528`), and the union before `landedWithoutListing` (`:241`) and `queueOfPlan` (`:245`) are all named at plan lines 72-76.
2. **Ref test.** Answered by dropping the refless restriction (plan line 79), which matches `queueOfPlan`'s `settled` at `queue-reading.ts:144-145`. One gap remains. The sentence "A ref-carrying name is still excluded from the proof" needs the claimed set, but `QueueWorld.subjectProven(plans)` takes only plans. No slice-2 test asserts that exclusion: "a branch with a ref and a subject still gets its own `queuedHasLanded` question".
3. **Corpus copy.** Answered (plan line 105). It contradicts the new import gate; see §3d.
4. **Destructive readers and a re-gate test.** Answered in the table at lines 89-95. `deliverability.ts:86` is `host.prMerged` and `:77` states that `unknown` counts as not merged. True. `plot-release-refs.sh:213` reads `pr_merged`. True. The gate is weak; see §3d.
5. **Owner.** The operator settled this as keep. The plan answers my conditions: one parser, `ownerOfRemote`, read through `refs.remoteUrl` (`ports/refs.ts:339`) in the supervisor, and the raw URL handed to the bundle by the scan, so shell does not parse it a second time. The owner is compared without case, and `null` keeps today's answer. The vendor-name gate (`ci.yml:299-311`) drops comment lines, so a `github-work` example in a doc comment passes. The same word in code under `rules/` fails.
6. **Bundle chores.** Answered (slice 1, line 118): `build.mjs`, `.gitattributes`, the subpath export (`domain/package.json:8-16` exports `./rules/*` and `./adapters` but no `./adapters/host/*`, so the plan is right to add one), the Helper Scripts row, and `SKILL.md:176`.
7. **Stdin.** Answered (line 68).

## 2. Factual claims on `cc1559c2`

True: `plot-fleet-scan.sh:2183` (`merged_by_subject`), `:474`, `:492`, `:3353`, `:439-446`, `:463-464`, `:3531-3533`; `queue-reading.ts:27`, `:144-145`, `:237`, `:241`, `:255`; `registryd-main.ts:556-560` (`new Set(['*'])`) and `:607` (`host.backend()`); `refs-git.ts:380` (`--no-merges`); `fleet.ts:5099-5106`; `eligible.ts` `isClaimable` requires `state === 'open'`; corpus regex at `branch-state.corpus.test.ts:226-230`; `rules/landed.ts:108` `mayRemove`; `entry/branch-state.ts:24-27`; `git grep "has('\*')"` has no hit in `packages/`; `fleet.test.mjs:845-900` uses a bare local `origin.git`.

False or imprecise:

- **`plot-host.sh backend` (`:3216`).** Line 3216 is a comment in the claim-marker loop. The scan calls `plot-host.sh backend` at `:408-409` and `:561`.
- **`plot-deliver.sh:179`.** The `plot-ask.mjs deliverable` call is at `:181`.
- **`controllers/deliverability.ts`** is in `packages/board/src/server/controllers/`, not in the domain. Name the package in the gate's list.
- **`sliceHasMerged` "imports none of them".** `sliceHasMerged` is a parameter (`app/lib/tuple-row.ts:1021`, `auto-dispatch.ts:147`), not a module, so it cannot import anything. Its value comes from the pulse, so it does carry subject-derived `merged` (`auto-dispatch.ts:159-165`). The table row "an agent's branch has a claim ref" is the true protection. Drop `sliceHasMerged` from the import list.
- **"One git call per plan".** Two: the adding-commit lookup and the walk. The "7.7 ms / 11.8 ms" figure (line 84) measures one walk for the whole scan. It does not measure N walks plus N lookups.

## 3. New defects

### 3a. The global union undoes the age rule in the supervisor (blocking)

`subjectProven` answers "the branches the rule proves, per plan" (line 74), and the plan then unions them "into `merged`" (line 76). That set is one `Set<string>` for the whole pass: `landedWithoutListing(plans, claimed, merged, world)` at `queue-reading.ts:241` and `queueOfPlan(plan, claimed, merged)` at `:245`, with `settled = claimed.has(branch) || merged.has(branch)` at `:145` and `:307`. Plan A (delivered) proves `bug/flaky`. Plan B reuses `bug/flaky` and has not started it. After the union, `merged.has('bug/flaky')` is true for plan B, its slice reads settled, and the next slice opens. This is the round-1 reused-name defect again. `readQueue` reads every plan (`registryd-main.ts:548-552`, no phase filter; 392 files in `docs/plans/` here), so plan A is asked too. Slice 2's test "a subject older than the plan adds nothing" uses one plan and does not catch this.

The scan has the same risk. `branch_readings` takes only `$1=branch $2=deferred` (`plot-fleet-scan.sh:3319`). The bundle answers per plan, so the set lookup must be keyed by plan and branch.

Fix: apply the proof per plan, `queueOfPlan(plan, claimed, merged ∪ proven(plan))`, and the same inside `landedWithoutListing`'s per-plan loop. Key the scan's lookup by plan and branch. Add a two-plan test in both slices: an old plan whose merged branch name a new plan reuses.

### 3b. The per-plan walk has no bound (blocking)

Measured on `cc1559c2`: `git log --diff-filter=A --format=%H -1 -- <plan>` for the 108 plans in `docs/plans/active/` takes 3.25 s, about 30 ms per plan. The comment at `entry/branch-state.ts` says the scan "walks ~40 plans on a 5-second pulse". The plan's bound, "only for plans that name a refless branch", covers nearly every delivered plan, because merging deletes the ref. In the supervisor, `plans()` returns all 392 files every tick.

Fix, in order of preference:
- Walk once for the whole pass with `--format='%H %s'`, match subjects against all branches, and check age only for a matched pair, with `git merge-base --is-ancestor <merge> <added>`. That call matches `check-ancestry-decisions.sh`'s `PATTERN` (`:65`), so the gate then requires the `plot-ancestry: evidence` marker and checks it. Resolve every adding commit in one call: `git log <main> --diff-filter=A --name-only --format=%H -- docs/plans/`.
- At minimum, restrict both readers to plans whose phase can queue a slice (`blockingBranches(plan.phase, …)` non-empty) and that hold an unsettled refless branch. State the measured cost in the plan.

### 3c. The supervisor cannot find `<added>` (blocking)

Slice 2 adds one port operation, `mergeSubjects(ref, since, max)`. Nothing resolves `since`. No existing refs-port operation answers "the commit that added a path" (`ports/refs.ts:85-352`). Name the operation, its git and fixture adapters, and its failure answer ("no subjects", as line 66 states for the scan). Also name the ref and the path the lookup reads: `origin/<main>`, not `HEAD`, and the dated file, not the `docs/plans/active/` symlink. The symlink's adding commit is the approval commit.

### 3d. The import gate contradicts slice 1 and guards the wrong edge (blocking as written)

Line 97 says `mergedBySubject` is "imported only by the bundle entry and `entry/registryd-main.ts`". Slice 1 makes the corpus test call it (line 105), and the rule's own unit tests import it. Scope the gate to `src/` and list the corpus file, or the gate fails on the commit that adds it.

The subject reaches delivery as data, not as an import: scan, then pulse `state: 'merged'`, then `allSlicesMerged` (`deliver.ts:230`, `auto-deliver.ts`). A future `deliverability.ts` that reads the pulse imports nothing on the list and passes the gate. The behavioural test carries the boundary, and its input is not defined. `deliverability.ts`'s `mergedBranches(host, branches)` (`:80-90`) takes no subject, so "a branch proven by subject" cannot be set up at the controller level, and the test passes for any input. Run it through `plot-deliver.sh` (or the auto-deliver tick) on a scan fixture where the subject proves the branch and the host stub answers not merged, and assert the refusal. The plan should call the import test a guard on the rule's callers, not the gate that holds the boundary.

### 3e. Not blocking, but the plan must state these

- **Renames and double adds.** 2 of 49 sampled dated plans have a no-follow adding commit later than their first add: `2026-08-23-the-agents-tab-filters-to-the-sprint.md` (renamed at `34dc2329`) and `2026-08-25-the-filter-does-not-hide-a-worker.md` (added at `413de75a` and again at `f1e19cd4`). In both, 0 merges lie between the two commits. In general a later adding commit narrows the window, so merged slices fall back to the host. That is the safe direction. State it.
- **A plan added on an idea branch.** `^<added>` excludes only history up to the idea branch's fork point. A reused name merged between the fork and the plan's merge still counts. State it as the rule's limit.
- **The `plot-ancestry: evidence` line** (line 66) is decorative as written. `PATTERN` at `check-ancestry-decisions.sh:65` does not match `^<added>`, so the gate neither requires nor checks it. 3b's `--is-ancestor` form makes it enforced.

## 4. What blocks implementation

3a, 3b, 3c and the first half of 3d. The rest are text corrections.

## What the plan must change

1. Apply the subject proof per plan in both readers: `queueOfPlan(plan, claimed, merged ∪ proven(plan))`, the same inside `landedWithoutListing`, and a scan lookup keyed by plan and branch. Add a two-plan reused-name test to slice 1 and slice 2.
2. Bound the age walk. Preferred: one walk with `%H %s`, one `--diff-filter=A --name-only -- docs/plans/` call for all adding commits, and `merge-base --is-ancestor <merge> <added>` only for a matched pair, carrying the `plot-ancestry: evidence` marker the gate then enforces. At minimum: only plans whose phase can queue a slice and that hold an unsettled refless branch. Replace "one git call per plan" with the measured cost (this repository: about 30 ms per adding-commit lookup, 3.25 s for 108 active plans).
3. Slice 2: name the refs-port operation that resolves `<added>`, with its git and fixture adapters and its failure answer. State that the lookup reads `origin/<main>` and the dated plan path, not the `active/` symlink.
4. Import gate: scope it to `src/` or list the corpus test and the rule tests, drop `sliceHasMerged` (a parameter, not a module), and name `packages/board/src/server/controllers/deliverability.ts`. Run the refusal test through `plot-deliver.sh` or the auto-deliver tick on a fixture where the subject proves the branch and the host answers not merged. Call that test the boundary's gate.
5. `subjectProven` takes the claimed set, or `queue-reading.ts` removes claimed names from its answer. Add the slice-2 test: a branch with a ref and a matching subject still gets its own `queuedHasLanded` question.
6. Correct `:3216` to `:408-409`/`:561` and `plot-deliver.sh:179` to `:181`. State the rename and idea-branch limits of the age rule.
