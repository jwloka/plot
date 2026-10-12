# Panel: the-phases-are-declared

- **Subject:** `docs/plans/2026-10-12-the-phases-are-declared.md`
- **Date:** 2026-10-12
- **Lenses:** estate, contradiction, deliverable, cost
- **Commitment:** `Position: proceed | amend | reject`
- **Siblings:** 5 read, 0 unread (story plot-works-in-five-phases)
- **Gate:** `plot-panel.mjs check` committed all four on the first run; no juror was re-run.
- **Reconcile:** `unanimous	amend	estate,contradiction,deliverable,cost`

## Positions

| Lens | Position | What the juror looked at |
|---|---|---|
| estate | amend | Read the plan, the siblings, the cited code and the released plan `2026-08-16-board-shows-discovery.md`; grepped for a phase-map parser, `needsDesign` and an owning command for `design` and found none. Ran no tests. |
| contradiction | amend | Read D1–D12, DESIGN-phases.md §2–§3, the five siblings, MANIFESTO.md, `skills/plot-idea/SKILL.md`, `entities/workflow.ts` and the state gate (`gate.ts`, `state-transition.ts`). Ran greps only. |
| deliverable | amend | Read every slice against the Changelog and grepped the callers of `toBoardPhase`, `storyPhase` and `rowPhase` under `packages/*/src`. Ran greps only. |
| cost | amend | Read the cited code, counted test files that hold a `'Discovery'` literal (27, 21 of them browser tests), read `controller-gate.ts` and `plot-state-receipt.sh`, and ran two git checks (`75f093cb9` is an ancestor of HEAD; `packages/` is unchanged since). Did not read the siblings in full. |

All four positions come from reading code and running greps. No juror ran a test, a build or the board, so every claim about a visible break (a missing button, an empty column) is a reading of the source and not an observation.

## Agreement

The four lenses reach `amend` for overlapping reasons, and three findings appear in three or four verdicts independently:

- **The board tests phase names as literals, and the plan does not count those sites.** `PlanCard.tsx:83-85` `isDraft` is `card.phase === 'Discovery'` (moderator confirmed). Under the default map a Draft plan reads in Design, so the Approve and Interrogate controls at `PlanCard.tsx:543` and `:548` and the menus that import `isDraft` (`menus.tsx:21`) stop showing on every Draft card. Further sites: `board.ts:1165` `phaseDateOf`, `Board.tsx:217` and `Swimlanes.tsx:161` (unguarded `PHASE_LEADERSHIP[phase]`), `Board.tsx:224`, `App.tsx:877`, `fleet.ts:5842` (an `idea/` row reads Discovery, against D1). Estate, cost and contradiction name these; deliverable names the readers no slice owns.
- **The wire schema has three `z.enum(BOARD_PHASES)` fields, not one:** `schema.ts:425`, `:736`, `:2486` (moderator confirmed). All four name it.
- **`owningCommand` does not admit a write.** It builds the refusal text (`state-transition.ts:93-104`); the receipt admits the write. All four name it. Cost adds that the actions are a closed list in three places the plan does not name: `controller-gate.ts:11`, `controller-gate.ts:50`, and `plot-state-receipt.sh:173-180`, the last of which costs shell lines under `check-shell-lines.sh`.
- **`storyPhase` has no production caller** (moderator confirmed: only `rules/phase.ts:72`). So `phaseOfStory` has no consumer in this plan, and Changelog bullet 2 ("Discovery holds only stories") ships an empty Discovery column until `tickets-and-stories-have-lanes` lands. Estate adds that released plan `2026-08-16-board-shows-discovery.md` already fixed an always-empty Discovery column once.
- **The fleet grep acceptance line proves nothing:** it returns zero matches today, before any slice lands. Three lenses name it.

## Disagreements

A unanimous position does not mean the jurors agree on what to amend. Each disagreement below is a different reading of the same plan text, and neither side is averaged away.

- **Where the board change lands.** Deliverable and cost say slice 1 already changes the board's columns, because moving the callers of `toBoardPhase` and `rowPhase` with `DEFAULT_PHASE_MAP` moves Draft plans to Design in wave 1; the plan puts the board change in wave 2. Contradiction reads the wave split as consistent with the siblings' `waits:` lines and does not raise it. The open question is whether slice 1 must own the visible move or must keep the old mapping until slice 2.
- **What the prose slice must say.** Contradiction says the prose slice must add `Design` as a plan state and keep states apart from declared phases (`MANIFESTO.md:101-109`, where the fourth activity is *Endgame*), and that `skills/plot/SKILL.md:182` contradicts D1. Cost says one Motivation claim is false: `DESIGN-plan.md` §4 already names five phases (`:750-755`) and `DESIGN-story.md` §4 describes story statuses, so neither "describes four phases". Estate reads the same ranges as correct apart from their end lines (`:900`, `:622`). Deliverable says the prose slice has no Changelog bullet and does not regenerate `AGENTS.md`. These are four different defects in one slice, and the plan must answer each.
- **Whether the third `/plot-idea` question contradicts the estate.** Contradiction and estate say it contradicts MANIFESTO Principle 10 (`MANIFESTO.md:79`, "two independent questions"), the plot-idea frontmatter and the CLAUDE.md row, and that it declares no unattended behaviour (`plot-idea/SKILL.md:58`), which lets a model decide what D3 gives a person. Deliverable and cost do not raise it. D12 and the story do not decide the wording of Principle 10, so the plan must say whether the design question is a ceremony question or a separate step.
- **Whether `phaseWorkflows` is sound.** Contradiction says the rule "a lifecycle workflow belongs to the phase that holds the state it moves a plan out of" contradicts `entities/workflow.ts:126-137` and gives no answer for `dispatch` and `implement`. The other three accept the plan's claim that a unit test asserting equality with today's `PHASE_WORKFLOWS` settles it. Only a test settles which reading is right.
- **`rowPhase` and the auto-bump.** Deliverable says giving `rowPhase` a `planStatus` would auto-bump per-branch rows, which only cards do today (`phase.ts:99-104`). Contradiction says a map with no phase holding `plan:delivered` drops the auto-bumped card (`board.ts:2115`). These are two separate gaps in the same sentence of the Design section.

## Shared blind spots

- **No juror ran anything.** All four positions rest on reading and grep. The `isDraft` break is near-certain from the source, but no juror counted which tests fail under the default map, and no juror proved the claimed equality of `phaseWorkflows(DEFAULT_PHASE_MAP)` with `PHASE_WORKFLOWS`.
- **No juror asked what the change does to an adopting repository.** The default map applies to every repository that declares no `Workflow phases` key. On upgrade, each such repository's Draft plans move from Discovery to Design and its Discovery column empties, with no declaration from the operator. The plan's Changelog states the new default but no juror asked whether that is a breaking change for the board's users, what version bump it needs, or whether the release notes must name it.
- **No juror looked past the files the plan names for stale phase prose.** `skills/plot-board-setup/SKILL.md:514` says the board serves `Discovery / Design / Development / Endgame / Released`, while `BOARD_PHASES` (`entities/workflow.ts:35-37`) already says `Testing`. The prose slice does not list that file.

## For the caller

The panel is unanimous `amend`. The plan needs, at minimum: a count of the board's literal phase-name sites and a slice that owns them; the three wire fields; the receipt and closed action lists instead of `owningCommand`; an answer for the empty Discovery column; a decision on where the visible Draft-to-Design move lands; and the prose slice's scope restated. The findings are recorded as Open Points in the plan.
