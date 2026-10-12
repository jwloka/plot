# Panel — design-work-proves-the-path

- **Subject:** `docs/plans/2026-10-12-design-work-proves-the-path.md`
- **Date:** 2026-10-12
- **Caller:** challenge-the-plan Phase 3P, run by a moderator agent for the batch of story `plot-works-in-five-phases`
- **Lenses:** estate, contradiction, deliverable, cost (four jurors, one rubric)
- **Commitment:** `Position: proceed | amend | reject`
- **Siblings:** 5 read, 0 unread (story plot-works-in-five-phases)
- **Gate:** `plot-panel.mjs check` exited 0 for all four jurors on the first run. No juror was sent back.
- **Reconcile:** `unanimous	amend	estate,contradiction,deliverable,cost`

## Positions

| Lens | Position | Main finding |
|---|---|---|
| estate | amend | A spike marker exists already: `isSpikeSlice` and `SPIKE_SLICES` (`packages/board/src/contract/schema.ts:1488-1521`) read a `### Spike` or `### Tracer` heading as a spike, and `plot-approve` step 2b plus `skills/plot/SKILL.md:282-298` define a pre-approval tracer path. The plan adds a second marker and does not reconcile the two. |
| contradiction | amend | The later approval of a `Review: pr` plan does not go through in-session. `workflows/approve.ts:227` reads the channel from the plan's `Review:` field, so with the plan PR merged at spike approval, an unattended run can approve the plan into Development (against D10). |
| deliverable | amend | Two Changelog entries promise behaviour no slice builds: spike dispatch (both phase gates refuse `design`, and no spike reading reaches `sliceVerdict`) and the automatic-delivery skip (the pulse `PlanSchema`, `entities/fleet.ts:695-713`, carries no `type`). |
| cost | amend | The spike slice costs about twice what it states: the domain gate, the shell gate in `plot-dispatch.sh`, the scan's verdict line (`plot-fleet-scan.sh:4561`) and the verdicts parser (`entry/verdicts.ts:63-92`) all change, and the shell line ratchet counts two scripts the plan does not price. |

## Where all four agree

- **Changing `sliceVerdict` alone does not dispatch a spike.** Every juror found `plangate` (`packages/domain/src/workflows/dispatch.ts:527-546`) refusing `design` with `state-wrong`. Three jurors also found the shell copy in `plot-dispatch.sh` (`:2957-2978`), and three found `phaseGateRefusal` (`rules/phase-gate.ts:185-192`), which refuses a commit on a spike branch whose slug equals the plan slug. Estate and contradiction add the brief route: `workflows/implement.ts:131-138` refuses `design` with `state-too-early`, and no brief means no dispatch. The sibling `the-fleet-writes-the-design` repeats the same claim (contradiction, finding 2).
- **The plan's cited lines are correct.** All four verified `rules/eligible.ts:43`, `:92`, `rules/phase.ts:147`, `transitions/plan.ts:258` and `plot-plan-meta.sh:448`. The defects are in what the plan leaves out, not in what it cites.
- **No decision D1 to D12 needs to change.** Every juror chose `amend` over `reject` for that reason.

## Disagreements

1. **Whether the `pr` arm for the second approval is a defect or a saving.** Contradiction rates it HIGH: the merged plan PR makes the second approval need no person, which breaks D10 and the *Phase Guardrails* rule that a draft is not approved unreviewed. Estate (medium) and deliverable (medium) agree that the record then names a merge that approved only the spike. Cost rates the same code path LOW and calls it "cheaper than the plan's wording", and asks the Open Point to state the `pr` arm "so that nobody builds a channel override". The two readings are opposite remedies for one fact. Cost reads only the mechanics; contradiction reads the decision the mechanics serve. D10 says approval stays a person's act, so the cost amendment, taken alone, writes the bypass into the plan. The plan must choose, and the choice is not the panel's.
2. **Whether the phase gate on a spike commit blocks.** Estate and contradiction treat `phaseGateRefusal` as one of the gates that must learn the approved spike. Deliverable and cost rate it LOW, because it fires only when the spike branch slug equals the plan slug, and suggest forbidding that name instead. The disagreement is between opening a gate and constraining the branch name.
3. **Where the spike readings come from.** Deliverable and cost say no domain plan parser exists, and that `<!-- spike -->` reaches TypeScript only through `plot-plan-meta.sh` JSON and `PlanMetaSchema`. Estate agrees (low). Contradiction does not raise it. Estate further says a spike reader exists already in the board contract (`isSpikeSlice`), so the question is not only which parser reads the marker, but which of two markers wins.

## Findings held by one juror

These have no second juror, so the panel cannot say whether the others missed them or judged them immaterial.

- **Estate only:** the existing `isSpikeSlice` marker and the `### Tracer` pre-approval path (finding 1, 2). No other juror searched the board contract for `spike`. This is the plan's Notes line being wrong (*"`spike` returned no marker"*), and three jurors read that line and accepted it.
- **Estate only:** no gate guards the `Spike approved:` write. The state gate covers `State:` only (`rules/state-transition.ts:18-29`), so a hand edit or a `sed` can open dispatch.
- **Contradiction only:** Manifesto Principle 2 (`skills/plot/MANIFESTO.md:21-23`) says implementation references an approved plan, and the plan does not amend it. The bundle `plot-approve-spike.mjs` is absent from the controller gate's `GATED` list (`rules/ci-suite.ts:233-240`). The `spike-unmerged` check decides a phase flip and must read the host's `mergedAt`. The slice rewrite in the person's checkout does not reach the approval's booking worktree (`workflows/approve.ts:326-331`).
- **Deliverable only:** no slice builds the `proven` badge or the *spike not approved* and *spike approved* card states. Whether automatic delivery of a dependent carries the tracer plan is unstated, so D5's "released with the first dependent" can fail on the default path.
- **Cost only:** the spike must be the first slice, or the `sliceVerdicts` fold (`rules/eligible.ts:110-130`) reads it `blocked` forever.
- **Cost and deliverable:** `### The spike and the tracer` holds two branches, against the estate's Slice definition (one branch).
- **Estate and cost:** `proven` needs both `PlanStatusSchema` copies and falls out of the sprint counters in `fleet.ts:6387` and `:6465`.
- **Contradiction, deliverable and cost:** delivering a tracer plan "in the same step" as its dependent needs a second state receipt.

## Shared blind spot

All four jurors read the plan's mechanism: markers, gates, records, readers. None asked what the spike's landed code means for the rest of the lifecycle. D4 makes the spike real code that merges to the default branch while the plan is still in Design. No juror asked:

- what a release cut in that window does with the spike's changeset, which ships under a plan nobody approved;
- what happens when the spike shows the path is wrong and the plan is dropped or rewritten, with its code already on the default branch;
- whether `plot-reconcile-scan.sh` and the deliverable search read a merged slice of a Design plan as drift.

The rubric asked about callers and readers of new fields, and every juror answered that question well. It did not ask about the failure path of the thing being proved, and so none of them looked.

## What each juror looked at

- **Estate** read the plan, all siblings, the story and the spec in full, then grepped and read the board contract, the board rows, nine domain files, the approve entry, `fleet.ts`, `idea.ts`, `plot-plan-meta.sh`, `plot-dispatch.sh` and both templates. It is the only juror that searched the board contract for an existing spike reader. It ran no tests.
- **Contradiction** read the plan, the siblings by grep, the story in full and five spec sections, the four named CLAUDE.md sections and the manifesto, then the state gate, the phase gate, the controller gate, `ci-suite.ts` and the approve, dispatch and implement workflows end to end. It traced the channel choice through `workflows/approve.ts` line by line. The controller gate refused one of its greps, and it read the file with the Read tool instead. It ran no tests.
- **Deliverable** read the plan, the siblings, the story's decisions and Open Points and spec §3 and §4, then the rules, transitions, workflows and pulse schema, and followed the verdict readings from `plot-fleet-scan.sh` through `entry/verdicts.ts` into `sliceVerdict`. It ran no tests.
- **Cost** read the plan, the siblings' Slices and Approach, the story and spec §1 and §4, then the same domain files plus the sprint counters in `fleet.ts`, `contract/schema.ts`, the scan, the shell line ratchet and the scripts README. The controller gate refused two of its greps, and it read those files another way. It ran no tests.

No juror executed code. Every position rests on reading, and the main finding (the dispatch gates) is a code-reading result that a test in the amended slice must confirm.
