# The phases are declared

> A `Workflow phases` key in `## Plot Config` maps each phase name to the plan states and story statuses it holds, Plot ships the five agentic-workflow phases as the default, and the domain answers a plan's or story's phase from the declared map instead of from `toBoardPhase` and `storyPhase`.

## Status

- **State:** Draft
- **Type:** feature
- **Story:** plot-works-in-five-phases
- **Review:** pr
- **Impl:** own branches
- **Rounds:** 1

## Changelog

- A `Workflow phases` key in `## Plot Config` declares the board's phases and the plan states and story statuses each one holds. A repository that declares none gets Discovery, Design, Development, Testing and Released.
- With the default phases, Discovery holds only stories, and a Draft plan reads in the Design column.
- `/plot-idea` asks whether a plan carries significant design decisions, and writes `State: Design` on yes.
- A *Needs design* action moves a Draft plan to Design, from the board or from the command line.

<!-- Board impact: the board's columns come from the declared map instead of BOARD_PHASES, and the wire schema's phase field becomes a declared name. No change to the plan format, the template or the docs/plans layout. -->

## Motivation

The phases are the operator's workflow, not a fact Plot owns (D12 in [the story](../stories/plot-works-in-five-phases/STORY-plot-works-in-five-phases.md)). Measured on `main` at `75f093cb9`, 2026-10-12:

- `packages/domain/src/entities/workflow.ts:35` declares `BOARD_PHASES` as five constant names, and `PHASE_LEADERSHIP` (`:62`) and `PHASE_WORKFLOWS` (`:143`) are keyed by them.
- `rules/phase.ts:41` `toBoardPhase` puts a `draft` plan in Discovery, beside the stories. `rules/phase.ts:72` `storyPhase` spreads the six story statuses over all five phases.
- `packages/board/src/server/board.ts:2082-2117` moves a `deliverable` plan into `toBoardPhase('delivered')`.
- No command writes `State: Design`. `owningCommand` (`rules/state-transition.ts:93`) names only `/plot-approve` and `/plot-deliver` for a plan, so the state gate refuses a commit that changes an existing plan from `Draft` to `Design`.
- `CLAUDE.md` *Phase Guardrails*, `skills/plot/SKILL.md:170-182` and `:266`, `skills/plot/MANIFESTO.md:99-109` and `:148`, `DESIGN-plan.md` §4 (`:688-830`) and `DESIGN-story.md` §4 (`:562-620`) describe four phases.

## Design

### Approach

The design spec is [DESIGN-phases.md](../stories/plot-works-in-five-phases/DESIGN-phases.md) §2 and §3.

**The declaration.** A new rule, `packages/domain/src/rules/workflow-phases.ts`, exports `parsePhaseMap(value)` and `DEFAULT_PHASE_MAP`. `parsePhaseMap` takes the key's text and returns an ordered phase map, or a refusal that names the entry and the reason. The grammar is DESIGN-phases.md §2: `;`-separated entries of `<name> = plan:<state>, story:<status>, …`, with `story:*` for every status. `plan:rejected` and `plan:superseded` cannot be declared. A state or status in two phases is a refusal. The shape follows `rules/local-checks.ts`, which parses the `Local checks` value the same way.

**The default.** `DEFAULT_PHASE_MAP` is `Discovery = story:*; Design = plan:draft, plan:design; Development = plan:approved; Testing = plan:delivered; Released = plan:released`. Plot's own `CLAUDE.md` declares the same value as the `Workflow phases` key, and `./scripts/check-agents-md.sh --write` regenerates `AGENTS.md`.

**The phase of a plan and a story.** `phaseOfPlan(map, readings)` replaces `toBoardPhase`, and `phaseOfStory(map, status)` replaces `storyPhase`. `rowPhase` composes `phaseOfPlan`. The readings are the plan state and `planStatus`. A `deliverable` plan reads in the phase that holds `plan:delivered`, which is the board's auto-bump expressed against the map. A state no phase holds answers `null`, as `toBoardPhase` does for `rejected` today. The tracer refinement of DESIGN-phases.md §3 belongs to `design-work-proves-the-path`, which adds the marker.

**Workflows and leadership.** `phaseWorkflows(map)` derives the workflow list per phase: a lifecycle workflow belongs to the phase that holds the state it moves a plan out of. With the default map the answer equals today's `PHASE_WORKFLOWS`, and a unit test asserts that equality. `PHASE_LEADERSHIP` stays keyed by the five default names, and a declared phase outside them carries no leadership.

**The board.** The board server reads the key once per build through the plan store's `config(key, fallback)`, parses it with `parsePhaseMap`, and puts the ordered phase list on the payload. `Board.tsx` and `Swimlanes.tsx` draw one column per listed phase. The wire field typed `z.enum(BOARD_PHASES)` becomes a string that the payload's phase list names. On a refusal the board renders the default map and shows the refusal text above the columns.

**The fleet reads no phase name.** No fleet code changes in this plan. A grep for `BOARD_PHASES`, `toBoardPhase` and `storyPhase` under `packages/fleet/src` returns zero matches after the first slice.

**Needs design.** A new transition `needsDesign(plan, input)` in `transitions/plan.ts` moves `draft` to `design` and refuses every other state by name. It writes `State: Design`, a `Design:` record (`<date>, <who>, <channel>`, the field `plot-plan-meta.sh:246` already reads) and an empty `## Spec` section with the placeholder `_To be filled in during Design._`. A bundle `board/plot-needs-design.mjs` and an endpoint `POST /api/needs-design` call it, and both leave a receipt. `owningCommand` names the action for `design`, so the state gate admits the write when the receipt matches. The board shows a *Needs design* button on a Draft plan's card.

**The design question in `/plot-idea`.** Step 4 of `skills/plot-idea/SKILL.md` gains a third question: *"Does this plan carry significant design decisions?"* On yes, the plan file is created with `State: Design` and the empty `## Spec` section. A new file passes the state gate, because the gate admits a creation. The Model Guidance table gives the step the Mid tier: a Mid model recommends an answer, and a Small model asks.

**The prose.** The four-phase prose moves to the declared phases. Plan states stay as they are.

### Open Points

- [ ] The key name `Workflow phases` and its grammar are this plan's proposal (story Open Point 1).
- [ ] A declared phase outside the five default names gets no leadership badge (story Open Point 2).
- [ ] A custom map that puts a story status into a plan phase: the Discovery tab lists every story, and the Planning tab lists plans only (story Open Point 3). This plan builds the map; `the-board-has-three-tabs` builds the tabs.
- [ ] Panel 2026-10-12 (estate, cost): the board tests phase names as literals, and no slice owns those sites. `PlanCard.tsx:83-85` `isDraft` is `card.phase === 'Discovery'`, so under the default map the Approve and Interrogate controls (`PlanCard.tsx:543`, `:548`, `menus.tsx`) leave every Draft card. Other sites: `board.ts:1165` `phaseDateOf`, `board.ts:2204`, `Board.tsx:217` and `Swimlanes.tsx:161` (unguarded `PHASE_LEADERSHIP[phase]`, which throws for a phase outside the five), `Board.tsx:224`, `App.tsx:877`, `fleet.ts:5842` (an `idea/` row reads Discovery, against D1), `mock-fleet.ts`. 27 test files hold a `'Discovery'` literal, 21 of them browser tests.
- [ ] Panel 2026-10-12 (all four lenses): the wire schema has three `z.enum(BOARD_PHASES)` fields, `schema.ts:425`, `:736` and `:2486`. The Design section names one.
- [ ] Panel 2026-10-12 (all four lenses): `owningCommand` (`state-transition.ts:93-104`) only builds the refusal text; the receipt admits the write (`gate.ts:248-253`). *Needs design* also needs `ControllerAction` (`controller-gate.ts:11`), the action regex (`controller-gate.ts:50`) and `_action_of` (`plot-state-receipt.sh:173-180`), and the shell edit pays lines under `check-shell-lines.sh` (cost).
- [ ] Panel 2026-10-12 (deliverable, estate, contradiction): `storyPhase` has no production caller (`rules/phase.ts:72` only), so `phaseOfStory` has no consumer here and Changelog bullet 2 ships an empty Discovery column until `tickets-and-stories-have-lanes` lands. Released plan `2026-08-16-board-shows-discovery.md` fixed an always-empty Discovery column before. The Motivation line about `storyPhase` overstates its reach.
- [ ] Panel 2026-10-12 (deliverable, cost): slice 1 moves the board callers of `toBoardPhase` and `rowPhase` (`board.ts:2079`, `:2082`, `:2115`, `fleet.ts:2269`, `:5463`) with `DEFAULT_PHASE_MAP`, so the visible Draft-to-Design move lands in wave 1, not wave 2. "`BOARD_PHASES` stops being the source" in slice 1 conflicts with slice 2 owning the wire schema and the `Phase` type. `StoryModal.tsx:84`, `phaseOrder` and `WORKFLOW` (`workflow.ts:80`, `:178-186`) have no slice.
- [ ] Panel 2026-10-12 (deliverable, contradiction): `rowPhase` takes no `planStatus` today (`phase.ts:99-104`); giving it one auto-bumps per-branch rows, which only cards do now. A map with no phase holding `plan:delivered` drops the auto-bumped card (`board.ts:2115`).
- [ ] Panel 2026-10-12 (contradiction, estate): the third `/plot-idea` question contradicts "two independent questions" (`MANIFESTO.md:79`, the plot-idea frontmatter, the CLAUDE.md row) and declares no unattended behaviour (`plot-idea/SKILL.md:58`), so a model can answer what D3 gives a person. The board's idea prompt says "Stop at Draft" (`idea.ts:279`).
- [ ] Panel 2026-10-12 (contradiction): `phaseWorkflows` places a workflow by the state it moves a plan out of, which contradicts `entities/workflow.ts:126-137` and gives no answer for `dispatch` and `implement`.
- [ ] Panel 2026-10-12 (contradiction, cost, deliverable): the prose slice must keep plan states apart from declared phases (`MANIFESTO.md:101-109` names the fourth activity Endgame; `skills/plot/SKILL.md:182` contradicts D1), add `Design` as a plan state, cover the CLAUDE.md controller-endpoint list and the state gate's script list, carry a Changelog bullet and regenerate `AGENTS.md`. The Motivation claim that `DESIGN-plan.md` §4 and `DESIGN-story.md` §4 describe four phases is false (`DESIGN-plan.md:750-755` already names five), and the cited ranges end at `:900` and `:622`.
- [ ] Panel 2026-10-12 (estate): `parseLocalChecks` skips a bad entry silently, so "the shape follows `rules/local-checks.ts`" does not carry the refusal `parsePhaseMap` promises.
- [ ] Panel 2026-10-12 (estate, contradiction, deliverable): the acceptance grep for `BOARD_PHASES`, `toBoardPhase` and `storyPhase` under `packages/fleet/src` already returns zero, so it proves nothing about slice 1.
- [ ] Panel 2026-10-12 (moderator, a blind spot of all four lenses): the default map applies to every adopting repository with no `Workflow phases` key, so an upgrade moves its Draft plans to Design and empties its Discovery column. The plan does not say whether that is a breaking change or what the release notes name. `skills/plot-board-setup/SKILL.md:514` still names `Endgame`, and no slice lists it.

## Slices

### The declared map

- `feature/the-phases-are-a-declaration` — `rules/workflow-phases.ts` with `parsePhaseMap`, `DEFAULT_PHASE_MAP`, `phaseOfPlan`, `phaseOfStory` and `phaseWorkflows`; `toBoardPhase`, `storyPhase` and `rowPhase` callers move to the new rules; `BOARD_PHASES` and `PHASE_WORKFLOWS` stop being the source; this repo's `CLAUDE.md` declares the key and `AGENTS.md` follows <!-- builds: parsePhaseMap, DEFAULT_PHASE_MAP, phaseOfPlan, phaseOfStory and phaseWorkflows -->

### The board draws the map

- `feature/the-board-draws-the-declared-phases` — the board server reads `Workflow phases`, puts the phase list on the payload, and draws one column per phase; the wire schema names a declared phase; the auto-bump at `board.ts:2082-2117` reads the phase that holds `plan:delivered`; a refused declaration renders the default with the refusal text <!-- builds: the payload's phase list and board columns drawn from it -->
- `feature/the-idea-asks-about-design` — `/plot-idea` step 4 asks the design question and writes `State: Design` with an empty `## Spec` on yes; its README and Model Guidance table follow <!-- builds: the plot-idea design question -->

### Needs design

- `feature/a-draft-can-need-design` — `needsDesign` in `transitions/plan.ts`; `board/plot-needs-design.mjs`; `POST /api/needs-design`; the receipt and `owningCommand` for `design`; the *Needs design* button on a Draft card <!-- builds: needsDesign, the Needs design controller and its board button -->

### The prose

- `docs/the-prose-names-the-declared-phases` — `CLAUDE.md` *Phase Guardrails*, `skills/plot/SKILL.md` *Phases* and the board paragraph, `skills/plot/MANIFESTO.md` *Four phases, four artifacts* and *Lifecycle*, `DESIGN-plan.md` §4 and `DESIGN-story.md` §4 state the declared phases and the default <!-- builds: the five-phase prose -->

## Notes

- 2026-10-12: drafted by an unattended `/plot-idea` batch run from jwloka's decisions of the same day. Type, Review and Impl came from the prompt.
- 2026-10-12, deliverable search (`plot-deliverable-search.sh`): `workflow phases` and `phase map` returned no phase-map artifact, only unrelated uses of *workflow* and *phase* in `packages/fleet/src` and `scripts/`. `toBoardPhase` returned the four board files and one domain file this plan replaces. `storyPhase` returned `rules/phase.ts`, which this plan replaces. `phaseOf` returned `phaseOf` in `entities/workflow.ts:166`, which reads `PHASE_WORKFLOWS`; the first slice re-derives it from `phaseWorkflows(map)`. `needsDesign` returned no artifact. The search does not find `commission.ts`, which writes `State: Design` through an agent today; the third wave's controller replaces that write path for a person's decision, and `the-fleet-writes-the-design` takes the agent.
- 2026-10-12: the state gate refuses a `Draft` to `Design` change in an existing plan today (`rules/state-transition.ts:93`), so where the gate is installed it refuses the commit that the board's *Commission design* agent makes. The *Needs design* slice is the first owning command for `design`.
