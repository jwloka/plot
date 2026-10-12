# Round 1 — layering juror

Position: amend
Evidence: executed

Subject: `docs/plans/2026-10-01-a-merge-subject-proves-a-landing-the-host-cannot.md` on `origin/main` at `ea8f88d5`. I read the code in a detached worktree at that commit, ran four CI gate scripts against it, and ran one scratch vitest probe against `queueOfPlan` (deleted after the run).

## Verdict in one paragraph

The direction is right and most of the placement is right. The rule goes into `rules/merge-subject.ts` with no vendor word. The forms go into `adapters/host/`, which follows the `adapters/host/listing-paging.ts` precedent (pure vendor data, exported through `adapters/index.ts:29`). The scan asks the domain once per scan through a bundle, which matches "A Shell Script Asks The Domain" and the existing `plot-branch-state.mjs` pattern. The plan needs amendments for five reasons. (1) The supervisor half names the wrong seam: `readQueue` cannot reach the refs port. (2) The slice-2 ref test asserts behaviour that `queueOfPlan` does not have. (3) The plan says that no second copy of the regex remains, but a third copy exists in the CI corpus tier. (4) The "no destructive decision reads the subject" list leaves out auto-delivery, which does read it. (5) The `<owner>` placeholder makes an adapter read git, and no measured defect justifies it.

## 1. Factual claims in Motivation and Design

All file:line references hold on `ea8f88d5`. I checked each one:

- `plot-fleet-scan.sh:2183` `merged_by_subject`, regex at `:2185`; `:474` `MERGE_SUBJECTS`; `:492` `MERGE_DETECT`; `:3353` call in the no-ref arm; `:439-446` first-parent note; `:462-463` timings. All true.
- `rules/branch-state.ts:189` `if (readings.mergeSubjectFound) return 'merged'`; ref check at `:170-181`. True.
- `queue-reading.ts:237` `const listing = await world.mergedBranches()`; `queueOfPlan(plan, claimed, merged)` at `:245`. True.
- `ports/refs.ts:344` and `refs-git.ts:380` run `commitsSync` with `--no-merges`. True: that function cannot serve.
- `6c66b389` is "plot-fleet: recognise a branch merged with its ref deleted". True.
- `plot-reconcile-scan.sh:2795` and `:2836` read the GitHub form. True.
- `git log origin/main --merges --max-count=2000 --pretty=%s` on this repository returns 316 `plot-pm/` owners, 20 `eins78/` owners and 1 each for `qubert-quatico`, `michaelaemisegger`, `jwloka` and `damoeb`. This matches the juror figure of 22 non-owner subjects (`eins78` ×20 and four others).

Claims that are false or incomplete:

- **"The shell regex at `:2185` and `:492` is removed, so no second copy of the rule exists to drift."** False. A third copy exists at `packages/domain/corpus/branch-state.corpus.test.ts:226-230` (`/^Merge pull request #\d+ from ([^/]+)\/(.+)$/`, any owner). It runs in CI as "Corpus tier — adapters vs production" (`ci.yml:92-94`). Its arm table at `:449` records 4 branches on this estate that reach the `mergeSubjectFound` arm. Slice 1 changes the scan's reading (it adds Bitbucket and restricts the owner) and leaves this copy as it is. The plan does not name the file.
- **"No destructive decision reads the subject."** Incomplete. `auto-deliver.ts:254` (`landedBranches`) and `planAutoDeliver` → `allSlicesMerged(pulse)` read the pulse's `merged` state, and the scan sets that state from the subject. Auto-delivery then chains to a reap and to `plot-release-refs.sh --yes` (`auto-deliver.ts:222-224`). The board's Deliver control (`deliver.ts:230`) reads the same pulse. The act itself is re-gated: `plot-deliver.sh:179` asks `plot-ask.mjs deliverable`, which reaches `controllers/deliverability.ts:205` → `ports.host`, and `plot-release-refs.sh:213` re-asks `pr_merged`. So no wrong subject answer completes a delivery or deletes a ref. The plan must still list these readers and name the re-gate that holds the boundary, because the re-gate is what makes the boundary true.
- **Table row 3, "Reads a merge subject: None."** True. But the row hides the fact that `QueueWorld` (`queue-reading.ts:27-80`, a board-side interface) is the seam, not the refs port. See §2.

## 2. Does the design fix the measured hold in both readers?

**Scan: yes.** With the Bitbucket form in the bundle, `merged_by_subject` returns true in the no-ref arm. `branchState` answers `merged` before the host arm at `branch-state.ts:189`. The next slice becomes `eligible`. The scan path also covers `plot-dispatch.sh:3850,3898` (`--list-eligible`), which is the gate the supervisor's hand-over passes through. That gate is the third reader. It reads the scan, so slice 1 fixes it. This is also why slice 1 must merge before slice 2: the queue could otherwise offer a slice that `plot-dispatch.sh` then refuses.

**Supervisor: yes in effect, but the plan names the wrong seam.** `readQueue` reads only through `QueueWorld`. It has no refs port. The production world is `queueWorldForRepo` (`entry/registryd-main.ts:528-660`). So slice 2 needs these parts, and the plan names none of them:
- a new `QueueWorld` member, for example `mergeSubjects(): Promise<readonly string[]>`;
- its implementation in `queueWorldForRepo` over `refs.mergeSubjects` and `host.backend()` (already used at `:597`);
- the union applied **before** `landedWithoutListing` (`:239-241`) as well as before `queueOfPlan`. If the union comes later, the number lookups spend `VIEWS_PER_PASS` on branches the subject already proved.

Measured hold path: the listing at `:237` returns `whole: false` under HTTP 429. `landedWithoutListing` finds no index row and no number. `queuedHasLanded` gets 429 and answers `unknown`, which prints "held on merge-unknown". Slice 2 is `not-claimable`. A subject-proven `merged` set breaks this chain at `queueOfPlan`. The fix is correct once it is placed at the right seam.

## 3. Can the subject move a branch to `merged` wrongly, and is the boundary enforceable?

Wrong answers are possible: a hand-edited Bitbucket merge message; a branch name reused by a later plan whose slice has no ref yet (the ref check protects only a reused name that has a ref); a stacked PR merged into another branch that later reaches the default branch. The host's `pr_merged` has the same reused-name hazard, because it reads `mergedAt` on any PR with that head. So this is not new in kind.

Where a wrong `merged` reaches:
- wave gate and queue: they offer the next slice early. This is the designed risk, and it is reversible.
- `isFree` via `auto-dispatch.ts:159-164` `mergedBranches(pulse)`: an agent holding that branch reads as free. Not destructive.
- auto-delivery trigger (`auto-deliver.ts:254`): it fires. `plot-deliver.sh` re-asks the host and refuses. Not destructive, but it costs a host call per tick under the throttle that caused the hold.
- reap, ref deletion: re-gated by `pr_merged`. Safe.

**The boundary is prose only.** No gate holds it. `check-ancestry-decisions.sh` matches `merge-base … --is-ancestor|--no-merged|--merged` (its `PATTERN`), not `git log --merges`. I ran it and it reports "Ancestry decisions: clean." It will stay clean after both slices whatever reads the new port op. The cheapest enforcement is a test that `plot-deliver.sh`'s deliverability answer for a refless branch proven only by subject is `false` when the host says not merged. Without that test, a later change to `deliverability.ts` that reads the pulse turns subject evidence into a delivery.

## 4. Buildability, order, gates, test sufficiency

**Gates.** I ran these on `ea8f88d5`: vendor-name grep (`ci.yml:299-311`): 0 hits; `check-script-names.sh`: clean; `check-ancestry-decisions.sh`: clean; `check-bundle-attributes.sh`: clean. Effect of the plan on each:
- Vendor-name gate: green, provided the backend→forms table stays under `adapters/host/` and the bundle entry (`packages/board/src/server/entry/…`, outside the gate's root) passes the backend word through. `pr-index-lookup.ts:155` is the precedent.
- Spawn ratchet (`allowed=28`): unchanged. `refs-git.ts` reaches git through `runScript`/`runScriptSync` inside `adapters/`, and the shell→node call is invisible to the ratchet.
- Script-name gate: unaffected. Its `PATTERN` matches `plot-*.sh` only.
- Actor-name gate: unaffected if the code avoids "Worker" as an actor name.
- **Bundle attributes gate: fails unless slice 1 adds the `.gitattributes` line.** The gate derives the set from `build.mjs`'s `shippedX = path.join(…)` declarations (`ci.yml:519-537`). Slice 1 must name `packages/board/build.mjs` and `.gitattributes`.
- Bundle resolution gate (`ci.yml:488-489`): the scan must build the path from `$script_dir/board/`, as at `:3532`.
- Domain coverage: `rules/merge-subject.ts` sits in the 100% glob. `adapters/host/merge-subjects.ts` is measured under the global adapter thresholds (`domain/vitest.config.ts:33-65`). Both are reachable from pure tests.
- **Corpus tier: at risk.** See §1. The corpus copy at `branch-state.corpus.test.ts:228` must call `mergedBySubject` with the adapter's forms, or the corpus compares the scan against a different rule.

**Import path.** `@plot-pm/domain` exports only `./adapters` (the barrel), not `./adapters/host/*` (`domain/package.json` `exports`). The new bundle would pull every adapter through the barrel. `entry/branch-state.ts:24-27` avoids the barrel for this reason (~320 KB). Slice 1 must add a subpath export or name the import explicitly.

**Slice 2's ref test is wrong as written.** "A test with a ref present for the same name keeps the slice outstanding" cannot pass. In `queueOfPlan`, a claimed branch is already settled (`settled = claimed.has || merged.has`, `queue-reading.ts:144-145`). I ran a probe: `queueOfPlan(plan([['one'],['two']]), new Set(['one']), new Set())` returns `[{ branch: 'two', slug: 'a-plan', claimable: true }]`, and the result is identical when `'one'` is also in `merged`. So "restricted to refless branches" changes nothing in `readQueue`. The queue's protection for a reused name is `plot-dispatch.sh`'s scan gate, not the queue. The test must assert what can fail: a ref-carrying name proven by subject is not reported `landed` and spends no host call. Otherwise the restriction must be dropped from slice 2 and the scan named as the protection.

**Slice 1 test.** It is sufficient for the scan. It should also run the prefix-sharing and fork-owner cases through the bundle directly, so `rules/merge-subject.ts` coverage does not rely on the shell fixture.

**`unaskable` footer word.** `skills/plot-pulse/SKILL.md:176` documents the `merge_detect` values. Slice 1 must add the new word there. No schema enumerates the field (no `merge_detect`/`mergeDetect` in `packages/*/src`), so nothing breaks at parse.

## 5. Missing or to cut

- **Cut `<owner>`.** The evidence in the Motivation shows 0 false positives in 200 merged PRs. The 20 `eins78/` subjects are this repository's own PRs #16-#19 before its transfer, not forks. The other four are contributor forks whose PRs did merge here. The restriction turns these true positives into host calls, and it fixes no measured defect. It also costs layering: "the owner read from `origin` by the adapter" makes the host connector run git, while `refs.remoteUrl` (`ports/refs.ts:339`, `refs-git.ts:374`) already owns that question. The scan side would also need a second owner parser in shell to pass `owner` to the bundle. GitHub owners are case-insensitive, so a literal match against the URL's spelling also adds a new miss. If the owner stays, read it through `refs.remoteUrl` with one pure parser, and have the shell receive it from that parser rather than parse it again.
- **Forms through one source.** Both readers must take the forms from the same module: the bundle for the scan, `queueWorldForRepo` for the supervisor. State in the plan that `queue-reading.ts` receives forms or a proven set, never a backend word. A vendor word in `packages/board/src/server/queue-reading.ts` falls outside the vendor gate's root, so nothing would refuse it.
- **Branches on stdin, not argv.** The plan passes plan branches as arguments. One supervisor tick measured 454 queued slices (`queue-reading.ts:196`). Put subjects and branches on stdin in two sections, as the other bundles do.

## What the plan must change

1. Slice 2: name `QueueWorld` (`queue-reading.ts`) and `queueWorldForRepo` (`entry/registryd-main.ts`) as the seam. Apply the subject-proven set before `landedWithoutListing` as well as before `queueOfPlan`.
2. Slice 2: replace the ref-present test with an assertion `queueOfPlan` can fail, or drop the refless restriction from `readQueue` and name `plot-dispatch.sh`'s scan gate as the protection for a reused name. A probe on `ea8f88d5` shows that a ref alone already settles the slice and makes the next slice claimable.
3. Slice 1: replace the corpus copy at `packages/domain/corpus/branch-state.corpus.test.ts:226-230` with a call to `mergedBySubject`. Correct the sentence "no second copy of the rule exists to drift".
4. Design, "No destructive decision reads the subject": list `auto-deliver.ts:254`/`allSlicesMerged` and `deliver.ts:230` as readers of subject-derived `merged`. Name `plot-deliver.sh:179` → `deliverability.ts:205` (host) and `plot-release-refs.sh:213` (`pr_merged`) as the re-gates that hold the boundary. Add a test that a delivery for a branch proven only by subject refuses when the host says not merged.
5. Drop the `<owner>` placeholder and the second Changelog bullet. If it stays: read the owner through `refs.remoteUrl`, keep one parser, and compare case-insensitively.
6. Slice 1: name `packages/board/build.mjs`, `.gitattributes` (bundle-attributes gate), the domain subpath export or explicit import path for `adapters/host/merge-subjects.ts`, and the `skills/plot-pulse/SKILL.md:176` entry for `merge_detect=unaskable`.
7. Bundle input: subjects and branches on stdin, not branches on argv.
