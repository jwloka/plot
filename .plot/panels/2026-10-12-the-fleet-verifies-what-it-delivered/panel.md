# Panel: the-fleet-verifies-what-it-delivered

- **Subject:** `docs/plans/2026-10-12-the-fleet-verifies-what-it-delivered.md`
- **Caller:** `/challenge-the-plan` Phase 3P, round 1
- **Commitment:** `Position: proceed | amend | reject`
- **Lenses:** estate, contradiction, deliverable, cost
- **Siblings:** 5 read, 0 unread (story plot-works-in-five-phases)
- **Gate:** all four verdicts committed on the first run (`plot-panel.mjs check`, exit 0 each); no juror was sent back
- **Reconcile:** `unanimous	amend	estate,contradiction,deliverable,cost`

## What the panel agrees on

All four jurors confirm the plan's Motivation claims on this branch: step 5 of `/plot-deliver` runs a `supported | refuted` panel, automatic delivery runs none, three release checklists exist, and the tracker port writes one fact. No juror argues against D11.

Three findings hold in every verdict, each found independently:

- **The panel gate cannot produce the per-claim record.** `readJuror` refuses a file whose `Position:` lines name two different words (`packages/domain/src/rules/panel.ts:162-165`). The `## Verification` section has one `supported` or `refuted` line per claim, so no gated output carries it, and the record would be moderator prose. Estate, contradiction and deliverable name this as the unresolved finding; cost does not dispute it. The plan's sentence "the fleet is its third caller and implements none of it" is false for the record it ships.
- **Slice 2 names no runner.** `/plot-panel` is a skill, and `packages/board/src/server/interrogate.ts:27-28` states that no script can run a panel. The plan names no command key, no lenses and no rubric, and an unattended panel refuses a missing parameter (`skills/plot-panel/SKILL.md:58-67`). The sibling `the-fleet-writes-the-design` names its key (`Idea command`); this plan does not.
- **"The fleet's capacity counts each juror like any agent" has no mechanism.** Jurors are `Task` subagents inside one process (`skills/plot-panel/SKILL.md:15`), and the fleet counts worker processes (`fleet-size.ts:15`, `Parallel agents`). Contradiction and cost both say the plan must state what it counts.

Further findings that two or more jurors share: the plan drops step 5's gated `Evidence: executed | read` line and asks in prose for the rule step 5 replaced with a gate (estate, contradiction); `issueOpen` needs a new `plot-host.sh` write op and four doc sites still say no ticket is created (`tracker.ts:84-88`, `:126-129`, `plot-host.sh:4929-4934`, `skills/plot-deliver/SKILL.md:450`) (estate, contradiction, deliverable); the verification panel writes `panel.md` into the directory the Draft rounds use (estate, contradiction); `next-checklist.md` sorts before every `v*` file, so the board's checklist badge never shows it, and one item per claim is not the shape `/plot-release rc` writes (estate, contradiction); the `## Verification` section needs a write kind the delivery workflow does not have (estate, deliverable); an issue opens before the record that makes it idempotent is pushed (contradiction, cost).

## Where the jurors disagree

The positions are unanimous. The remedies are not, and these differences are what a later round must settle:

- **A plan that `/plot-deliver` already panelled.** Estate proposes that `verificationOf` reads a committed `deliver-panel.md` as a verification, so the fleet runs only for auto-delivered plans, the gap `auto-deliver.ts:311-315` names. Cost reads D11's "each Delivered plan" as putting the second run in scope and asks the plan to state the duplicate cost, not to avoid it. Both stay inside D11; they disagree on which reading the plan takes. The precedent itself is split: `skills/plot-deliver/SKILL.md:352` names `.plot/panels/<subject>/panel.md`, while the one committed delivery panel uses a `deliver-` prefix (`.plot/panels/2026-09-30-a-slice-nobody-worked-on-reads-not-started/deliver-panel.md`).
- **How to get a per-claim position.** Estate and contradiction propose one gated label per claim (`Claim-3: supported`), one `check` call each, as step 5 adds `Evidence`. Deliverable also names one panel per claim, or a plan-level record only, and adds that no slice owns the fold from N jurors' answers on one claim into one record line, nor the rule for jurors who disagree on a claim. The first remedy keeps the record shape; the third changes the record that slice 1 defines.
- **What the most important change is.** Estate: make the run the existing panel (launch, lenses, both commitment lines, file prefix). Contradiction: the per-claim gate. Deliverable: the per-claim fold, and second the wave order. Cost: a cost statement and an off switch, as `autoDispatch` has. These are not ranked here.
- **Findings one juror holds alone.** Deliverable: wave 2 runs `a-refuted-claim-opens-an-issue` beside the run it consumes, so it needs a `waits:` or a split; and slice 1's wait on `feature/the-phases-are-a-declaration` has no stated build reason. Cost: steady state is about 6 Delivered plans a day (168 deliver commits since 2026-09-12), each record and each checklist rewrite is a push to `main` that runs three workflows with no path filter, the median delivery-to-release gap is 1 day so a queued run pays and keeps nothing, and a juror that runs a claim at a desk meets the CI-suite refusal and the operator's board. Contradiction: this repository declares no `Tracker`, so the dog-food run opens no issue; and `/plot-reject` already exists for a refuted plan and the plan does not name it.

## Facts the jurors stated differently

- `## Acceptance`: estate counts 0 of 452 plans; deliverable says one plan has the heading. The moderator's `grep -l "^## Acceptance" docs/plans/*.md` returns 0. The clause in the plan names a section no plan on this branch carries.
- Delivered plans today: cost counts 0 (419 Released, 17 Rejected, 9 Superseded, 6 Draft, 1 Approved); the moderator's count agrees. Open Point 14's default therefore covers no plan on the first day.

## A blind spot the four share

All four jurors judge the plan against the code as it is today. None asks what a juror compares a claim with when the default branch moved after delivery. The plan runs the panel "against the default branch at its current head". A later plan can change or remove a behaviour that an earlier plan delivered, and the juror then refutes a claim that was true when it shipped. That opens an `ai-generated` issue and flags a plan that is not at fault. With a median gap of 1 day the risk is small per plan, but a backlog or a failed run that a person restarts days later widens it. The plan must say whether a juror checks a claim at the plan's merge commits, at the head, or at both, and what a refutation at head alone means.

Second, none of the four asks who may change a record after a person fixes a refuted claim. The plan writes `Verified:` once and runs once per plan; nothing in it moves a refuted plan back to supported.

## What each juror looked at

- **Estate:** read the plan, the story and spec §6–§9, three siblings by grep, `plot-deliver` step 5, `plot-release` rc, `rules/panel.ts`, `auto-deliver.ts`, `ports/tracker.ts`, `interrogate.ts`, `board.ts:388-429`, the `plot-deliver.mjs` bundle by grep, and the committed `.plot/panels/` listing; ran `git show 88a9ffbd7` and a heading count. Reading only, no execution of the features.
- **Contradiction:** read the plan, all five siblings by grep, the whole story, spec §6, the tracker port and both connectors, `panel.ts`, `interrogate.ts`, the deliver entry's commit path, `board.ts`, the state, phase and release gates, `plot-host.sh` ops, and the manifesto by grep. Reading only.
- **Deliverable:** built a Changelog-to-slice map; read the template's wave rules, `plot-plan-meta.sh`, the deliver and decision workflows, `perform-fs.ts`, `implement-run.ts`, `sections.ts`, and the same skill and domain files as the others. Reading only.
- **Cost:** the only juror that measured: counted plan states, deliver commits since 2026-09-12, Delivered-to-Released lag over 417 plans, Changelog entries per plan, version and RC tags, and read the CI workflow triggers, `fleet-size.ts`, `fleet-settings-store.ts` and `registryd-main.ts`. No juror ran a test, the board or the fleet, as the rubric required.
