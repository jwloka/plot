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
- With the default phases, no plan reads in Discovery, and a Draft plan reads in the Design column. The plans board draws only the phases that hold a plan state, so it shows no Discovery column.
- Upgrade note: a repository with no `Workflow phases` key sees its Draft plans move from Discovery to Design on upgrade. No plan file changes. To keep the earlier columns, declare `Workflow phases: Discovery = plan:draft; Design = plan:design; Development = plan:approved; Testing = plan:delivered; Released = plan:released`.
- `/plot-idea` asks whether a plan carries significant design decisions, and writes `State: Design` on yes. An unattended run with no answer in its prompt writes `State: Draft`.
- A *Needs design* action moves a Draft plan to Design, from the board or from the command line.
- Plot's docs, `/plot` and the manifesto name the five default phases and the `Design` plan state. The fourth activity is Testing, not Endgame.

<!-- Board impact: the board's columns come from the declared map instead of BOARD_PHASES; the three wire fields typed z.enum(BOARD_PHASES) become declared names; a card carries its plan state, and the Draft and Approved predicates read it. No change to the plan format, the template or the docs/plans layout. -->

## Motivation

The phases are the operator's workflow, not a fact Plot owns (D12 in [the story](../stories/plot-works-in-five-phases/STORY-plot-works-in-five-phases.md)). Measured on `main` at `75f093cb9` and re-read on this branch, 2026-10-12:

- `packages/domain/src/entities/workflow.ts:35` declares `BOARD_PHASES` as five constant names, and `PHASE_LEADERSHIP` (`:62`) and `PHASE_WORKFLOWS` (`:143`) are keyed by them.
- `rules/phase.ts:41` `toBoardPhase` puts a `draft` plan in Discovery. `rules/phase.ts:72` `storyPhase` maps the six story statuses over all five phases, and no production code calls it: its callers are `packages/domain/test/phase.test.ts` and `test/workflow.test.ts`.
- `packages/board/src/server/board.ts:2082-2115` moves a `deliverable` plan into `toBoardPhase('delivered')`.
- The board decides behaviour from literal phase names. `PlanCard.tsx:83-85` `isDraft` is `card.phase === 'Discovery'`, and it gates the Approve and Interrogate controls (`PlanCard.tsx:543`, `:548`) and the row menu's Approve and Commission entries (`menus.tsx:1464-1466`). Other literal sites: `PlanCard.tsx:41`, `:63`, `board.ts:1165-1177` (`phaseDateOf`), `board.ts:2204`, `Board.tsx:224`, `App.tsx:877` and `server/fleet.ts:5842`. 27 test files hold a `'Discovery'` literal, 13 of them under `packages/board/test/integration/`.
- No command writes `State: Design`. The state gate admits a change of `State:` only when a receipt for that path and value exists (`packages/board/src/server/entry/gate.ts:248-253`), and no command writes a receipt for `Design`. The refusal text from `owningCommand` (`rules/state-transition.ts:93-105`) names the lifecycle `Draft > Approved > Delivered > Released`.
- `CLAUDE.md` *Phase Guardrails* (`:205-209`), `skills/plot/SKILL.md:170-182` and `:266`, `skills/plot/MANIFESTO.md:99-111` and `:148`, `skills/plot/intro-to-using-plot.md:17`, `skills/plot-board-setup/SKILL.md:514` and `docs/board-entity-properties.md:38`, `:154` describe four plan states, four columns or an Endgame phase. `DESIGN-plan.md` §4 (`:688-900`) already separates phases from states and names the five phases (`:748-755`).

## Design

### Approach

The design spec is [DESIGN-phases.md](../stories/plot-works-in-five-phases/DESIGN-phases.md) §2 and §3.

**Two words.** A *state* is the `State:` word in a plan file. A *phase* is a declared column. New code names a plan's state `state`. `PlanReadings.phase` (`rules/phase.ts:118`) holds a state under the old name, and this plan does not rename it.

**The declaration.** A new rule, `packages/domain/src/rules/workflow-phases.ts`, exports `parsePhaseMap(value)` and `DEFAULT_PHASE_MAP`. `parsePhaseMap` takes the key's text and returns an ordered phase map, or a refusal that names the entry and the reason. The grammar is DESIGN-phases.md §2: `;`-separated entries of `<name> = plan:<state>, story:<status>, …`, with `story:*` for every status. `plan:rejected` and `plan:superseded` cannot be declared. A state or status in two phases is a refusal. The split into entries follows `rules/local-checks.ts:73-82`, but `parseLocalChecks` skips a malformed entry and `parsePhaseMap` refuses it.

**The default.** `DEFAULT_PHASE_MAP` is `Discovery = story:*; Design = plan:draft, plan:design; Development = plan:approved; Testing = plan:delivered; Released = plan:released`. A unit test asserts that its names equal `BOARD_PHASES` in order. `BOARD_PHASES`, the `Phase` type, `phaseOrder` (`workflow.ts:80`) and `DevelopmentWorkflow` (`workflow.ts:176-186`) stay as the default map's names; no production code outside `entities/workflow.ts` reads `phaseOrder` or `DevelopmentWorkflow`. Plot's own `CLAUDE.md` declares the default as the `Workflow phases` key, and `./scripts/check-agents-md.sh --write` regenerates `AGENTS.md`.

**The phase of a plan and a story.** `phaseOfPlan(map, readings)` replaces `toBoardPhase`, and `phaseOfStory(map, status)` replaces `storyPhase`. The readings are the plan state and an optional `deliverable` flag. A deliverable plan reads in the phase that holds `plan:delivered`; when no phase holds it, the plan stays in the phase of its state. A state no phase holds answers `null`, as `toBoardPhase` does for `rejected` today. `planPhases(map)` answers the declared phases that hold at least one `plan:` member, in declared order. The tracer refinement of DESIGN-phases.md §3 belongs to `design-work-proves-the-path`, which adds the marker. `phaseOfStory` has no production caller in this plan, as `storyPhase` has none today; its first caller is the Discovery tab of `tickets-and-stories-have-lanes`.

**Workflows and leadership.** `phaseWorkflows(map)` derives the workflow list per phase: a lifecycle workflow belongs to the first declared phase that holds a state it acts on. `approve` acts on `draft` and `design`, `dispatch`, `implement` and `deliver` act on `approved`, and `release` acts on `delivered`. With the default map the answer equals today's `PHASE_WORKFLOWS`, and a unit test asserts that equality. `PHASE_WORKFLOWS` becomes `phaseWorkflows(DEFAULT_PHASE_MAP)`, and the doc block at `workflow.ts:126-137` states the new rule. `PHASE_LEADERSHIP` stays keyed by the five default names, and a declared phase outside them carries no leadership.

**The board.** The board server reads the key once per build through the plan store's `config(key, fallback)` (`ports/plan-store.ts:131`), parses it with `parsePhaseMap`, and puts `planPhases(map)` on the payload as the phase list. On a refusal the board renders the default map and shows the refusal text above the columns. The plans board draws one column per listed phase, so the default map draws no Discovery column; the released plan `2026-08-16-board-shows-discovery.md` measured a column that can never hold a card as a defect. The board's own phase readers move to the map:

- **The wire.** The three fields typed `z.enum(BOARD_PHASES)`, `schema.ts:425` (card), `:736` (column) and `:2486` (row, nullable), become strings, and a payload test asserts that each names a phase of the payload's list. The re-export of `toBoardPhase` (`schema.ts:1349`) goes.
- **The card carries its state.** `CardSchema` gains `state`, the plan's lowercased `State:` word. `isDraft` reads `state === 'draft'`. `isApproved` (`PlanCard.tsx:62-64`), `isReadyToStart` (`:40-42`) and the `started` assignment at `board.ts:2204` read `state === 'approved'` and not `deliverable`, which is today's answer under the default map.
- **Other literals.** `phaseDateOf` (`board.ts:1165-1177`) keys on the plan state and the `deliverable` flag, so each card sorts as it does today. The checklist at `Board.tsx:224` renders in the phase that holds `plan:delivered`. `App.tsx:877` reads `c.state === 'released'`. `Board.tsx:217-219` and `Swimlanes.tsx:161-163` render no leadership badge where `PHASE_LEADERSHIP` has no entry. `LANE_PHASES` (`Swimlanes.tsx:66`) and `plansInStory` (`StoryModal.tsx:84`) read the payload's phase list. `mock-fleet.ts` keeps the default names.
- **Rows.** The agent-row build in `server/fleet.ts` receives the parsed map. `:5463` reads `phaseOfPlan(map, { state })` with no `deliverable` flag, so a row does not auto-bump, as today. `:5842` gives an `idea/` row the phase that holds `plan:draft`.
- **The auto-bump** at `board.ts:2082-2115` reads `phaseOfPlan(map, { state, deliverable })`. `toBoardPhase` and `rowPhase` go.

**The fleet reads no phase name.** `packages/fleet/src` reads no phase name today (a grep for the five names, `BOARD_PHASES`, `toBoardPhase`, `storyPhase` and `rowPhase` returns zero, 2026-10-12), and no slice adds one. The board server's `fleet.ts` is board code, and the board slice moves its two phase readers. The board slice's acceptance test builds a payload from the map `Idea = plan:draft, plan:design; Build = plan:approved; Done = plan:delivered, plan:released` and asserts that every card, column and row names one of those three phases, and that the Approve control shows on every Draft card.

**Needs design.** A new transition `needsDesign(plan, input)` in `transitions/plan.ts` moves `draft` to `design` and refuses every other state by name. It writes `State: Design`, a `Design:` record (`<date>, <who>, <channel>`, the shape of `Approved:`) and an empty `## Spec` section with the placeholder `_To be filled in during Design._`. The comment at `plot-plan-meta.sh:246-248` changes in place to that shape, with no net shell lines. A bundle `board/plot-needs-design.mjs` and an endpoint `POST /api/needs-design` call it. Each writes a state receipt for `Design` through `recordStateReceipt` (`server/entry/ladder.ts:64`), which admits the commit at the state gate. The receipt writer is TypeScript, so `plot-state-receipt.sh` and `check-shell-lines.sh` see no change. `owningCommand` gains a `design` arm that names the bundle, and its fallback text names the lifecycle `Draft > Design > Approved > Delivered > Released`. The controller gate's action list (`controller-gate.ts:11`, `:50`) and `_action_of` (`plot-state-receipt.sh:173-180`) do not list *Needs design*: like `idea` and `commission`, the action carries no action receipt. The board shows a *Needs design* button on a card whose `state` is `draft`. `CLAUDE.md` *The Master Agent Uses The Controllers* names the tenth endpoint (`:499`) and the receipt writers (`:518`), and `AGENTS.md` follows.

**The design question in `/plot-idea`.** D3 gives the question to `/plot-idea`, and the plan keeps it out of the ceremony questions: MANIFESTO Principle 10 (`MANIFESTO.md:79`), the plot-idea frontmatter and `CLAUDE.md:166` name two ceremony questions, and they stay at two. A new step after step 4 of `skills/plot-idea/SKILL.md` asks *"Does this plan carry significant design decisions?"* and records the answer as `State:`, not as a ceremony answer. On yes, the plan file is created with `State: Design` and the empty `## Spec` section. A new file passes the state gate, because the gate admits a creation (`rules/state-transition.ts:137`). The default answer is no. Under `PLOT_UNATTENDED=1` the step reads the answer from the prompt; with none, it writes `State: Draft` and names the skipped question in the output, so no model decides design (D3). The board's idea prompt (`server/idea.ts:279`, "Stop at Draft") runs unattended and gives no answer, so a board-started plan is Draft; the prompt does not change. The Model Guidance table gives the step the Mid tier: a Mid model recommends an answer, and a Small model asks.

**The prose.** The plan states stay as they are, and `Design` joins them as the optional state between Draft and Approved. The declared phases go where the prose names columns or activities: the activity table in `MANIFESTO.md:99-111` names Testing in place of Endgame and adds Released, and `skills/plot/SKILL.md:182` no longer says that a plan has no Testing phase.

**Adopting repositories.** D12 applies the default map to every repository that declares no key. On upgrade such a repository sees its Draft plans in Design and no Discovery column on the plans board; no plan file, command or config key changes meaning. The change is not breaking under *Versioning* in `CLAUDE.md`, because one declaration restores the earlier columns, and the changesets bump `plot` and `@plot-pm/board` minor. The release note is the Changelog's upgrade bullet.

**Tests per slice.** The declared map: `packages/domain/test/phase.test.ts` and `test/workflow.test.ts` drop `storyPhase` and gain the new rules. The board: `test/unit/phases.test.ts`, `swimlanes.test.ts`, `fleet.test.ts`, `classifier-is-total.test.ts`, `merged-slices-reach-testing.test.ts`, `column-overflow.test.ts`, `agent-list.test.ts`, `catalogue/states.ts`, and the 25 board test files that hold a `'Discovery'` literal (13 under `test/integration/`, which run as browser tests under `pnpm run test:board`).

### Open Points

- [ ] The key name `Workflow phases` and its grammar are this plan's proposal (story Open Point 1).
- [ ] A declared phase outside the five default names gets no leadership badge (story Open Point 2).
- [ ] A custom map that puts a story status into a plan phase: the Discovery tab lists every story, and the Planning tab lists plans only (story Open Point 3). This plan builds the map; `the-board-has-three-tabs` builds the tabs.
- [x] ~~Panel 2026-10-12 (estate, cost): the board tests phase names as literals, and no slice owns those sites.~~ Resolved: the card carries its `state`, and the board slice lists every literal site and its new reading (Design › The board).
- [x] ~~Panel 2026-10-12 (all four lenses): the wire schema has three `z.enum(BOARD_PHASES)` fields, `schema.ts:425`, `:736` and `:2486`.~~ Resolved: the board slice names all three and a payload test checks each against the phase list.
- [x] ~~Panel 2026-10-12 (all four lenses): `owningCommand` only builds the refusal text; the receipt admits the write. The action lists and `_action_of` are closed, and a shell edit pays lines.~~ Resolved: the bundle and endpoint write the state receipt through `recordStateReceipt` (TypeScript, no shell lines); the controller gate does not list the action, as for `idea` and `commission`; `owningCommand` only names it.
- [x] ~~Panel 2026-10-12 (deliverable, estate, contradiction): `storyPhase` has no production caller, so `phaseOfStory` has no consumer and Changelog bullet 2 ships an empty Discovery column.~~ Resolved: the Motivation states the zero callers, `phaseOfStory` names its first caller in `tickets-and-stories-have-lanes`, and the plans board draws only `planPhases(map)`, so no empty column ships.
- [x] ~~Panel 2026-10-12 (deliverable, cost): slice 1 moves the board callers, so the visible move lands in wave 1; `StoryModal.tsx:84`, `phaseOrder` and `WORKFLOW` have no slice.~~ Resolved: slice 1 is domain-only and moves no board caller; the board slice moves every caller, the wire fields and `StoryModal.tsx`; `phaseOrder` and `DevelopmentWorkflow` stay as the default names with no production reader.
- [x] ~~Panel 2026-10-12 (deliverable, contradiction): `rowPhase` takes no `planStatus`; a map with no phase holding `plan:delivered` drops the auto-bumped card.~~ Resolved: rows pass no `deliverable` flag, and a deliverable plan stays in its state's phase when no phase holds `plan:delivered`.
- [x] ~~Panel 2026-10-12 (contradiction, estate): the third `/plot-idea` question contradicts "two independent questions" and declares no unattended behaviour.~~ Resolved: the design question is its own step, not a ceremony question, so Principle 10 holds; unattended with no answer writes Draft; `idea.ts:279` stays.
- [x] ~~Panel 2026-10-12 (contradiction): `phaseWorkflows` contradicts `entities/workflow.ts:126-137` and gives no answer for `dispatch` and `implement`.~~ Resolved: a workflow belongs to the first phase that holds a state it acts on, which places all five and replaces the doc block.
- [x] ~~Panel 2026-10-12 (contradiction, cost, deliverable): the prose slice merges states and phases, misses files, has no Changelog bullet and no `AGENTS.md` step; the `DESIGN-plan.md`/`DESIGN-story.md` claim is false.~~ Resolved: the prose slice adds `Design` as a state and puts phases in the activity table, lists every file with its line, carries a Changelog bullet and regenerates `AGENTS.md`; the Motivation drops the false claim, and `DESIGN-story.md` leaves the scope.
- [x] ~~Panel 2026-10-12 (estate): `parseLocalChecks` skips a bad entry silently.~~ Resolved: the Design says `parsePhaseMap` shares only the split and refuses a malformed entry.
- [x] ~~Panel 2026-10-12 (estate, contradiction, deliverable): the acceptance grep under `packages/fleet/src` already returns zero.~~ Resolved: the grep is stated as today's fact, and the board slice's acceptance is a payload test over a non-default map.
- [x] ~~Panel 2026-10-12 (moderator): the default map moves every adopting repository's Draft plans with no word on breaking change or release notes; `plot-board-setup/SKILL.md:514` still names Endgame.~~ Resolved: *Adopting repositories* states a minor bump and the Changelog carries the upgrade note with the declaration that restores the earlier columns; the prose slice lists `:514`.

## Slices

### The declared map

- `feature/the-phases-are-a-declaration` — `rules/workflow-phases.ts` with `parsePhaseMap`, `DEFAULT_PHASE_MAP`, `phaseOfPlan`, `phaseOfStory`, `planPhases` and `phaseWorkflows`, with unit tests; `PHASE_WORKFLOWS` derived from `phaseWorkflows(DEFAULT_PHASE_MAP)` and its doc block rewritten; `storyPhase` deleted; no board caller moves, so the board renders as today; this repo's `CLAUDE.md` declares the key and `AGENTS.md` follows <!-- builds: parsePhaseMap, DEFAULT_PHASE_MAP, phaseOfPlan, phaseOfStory, planPhases and phaseWorkflows -->

### The board draws the map

- `feature/the-board-draws-the-declared-phases` — the board server reads `Workflow phases` and puts `planPhases(map)` and any refusal on the payload; the three wire fields (`schema.ts:425`, `:736`, `:2486`) become declared names; `CardSchema.state`, with `isDraft`, `isApproved`, `isReadyToStart` and `board.ts:2204` reading it; `phaseDateOf`, `Board.tsx:224`, `App.tsx:877`, the leadership guard at `Board.tsx:217` and `Swimlanes.tsx:161`, `LANE_PHASES` and `plansInStory`; the agent rows at `fleet.ts:5463` and `:5842`; the auto-bump at `board.ts:2082-2115`; `toBoardPhase` and `rowPhase` deleted; the board tests and fixtures that name Discovery for a Draft plan <!-- builds: the payload's phase list, CardSchema.state and board columns drawn from the declared map -->

### The idea asks about design

- `feature/the-idea-asks-about-design` — a `/plot-idea` step after the ceremony questions asks the design question and writes `State: Design` with an empty `## Spec` on yes; its unattended rule writes Draft with no answer; its README and Model Guidance table follow <!-- builds: the plot-idea design question -->

### Needs design

- `feature/a-draft-can-need-design` — `needsDesign` in `transitions/plan.ts`; `board/plot-needs-design.mjs`; `POST /api/needs-design`; the state receipt through `recordStateReceipt`; the `design` arm and lifecycle text of `owningCommand`; the `Design:` comment in `plot-plan-meta.sh`; the *Needs design* button on a card whose state is `draft`; `CLAUDE.md` `:499` and `:518`, and `AGENTS.md` follows <!-- builds: needsDesign, the Needs design controller and its board button -->

### The prose

- `docs/the-prose-names-the-declared-phases` — `CLAUDE.md` *Phase Guardrails* (`:205-209`) adds the `Design` state; `skills/plot/SKILL.md` *Plan Phases* (`:170-182`) adds `Design` and drops the Testing sentence at `:182`, and the board paragraph (`:266`) names the declared phases; `skills/plot/MANIFESTO.md` *Four phases, four artifacts* (`:99-111`) names Testing and Released, and *Lifecycle* (`:148`) adds `Design`; `skills/plot/intro-to-using-plot.md:17`; `skills/plot-board-setup/SKILL.md:514`; `docs/board-entity-properties.md:38`, `:154`; `docs/board-domain-model.md:22`, `:201`; `DESIGN-plan.md:748-755` names the five as the default; `AGENTS.md` follows <!-- builds: the five-phase prose -->

## Notes

- 2026-10-12: drafted by an unattended `/plot-idea` batch run from jwloka's decisions of the same day. Type, Review and Impl came from the prompt.
- 2026-10-12, deliverable search (`plot-deliverable-search.sh`): `workflow phases` and `phase map` returned no phase-map artifact, only unrelated uses of *workflow* and *phase* in `packages/fleet/src` and `scripts/`. `toBoardPhase` returned the four board files and one domain file this plan replaces. `storyPhase` returned `rules/phase.ts`, which this plan replaces. `phaseOf` returned `phaseOf` in `entities/workflow.ts:166`, which reads `PHASE_WORKFLOWS`; the first slice re-derives it from `phaseWorkflows(map)`. `needsDesign` returned no artifact. The search does not find `commission.ts`, which writes `State: Design` through an agent today; the *Needs design* controller replaces that write path for a person's decision, and `the-fleet-writes-the-design` takes the agent.
- 2026-10-12: the state gate refuses a `Draft` to `Design` change in an existing plan today, because no command writes a receipt for `Design` (`gate.ts:248-253`). Where the gate is installed it refuses the commit that the board's *Commission design* agent makes. The *Needs design* slice is the first command that writes that receipt.
- 2026-10-12: `docs/board-domain-model.md` from `:458` on records dated measurements that name Endgame. They stay as recorded; the prose slice changes the two rows that state the current vocabulary.
