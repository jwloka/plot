# Round 1 — moderation

Subject: `docs/plans/2026-10-01-a-merge-subject-proves-a-landing-the-host-cannot.md` at `385a973d`. Jurors: `round1-skeptic.md`, `round1-bitbucket.md`, `round1-layering.md`. Gate: all three committed (`plot-panel.mjs check`). Reconcile: `unanimous amend skeptic,bitbucket,layering`.

## Evidence each juror used

- **Skeptic (executed):** a shell fixture with a bare origin, a `plot-host.sh` shim that answers `bitbucket` and refuses every PR op with HTTP 429, the unmodified scan, a copy with the Bitbucket form added, and two throwaway vitest files against `queueOfPlan` and `readQueue`.
- **Bitbucket operator (executed in part):** read the plan against `origin/main`, probed `queueOfPlan` and the `claimedBranches` failure answer, and named the GitFlow and Jira-keyed reuse cases. It did not call `bb`, so the squash count is unmeasured.
- **Layering (executed in part):** read the seams and the gates, ran a probe on `ea8f88d5` showing a ref alone settles a slice in `queueOfPlan`, and listed the delivery readers of `merged`.

## Agreed changes (all three, or two with the third silent)

1. **The Changelog overclaims.** Under a sustained 429 the subject releases the merged predecessor, and the successor then waits on one host answer about itself (`queuedHasLanded` in the supervisor, `unknown` in the scan). The plan must say so, or add a host-free answer for the successor. The PR index cannot be that answer, because the index never says no. (skeptic 1, bitbucket 1)
2. **The tests must reproduce #1139 end to end.** Slice 1 asserts `--list-eligible` and `--next`, not only the wave verdict. Slice 2's stub refuses both the listing and `queuedHasLanded`, and asserts the successor's hold word. (skeptic 2, bitbucket 2)
3. **The union goes before `landedWithoutListing`, not only before `queueOfPlan`,** and the seam is named: `QueueWorld` in `queue-reading.ts` and `queueWorldForRepo` in `entry/registryd-main.ts`. (all three)
4. **The "restricted to refless branches through `claimed`" sentence and its test are wrong.** `queueOfPlan` settles a slice on `claimed || merged`, so a ref already settles it and the restriction changes no queue. Executed by two jurors. (skeptic 3, layering 2)
5. **The destructive boundary needs a gate, not a sentence,** and the list is incomplete: `auto-deliver.ts:254` (`allSlicesMerged`) and `deliver.ts:230` read the `merged` set. `deliverability.ts:205` (host) and `plot-release-refs.sh:213` (`pr_merged`) are the re-gates that hold it, and a test must prove a delivery proven only by subject refuses when the host says not merged. (skeptic 5, bitbucket 6, layering 4)
6. **The scan skips `merged_by_host` for a branch the subject proved.** The skeptic's host log showed `pr-state feature/tracer` asked on every run. (skeptic 7, bitbucket 5)
7. **The bundle chores are named:** `packages/board/build.mjs`, `.gitattributes`, the subpath import of `adapters/host/merge-subjects.ts`, the Helper Scripts row, and subjects plus branches on stdin rather than argv. (bitbucket 7, layering 6-7)
8. **"No second copy of the rule exists" is false:** `packages/domain/corpus/branch-state.corpus.test.ts:226-230` holds one. It becomes a call to `mergedBySubject`. (layering 3)

## Disagreements, named

- **The reused branch name.** The skeptic executed it: a later plan reusing a merged name reads `merged` before it starts (`bug/flaky — merged`), so the next slice opens and the reused slice is never offered. The Bitbucket operator calls this common on Jira-keyed GitFlow estates and requires rejecting a subject whose merge commit is an ancestor of the commit that added the plan. The skeptic accepts that rule or an Open Point stating the consequence. The layering juror treats the ref as the protection and names `plot-dispatch.sh`'s scan gate. The open question is whether a refless reused name before its first claim is rare enough to document, or frequent enough to gate. Only the Bitbucket operator's estate can answer it, and nobody measured it.
- **The GitHub owner pin.** The layering juror would drop the `<owner>` placeholder and its Changelog bullet: no measured failure on this estate depends on it. The skeptic keeps it, but requires one owner parser and a defined answer for a local-path origin, an SSH alias and owner case, and names `fleet.test.mjs:845-900` as affected. The panel juror on #1139 (pre-plan) asked for the pin after counting 22 fork-owner subjects. The point at issue is whether 22 historical subjects that already fall through to the host justify a parser with three edge cases.
- **`merge_detect=unaskable`.** The skeptic would drop it and refuse with exit 2, as `ask_branch_states` already does for a missing bundle. The layering juror keeps the word and asks that `skills/plot-pulse/SKILL.md:176` document it. This is the scan's existing contract, and the plan contradicts it either way until it picks one.

## Single-juror findings

- `claimedBranches` answers `{'*'}` on failure, and `'*'` excludes no branch from the union. Apply the union only when the ref list was read, with a test. (bitbucket 3)
- `plot-worker-loop.sh --offline --next` is a third reader that slice 1 fixes and the plan does not list. (skeptic 10)
- Measure `git log origin/develop --merges --grep='^Merged in '` against the `--no-merges` count on `ewz-kus-portal`, so the squash Open Point carries a number. (bitbucket 8)

## Blind spot

All three lenses read the wave gate. None asked what the board renders for a slice the subject proved while its PR row reads `unknown` from a throttled host, which is the operator's first view of this fix. The amendment should state the board's row for that slice.
