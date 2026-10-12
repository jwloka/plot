# Design work proves the path

> A plan in Design names one slice as its spike, a person approves the spike alone, and after its merge a person confirms the remaining slices and approves the plan. A tracer-bullet plan proves a path for other plans, stays in the Design column, reads `proven` when its slices merge, and ships with its first dependent.

## Status

- **State:** Draft
- **Type:** feature
- **Story:** plot-works-in-five-phases
- **Review:** pr
- **Impl:** own branches

## Changelog

- A plan in Design can name one slice as its spike with a `<!-- spike -->` annotation. A person approves the spike alone, and the spike can be dispatched while the rest of the plan waits.
- After the spike merges, a person confirms or rewrites the remaining slices and approves the plan into Development. Approval refuses a plan whose spike has not merged.
- A plan with `Type: tracer` is a tracer-bullet plan. It stays in the Design column, reads `proven` when all its slices merge, and is delivered and released with the first plan that waits on it.

<!-- Board impact: two new plan markers (`<!-- spike -->` on a branch line, `Type: tracer`), two new Status records (`Spike approved:`, `Slices confirmed:`) and a `proven` plan status. The template gains one comment line for the spike annotation. -->

## Motivation

D3, D4 and D5 in [the story](../stories/plot-works-in-five-phases/STORY-plot-works-in-five-phases.md) make Design the phase where a plan proves its path before its slices are confirmed. Measured on `main` at `75f093cb9`, 2026-10-12:

- The fleet dispatches a slice only when its plan is `approved` (`rules/eligible.ts:43`). A plan in Design has no dispatchable slice, so a spike cannot run before approval.
- `plot-plan-meta.sh:448` `norm_type` reads one of `feature`, `bug`, `docs` and `infra`, and answers `""` for any other word.
- The plan template names a `### Tracer` wave heading (`skills/plot/templates/plan.md`), which orders slices inside one plan. Nothing marks a whole plan as prerequisite work for other plans.
- The `waits:` annotation (`docs/plans/2026-09-01-a-slice-can-wait-on-another-plan.md`) holds a slice until a named branch of another plan merges. It needs no change for a tracer plan's dependents.

## Design

### Approach

The design spec is [DESIGN-phases.md](../stories/plot-works-in-five-phases/DESIGN-phases.md) §4.

**The markers.** `plot-plan-meta.sh` and the domain's plan parser read two new markers. `<!-- spike -->` on a branch line sets `waves[].branches[].spike`, in the same way `deferred:` and `waits:` are read. `Type: tracer` joins the type vocabulary in `norm_type`. A plan that names more than one spike reports the extra names in a new `extra_spikes` field, and the parser picks none of them; nothing refuses the file. The shell line ratchet (`scripts/check-shell-lines.sh`) applies: the lines this adds to `plot-plan-meta.sh` are removed elsewhere in the same slice, or the parse moves into the domain parser alone.

**Approving the spike.** A new transition `approveSpike(plan, input)` accepts a `design` plan with exactly one spike and no `Spike approved:` record, and writes `- **Spike approved:** <date>, <who>, <channel>`. `State:` does not change, so the state gate is not involved. A bundle `board/plot-approve-spike.mjs`, an endpoint `POST /api/approve-spike` and an *Approve spike* button on the card call it. `sliceVerdict` (`rules/eligible.ts:92`) answers `eligible` for the spike slice of a `design` plan with a `Spike approved:` record, and keeps every other slice of that plan undispatchable. `/plot-dispatch` and the dispatch endpoint can then dispatch the spike. Automatic dispatch keeps its `approved` filter; `the-fleet-writes-the-design` widens it.

**Confirming the slices.** `approve` (`transitions/plan.ts:258`) refuses a `design` plan whose spike has not merged, with the refusal `spike-unmerged` that names both ways forward: wait for the merge, or remove the `spike` annotation. Once the spike has merged, approval writes `- **Slices confirmed:** <date>, <who>` beside the usual `Approved:` record. The person edits the remaining slices in the same change when they rewrite them. The board card of a Design plan with a merged spike reads *spike merged, confirm the slices* and shows a *Confirm slices and approve* button that calls the approve route.

**Where the plan lives while its spike runs.** The fleet reads plans on the default branch. For a `Review: pr` plan, approving the spike merges the plan PR with `State: Design` and the `Spike approved:` record, so the fleet can read the spike. The later approval then records through the `in-session` channel on the default branch. This is the plan default, listed under Open Points.

**The tracer plan.** `phaseOfPlan` reads a `Type: tracer` plan in the phase that holds `plan:design`, in every state but `released`. `planStatus` (`rules/phase.ts:147`) answers a new value, `proven`, for an approved tracer plan whose every non-deferred slice has merged; `proven` replaces `deliverable` for a tracer plan, so the auto-bump does not move it to Testing. A dependent plan is a plan with a slice whose `waits:` names a branch of the tracer plan. Automatic delivery (`rules/auto-deliver.ts`) skips a tracer plan. `deliver` delivers a proven tracer plan in the same step as its first dependent, and the release that carries the dependent carries the tracer plan.

**Every view state is a domain property.** The spike state of a card (*spike not approved*, *spike approved*, *spike merged*), the `proven` status and the button each card shows come from `spikeOf(plan)` and `planStatus`, with unit tests. The board renders them.

### Open Points

- [ ] Where a `Review: pr` plan lives while its spike runs (story Open Point 4). Plan default above.
- [ ] Delivering a tracer plan with its first dependent, and skipping it in automatic delivery (story Open Point 5).
- [ ] `Type: tracer` replaces the plan's `feature`, `bug`, `docs` or `infra` type (story Open Point 6).

## Slices

### The markers

- `feature/a-slice-is-marked-spike` <!-- waits: feature/the-phases-are-a-declaration --> — `plot-plan-meta.sh` and the domain plan parser read `<!-- spike -->` and `Type: tracer`; `extra_spikes`; `spikeOf(plan)`; the contract tests and the template comment <!-- builds: the spike annotation, extra_spikes, the tracer type and spikeOf -->

### The spike and the tracer

- `feature/the-spike-is-approved-alone` — `approveSpike`; `board/plot-approve-spike.mjs`; `POST /api/approve-spike`; the *Approve spike* button; `sliceVerdict` makes an approved spike of a Design plan eligible and nothing else of that plan <!-- builds: approveSpike, its controller, and spike eligibility in sliceVerdict -->
- `feature/a-tracer-plan-stays-in-design` — `phaseOfPlan` holds a tracer plan in the phase of `plan:design`; `planStatus` answers `proven`; automatic delivery skips a tracer plan; `deliver` carries a proven tracer plan with its first dependent <!-- builds: the proven plan status and tracer delivery with its first dependent -->

### Confirming the slices

- `feature/the-slices-are-confirmed-after-the-spike` — `approve` refuses `spike-unmerged` and writes `Slices confirmed:`; the card reads *spike merged, confirm the slices* and shows *Confirm slices and approve*; `/plot-approve` and `skills/plot/SKILL.md` describe the spike path <!-- builds: the spike-unmerged refusal, the Slices confirmed record and the confirm button -->

## Notes

- 2026-10-12: drafted by an unattended `/plot-idea` batch run from jwloka's decisions of the same day. Type, Review and Impl came from the prompt.
- 2026-10-12: the first slice waits on `feature/the-phases-are-a-declaration` of `the-phases-are-declared`, because `phaseOfPlan` is where a tracer plan's phase is read.
- 2026-10-12, deliverable search (`plot-deliverable-search.sh`): `spike` returned no marker, only prose in `entities/workflow.ts:20`, `plot-plan-meta.sh:94` and measurement comments in `auto-dispatch.ts` and `plot-host.sh`. `tracer plan` returned the `### Tracer` wave heading read at `plot-plan-meta.sh:1054`, which this plan keeps; it orders slices inside a plan and does not mark a plan. `approveSpike` and `confirmSlices` returned no artifact. `proven` returned the `proven` mode of `board/plot-merge-subject.mjs` (`packages/board/src/server/entry/merge-subject.ts:16`) and `registryd-main.ts:600`, where a branch is *proven* merged by a merge subject. The plan status `proven` is a different word for a different subject; the brief names both so a reader does not join them.
