# Round 2 — moderation

Subject: `docs/plans/2026-10-01-a-merge-subject-proves-a-landing-the-host-cannot.md` at `cc1559c2`, amended after round 1. Jurors: `round2-skeptic.md`, `round2-bitbucket.md`, `round2-layering.md`. Gate: all three committed (`plot-panel.mjs check`). Reconcile: `unanimous amend skeptic,bitbucket,layering`.

## Evidence each juror used

All three executed. The skeptic ran fixtures for the age rule, the import gate and the auto-delivery path. The Bitbucket operator timed per-plan and batched adding-commit lookups on `ewz-kus-portal` and read a delivered plan through its symlink. The layering juror timed the per-plan walk on this repository and checked the seams. Round 1's agreed changes are answered; every remaining finding concerns what the amendment added.

## Agreed changes

1. **Batch the age walk.** The per-plan lookup is two git calls, not one. Measured: about 30 ms per lookup here, 3.25 s for 108 active plans; 5.23 s for 140 lookups on `ewz-kus-portal`, against 0.105 s for one `--diff-filter=A --name-only` walk over the plan directory. Read all adding commits once, walk merges once with `%H %s`, and run `merge-base --is-ancestor` only for a subject that names a refless plan branch, with the `plot-ancestry: evidence` marker. State the measured cost and what `merge_detect` says when the walk is capped. (bitbucket 2, layering 2)
2. **Define the plan file for the age rule.** Read it on `origin/<main>`, through the dated path, never the `active/` or `delivered/` symlink. Measured: a delivered plan keeps 4 of 4 subjects through its target and 0 of 4 through its symlink. State that a rename moves the age forward unless `--follow` is used, and that a reused name merged between an idea branch's fork and the plan's merge still counts. Add a fixture for each stated behaviour. (all three)
3. **Name the refs-port operation that answers a plan's adding commit,** with its git and fixture adapters and its failure answer (no subjects, branches go to the host). Slice 2's age test depends on it. (all three)
4. **Make the import gate buildable.** Scope it to `packages/*/src/`, so corpus and rule tests may import the rule. Drop `sliceHasMerged`, which is a parameter inside `registryd-main.ts` and not a module. Name `packages/board/src/server/controllers/deliverability.ts`. (all three)
5. **Correct the small facts:** the scan reads the backend at `plot-fleet-scan.sh:408` and `:561`, not `:3216`; `plot-deliver.sh:181`, not `:179`; the worker-loop references; the per-plan walk is two calls. (all three)

## Single-juror findings that block

- **Skeptic: a refused auto-delivery is never retried.** A delivery refused while the subject says `merged` stays in `inFlight` until the board restarts (`auto-deliver.ts:311-332`, `:401-406`). Either retire the slug on a non-zero exit, or keep subject-only evidence out of `allSlicesMerged` for auto-delivery, with a test in which the host recovers and a later tick delivers.
- **Layering: the proof must be per plan in both readers.** A global union lets one plan's proof settle another plan's reused name: `queueOfPlan(plan, claimed, merged ∪ proven(plan))`, the same in `landedWithoutListing`, and a scan lookup keyed by plan and branch, with a two-plan test. `subjectProven` must also drop claimed names, with a test that a ref-carrying branch keeps its own `queuedHasLanded` question.
- **Skeptic: the `unaskable` sentence is wrong for GitHub.** The shell regex is removed, so a GitHub estate loses the proof it has today whenever the bundle cannot answer. The plan must say so.

## Disagreements, named

- **Where the age is measured.** The skeptic offers `--first-parent` on `<main>` to close an idea-branch plan's draft window, and notes it excludes a work-branch plan's own merge. The Bitbucket operator and the layering juror accept the window as a stated limit. Both shapes are defensible; the plan must pick one and name the residual.
- **The delivery-boundary test.** The skeptic accepts a controller-level test; the layering juror wants the refusal run through the delivery path or the auto-deliver tick and called the boundary's gate.

## Blind spot

All three lenses examined the age rule as a correctness filter. None asked how an operator learns that a subject was ignored for age. A slice that a subject would prove but the age rule rejects reads `unknown` under 429, the same as a slice with no subject. The amendment should say whether the footer or the row names this case.

## Conduct note

The skeptic reports one `rm -rf` inside its own scratch fixture directory instead of `trash`. Nothing outside the scratch directory was touched.

## What an amendment changes

The batched age walk with its measured cost; the plan-file definition and the rename and idea-branch limits with fixtures; the adding-commit port op; per-plan proof in scan and queue with the two-plan test and the claimed-name exclusion; the auto-delivery retry or exclusion with its test; the buildable import gate; the GitHub `unaskable` sentence; the corrected line references; and a choice of where the age is measured.
