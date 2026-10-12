# Round 2 — refutation skeptic

Position: amend
Evidence: executed

Subject: `docs/plans/2026-10-01-a-merge-subject-proves-a-landing-the-host-cannot.md` at `cc1559c2`. I read it in a detached worktree of `cc1559c2` in my scratch directory.

## Method

- I checked every line reference in the amended plan against `cc1559c2`.
- Fixture B is a shell repository built to test the `^<added>` walk. Before the plan exists, `main` merges `bug/flaky`. The plan is then added on `idea/p`. While the plan is a Draft on that branch, `main` merges `bug/racy`. Then `idea/p` merges, and the plan file is renamed. I ran the plan's exact command (`git log --diff-filter=A --format=%H -1 -- <plan file>`, then `git log main ^<added> --merges --pretty=%s`), and two variants of it.
- On this repository's `origin/main` I counted plan renames and timed the add lookup.
- I ran a throwaway vitest against `planAutoDeliver` and `pruneDelivering` (`packages/board/src/server/auto-deliver.ts`), built on the helpers of `test/unit/auto-deliver.test.ts`. It passed, and I trashed it afterwards.

## 1. My round-1 asks

| # | Ask | Status |
|---|---|---|
| 1 | Changelog and Motivation match what the design delivers | Answered (`:17`, `:42`). |
| 2 | Slice 1 asserts `--list-eligible`; slice 2 states `queuedHasLanded`'s answer | Answered (`:118`, `:122`). |
| 3 | Remove the `claimed` restriction and its test | Answered (`:79`). |
| 4 | The reused name before a claim | Answered by the `^<added>` rule (operator decision a). The Changelog words it more strongly than the mechanism delivers. See §3 A. |
| 5 | A gate on who consumes the subject | Answered in intent. As written, part of the gate cannot be tested. See §3 C. |
| 6 | One owner parser, with local path, SSH alias and case defined | Answered (`:54`). `fleet.test.mjs:852` uses a bare local path, so `null` keeps that test green. |
| 7 | Skip `merged_by_host` for a proven branch | Answered (`:68`). |
| 8 | Drop `unaskable` | Overruled by the operator (decision c). I accept the decision. One sentence is wrong for GitHub. See §3 E. |
| 9 | Name the `QueueWorld` member and its wiring; put the union before `landedWithoutListing`; call the bundle after plan parsing | Answered (`:68`, `:72-77`), with one gap: no port op supplies `since`. See §3 D. |
| 10 | Name the worker loop as a reader | Answered (`:38`), and the plan corrects `--next` to `--why-nothing` (`plot-worker-loop.sh:2213`). |

## 2. Factual claims on `cc1559c2`

True:

- `plot-fleet-scan.sh:2183-2186` `merged_by_subject`, `:492` `MERGE_DETECT`, `:3353` the subject call, `:3378` the unconditional `merged_by_host`, `:3531-3533` `ask_branch_states` exits 2, `:463-464` the cap timing, `:439-446` first-parent.
- `queue-reading.ts:144-145` `settled`, `:237-241` the listing and `landedWithoutListing`, `:253-256` `queuedHasLanded`.
- `registryd-main.ts:556-560` the `{'*'}` sentinel and `:607` `host.backend()`. `git grep "'\*'"` under `packages/*/src` finds only the producer at `:560`, so the Open Point "read by nothing" is true.
- `ports/refs.ts:339` `remoteUrl`. `refs-git.ts:380` `commitsSync` runs `--no-merges`.
- `rules/queue.ts:206-207`: `merge-unknown` is tested first. `not-landed` with `isHandOverReady` returns `null`, so slice 2's "handed out" test is reachable.
- `fleet.ts:5101-5106` gives DONE with the note `merged` or `merged — slice still open`.
- `controllers/deliverability.ts:86` `host.prMerged`, `auto-deliver.ts:252-256` `landedBranches`, `deliver.ts:230` `allSlicesMerged`, `plot-deliver.sh:179` `plot-ask.mjs deliverable`, `plot-release-refs.sh:213` `pr_merged`.
- `corpus/branch-state.corpus.test.ts:226-230` holds the third copy of the regex.
- `entry/branch-state.ts:24-27` imports by subpath. `package.json` already exports `./rules/*`. It has no `./adapters/*` subpath, only the `./adapters` barrel, so slice 1 does need to add one, as the plan says.

False or imprecise:

- **`:3216` is not where the scan reads the backend.** Line 3216 is a comment in the claim-commit walk. The scan calls `plot-host.sh backend` at `:408-409` and `:561`.
- **"One git call per plan" is two.** Each plan needs the `--diff-filter=A` lookup and then the `^<added>` walk. Both are cheap: the lookup takes 8 ms on this repository (5416 commits). The count in the plan is still wrong.
- **"Each check asks the host again" (`:97`) is false.** See §3 B.

## 3. New defects in the amended design

**A. The age rule is "not contained in the adding commit", not "older than the plan". The two differ for a plan drafted on an idea branch. Executed.**

On Fixture B, `git log --diff-filter=A -1 -- docs/plans/p.md` answers the commit on `idea/p`. `main ^<that>` then lists `Merged in bug/racy (pull request #2)`, a merge that landed on `main` while the plan was still a Draft on its branch. A plan that reuses `bug/racy` therefore reads that slice `merged` before anybody starts it. This is the round-1 defect, now limited to the draft window. The Changelog (`:19`) says "a merge subject older than the plan … proves nothing", and that is false for an idea-branch plan. A first-parent lookup on `<main>` (`git log <main> --first-parent --diff-filter=A -1 -- <file>`) answered the merge that brought the plan onto `main`, which closes the window. It has its own cost: a plan written on the work branch it implements would have its own slice's merge excluded and sent to the host. The plan must pick one option and state its residual.

**Renames move `<added>` forward. Executed.** After `git mv p.md p2.md`, the lookup answers the rename commit, and `main ^<rename>` lists no subjects. On a plan renamed after a slice merged, the subject would no longer prove that slice, and the #1139 hold returns for that plan. A wrong answer here sends the branch to the host, which is the safe direction. On this estate 4 of 392 plans were renamed, all while Draft, with 0 merges between the original add and the rename, so the risk is small. The plan should still state it, or use `--follow`, which found the original add on Fixture B.

**The ref is unnamed.** The lookup as written runs from `HEAD`. In a desk or a stale checkout, `HEAD` is not `<main>`. The plan should write `git log <main> --diff-filter=A …`, the same ref as the walk.

**B. Auto-deliver never retries a delivery refused during the throttle. Executed.** `maybeAutoDeliver` adds a slug to `inFlight` when it starts `plot-deliver.sh`. `pruneDelivering` (`auto-deliver.ts:311-332`) keeps the slug while the plan reads `approved` and `allSlicesMerged` answers `merged`. The refusal path (`:401-406`) logs and does not remove it. With this plan, a subject-proven Bitbucket plan reads `merged` during the 429. Tick 1 starts a delivery, which `deliverability.ts:86` refuses because the host answers `unknown`. Every later tick keeps the slug and starts nothing, even after the host recovers. My test asserted exactly that: tick 1 started `ship-it`, and four later ticks over the same pulse started none. Before this plan, the scan read `unknown` under the 429, nothing triggered, and the first tick after recovery delivered. The plan's statement "each check asks the host again; that cost is stated" describes a retry that does not happen. The real consequence is that auto-delivery is lost until the board restarts. The same path already exists for GitHub subjects since `6c66b389`. This plan extends it to Bitbucket, which is the estate that is throttled.

**C. The import gate cannot be tested as written.**

- `sliceHasMerged` is a closure inside `entry/registryd-main.ts:617`, and that file is the one the gate allows to import `mergedBySubject`. A file-level import test cannot assert that `sliceHasMerged` imports nothing.
- `packages/domain/src/index.ts` re-exports 49 of the 54 rule files with `export *`. If slice 1 follows that convention, `deliverability.ts:1` (`from '@plot-pm/domain'`) can reach `mergedBySubject` through the barrel, and a test that checks only module paths would not see it. The plan must keep both new rules out of the barrel and make the gate match identifiers, not paths.
- The rule's own tests and the corpus test (`:105`) import `mergedBySubject`. "Imported only by the bundle entry and `registryd-main.ts`" must therefore exclude test files explicitly.

**D. The supervisor has no port op for `since`.** `mergeSubjects(ref, since, max)` needs the plan's adding commit. The refs port (`ports/refs.ts:85-352`) has no op that answers it, and `git grep diff-filter` finds no TypeScript reader. Slice 2 names only `mergeSubjects`, so its test "a subject older than the plan adds nothing" has nothing to call. Either `mergeSubjects` takes the plan path, or a second op is named.

**E. Smaller points.**

- `unaskable` (`:70`) says "every refless branch then goes to the host, which is today's behaviour on Bitbucket". On GitHub it is worse than today: the shell regex that answers today is removed, so a GitHub estate loses its subject proof whenever this bundle cannot answer. The sentence should say so.
- `skills/plot-pulse/SKILL.md:188-191` already tells readers that a host which cannot answer leaves the branch `open`, while the scan reads `unknown` (`:3385-3395`). This drift predates the plan. Slice 1 edits that table, so the slice should correct the paragraph too.

## 4. What blocks implementation

These block implementation: B (a false statement about a destructive-adjacent actor, and a regression on the target estate), C (a gate that cannot be built as specified), and D (a slice test with no op behind it). A needs a reworded Changelog plus one test, so the implementer does not build the wrong boundary. The line-number and call-count errors are not blocking.

## What the plan must change

1. Replace "each check asks the host again; that cost is stated" (`:97`). A delivery that is refused while the subject says `merged` stays in `inFlight` and is never retried until the board restarts (`auto-deliver.ts:311-332`, `:401-406`). Either retire the slug on a non-zero exit, or keep subject-only evidence out of `allSlicesMerged` for auto-delivery. Add a test: tick 1 is refused, the host recovers, and a later tick delivers.
2. State the age rule as what it is, "merges not contained in the commit that added the plan", and choose the lookup. The plain lookup leaves the draft window of an idea-branch plan open (executed: `bug/racy` listed). `--first-parent` on `<main>` closes that window but excludes a work-branch plan's own merge. Name the residual in the Changelog or an Open Point. Run the lookup on `<main>`, not `HEAD`. Use `--follow`, or state that a rename moves `<added>` forward. Add a slice 1 fixture for the chosen behaviour.
3. Rewrite the import gate so it can be built. Keep `merge-subject.ts` and `remote-owner.ts` out of `packages/domain/src/index.ts`. Match on identifiers, not only on module paths. Exclude test files by name. Drop `sliceHasMerged` from the list, or move it out of `registryd-main.ts` so a file-level test can see it.
4. Name the refs-port reading of the plan's adding commit, either as a parameter of `mergeSubjects` or as a second op with its git and fixture adapters. Slice 2's "older than the plan" test depends on it.
5. Correct the small facts: the backend read is at `plot-fleet-scan.sh:408` and `:561`, not `:3216`. The per-plan walk is two git calls. The `unaskable` sentence must say that a GitHub estate loses its subject proof under that word.
