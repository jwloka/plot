# Deliverable lens — design-work-proves-the-path

Juror: deliverable lens. Subject: `docs/plans/2026-10-12-design-work-proves-the-path.md`.

Position: amend

The Motivation's code claims are true. Two of the three Changelog entries promise behaviour that no slice builds as written: the dispatch of a spike, and the automatic-delivery skip for a tracer plan. In both cases the plan names the domain rule but not the two other places that refuse the same thing, and not the pulse fields that carry the reading. A worker that builds the slices exactly as named ships a `sliceVerdict` that answers `eligible`, while both dispatch gates still refuse the plan. Amendments to the slice text fix this. No decision has to change.

## Findings

1. **Motivation claims verified (no severity).** `rules/eligible.ts:43` sets `DISPATCHABLE_PHASE = 'approved'`, and `sliceVerdict` is at `:92`, as the plan cites. `plot-plan-meta.sh:448` `norm_type` accepts only `feature|bug|docs|infra` (`:454`) and returns `""` otherwise. `skills/plot/templates/plan.md:42-55` holds the `### Tracer` wave comment. `transitions/plan.ts:258` is `approve`, and it already admits `design` (`:261`). `rules/phase.ts:147` is `planStatus`. `plot-plan-meta.sh:246` reads `design_raw`. The Notes' `plot-plan-meta.sh:94` and `:1054` citations also match.

2. **HIGH — a spike cannot be dispatched: two phase gates refuse a Design plan, and no slice names them.** Changelog entry 1 says "the spike can be dispatched". The Approach says "`/plot-dispatch` and the dispatch endpoint can then dispatch the spike". Slice `feature/the-spike-is-approved-alone` changes only `sliceVerdict`. Both dispatch paths gate on the plan phase independently of the verdict:
   - `skills/plot/scripts/plot-dispatch.sh:2957-2978` lets only `approved` through. Its `*)` arm refuses `design` with "is in phase 'design', not Approved" (`:2974`).
   - `packages/domain/src/workflows/dispatch.ts:527-545` lets only `approved` through. Its `default` arm refuses `design` as `state-wrong` (`:544`).
   - `eligible.ts:36-42` documents that `DISPATCHABLE_PHASE` mirrors `plot-dispatch.sh`'s own gate on purpose. If only one side changes, the board offers a spike that both dispatch paths refuse. This is the exact disagreement measured on 2026-08-27 and recorded at `eligible.ts:69-73`.
   
   Any change to the shell gate also falls under `scripts/check-shell-lines.sh`. The plan applies the ratchet to `plot-plan-meta.sh` only.

3. **HIGH — the readings that `sliceVerdict` needs do not reach it.** `sliceVerdict(readings, priorComplete)` reads `phase`, `outstanding` and `branches` (`eligible.ts:92-106`). The scan calls it through `plot-verdicts.mjs` with a TSV of `outstanding<TAB>plan_phase<TAB>wave_states` (`plot-fleet-scan.sh:4561`, `:4582-4583`, `packages/board/src/server/entry/verdicts.ts:11`). None of these carries "this branch is the spike" or "a `Spike approved:` record exists". So the rule needs new inputs, and a producer for each:
   - a `spike_approved_raw` (and `slices_confirmed_raw`) field in `plot-plan-meta.sh`, which no slice names;
   - the scan's verdict TSV;
   - `BranchSchema` in `entities/fleet.ts`, whose fields at `:560-660` carry no `spike`.
   
   Slice 1 builds `waves[].branches[].spike` in the parser, but nothing carries it from the parser into the pulse.

4. **HIGH — automatic delivery cannot see `Type: tracer`.** Changelog entry 3 and slice `feature/a-tracer-plan-stays-in-design` say "automatic delivery skips a tracer plan". `rules/auto-deliver.ts` decides from the pulse's `FleetReading['plans']` (`:1`, `:213`, `:304-320`), not from `planStatus`. The pulse `PlanSchema` (`entities/fleet.ts:695-713`) carries `file`, `phase` and `slices`, and no `type`. The scan does print a type on its internal `P` line (`plot-fleet-scan.sh:3110`), but the schema does not carry it to the reader. The slice must add `type` to the pulse plan, or the skip has nothing to test.

5. **MEDIUM — the Open Point 4 default contradicts the approve workflow.** The Approach says the later approval of a `Review: pr` plan "records through the `in-session` channel". `workflows/approve.ts` takes the channel from the plan's `Review:` value (`:227`), not from the caller. For a `pr` plan whose PR has already MERGED, the workflow skips the merge (`:252`) and records `plan-PR #N merged` (`:270-274`). That record claims that the slice confirmation happened through a PR merge, which is false. Slice `feature/the-slices-are-confirmed-after-the-spike` must name this change: either it accepts an explicit in-session channel for a `pr` plan in Design with a `Spike approved:` record, or it records the confirmation channel in `Slices confirmed:` and leaves `Approved:` as written. In addition, `approveSpike` merges the plan PR (Approach, "Where the plan lives"). That merge is a host write, which a transition cannot do. The merge lives in a workflow like `workflows/approve.ts:251-257`, and slice 2 names only a transition, a bundle, an endpoint and a button.

6. **MEDIUM — delivering two plans in one step goes through the state gate twice.** The slice says "`deliver` carries a proven tracer plan with its first dependent". `owningCommand` and the receipt check are per plan file (`rules/state-transition.ts:93-104`, `:235-250`). Today the deliver workflow writes one plan (`workflows/deliver.ts`, which has no dependent logic). The slice must name a receipt for the tracer plan's `State:` write. Without it, `plot-state-gate.sh` refuses the commit that delivers both plans. The slice also does not say whether automatic delivery of the dependent carries the tracer plan. If it does not, a dependent that auto-delivers leaves the tracer plan undelivered, so D5's "released with the first dependent" fails on the default path.

7. **LOW — the new status needs a reader on the board.** `proven` joins `PlanStatusSchema` (`rules/phase.ts:25-27`), and the board contract mirrors that schema (`packages/board/src/contract/schema.ts`, one of 7 non-test files that name `'deliverable'`). No slice names the card badge for `proven`, or the card's *spike not approved* and *spike approved* states (Approach, "Every view state"). Slice 4 names only *spike merged*. The Board-impact comment lists `proven`, but no slice builds the rendering.

8. **LOW — the phase gate refuses a spike whose branch slug equals the plan slug.** `phaseGateRefusal` refuses implementation commits while the plan is `design` (`rules/phase-gate.ts:185-195`). It finds the plan by matching the branch slug to the plan slug (`:77-78`, `gate.ts:336-382`). A single-branch plan in this shape has its spike refused at commit time. Also, the approve workflow clears `.plot/hold` per branch (`approve.ts:283-288`), but `approveSpike` names no hold clear for the spike branch. Both belong in the slice-2 text.

9. **LOW — the slice shape and the wait.** The wave *The spike and the tracer* holds two unrelated branches. CLAUDE.md defines a Slice as exactly one branch. As written, the confirm wave also waits on the tracer branch, which it does not need, and `the-fleet-writes-the-design` waits on that confirm wave. The `waits: feature/the-phases-are-a-declaration` on slice 1 is correct in effect, but the Notes give the wrong reason: the markers slice needs no `phaseOfPlan`, the tracer branch does. The plan names two templates without saying which one is meant (`skills/plot/templates/plan.md:42`, `.plot/templates/plan.md:69`).

## Amendments required

- A1 (fixes 2): Slice `feature/the-spike-is-approved-alone` names both dispatch gates, `plot-dispatch.sh:2957-2978` and `workflows/dispatch.ts:527-545`. Each admits a `design` plan only for its spike branch with a `Spike approved:` record. The slice also names the shell-line ratchet cost, or moves the shell gate's decision to the domain. A test proves that the scan's `eligible` and both gates agree on a Design plan with an approved spike.
- A2 (fixes 3): The markers slice (or slice 2) names the full path for the spike readings: `plot-plan-meta.sh` reports `spike_approved_raw` and `slices_confirmed_raw`, the scan's verdict TSV carries the spike readings, and `BranchSchema` gains `spike`.
- A3 (fixes 4): Slice `feature/a-tracer-plan-stays-in-design` adds `type` to the pulse `PlanSchema` (`entities/fleet.ts:695`) and names the `auto-deliver.ts` arm that reads it. It also states whether automatic delivery of a dependent carries the tracer plan.
- A4 (fixes 5): The Approach states how a `Review: pr` plan records its later approval, given `approve.ts:227-274`. Slice 4 names that workflow change. Slice 2 names an `approveSpike` workflow that performs the plan-PR merge.
- A5 (fixes 6): The tracer-delivery slice names the state-gate receipt for the second plan file.
- Recommended, not blocking: split the wave *The spike and the tracer* into two waves, name the `proven` badge and all three spike card states in a slice, name the template file, and correct the reason for the wait in the Notes.

## What I read

- The subject plan, all five sibling plans, `STORY-plot-works-in-five-phases.md` (Decisions D1–D12 and Open Points 1–14), and `DESIGN-phases.md` §3 and §4.
- `packages/domain/src/rules/eligible.ts:30-130`, `rules/verdict.ts:36-80`, `rules/phase.ts:20-28` and `:135-165`, `rules/phase-gate.ts:60-200`, `rules/state-transition.ts:80-110` and `:235-250`, and `rules/controller-gate.ts:11`.
- `transitions/plan.ts:193-345`, `workflows/approve.ts:180-332`, `workflows/dispatch.ts:515-560`, and `entities/fleet.ts:560-825` (schema fields only).
- `packages/board/src/server/fleet.ts:2475-2520` and `entry/verdicts.ts`, plus `entry/gate.ts:283-382` through grep.
- `skills/plot/scripts/plot-plan-meta.sh:85-170`, `:240-250`, `:440-460` and `:1045-1060`; `plot-dispatch.sh:2950-2985`; `plot-fleet-scan.sh:3110` and `:4555-4600`; `plot-phase-gate.sh`; and both plan templates.
- Greps for `'deliverable'`, `proven`, `hold-clear`, `.plot/hold`, `waits:`, `sliceVerdict` and `type`.
- No tests, fleet commands or board commands were run.
