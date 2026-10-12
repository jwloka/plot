# Round 3 — moderation

Subject: `docs/plans/2026-10-01-a-merge-subject-proves-a-landing-the-host-cannot.md` at `5b62e9e1`, amended after round 2. Jurors: `round3-skeptic.md`, `round3-bitbucket.md`, `round3-layering.md`. Gate: all three committed (`plot-panel.mjs check`). Reconcile: `unanimous amend skeptic,bitbucket,layering`.

## How the panel ran

One agent wrote the three verdicts in sequence, because the agent that ran this round could not start subagents. The lenses are not independent readings, and their agreement is weaker evidence than three separate jurors. Rounds 1 and 2 used separate jurors.

## Evidence

- **Skeptic: executed.** A shell fixture with the plan's batched commands: the age test answers as designed (a merge before the plan is ignored; a merge in the draft window counts, as stated), and a renamed dated file is absent from the walk. It counted 4 of 392 dated plans on `origin/main` with no `A` entry for their current path.
- **Bitbucket operator: executed.** Re-ran the adding-commit walk on `ewz-kus-portal` (35 of 35 dated plans have an `A` entry) and read the scan's `HOST_VERDICT`.
- **Layering: executed in part.** Read the seams on `5b62e9e1` and located `allSlicesMerged` in `rules/deliverable.ts:62`.

## Round 2 answered

All three find every round-2 change answered: the batched walk with measured cost, the dated plan file on `origin/<main>`, the three refs-port ops with failure answers, per-plan proof in both readers with the two-plan and claimed-name tests, the import test scoped and called a guard, the auto-delivery stick addressed, the GitHub `unaskable` sentence, the corrected line references, and the footer counter for a subject ignored for age.

## Agreed, blocking

**The `evidence` field is stripped before auto-delivery reads it** (skeptic, layering). The pulse is parsed through `BranchSchema` (`entities/fleet.ts:174`), a plain `z.object` that drops undeclared keys. The skip never fires, and the round-2 stick returns while a test that builds its pulse as a literal stays green. `evidence` and `subjectIgnored` go on `BranchSchema` with defaults, and the tick test parses scan JSON.

## Single-juror findings, each required

- **Layering:** the confirmation reading is a domain decision. It goes in `rules/deliverable.ts` beside `allSlicesMerged`, tested at 100% branch coverage, and `planAutoDeliver` calls it.
- **Bitbucket:** the delivery-candidate host question runs on every 5 s scan during a 429, which is new spend in the condition #1139 reports. Ask it only when `HOST_VERDICT` is `ok` or `partial`, with a fixture where the listing is refused and the host log holds no `pr-state` for the candidate.
- **Skeptic:** the rename limit names the wrong mechanism for the batched walk (absent, not moved forward); reading `--diff-filter=AR --name-status` and following each `R` to its `A` keeps the age across a retitle at no extra call. "Answered once" is "once per tip of `origin/<main>`", because the terminal cache discards an entry when main moves.

## Disagreements

None on position or on any finding. Each change touches a different part of the plan.

## Blind spot

All three read the scan, the queue and auto-delivery. None read the board's Deliver control for a plan whose every branch is subject-only: `deliver.ts:230` reads `allSlicesMerged`, so the button reads deliverable, and a person who presses it is refused by `deliverability.ts` during the throttle. The amendment should state what the control shows, or have it read the same confirmation rule.

## What an amendment changes

1. `evidence` and `subjectIgnored` on `BranchSchema`; the tick test parses scan JSON.
2. The confirmation reading in `rules/deliverable.ts`, called by `planAutoDeliver`, and named for the board's Deliver control.
3. The delivery-candidate question gated on `HOST_VERDICT` in `ok|partial`, with its fixture.
4. The rename limit restated for the batched walk, or `R` entries followed to the original add.
5. "Once per tip of `origin/<main>`".
