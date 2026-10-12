## Implementation brief — design-work-proves-the-path (wave 5: Confirming the slices)

- **Plan (canonical):** [docs/plans/2026-10-12-design-work-proves-the-path.md](../../docs/plans/2026-10-12-design-work-proves-the-path.md) on `main`
- **Approved:** 2026-10-12, Jan Wloka, plan-PR #1608 merged
- **Branch:** `feature/the-slices-are-confirmed-after-the-spike` (base: `main`)
- **Ends as:** one PR to `main`
- **Review of the code:** per repo convention (CI gates; no separate review channel declared for this slice)

This is slice 5 of 7. Slices 1–4 are merged: `feature/the-design-approvals-are-gated` (#1616, the person arm), `feature/a-slice-is-marked-spike` (#1621, the markers and scan readings), `feature/the-spike-is-approved-alone` (#1629, `approveSpike` and the `Spike approved:` record + its gate), `feature/the-spike-can-be-dispatched` (#1634, wiring the four dispatch gates to admit only the approved spike branch). This slice has no remote ref yet. The two tracer slices that fold after it (`feature/a-tracer-plan-stays-in-design`, `feature/a-tracer-plan-ships-with-its-dependent`) read nothing this slice builds and touch different files.

### What to build

Everything upstream of `approve` is in place: a Design plan's spike can be approved alone and dispatched alone, but `approve` itself still has no idea a spike exists. Today a `design`-phase plan falls straight through `approve`'s `switch (plan.phase)` into the same path as `draft` (`packages/domain/src/transitions/plan.ts:266-274`), gated only by the review-channel checks and whatever `preconditions` the caller happened to pass. Nothing stops a `design` plan with an unmerged (or unapproved) spike from being approved whole — the plan's own words: *"`approve` ... refuses a `design` plan whose spike has not merged"* is a sentence this slice makes true, not one that is true yet.

This slice adds the one refusal that makes "confirming the slices" a real gate, plus the surface that lets a person act on it:

1. **`approve` refuses `spike-unmerged`** for a `design`-phase plan whose spike branch's PR has not merged. The reading is the host's `mergedAt` for the spike branch, via `prMerged(branch)` on the host port (`packages/domain/src/ports/host.ts:174`) — never a merge subject, never ancestry (plan line 92: *"the reading is the host's `mergedAt` ... read through the host port's `prMerged(branch)`"*). Pass it in as a `Precondition`, the same shape `unmet()` already consumes, but give it its own `RefusalReason` member (`spike-unmerged`) rather than letting it collapse into the generic `precondition-unmet` — follow the precedent `spike-none`/`spike-not-first`/`spike-approved` set in `approveSpike` for exactly this reason: a caller branching on the reason needs to tell "spike not merged" apart from any other unmet reading.
2. **`approve` refuses `slices-unpushed`** when the plan file in the approver's checkout differs from the copy on `origin/<default branch>`. This is the plan's own words (line 123): *"The approval refuses `slices-unpushed` when the plan file in the person's checkout differs from the copy on `origin/<main>`."* The rewrite of the remaining slices (after the spike merges, a person edits the plan's `## Slices` section in light of what the spike proved) has to land on the default branch *before* the approval, because the approval's booking commit stages only the plan file, `.plot/hold` and the sprint file (`workflows/approve.ts:328-333`) from a worktree cut fresh off `origin/<default branch>` — if the person's local edit never reached origin, the approval would silently approve the pre-spike slice list.
3. **Both checks apply only to a `design`-phase plan with an approved, unconfirmed spike.** A `draft` plan, an `approved`-phase plan (idempotent re-approval), and a `design` plan with no spike annotation at all are unaffected — this is additive to the existing `design` path, not a new phase arm.
4. **The three spike card states.** A Design plan's card shows one of: *spike not approved*, *spike approved* (dispatchable, slices not yet confirmed), or *spike merged, confirm the slices* (approval now unblocked). These come from `spikeOf`, the `Spike approved:` record, and the spike branch's merge reading — composed into a domain property, not decided in `.tsx` (`CLAUDE.md` *Every rendered state is a domain property*). The spike badge itself (`isSpikeSlice`, `packages/board/src/contract/schema.ts:1550-1555`) already exists and is unrelated — it answers a display-only "what kind of outcome does this slice have," not the gate state.
5. **A *Confirm slices and approve* control** on the card, visible once the spike has merged, that triggers the normal `approve` action (now unblocked by `spike-unmerged` clearing) — not a new action, just the point at which the existing `approve` endpoint becomes callable for this plan.
6. **`draftPlacement` widens to `design`.** `packages/domain/src/rules/draft-placement.ts:45` reads `if (readings.planPhase !== 'draft') return null;` — the plan's own words (line 138): *"A `design` plan's branches that may not run read the same as a Draft plan's ... except the branch that `spikeOf` names once the `Spike approved:` record exists, which takes the arm of a dispatchable branch."* Change the guard to admit `design` too, then carve out the one exception: the spike branch, once approved, must NOT fall into the Draft-style `waiting-on-you`/`quiet` placement — it takes whatever arm a normal dispatchable branch takes. Every other branch of a `design` plan (including the spike before it's approved) places exactly as a Draft plan's branches do today.
7. **`/plot-approve` step 2b.** Already reads the spike annotation for a Design-phase plan per the merged slice "The spike: the person arm" — confirm the step's wording matches what `spike-unmerged` now actually refuses, and names the fix (wait for the spike's PR to merge, or drop the `<!-- spike -->` annotation) the way the plan's refusal-naming convention requires (*The words*, plan line 60: each refusal names the next command).
8. **`/plot-release` step 3.** Lists a merged spike's changeset as *a spike of a Design plan* rather than as an orphan entry with no delivered plan (plan's D16 reference, line 183). The spike's PR carries a changeset like any slice, and the plan is still in Design when a release is cut in that window — step 3's cross-check must not flag it as a changeset with no corresponding delivered plan.
9. **`skills/plot/SKILL.md` *tracer-bullets* and its `:284` sentence.** The sentence there currently describes `/plot-approve` as parsing only `### Implementation` and skipping tracer branches — the plan says this describes no code (line 54: *"its sentence at `:284` ... describes no code: the slice rewrites it as what step 2b asks the agent to do"*). Rewrite it to say what step 2b actually does now: for a Draft plan it still reads the `### Tracer` heading; for a Design plan it reads the spike annotation instead.

### Decisions the plan settles — do not re-derive them

**`spike-unmerged` and `slices-unpushed` do not exist anywhere in the codebase yet** (confirmed by grep across `packages/domain/src` and `test/` before writing this brief) — you are adding both from scratch, not wiring up something already stubbed.

**The merge check is `mergedAt`, never a merge subject and never ancestry.** `CLAUDE.md` *One Answer To "Did This Land"* draws this line precisely because the phase flip is destructive (moving a plan out of Design cannot be casually undone the way re-opening a slice can): *"the wave gate also takes a host-written merge subject ... as positive evidence for a branch with NO REF ... What makes the two readings coexist is the blast radius ... a subject settles a slice and never starts a delivery."* Confirming a plan's slices is exactly the kind of destructive, hard-to-reverse decision that section reserves for `mergedAt` alone. Use `prMerged(branch)` on the host port; do not add a merge-subject or ancestry read here even if it would be cheaper.

**The new refusal reasons are closed-union members, not generic preconditions.** `RefusalReason` in `transitions/plan.ts:94-106` is an explicit string union. `spike-unmerged` and `slices-unpushed` each need their own member, following exactly the pattern `spike-none` / `spike-not-first` / `spike-approved` set for `approveSpike`'s refusals two slices ago — a caller branching on `result.reason` needs these distinguishable from `precondition-unmet` and from each other, because the repair is different for each (wait for the merge vs. push your plan edit).

**`approve`'s own doc comment is part of the contract and needs updating.** The function's JSDoc (`transitions/plan.ts:241-263`) currently lists the refusal reasons it can return (`state-terminal`, `state-unreadable`, `state-wrong`, `review-human`, `reviewer-undeclared`, `review-unrecognised`, `precondition-unmet`) and says a host-dependent check like "whether the plan PR merged" is "supplied as a precondition reading rather than performed here." Both of those sentences are what you are revising — the comment currently describes the state before this slice; update it to name `spike-unmerged` and `slices-unpushed` explicitly, following `CLAUDE.md`'s *Factual API documentation* rule (say what the function does and how it fails, not the history of the decision).

**`approve`'s existing structure is where this plugs in, not a new function.** The `switch (plan.phase)` already falls `draft`/`design`/`approved` through to the same body (`:267-269`). Do not branch Design into a separate code path — add the spike/slices checks as additional gates inside the existing flow, guarded on `plan.phase === 'design'` and on whether the plan actually has an approved spike (`spikeOf` + `plan.spikeApprovedRecord`). A `design` plan with no spike at all keeps approving exactly as before — this slice must not make every Design plan harder to approve, only the ones mid-spike.

**Scope boundary with "Dispatching the spike" (already merged, #1634).** That slice answers *may this branch run* (the four gates: `sliceVerdict`, `plangate`, `implement`, `phaseGateRefusal`). This slice answers *is the plan ready to leave Design* (`approve`). Different transitions, different questions — do not duplicate `spike-unmerged` into any of the four dispatch gates, and do not touch `eligible.ts`, `workflows/dispatch.ts`, `workflows/implement.ts` or `rules/phase-gate.ts` except where `draftPlacement` (item 6 above) is the one placement rule this slice does own.

**This slice adds no shell.** The ratchet (`check-shell-lines.sh pr`) grants no allowance beyond what the markers slice already repaid (net ≈ −20, fully spent). Everything here is TypeScript (domain + board rendering) plus skill prose. If you find yourself touching a `.sh` file, you're off scope.

### Done when

The plan's `## Acceptance` section is the specification. In particular, for this slice:
- A `design`-phase plan whose spike is approved but whose spike PR has not merged refuses `approve` with `spike-unmerged`, naming the next step.
- The same plan, spike PR merged, approves normally — and a stale local plan-file edit not yet pushed to `origin/<default branch>` refuses `slices-unpushed` instead of silently approving the unconfirmed slice list.
- A unit test per new refusal, each with a plan that would otherwise pass every other gate, isolating exactly the one check added.
- `draftPlacement` admits a `design`-phase plan's non-spike branches the same way it admits a `draft` plan's, and excludes the approved spike branch from that placement with its own test.
- The three card states render from domain properties with unit tests, and one browser test per state proves the badge/control shows — per `CLAUDE.md` *Every rendered state is a domain property*: "a view state that cannot be asserted without a browser is a domain property that has not been extracted yet."
- `/plot-release` step 3 does not flag a merged spike's changeset as orphaned when its plan is still in Design.

Plus the repo's standard gates: run `node skills/plot/scripts/board/plot-local-checks.mjs` (resolved relative to `skills/plot/scripts/`) before each push, and run exactly what it prints — the suites naming your changed files, related tests and typecheck for touched packages, and the gate scripts. The `CI suites` listed in `## Plot Config` run in CI on every PR; do not run them locally as a substitute.

Name the shell gate explicitly if you touch any `.sh` file: `scripts/check-shell-lines.sh` refuses a PR whose shell under `skills/` grows past its merge base, with no stored allowance and no override — if a shell line turns out to be unavoidable, remove one elsewhere in the same change.

A changeset is required. The plan's slice heading for this branch names `bumps: plot: patch, plot-approve: minor, plot-release: minor`, each with its Model Guidance row updated in the respective skill's SKILL.md.

### Bookkeeping

Open the PR through the controller once the branch carries a real commit:

```bash
../plot/scripts/plot-open-pr.sh          # on this branch
../plot/scripts/plot-open-pr.sh --draft  # while still moving
```

Do not run `gh pr create`. When the PR is created, append `→ #<number>` to this branch's line in the plan's `## Slices` section (the "Confirming the slices" heading).

### Scope guard

This branch owns: `packages/domain/src/transitions/plan.ts` (`approve`'s new `spike-unmerged`/`slices-unpushed` refusals and its `RefusalReason` union), `packages/domain/src/rules/draft-placement.ts` (`draftPlacement`'s `design` admission), the board-side card-state composition and its *Confirm slices and approve* control, the matching unit and browser tests, `skills/plot-approve/SKILL.md` step 2b wording, `skills/plot-release/SKILL.md` step 3's spike-of-a-Design-plan handling, and `skills/plot/SKILL.md`'s `:284` tracer-bullets sentence.

Other branches of this plan, verified via `git ls-remote --heads origin` at brief-writing time: none exist remotely besides what's already merged (`feature/the-design-approvals-are-gated` → #1616, `feature/a-slice-is-marked-spike` → #1621, `feature/the-spike-is-approved-alone` → #1629, `feature/the-spike-can-be-dispatched` → #1634, all merged). `feature/a-tracer-plan-stays-in-design` and `feature/a-tracer-plan-ships-with-its-dependent` have no ref yet and build nothing this slice touches.

If you find something the plan did not anticipate, report it rather than improvising outside scope.
