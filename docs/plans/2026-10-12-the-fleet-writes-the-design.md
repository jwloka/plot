# The fleet writes the design

> For a plan in `State: Design` whose spec is empty, the fleet commissions an agent to write the spec, and after a person approves a plan's spike, automatic dispatch starts it. Approval stays a person's act.

## Status

- **State:** Draft
- **Type:** feature
- **Story:** plot-works-in-five-phases
- **Review:** pr
- **Impl:** own branches

## Changelog

- The fleet writes the design spec of a plan in Design whose `## Spec` section is empty. The agent proposes the spec on a branch, and a person merges it.
- With auto-dispatch on, the fleet dispatches a plan's spike as soon as a person approves it.
- The board's *Commission design* button is removed. *Needs design* moves a Draft plan to Design, and the fleet writes the spec.

<!-- Board impact: the Commission design button and /api/commission are removed; a spec run shows as a Delivery tab row. No change to the plan format, the template or the docs/plans layout. -->

## Motivation

D10 in [the story](../stories/plot-works-in-five-phases/STORY-plot-works-in-five-phases.md) gives the fleet the mechanical part of design work. Measured on `main` at `75f093cb9`, 2026-10-12:

- *Commission design* is a board route (`packages/board/src/server/commission.ts`). A person clicks it on a Draft plan, and an agent started with the `Idea command` moves the plan to Design and adds a `## Spec` section with the placeholder `_To be filled in during Design._`. Its prompt tells the agent not to write the spec (`commission.ts:136-177`).
- `the-phases-are-declared` gives the move to Design to a person, through `/plot-idea` and *Needs design*. After it, *Commission design* is left with half its job.
- Automatic dispatch reads `approved` plans only (`packages/domain/src/rules/auto-dispatch.ts:531`, `:582`, `:617`). Five places refuse a slice of a plan that is not `approved`: `sliceVerdict` and the scan's verdict column (`rules/eligible.ts:43`), the dispatch workflow's `plangate` (`workflows/dispatch.ts:527-546`), the shell copy in `plot-dispatch.sh:2957-2978`, the brief route (`workflows/implement.ts:131-138`) and the commit-time `phaseGateRefusal` (`rules/phase-gate.ts:185-192`). `design-work-proves-the-path` deletes the shell copy in `feature/a-slice-is-marked-spike`, after which `plot-dispatch.sh` asks `plangate`. Its branch `feature/the-spike-can-be-dispatched` then admits an approved spike of a Design plan at the four places in TypeScript, and leaves automatic dispatch unchanged.

## Design

### Approach

The design spec is [DESIGN-phases.md](../stories/plot-works-in-five-phases/DESIGN-phases.md) §6, *In Design*.

**What the fleet reads.** A new rule `designWork(plan)` answers `write-spec`, `dispatch-spike` or `none` from the plan's state, its markers and its records only. It never reads a phase name (D12). `specIsEmpty(planText)` is true when the `## Spec` section is absent or holds only the placeholder. A section that holds only a link to a `DESIGN-*.md` file counts as written.

| Plan | `designWork` |
|---|---|
| `State: Design`, spec empty, no spec run recorded | `write-spec` |
| `State: Design`, `Spike approved:` record, spike not merged and not claimed | `dispatch-spike` |
| anything else | `none` |

**Writing the spec.** `plot-fleetd` starts a spec agent for a `write-spec` plan, through the layering rule: the fleet's controller asks `designWork`, and an adapter starts the process. The agent runs the `Idea command`, as *Commission design* does today (`packages/fleet/src/shared/implement-run.ts:29`). The prompt is *Commission design*'s prompt turned around: read the plan and its story, write the spec into `## Spec`, change no `State:` line, approve nothing, write nothing to a tracker. The agent commits the spec onto the plan PR's head branch when one is open, and otherwise onto a new branch `idea/<slug>-spec` with a draft PR. A person merges it. The fleet records one spec run per plan in its state, so a failed or unmerged run is not started again; a failed run shows in the Delivery tab's *Waiting on you* with its log. One spec run is one worker process. `Parallel agents` counts processes (`packages/fleet/src/server/entry/registryd-main.ts:980`), so a run counts as 1, and the fleet starts one only when the cap has a free slot, so a run never displaces a slice agent.

**Dispatching the spike.** `planAutoDispatch` and `startableBranches` accept a `design` plan for its spike slice when `designWork` answers `dispatch-spike`. Every other slice of a Design plan stays out of automatic dispatch.

**The board.** The *Commission design* button, `CommissionDesignButton.tsx` and `POST /api/commission` are removed. A spec run renders as a Delivery tab row in *Working*, and a failed one in *Waiting on you*.

**The controller prose.** `CLAUDE.md:499` names `commission` twice: in the list of controller endpoints and in the routes that are still HTTP only. The slice removes both names, and `./scripts/check-agents-md.sh --write` regenerates `AGENTS.md`. After `feature/a-draft-can-need-design` of `the-phases-are-declared` the endpoint list carries no count word, so the removal changes one name; if this slice lands first, it also changes the count from nine to eight.

**What stays human.** The fleet moves no plan into Design, approves no spike, merges no spec and approves no plan (D3, D10).

### Open Points

- [ ] Where the spec commit goes. Plan default above (story Open Point 9).
- [ ] The command a spec agent runs. Plan default: `Idea command`; a `Design command` key is the alternative (story Open Point 10).
- [ ] The board keeps no manual trigger for a spec run. Plan default: the *Commission design* button is removed, because *Needs design* and the fleet cover its two halves (story Open Point 13).

## Slices

### What the fleet reads

- `feature/the-fleet-reads-design-work` <!-- waits: feature/the-spike-can-be-dispatched --> — `specIsEmpty` and `designWork` with unit tests over the table above <!-- builds: specIsEmpty and designWork -->

### The fleet acts

- `feature/the-fleet-commissions-the-spec` — `plot-fleetd` starts a spec agent for a `write-spec` plan; the spec prompt; one run per plan in the fleet's state; the spec PR; the Delivery tab rows; *Commission design* and `/api/commission` are removed; `commission` leaves both lists at `CLAUDE.md:499`, and `AGENTS.md` follows <!-- builds: the fleet's spec agent and its one-run record -->
- `feature/the-fleet-dispatches-an-approved-spike` — `planAutoDispatch` and `startableBranches` accept the spike slice of a Design plan when `designWork` answers `dispatch-spike` <!-- builds: automatic dispatch of an approved spike -->

## Notes

- 2026-10-12: drafted by an unattended `/plot-idea` batch run from jwloka's decisions of the same day. Type, Review and Impl came from the prompt.
- 2026-10-12: the first slice waits on `feature/the-spike-can-be-dispatched`, the third wave of `design-work-proves-the-path`. That wave opens only after the markers wave (`spikeOf`, `spike_approved_raw`) and the spike approval wave (`approveSpike`, the `Spike approved:` record) have merged, and it builds the spike's eligibility at all five dispatch gates. `designWork` reads nothing that `feature/the-slices-are-confirmed-after-the-spike` builds: it needs no `Slices confirmed:` record and no second approval. The wait moved from that branch on 2026-10-12.
- 2026-10-12, deliverable search (`plot-deliverable-search.sh`): `specIsEmpty` returned no artifact, only reconcile scan headings that share the word *is*. `commission` returned `commission.ts` and `CommissionDesignButton.tsx` on the board, `agent-log.ts:319` (the `commission` log kind, which the spec agent reuses) and `implement-run.ts:29` in the fleet, and a comment in `rules/auto-dispatch.ts:671`. This plan replaces the board route with a fleet action and keeps the log kind.
- 2026-10-12, cross-plan alignment after the spike-first revisions: `feature/the-spike-can-be-dispatched` is now the fourth slice of `design-work-proves-the-path`, after its spike `feature/the-design-approvals-are-gated`, the markers slice and the spike approval slice, so the first slice's wait on it opens only after all four have merged. The wait keeps its branch name. `plot-dispatch.sh` asks `plangate` from `feature/a-slice-is-marked-spike` on, so the spike is admitted at four places in TypeScript. This plan names no spike, so D29 holds none of its branches.
