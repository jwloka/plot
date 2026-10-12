# Round 1 — refutation skeptic

Position: amend
Evidence: executed

Subject: `docs/plans/2026-10-01-a-merge-subject-proves-a-landing-the-host-cannot.md` on `origin/main` at `ea8f88d5`. `git diff --stat 3f916d15 origin/main` over `plot-fleet-scan.sh`, `rules/branch-state.ts`, `queue-reading.ts` and `ports/refs.ts` is empty, so the plan's line numbers still apply.

## Method

- A detached worktree of `origin/main` in my scratch directory, with `pnpm install`.
- Fixture A, a shell repository with a bare origin, two Approved plans, and a `plot-host.sh` shim that answers `backend` with `bitbucket` and refuses `pr-state`, `pr-list`, `pr-merged` and `pr-view` with `HTTP 429`. It holds these merges on `main`: `Merged in feature/tracer (pull request #3644)` (ref deleted), `Merge pull request #12 from eins78/feature/fork` (fork owner), `Merged in feature/x-long (pull request #13)` (prefix of a plan branch `feature/x`), `Merge pull request #14 from plot-pm/bug/flaky` (an earlier merge of a name that a second plan reuses and has not started), and a backward merge `Merge remote-tracking branch 'origin/main' into feature/pull`. Plan P has slice Tracer (`feature/tracer`) and slice Next (`feature/next`, unstarted, no ref).
- I ran the unmodified scan against it. Then I ran a copy of the scan whose `merged_by_subject` also accepts `^Merged in <branch> \(pull request #[0-9]+\)$`, which is what slice 1 adds.
- Two throwaway vitest files against `queueOfPlan` and `readQueue` with a stub `QueueWorld` that reproduces the measured tick: listing refused (`whole: false`), no index rows, `queuedHasLanded` answers `unknown`. I seeded `listing.merged` with `feature/tracer` to simulate slice 2's union. I trashed both files afterwards.

## 1. Factual claims

True, with evidence:

- `plot-fleet-scan.sh:2183` `merged_by_subject`, and the GitHub-only regex at `:2185` and `:492`. `MERGE_DETECT` is set at `:492-496`.
- `rules/branch-state.ts:189` is `if (readings.mergeSubjectFound) return 'merged';`, and the ref check is at `:170-182`.
- `queue-reading.ts:237` is `const listing = await world.mergedBranches();`, followed by `queueOfPlan(plan, claimed, merged)` at `:245`.
- `commitsSync` runs `git log --no-merges` (`refs-git.ts:380`), so it cannot list merge subjects.
- `6c66b389` is dated 2026-08-16 ("recognise a branch merged with its ref deleted").
- The cap measurements are at `:463-464`. The first-parent finding is at `:439-446`.
- `plot-reconcile-scan.sh:2795` and `:2836` read the GitHub form.
- Fork and predecessor owners on `origin/main`: `eins78` ×20, plus `qubert-quatico`, `michaelaemisegger`, `jwloka` and `damoeb` ×1 each. This matches the plan's "22 … `eins78` ×20 and four others".
- Today's scan reproduces the defect. Fixture A, unmodified scan: `feature/tracer — unknown — PR could not be read`, `Tracer — eligible`, `Next — blocked`.
- Today's supervisor reproduces the measured tick. Stub world: `feature/tracer` reads `merge-unknown` and `feature/smartmeter` reads `not-claimable`.

Mislocated:

- `queue-reading.ts` is `packages/board/src/server/queue-reading.ts`, not a domain file. The table reads as if it sits beside `rules/branch-state.ts`.
- `readQueue` does not read the refs port. It reads `QueueWorld` (`queue-reading.ts:27-80`), and `registryd-main.ts:547-650` builds that world. "The refs port gains `mergeSubjects`" therefore also needs a new `QueueWorld` member and its wiring in `registryd-main.ts`. The plan does not name either.

False or incomplete:

- **"A reused branch name has a ref and never reaches the subject."** This holds only after somebody claims the reused name. A reused name that is not yet started has no ref. Fixture A, unmodified scan: `bug/flaky — merged`. That branch has no ref and nobody started it. The `merged` comes from an earlier plan's merge of the same name. The owner restriction does not catch this case, because the owner is the repository's own.
- **"The supervisor applies the same restriction through `claimed`."** `queueOfPlan` treats a claimed branch and a merged branch the same way: `settled = claimed.has || merged.has` (`queue-reading.ts:144-145`). Executed with prior slice `bug/a`: `claimed={bug/a}` gives `[{"branch":"bug/b","claimable":true}]`, and `merged={bug/a}` gives the identical result. A refless restriction on the union changes nothing in `queueOfPlan`, so it cannot be what protects a reused name.

## 2. Does the design fix the measured failure?

It moves the hold. It does not remove it.

**Scan, executed.** With the Bitbucket form added, Fixture A under 429 gives:

```
Tracer — complete
    feature/tracer — merged
Next — eligible
    feature/next — unknown — PR could not be read (failed host)
--list-eligible p → "nothing claimable: no eligible wave holds a startable branch." rc=1
```

The next slice's own branch has no ref, so the scan asks the host about it. Under 429 that answer is `unknown`, and `isClaimable` accepts only `open` (`eligible.ts:139-170`). Slice 1's proof ("reads that slice `merged` and the next slice `eligible`") passes on this fixture, but `--next` and `--list-eligible` still hand out nothing.

**Supervisor, executed.** With `feature/tracer` added to `merged`:

```
TODAY [["feature/tracer",true,"unknown","merge-unknown"],["feature/smartmeter",false,"not-landed","not-claimable"]]
PLAN  [["feature/smartmeter",true,"unknown","merge-unknown"]]  asked [ 'feature/smartmeter' ]
```

`feature/smartmeter` is now claimable and briefed. `readQueue` therefore asks `queuedHasLanded(feature/smartmeter)` (`queue-reading.ts:253-256`). It has no PR number, so `landedWithoutListing` cannot answer it. Under the same 429 the answer is `unknown`, and `whyNotReady` tests `merge-unknown` before anything else (`rules/queue.ts:206-207`). The free agent still waits. The tick line changes from `merge-unknown=1 not-claimable=N` to `merge-unknown=1`, on a different branch.

**Consequence.** The Changelog sentence "a throttled host no longer holds the slices behind it" is false while the throttle lasts. The plan's gain is real but smaller than claimed. The merged predecessor stops costing a host answer. The successor still needs exactly one host answer about itself. Slice 2's test ("holds nothing on `merge-unknown`, makes the next slice claimable") passes only if the stub answers `queuedHasLanded` for the successor. The measured host did not give that answer, because `pr-merged` returned 429.

**Third reader.** The successor's own landing question is the reader that still holds the slice. It appears in both paths: the scan's no-ref arm (`plot-fleet-scan.sh:3378` → `branch-state.ts:213-220`) and `readQueue`'s `queuedHasLanded`. A third path, `plot-worker-loop.sh:594/2213` (`plot-fleet-scan.sh --offline --next`), is fixed by slice 1 without the plan naming it. Offline, a refless Bitbucket Tracer reads `open` today, so `--next` can offer finished work. The plan should name this path as a reader that slice 1 fixes.

**Host spend in the scan.** `merged_by_host "$br"` runs without a condition after `merged_by_subject` (`:3353`, `:3378`). Fixture A host log: `pr-state feature/tracer` was asked on every scan, both before and after the simulated fix, and also `bug/flaky` and `feature/fork`, which the subject already proves. Under a rate limit, every branch the subject proves still costs a call on each pulse. The terminal cache does not hold a refused answer.

## 3. Wrong `merged`, and where it reaches

The subject can move a branch to `merged` wrongly in two cases:

- **A reused name that nobody has started** (executed: `bug/flaky — merged`). Its slice reads `complete`, so the next slice opens on work that has not landed. Nobody is ever offered the reused branch, because it reads `merged`.
- **A merge subject edited by hand.** Bitbucket's merge dialog lets the person who merges edit the message. This case is rare and needs deliberate input.

The owner restriction fixes the fork case (Fixture A today: `feature/fork — merged` from `eins78/feature/fork`). The prefix case is already safe (`feature/x` was not matched by `feature/x-long`), and so is the backward merge (`feature/pull — in progress`).

**Does a wrong answer reach a destructive decision?** I traced the readers and found none:

- `plot-reap.sh`, `plot-release-refs.sh` and the `plot-dispatch.sh` `--release` and desk-reuse paths use `pr_merged` or `plot-host.sh pr-merged` (`plot-dispatch.sh:1986`, `:3690`).
- `deliverability.ts:80` asks the host.
- `sliceHasMerged` asks the host (`registryd-main.ts:617`).
- `auto-dispatch.ts:159` reads the scan's `merged` only to call an agent free. An agent's branch has a claim ref, so it never reaches the subject arm.

The wave gate is the only consumer today. **The boundary is prose only.** Nothing stops a later change from importing `mergedBySubject`, or from reading the scan's `merged` in a reap or delivery path. The repository's own rule ("Gates Over Rules", and `check-ancestry-decisions.sh` for the twin question) says a destructive boundary needs a gate.

## 4. Buildability, order, gates, tests

- **Order.** Slice 2 imports `mergedBySubject` and the forms adapter from slice 1, so the order is correct. Each slice can merge alone.
- **Vendor-name gate** (`ci.yml:299`). It allows `github` and `bitbucket` in `packages/domain/src/adapters/host/merge-subjects.ts` and forbids them in `rules/merge-subject.ts`. The design puts each word on the correct side. The bundle entry lives in `packages/board`, which the gate does not scan.
- **Spawn ratchet** (`ci.yml:338`). `mergeSubjects` runs in `refs-git.ts`, inside `adapters/`, so the count does not change.
- **Script-name gate.** A `.mjs` bundle called from a script is outside the gate's scope.
- **Actor-name gate.** No new names are at risk.
- **Domain coverage 100%.** This is reachable for a pure rule. `adapters/` is measured under its own thresholds (`packages/domain/vitest.config`).
- **Bundle cost.** The scan already starts `plot-branch-state.mjs`, `plot-verdicts.mjs` and `plot-delta.mjs` on each pass (`:3532`, `:3925`, `:4340`, `:4672`), so one more start follows precedent. But `ask_branch_states` refuses with exit 2 when its bundle is missing (`:3531-3533`), and that comment says "There is no shell fallback". The plan's `merge_detect=unaskable` degraded path contradicts that precedent. It is also nearly unreachable, because the scan exits 2 first.
- **Owner source contradicts itself.** The design says "`<owner>` … read from the `origin` URL by the adapter", and also that the bundle "takes … the backend, owner and plan branches as arguments". The shell would then need its own URL parser, which makes a second copy of the rule.
- **The owner of a local-path origin is undefined, and existing tests depend on it.** `test/reconcile/fleet.test.mjs:845-900` builds origin as a bare local path and merges with `owner = 'plot-pm'`. `plot-host.sh backend` defaults that fixture to `github` (executed: "no 'Git host' key … assuming 'github'"). With no owner readable from `/…/origin.git`, the GitHub form cannot match. Tests "a merged-and-deleted branch reports merged, not open" and "--next does not name a merged-and-deleted branch" then go red, unless the plan states what happens when the owner cannot be read. SSH host aliases (`git@github-work:org/repo.git`) and owner case (GitHub logins are case-insensitive) have the same gap.
- **Call placement.** "Calls it once after its existing `MERGE_SUBJECTS` walk" does not work, because the plan branches are known only after the scan parses the plans, which happens later.
- **Union placement in `readQueue`.** The union must go into `merged` before `landedWithoutListing` (`:239-241`). Otherwise `blockingBranches` still names the proven branch and spends an index lookup or a `viewLanded` call on it. "Before `queueOfPlan`" does not say this.
- **Test sufficiency.** Slice 1's test asserts the slice verdict, not claimability, so it proves less than the Changelog claims (§2). Slice 2's "ref present keeps the slice outstanding" test is false against `queueOfPlan` (§1): a ref makes the branch settled. Slice 2's 429 test must state what `queuedHasLanded` answers for the successor. If the stub answers `unknown`, which is the measured behaviour, the test as worded fails.

## 5. Missing or to cut

- **Missing:** the successor's own landing question under a refused host (§2). This is the remaining hold, and it is the measured symptom.
- **Missing:** a gate on who may consume `mergedBySubject` (§3).
- **Missing:** the reused-name case before anyone claims it (§1, §3).
- **Missing:** owner rules for a local-path origin, an SSH alias and case (§4).
- **Missing:** skipping `merged_by_host` when the subject already proved the branch (§2).
- **Cut:** the `merge_detect=unaskable` fallback. Refuse the way `ask_branch_states` does.
- **Cut or reword:** "the supervisor applies the same restriction through `claimed`".

## What the plan must change

1. Reword the Changelog and Motivation to match what the design delivers. The subject removes the hold on a merged, refless predecessor. Under a refused host the successor still waits for one host answer about itself, and the plan must say so. Alternatively, add a design element that answers the successor without the host. The plan cannot use the PR index for that, because "the index never says no".
2. Rewrite slice 1's proof to assert `--list-eligible`, not only the wave verdict. Rewrite slice 2's 429 test to state the stub's `queuedHasLanded` answer for the successor. Assert the real outcome: `merge-unknown` moves to the successor and stays there while the host refuses. If item 1 adds a mechanism, assert that the successor is handed over.
3. Remove "the supervisor applies the same restriction through `claimed`" and the slice 2 test "a ref present for the same name keeps the slice outstanding". Both contradict `queueOfPlan` (executed: claimed and merged give the same queue).
4. State the reused-name gap before a claim: a later plan that reuses a merged name reads `merged` before it starts (executed: `bug/flaky — merged`). Either restrict subject evidence to merges newer than the plan's approval commit, or record the gap as an Open Point with its consequence: the next slice opens and the reused slice is never offered.
5. Add a gate, modelled on `check-ancestry-decisions.sh` or as an import allowlist, that limits `mergedBySubject` and `plot-merge-subject.mjs` to the wave-gate callers. "No destructive decision reads the subject" then becomes enforceable rather than prose.
6. Choose one owner reader. Either the bundle reads `origin` itself, or the adapter is the only parser and the shell passes the URL and never the owner. Define the answer for a local-path origin, an SSH alias and owner case, and name what happens to `fleet.test.mjs:845-900`.
7. In the scan, do not call `merged_by_host` for a branch that the subject proved. Under a rate limit this saves one call per proven branch per pulse (executed host log: `pr-state feature/tracer` asked on every run).
8. Drop `merge_detect=unaskable`. A missing bundle refuses with exit 2, as `ask_branch_states` does.
9. Name the new `QueueWorld` member and its `registryd-main.ts` wiring. Place the union before `landedWithoutListing`, not only before `queueOfPlan`. Place the scan's bundle call after plan parsing.
10. List `plot-worker-loop.sh`'s `--offline --next` as a reader that slice 1 fixes. Offline, a refless Bitbucket branch reads `open` today and can be offered again.
