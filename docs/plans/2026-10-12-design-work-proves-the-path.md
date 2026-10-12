# Design work proves the path

> A plan in Design names one slice as its spike, a person approves the spike alone, and after its merge a person confirms the remaining slices and approves the plan. A tracer-bullet plan proves a path for other plans, stays in the Design column, reads `proven` when its slices merge, and ships with its first dependent.

## Status

- **State:** Draft
- **Type:** feature
- **Story:** plot-works-in-five-phases
- **Review:** pr
- **Impl:** own branches
- **Rounds:** 1

## Changelog

- A plan in Design can name one slice as its spike with a `<!-- spike -->` annotation on its branch line. A person approves the spike alone, and the spike can be dispatched while the rest of the plan waits.
- After the spike merges, a person confirms or rewrites the remaining slices and approves the plan into Development. Approval refuses a plan whose spike has not merged, and it always needs a named person, whatever the plan's review channel.
- A plan with a `Tracer: yes` line in its `## Status` block is a tracer-bullet plan, and its `Type:` keeps `feature`, `bug`, `docs` or `infra`. It stays in the Design column, reads `proven` when all its slices merge, and is delivered and released with the first plan that waits on it. A person may deliver a tracer plan with no dependent alone; it stays in the Design column until it is released.
- A release cut while a plan is in Design ships its merged spike's changeset, and the release cross-check lists it as a spike of a Design plan.

<!-- Board impact: two new plan markers (`<!-- spike -->` on a branch line, `Tracer: yes`), two new Status records (`Spike approved:`, `Slices confirmed:`), a `proven` plan status, a `tracer` field on the pulse plan, a spike column in the scan's verdict readings, three spike card states and two card buttons. Both plan templates gain one comment line for the spike annotation. -->

## Motivation

D3, D4 and D5 in [the story](../stories/plot-works-in-five-phases/STORY-plot-works-in-five-phases.md) make Design the phase where a plan proves its path before its slices are confirmed. Measured on this branch at `6954a7ed1`, 2026-10-12:

- Five places refuse a slice of a plan that is not `approved`, and a spike must pass all five. `sliceVerdict` answers `unapproved` (`packages/domain/src/rules/eligible.ts:43`, `:92-108`). The dispatch workflow's `plangate` refuses `design` with `state-wrong` (`workflows/dispatch.ts:527-546`). The shell copy in `plot-dispatch.sh:2957-2978` refuses it in its `*)` arm. The brief route refuses it with `state-too-early` (`workflows/implement.ts:131-138`), and dispatch refuses a branch with no brief (`dispatch.ts:470`). The commit-time `phaseGateRefusal` refuses an implementation commit while the plan is `design` (`rules/phase-gate.ts:185-192`).
- The approval workflow takes its channel from the plan's `Review:` field (`workflows/approve.ts:227`). For a `Review: pr` plan whose plan PR has merged, it skips the merge (`:252`), names no reviewer and records `plan-PR #N merged` (`:270-274`). The unattended refusal in the bundle applies only to `Review: in-session` (`packages/board/src/server/entry/approve.ts:480`, `:527`).
- A spike reading exists on the board already. `isSpikeSlice` (`packages/board/src/contract/schema.ts:1488-1521`) reads a slice named `Spike` or `Tracer` as a spike for the amber badge. `/plot-approve` step 2b (`skills/plot-approve/SKILL.md:138-157`) and `skills/plot/SKILL.md:282-298` describe a `### Tracer` slice that runs on the `idea/<slug>` branch before a Draft plan is approved. Neither makes a slice dispatchable.
- `plot-plan-meta.sh:448` `norm_type` reads one of `feature`, `bug`, `docs` and `infra`, and answers `""` for any other word. No TypeScript parser reads a plan's branch annotations: `deferred:` and `waits:` reach TypeScript only as `plot-plan-meta.sh` JSON, through `PlanMetaSchema` (`packages/board/src/contract/schema.ts:63`).
- The scan hands `sliceVerdict` a three-column line, `outstanding<TAB>phase<TAB>states` (`plot-fleet-scan.sh:4561`), parsed by `slicesFrom` (`packages/board/src/server/entry/verdicts.ts:63-92`). The pulse `PlanSchema` (`packages/domain/src/entities/fleet.ts:695-713`) carries `file`, `phase` and `slices`, and no `type`.
- The state gate reads the `State:` line only (`rules/state-transition.ts:18-29`). The controller gate classifies five script names (`GATED`, `rules/ci-suite.ts:233-239`), and `ControllerAction` names four actions (`rules/controller-gate.ts:11`).
- The `waits:` annotation (`docs/plans/2026-09-01-a-slice-can-wait-on-another-plan.md`) holds a slice until a named branch of another plan merges. It needs no change for a tracer plan's dependents.

## Design

### Approach

The design spec is [DESIGN-phases.md](../stories/plot-works-in-five-phases/DESIGN-phases.md) §4.

**The marker.** `<!-- spike -->` on a branch line is the one marker that lets a slice run before its plan is approved. `plot-plan-meta.sh` reads it in both slice dialects (list items and `### Name (Branch: …)` headings, `plot-plan-meta.sh:391-392`) and reports `slices[].branches[].spike`, in the same way it reads `deferred:` and `waits:`. It also reports `spike_approved_raw`, `slices_confirmed_raw`, `extra_spikes`, the spike names after the first, and `tracer`, true when the `## Status` block holds `Tracer: yes` (D15); a plan with extra spikes has no spike, and nothing refuses the file. `norm_type` (`plot-plan-meta.sh:448`) does not change, because the type word stays. `PlanMetaSchema` gains the five fields. The domain rule `spikeOf(slices)` takes the parsed slices as a value and answers the spike branch and its slice index, or none.

**The existing spike reading stays a display rule.** `isSpikeSlice` answers *what kind of outcome does this slice have*, from its name, for the badge. `spikeOf` answers *which branch may run before approval*, from the annotation, for the gates. The board's spike badge shows when either answers yes. A slice named `Spike` or `Tracer` with no annotation keeps the badge and opens no gate. The `### Tracer` heading keeps its current meaning for a Draft plan, and `/plot-approve` step 2b keeps it. For a plan in Design, step 2b reads the spike annotation instead, and `skills/plot/SKILL.md` *tracer-bullets* names both paths and which phase each serves.

**Where the spike sits.** The spike branch is the only branch under the first slice heading. `approveSpike` refuses `spike-not-first` otherwise. The fold in `sliceVerdicts` (`rules/eligible.ts:110-130`) then needs no exemption: the spike slice reads `complete` once it merges (`:96`), and every later slice reads `unapproved` until the plan is approved.

**Approving the spike.** A new transition `approveSpike(plan, input)` accepts a `design` plan with exactly one spike, in first position, and no `Spike approved:` record. It needs `--who` from `People` on every review channel, because D4 makes the spike approval a person's act. It writes `- **Spike approved:** <date>, <who>, <channel>`. A workflow of the same name holds the host writes: for a `Review: pr` plan with an open plan PR it writes `pr-ready` and a `pr-merge` pinned with `--match-head` to the head SHA the person reviewed, as the approve bundle does (`entry/approve.ts:586`). It then writes the record as a booking commit on the default branch, as `approve` does (`workflows/approve.ts:304-311`), and clears the spike branch's `.plot/hold` entry. The bundle `board/plot-approve-spike.mjs` refuses under `PLOT_UNATTENDED=1`. The endpoint `POST /api/approve-spike` and an *Approve spike* card button call it.

**Gating the spike approval.** The `Spike approved:` record opens dispatch, so a hand edit must not write it. The state gate extends from the `State:` line to this record: `rules/state-transition.ts` gains `spikeApprovalOf(text)`, and `plot-state-gate.sh` refuses a commit that adds the record without the receipt that `plot-approve-spike.mjs` leaves through `record_state_receipt`. The controller gate learns the bundle: `ControllerAction` gains `approve-spike`, `GATED` gains `plot-approve-spike.mjs`, and `POST /api/approve-spike` leaves the controller receipt. Manifesto Principle 2 (`skills/plot/MANIFESTO.md:21-23`) gains one sentence: a recorded spike approval licenses implementation of its one branch.

**Dispatching the spike.** Each of the five places above admits the spike branch of a `design` plan with a `Spike approved:` record, and nothing else of that plan:

- `sliceVerdict` reads a fourth column of the scan's verdict line, `spike`, which is `1` for the slice that holds an approved spike of a `design` plan. `slicesFrom` parses it. The column is a reading; the decision stays in the rule.
- `plangate` passes such a plan, and the dispatch workflow refuses `spike-only` for any other branch of it.
- `plot-dispatch.sh` stops deciding the phase. Its `case` at `:2957-2978` (22 lines) is replaced by a call to the domain's `plangate` through a bundle, as *A Shell Script Asks The Domain* asks of a script that runs once per operator command. This removes the duplicate that `eligible.ts:36-42` declares.
- `implement` admits the spike branch of such a plan and writes its brief. A non-spike branch still refuses `state-too-early`.
- `phaseGateRefusal` takes the spike branch and the record as readings and passes a commit on the spike branch.

One test per place proves it with a spike branch and a non-spike branch of one Design plan. Automatic dispatch keeps its `approved` filter; `the-fleet-writes-the-design` widens it.

**Confirming the slices.** `approve` (`transitions/plan.ts:258`) refuses a `design` plan whose spike has not merged, with the refusal `spike-unmerged` that names both ways forward: wait for the merge, or remove the `spike` annotation. The phase flip is a destructive decision, so the reading is the host's `mergedAt` for the spike branch's PR (`plot-pr-merged.sh`, or the host port's PR state), passed as a precondition; a merge subject and ancestry are not read. Once the spike has merged, approval writes `- **Slices confirmed:** <date>, <who>` beside the usual `Approved:` record.

**The second approval is a person's act (D10).** A `design` plan with a `Spike approved:` record approves through the person arm whatever its `Review:` field says. `workflows/approve.ts` and `transitions/plan.ts` take that arm: `--who` must name a handle in `People`, the record names channel `in-session`, and no merged plan PR stands in for the reviewer. The bundle's `inSession` reading (`entry/approve.ts:480`) includes this case, so the unattended refusal at `:527` applies. `/plot-approve`'s unattended instruction for `Review: pr` (`skills/plot-approve/SKILL.md:122-124`) names the exception.

**The slice rewrite reaches the approval.** The approval commits in a booking worktree cut from `origin/<main>` and stages only the plan file, `.plot/hold` and the sprint file (`workflows/approve.ts:328-333`). The person's rewrite of the remaining slices therefore lands on the default branch before the approval, through any route the repository allows for a plan-only change; the phase gate passes a plan-only commit (`phase-gate.ts:187`). The approval refuses `slices-unpushed` when the plan file in the person's checkout differs from the copy on `origin/<main>`.

**Where the plan lives while its spike runs.** The fleet reads plans on the default branch. For a `Review: pr` plan, approving the spike merges the plan PR with `State: Design` and the `Spike approved:` record, so the fleet can read the spike, and a person records the later approval in-session (D13).

**What the spike leaves on the default branch.** The spike is real code that lands while the plan is in Design (D4). The reconcile scan does not read it as drift: *Merged-but-not-delivered* reads `approved` plans only (`plot-reconcile-scan.sh:1135`), and the symlink check has no `design` arm (`:1035`). A test keeps that true. A rewrite of the remaining slices keeps the spike slice, which reads `complete`. The spike PR carries a changeset like any slice. A release cut in this window ships it, and `/plot-release` step 3 lists a changeset whose plan is in Design with a merged spike as a spike of a Design plan, not as an entry with no delivered plan (D16). When the plan is dropped after the spike merged, the spike's code stays on the default branch, and a revert is a slice of a new plan (D17); no command writes `Rejected` or `Superseded` today (`rules/state-transition.ts:102-103`), and this plan adds none.

**The tracer plan.** `phaseOfPlan` reads a plan with `Tracer: yes` in the phase that holds `plan:design`, in every state but `released`. `planStatus` (`rules/phase.ts:147`) answers a new value, `proven`, for an approved tracer plan whose every non-deferred slice has merged. `proven` replaces `deliverable` for a tracer plan, so the auto-bump does not move it to Testing. Both `PlanStatusSchema` copies gain the word (`rules/phase.ts:25-27`, `contract/schema.ts:394`), and the sprint counters count it as WIP, as they count `deliverable` (`packages/board/src/server/fleet.ts:6396`, `:6472`).

**`proven` names a plan, not a branch.** The merge-subject mode `plot-merge-subject.mjs proven` (`entry/merge-subject.ts:16`) and `packages/fleet/src/server/entry/registryd-main.ts:600` call a *branch* proven when a merge subject shows it landed. The plan status `proven` is a value of `PlanStatus` and says that every slice of a tracer plan merged. The two never meet in one reader: the first is a branch reading inside the scan, the second a plan status on the card. The brief of each slice that touches either names both.

**Delivering a tracer plan.** A dependent plan is a plan with a slice whose `waits:` names a branch of the tracer plan. The pulse `PlanSchema` gains `tracer`, which the scan prints as a fifth column of its `P` line from plan-meta's `tracer` field; the line holds `file`, `phase` and `type` today (`plot-fleet-scan.sh:3110`). `planAutoDeliver` (`rules/auto-deliver.ts:274-300`) skips a tracer plan on its own. When it delivers a dependent, it carries every `proven` tracer plan the dependent waits on, because D5 releases a tracer plan with the first dependent that ships. `deliver` takes the same shape by hand. The deliver workflow writes each tracer plan's `State: Delivered` and moves its index symlink, and the bundle records one state receipt per plan file, so the state gate clears both writes. Delivery reads each tracer slice's merge from the host's `mergedAt`, as it does for the dependent. A person may deliver a proven tracer plan with no dependent alone through `/plot-deliver` (D14); automatic delivery never delivers one alone, and `phaseOfPlan` keeps it in the Design column until it is released.

**Every view state is a domain property.** The spike state of a card (*spike not approved*, *spike approved*, *spike merged, confirm the slices*), the `proven` status and the button each card shows come from `spikeOf`, the two records and `planStatus`, with unit tests. The board renders them, and one browser test proves each badge shows.

**The shell line ratchet.** `scripts/check-shell-lines.sh` counts three scripts here: `plot-plan-meta.sh` (the annotation, two records, the `Tracer:` line), `plot-fleet-scan.sh` (the verdict column, the pulse `tracer` column) and `plot-dispatch.sh`. The 22 lines of the dispatch `case` leave in `feature/the-spike-can-be-dispatched`. Each slice states its net line count in its PR, and the gate refuses a slice that adds more than it removes.

### Open Points

- [x] Where a `Review: pr` plan lives while its spike runs (story Open Point 4). — resolved by D13: approving the spike merges the plan PR with `State: Design` and the record, and a person records the later approval in-session.
- [x] A tracer plan that no dependent ever delivers (story Open Point 5, remaining half). — resolved by D14: a person may deliver a proven tracer plan alone, and `phaseOfPlan` keeps it in the Design column until it is released.
- [x] How a tracer plan is marked (story Open Point 6). — resolved by D15: a separate `Tracer: yes` line, and `Type:` keeps its word, so `idea.ts:519-521`, `workflows/release.ts:257`, `ports/plan-store.ts:28` and `/plot-release` step 2 do not change.
- [x] The spike's changeset when a release is cut while its plan is in Design (panel round 1, moderator blind spot). — resolved by D16: the spike PR carries a changeset, and `/plot-release` step 3 lists it as a spike of a Design plan.
- [x] The spike's code when the plan is dropped after the spike merged (panel round 1, moderator blind spot). — resolved by D17: the code stays, and a revert is a slice of a new plan.
- [x] Panel round 1, all lenses: changing `sliceVerdict` alone does not dispatch a spike. Resolved: *Dispatching the spike* names all five places, and `feature/the-spike-can-be-dispatched` changes each with one spike and one non-spike test. The same claim in `the-fleet-writes-the-design` is a cross-plan change.
- [x] Panel round 1, contradiction (HIGH): the second approval of a `Review: pr` plan takes the `pr` arm after the plan PR merged (`workflows/approve.ts:227`). Resolved by D3 and D10: *The second approval is a person's act* routes a Design plan with a `Spike approved:` record through the person arm and the unattended refusal, with tests. The cost lens's reading, that the `pr` arm is a saving, is rejected by D10.
- [x] Panel round 1, estate (HIGH): a spike marker exists already. Resolved: *The existing spike reading stays a display rule* keeps `isSpikeSlice` for the badge, makes the annotation the one gate marker, keeps step 2b and the `### Tracer` comment for Draft plans, and the Notes line is corrected.
- [x] Panel round 1, deliverable and cost: the spike readings and the plan type do not reach their readers. Resolved: `PlanMetaSchema` gains four fields, the scan's verdict line gains a `spike` column, the pulse `PlanSchema` gains `type`, and *The shell line ratchet* prices three scripts.
- [x] Panel round 1, estate: no gate guards the `Spike approved:` write. Resolved: *Gating the spike approval* extends the state gate to the record, with a receipt from the bundle.
- [x] Panel round 1, contradiction: Manifesto P2, the `GATED` list, the `approveSpike` workflow, the `mergedAt` reading and the slice-rewrite route. Resolved: P2 gains one sentence; `GATED` and `ControllerAction` gain the bundle; `approveSpike` is a workflow with a pinned merge and a booking commit; `spike-unmerged` reads `mergedAt`; the rewrite lands on the default branch first, and `slices-unpushed` refuses otherwise.
- [x] Panel round 1, cost: the spike must be the first slice, and one heading held two branches. Resolved: *Where the spike sits* requires the spike alone under the first heading, refused as `spike-not-first`; every slice heading now holds one branch.
- [x] Panel round 1, estate, deliverable and cost: `proven` readers, the card states and the second receipt. Resolved: both schema copies, both sprint counters (WIP), the three card states and the badge are in the slices; the deliver workflow records one receipt per plan file; automatic delivery of a dependent carries its proven tracer plans (D5).
- [x] Panel round 1, moderator blind spot, reconcile half: the reconcile scan does not read a merged spike of a Design plan as drift (`plot-reconcile-scan.sh:1035`, `:1135`), and `feature/the-spike-can-be-dispatched` adds a test that keeps it so. The release half is decided by D16 and the drop half by D17.
- [x] Panel round 1, estate: `proven` collides with the merge-subject meaning. Resolved: D5 names the status `proven`, so the word stays, and *`proven` names a plan, not a branch* defines the difference.

## Slices

### The markers

- `feature/a-slice-is-marked-spike` — `plot-plan-meta.sh` reads the spike annotation in both slice dialects, `spike_approved_raw`, `slices_confirmed_raw`, `extra_spikes` and the `Tracer: yes` line; `PlanMetaSchema` gains the five fields; `spikeOf(slices)` in the domain with unit tests; the board's spike badge reads `isSpikeSlice` or the annotation; the comment line in `skills/plot/templates/plan.md` and `.plot/templates/plan.md`; the net shell line count <!-- builds: the spike annotation, extra_spikes, the Tracer line and spikeOf -->

### Approving the spike

- `feature/the-spike-is-approved-alone` <!-- waits: feature/a-draft-can-need-design --> — the `approveSpike` transition and workflow with the pinned plan-PR merge, the booking commit and the hold clear; `spike-not-first`; `--who` from `People` and the unattended refusal; `board/plot-approve-spike.mjs`; `POST /api/approve-spike`; the *Approve spike* button; `spikeApprovalOf` and the receipt in the state gate; `approve-spike` in `ControllerAction` and `GATED`; the Manifesto P2 sentence <!-- builds: approveSpike, its controller, and the gate on the Spike approved record -->

### Dispatching the spike

- `feature/the-spike-can-be-dispatched` — the `spike` column in `plot-fleet-scan.sh:4561` and `slicesFrom`; `sliceVerdict`; `plangate` and `spike-only`; `plot-dispatch.sh` asks the domain's `plangate` in place of its `case`; `implement` writes the spike's brief; `phaseGateRefusal`; one test per place with a spike and a non-spike branch of one Design plan; a reconcile test that a merged spike of a Design plan is no drift <!-- builds: spike eligibility in sliceVerdict and the four dispatch gates -->

### Confirming the slices

- `feature/the-slices-are-confirmed-after-the-spike` — `approve` refuses `spike-unmerged` from the host's `mergedAt` and `slices-unpushed`, and writes `Slices confirmed:`; the person arm for a Design plan with a `Spike approved:` record in `transitions/plan.ts`, `workflows/approve.ts` and the bundle's unattended refusal, with a test that a `Review: pr` plan with a merged plan PR and a merged spike refuses with no `--who`; the three spike card states and *Confirm slices and approve*; `/plot-approve` step 2b and its unattended instruction; `/plot-release` step 3 lists a merged spike's changeset as a spike of a Design plan (D16); `skills/plot/SKILL.md` *tracer-bullets* <!-- builds: the spike-unmerged refusal, the Slices confirmed record, the person-only second approval and the spike card states -->

### The tracer plan

- `feature/a-tracer-plan-stays-in-design` <!-- waits: feature/the-phases-are-a-declaration, feature/the-board-draws-the-declared-phases --> — `phaseOfPlan` holds a tracer plan in the phase of `plan:design`; `planStatus` answers `proven`; both `PlanStatusSchema` copies; both sprint counters; the `proven` badge and the card's Deliver control; the scan's `tracer` column and `tracer` on the pulse `PlanSchema`; `planAutoDeliver` skips a tracer plan and carries it with its first dependent; `/plot-deliver` delivers a proven tracer plan with no dependent when a person runs it (D14); `deliver` writes both plans with one state receipt each <!-- builds: the proven plan status and tracer delivery with its first dependent -->

## Notes

- 2026-10-12: drafted by an unattended `/plot-idea` batch run from jwloka's decisions of the same day. Type, Review and Impl came from the prompt.
- 2026-10-12, deliverable search (`plot-deliverable-search.sh`): `spike` returned prose only, in `entities/workflow.ts:20`, `plot-plan-meta.sh:94` and measurement comments in `auto-dispatch.ts` and `plot-host.sh`. The search missed `isSpikeSlice` and `SPIKE_SLICES` in `packages/board/src/contract/schema.ts:1488-1521`, which read a slice named `Spike` or `Tracer` as a spike for the board's badge; the estate juror found them. `tracer plan` returned the `### Tracer` wave heading read at `plot-plan-meta.sh:1054`, which this plan keeps. `approveSpike` and `confirmSlices` returned no artifact. `proven` returned the merge-subject mode at `packages/board/src/server/entry/merge-subject.ts:16` and `packages/fleet/src/server/entry/registryd-main.ts:600`.
- 2026-10-12, panel round 1 revision: the waits moved. The markers slice waits on nothing, because it reads no phase. The tracer slice waits on `feature/the-phases-are-a-declaration` for `phaseOfPlan` and on `feature/the-board-draws-the-declared-phases`, which rewrites the auto-bump at `board.ts:2082-2117`. The spike approval waits on `feature/a-draft-can-need-design`, which edits `transitions/plan.ts` and the state gate's `owningCommand`. The tracer slice sits last so that `the-fleet-writes-the-design`, which waits on `feature/the-slices-are-confirmed-after-the-spike`, does not wait on it.
- 2026-10-12, panel round 1 revision, cross-plan changes this plan does not make:
  - `the-fleet-writes-the-design`: its Motivation (line 27) says this plan makes an approved spike eligible for `/plot-dispatch` through `sliceVerdict`. Five places gate it; the sentence names `feature/the-spike-can-be-dispatched` instead. Its wait on `feature/the-slices-are-confirmed-after-the-spike` can move to `feature/the-spike-can-be-dispatched`, which builds everything `designWork` reads.
  - `DESIGN-phases.md` §4 *The spike*: the spike sits alone under the first slice heading, the second approval is a person's act on every review channel, and *The tracer bullet* names the second state receipt and the automatic carry with a dependent.
  - Story Open Points 4, 5 and 6 point here for their remaining halves, and two new story Open Points cover the spike's changeset and the dropped plan.
- 2026-10-12, decisions D13 to D17: the five operator decisions above are resolved. The cross-plan changes in the previous note are applied in `the-fleet-writes-the-design`, `DESIGN-phases.md` §4 and the story's Open Points.
