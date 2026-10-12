# Panel round 2 — design-work-proves-the-path

- **Subject:** `docs/plans/2026-10-12-design-work-proves-the-path.md`
- **Date:** 2026-10-12
- **Caller:** challenge-the-plan Phase 3P, round 2, run by a moderator agent for the batch of story `plot-works-in-five-phases`
- **Lenses:** estate, contradiction, deliverable, cost (four jurors, one rubric)
- **Rubric:** (1) did the revision resolve each round-1 Open Point marked `[x]`, verified against the code with file:line; (2) what new defect the revision introduced; (3) is the plan ready to approve from this lens
- **Commitment:** `Position: proceed | amend | reject`
- **Siblings:** 5 read, 0 unread (story plot-works-in-five-phases)
- **Gate:** `plot-panel.mjs check` exited 0 for all four jurors on the first run. No juror was sent back.
- **Reconcile:** `unanimous	amend	estate,contradiction,deliverable,cost`
- **Verdict files:** `round2-estate.md`, `round2-contradiction.md`, `round2-deliverable.md`, `round2-cost.md`. The round-1 files are unchanged.

## Positions

| Lens | Position | Main finding |
|---|---|---|
| estate | amend | `approve-spike` has no route with no board: `_action_of` (`plot-state-receipt.sh:173-180`) knows four actions, and slice 2 does not amend `CLAUDE.md:499` or `AGENTS.md`. `Slices confirmed:` duplicates the `Approved:` record that the same commit writes (`transitions/plan.ts:338-343`), and no reader needs it. |
| contradiction | amend | HIGH: the person arm keys on the `Spike approved:` record, and the state gate passes a commit that removes a line (`rules/state-transition.ts:121-122`, `:137-141`). Two plan-only hand edits put a Design plan back on the `pr` arm, which approves with no `--who` (`workflows/approve.ts:252`, `:270-274`). `POST /api/approve` decides its 409 from the `Review:` word alone (`packages/board/src/server/approve.ts:306`). |
| deliverable | amend | HIGH: the shell line ratchet refuses slices 1 and 5. `scripts/check-shell-lines.sh` stores no allowance (`:14-19`), both slices add shell and name no removal, and the only named removal (22 lines of the dispatch `case`) is in slice 3. No slice names how the spike reading reaches the scan's `P` and `W` rows (`plot-fleet-scan.sh:3110`, `:3140-3158`). |
| cost | amend | HIGH: the same ratchet defect, for slice 1 in wave 1. Slice 5 is about 12 to 15 files and its multi-plan delivery is unsized (`workflows/deliver.ts:139`, `entry/deliver.ts:368` are single-plan). Slice 2 bundles two repository-wide gates with a full controller. |

## Where all four agree

- **The revision is real.** Every juror verified the plan's citations against `5b9e68ce9` and found them correct: `rules/eligible.ts:43`, `workflows/dispatch.ts:470` and `:527-546`, `workflows/implement.ts:131-138`, `rules/phase-gate.ts:185-192`, `workflows/approve.ts:227`, `:252`, `:304-311`, `:328-333`, `entry/approve.ts:480`, `:527`, `:586`, `rules/ci-suite.ts:233-239`, `rules/controller-gate.ts:11`, both `PlanStatusSchema` copies and both sprint counters. Round 1's main finding (five dispatch gates) is resolved by all four readings.
- **The waits are correct.** `feature/a-draft-can-need-design`, `feature/the-phases-are-a-declaration` and `feature/the-board-draws-the-declared-phases` exist in `2026-10-12-the-phases-are-declared.md` (`:94`, `:98`, `:106`) and build what this plan reads. `the-fleet-writes-the-design` waits on `feature/the-spike-can-be-dispatched` (`:61`).
- **The resolved Open Point on the readings contradicts the Approach.** All four found that the `[x]` line for *deliverable and cost: the readings do not reach their readers* says `PlanMetaSchema` gains "four fields" and the pulse `PlanSchema` gains `type`. The Approach, slice 1 and slice 5 say five fields and `tracer`, as D15 requires. Severity varies (estate and contradiction LOW, deliverable and cost MEDIUM), and the fix is one line.
- **The receipt writer is named wrong.** All four found that the bundle cannot write through the shell `record_state_receipt` (`plot-state-receipt.sh:82`); a bundle uses `recordStateReceipt` (`server/entry/ladder.ts:64`). Deliverable adds that this writer keys on a `State:` value, so a `Spike approved:` receipt needs a key the gate can tell apart.
- **No decision D1 to D22 needs to change.** Every juror chose `amend` and named sentence-sized fixes.

## Disagreements

1. **Whether the shell line ratchet blocks the plan.** Deliverable and cost rate it HIGH: wave 1 cannot merge, so no later wave can either. Estate and contradiction did not raise it; both read the ratchet section as priced. The moderator confirmed `check-shell-lines.sh:14-19` ("no override, no allowance literal") on this branch. The two raising jurors also disagree on the remedy: cost moves the 22-line dispatch `case` into slice 1; deliverable offers that, or a named removal, or reading the markers outside shell. Neither juror measured the lines slice 1 adds (cost estimates 20 to 40).
2. **Whether round-1 Open Point 7 (the second approval takes the `pr` arm) is resolved.** Estate, deliverable and cost say resolved, because the domain, the bundle and the unattended refusal are named with a test. Contradiction says partly resolved, because two channels stay open: the removal of the record by hand, and the HTTP agent arm at `server/approve.ts:306`. The moderator confirmed that `stateTransitionOf` passes a removed line and that the 409 reads only `Review: in-session`. The three other jurors read the plan's channel list and checked it; only contradiction enumerated the channels the plan does not list.
3. **Whether round-1 Open Point 13 (the second receipt for tracer delivery) is resolved.** Estate, contradiction and deliverable say resolved, because the plan names one receipt per plan file. Cost says partly resolved, because the deliver workflow and bundle are single-plan end to end, and "`deliver` takes the same shape by hand" does not say whether the bundle runs `deliver` once per plan or reshapes the readings.
4. **Whether round-1 Open Point 9 (the readings reach their readers) is resolved.** Estate, contradiction and cost say resolved in the Approach and stale only in the Open Point text. Deliverable says partly resolved, because the step from plan-meta JSON into the scan's `P` and `W` rows is unnamed and two slices change one two-token parse (`plot-fleet-scan.sh:3151-3158`). Estate found the same input gap and rated it LOW; deliverable rates it MEDIUM and adds that computing `spike=1` in the scan moves the approval decision into shell.
5. **Whether `phaseGateRefusal` is a gate the spike must pass.** Cost repeats its round-1 reading: the refusal fires only when the branch slug equals the plan slug (`server/entry/gate.ts:336-345`), so "a spike must pass all five" is true of four. The other three count five. This is round-1 disagreement 2, still open, now LOW.

## Findings held by one juror

These have no second juror, so the panel cannot say whether the others missed them or judged them immaterial.

- **Contradiction only:** the person arm keys on a removable record (HIGH); a second route reaches the same state with no hand edit, when a person merges the spec commit on the plan PR head (`the-fleet-writes-the-design` line 43); the HTTP agent arm (MEDIUM); a second `plot-approve*` bundle makes the glob `plot-approve*.mjs` ungated (`rules/ci-suite.ts:284-292`, LOW); the Changelog says "whatever the plan's review channel" for every plan (LOW); the person arm overrides a `Review: ballot` tally (LOW); `draftPlacement` reads `draft` only (`rules/draft-placement.ts:45`), carried from round 1 with no Open Point (LOW).
- **Estate only:** `Slices confirmed:` duplicates `Approved:` and has no reader (MEDIUM); `skills/plot/SKILL.md:284` describes `/plot-approve` behaviour that no code has (LOW).
- **Deliverable only:** `PlanReadings` (`rules/phase.ts:113-124`) has no `tracer` reading, and slice 5 does not name its callers (LOW); Notes line 125 gives a stale reason for the tracer slice's position (LOW).
- **Cost only:** slice 5 is too large for one pass; slice 2 mixes two high-blast-radius gates with a low-blast-radius controller; skill edits need `bumps:` entries and Model Guidance rows; `spike-unmerged` leaves the adapter choice open.
- **Estate and contradiction:** `approve-spike` has no route with no board, and slice 2 does not amend `CLAUDE.md:499` or `AGENTS.md`. Cost names the `CLAUDE.md` gap too.

## Shared blind spot

All four jurors checked each of the five dispatch gates as a separate place with its own unit test, as the plan names them. None asked whether any test proves that a spike dispatches end to end: annotation, plan-meta, scan column, `sliceVerdict`, `plangate`, brief, worker commit. Round 1's main finding was that one gate was not enough. The revision answers it with five per-place tests, and five green unit tests can still leave the path broken at a seam between two of them, as deliverable's unnamed `P`/`W` producer shows. Rubric item 2 asked about "an acceptance criterion that proves nothing", and no juror applied it to the plan's central claim.

A second, smaller gap: every juror read; none executed. The two HIGH findings rest on reading `check-shell-lines.sh` and `stateTransitionOf`, which the moderator confirmed by reading, and on an estimate of the lines slice 1 adds, which nobody measured.

## What each juror looked at

- **Estate** read the plan, round-1 files, `the-fleet-writes-the-design` in full, the approach and slices of `the-phases-are-declared`, D13 to D17 and DESIGN §4, then about thirty code files by `sed` and `grep`, including `plot-state-receipt.sh`, `entry/gate.ts`, `entry/ladder.ts`, `server/deliver.ts` and `entry/ask.ts`. The controller gate hook refused its read of `plot-dispatch.sh`, so it took that citation from round 1. It executed nothing.
- **Contradiction** read the plan, its round-1 files, siblings by grep and two in part, STORY D1 to D17, DESIGN §4 and §7, `CLAUDE.md:499` and the manifesto, then traced the approval through `workflows/approve.ts`, `transitions/plan.ts`, `rules/state-transition.ts`, both board approve files, `plot-state-gate.sh` and `plot-state-receipt.sh`, channel by channel. It read `plot-dispatch.sh` with the Read tool after the hook refused a `sed`. It executed nothing.
- **Deliverable** read the plan, its round-1 files and siblings by grep, then every cited line, and followed the data from `plot-plan-meta.sh` through the scan's `P` and `W` rows and their parse into `entry/verdicts.ts` and `sliceVerdict`. It read `check-shell-lines.sh`. It executed nothing.
- **Cost** read the plan, its round-1 file and the siblings' slice lines, then the ratchet, `ci.yml`, the scan, the dispatch `case`, the deliver workflow and bundle, and the gates. It did not read the story or DESIGN in full this round. It executed nothing.

## Round-1 points not actually resolved

- **Open Point 7, the second approval takes the `pr` arm:** open on two channels (contradiction): removing the `Spike approved:` record, and the HTTP agent arm of `POST /api/approve`.
- **Open Point 9, the readings reach their readers:** the `[x]` text states the superseded design (all four), and the producer into the scan's `P` and `W` rows is unnamed (deliverable, estate).
- **Open Point 13, the second receipt:** the multi-plan delivery shape is unstated (cost only).
- **Round-1 contradiction finding 10, `draftPlacement`:** never became an Open Point (contradiction).

## What the panel decides

Nothing. Four jurors say `amend`, each with sentence-sized fixes, and the two HIGH findings (the ratchet in wave 1, the removable record) each have a named remedy. Acting on them is the plan author's decision.
