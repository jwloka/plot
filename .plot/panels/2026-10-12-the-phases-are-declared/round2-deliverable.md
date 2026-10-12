# Round 2, deliverable lens: the-phases-are-declared

Position: proceed

Each of the five slices names an artifact that ships. Each slice can land in its wave on its own: slice 1 is domain-only and moves no board caller, slice 2 owns every board reader, and slice 4 (*Needs design*) reads `CardSchema.state` only after slice 2 has merged. The Changelog matches what the slices build, and the visible move (Draft into Design, no Discovery column) now ships in the same slice that draws the columns. The defects below are omissions that typecheck or existing gates catch, and one stale `waits:` reason in a sibling plan. None of them stops a slice from landing, so they belong in Open Points and not in another round.

## What I looked at

- Read: the subject plan in full; round-1 `deliverable.md`; the Slices and Notes of the five sibling plans (grep for this plan's branch names and new symbols); the D13-D22 rows of `STORY-plot-works-in-five-phases.md`.
- Read in code on this branch (HEAD `5b9e68ce9`): `packages/domain/src/rules/phase.ts:36-120`; `packages/domain/src/entities/workflow.ts:120-190`; `packages/domain/src/rules/state-transition.ts:90-142`; `packages/domain/src/rules/controller-gate.ts:5-54`; `packages/board/src/server/board.ts:1160-1180`, `:2075-2120`, `:2195-2258`; `packages/board/src/server/entry/ladder.ts:60-70`; `packages/board/src/server/entry/gate.ts:244-256`; `packages/board/src/app/components/PlanCard.tsx:10-85`, `:543`, `:548`; `menus.tsx:1460-1468`; `Board.tsx:165-226`; `Swimlanes.tsx:64-66`, `:158-165`; `StoryModal.tsx:80-88`; `server/fleet.ts:5838-5845`; `App.tsx:872-880`; `server/idea.ts:275-282`; `skills/plot/scripts/plot-state-receipt.sh:170-182`; `plot-plan-meta.sh:244-249`; `CLAUDE.md:166`, `:205-209`, `:499`, `:518`; `MANIFESTO.md:79`, `:99-111`; `plot-board-setup/SKILL.md:514`; `skills/plot/SKILL.md:182`; `docs/board-domain-model.md:22`, `:201`; `.gitattributes:58`; `packages/board/build.mjs:1208-1209`; `scripts/check-bundle-attributes.sh` header.
- Grep: callers of `rowPhase`, `toBoardPhase`, `storyPhase`, `phaseOrder`, `PHASE_WORKFLOWS`, `DevelopmentWorkflow`, `BOARD_PHASES`, `PHASE_LEADERSHIP` under `packages/*/src`; quoted phase-name literals and `Phase`-typed sites under `packages/board/src`; `'Discovery'` in test files (25 under `packages/board/test`, 13 of them under `integration/`, plus 2 domain tests, which gives the Motivation's 27); `recordStateReceipt` callers.
- Not run: no tests, no board, no fleet, no build.

## Round-1 points the plan marks resolved

- **Literal sites have no slice (estate, cost).** Resolved, with one gap. Slice 2 names `PlanCard.tsx:41`, `:63`, `:84`, `board.ts:1165-1177`, `:2204`, `Board.tsx:224`, `App.tsx:877`, `fleet.ts:5842`, and the cites hold. The plan misses two `Phase`-keyed sites (new defect N1).
- **Three `z.enum(BOARD_PHASES)` fields.** Resolved. `schema.ts:425`, `:736` and `:2486` hold `z.enum(BOARD_PHASES)`, and `:1349` re-exports `toBoardPhase`. Slice 2 names all four.
- **`owningCommand` does not admit a write; closed action lists; shell lines.** Resolved. `owningCommand` builds text only (`state-transition.ts:93-105`). The gate spends a receipt for `(path, after)` (`gate.ts:250`). `recordStateReceipt` is TypeScript (`ladder.ts:64`) and already serves `approve.ts:346` and `deliver.ts:368`, `:703`, so the plan's route needs no shell. `ControllerAction` (`controller-gate.ts:11`), `mayRunController` (`:50`) and `_action_of` (`plot-state-receipt.sh:173-180`) stay closed, as the plan says.
- **`storyPhase` has no production caller; empty Discovery column.** Resolved. The grep finds only `phase.ts:72` in `src`, plus tests. `planPhases(map)` drops Discovery under the default map, and Changelog bullet 2 now says so. `phaseOfStory` names its first caller in `tickets-and-stories-have-lanes` (that plan's line 86 confirms it).
- **Slice 1 moves board callers.** Resolved. Slice 1 is domain-only. All `toBoardPhase` and `rowPhase` callers (`board.ts:2082`, `:2115`, `fleet.ts:2269`, `:2506`, `:5463`) are in slice 2. `phaseOrder` and `DevelopmentWorkflow` have no reader outside `entities/workflow.ts` and `rules/phase.ts:11`, as the plan claims.
- **`rowPhase` takes no `planStatus`.** Resolved. `rowPhase(planPhase, state)` (`phase.ts:99`) and its caller `fleet.ts:5463` pass no deliverable reading, and the plan keeps rows without the bump.
- **Third `/plot-idea` question; unattended behaviour.** Resolved. `MANIFESTO.md:79` and `CLAUDE.md:166` name two questions, and the design question is a separate step. `idea.ts:279` reads "Stop at **Draft**", so a board-started plan stays Draft.
- **`phaseWorkflows` placement.** Resolved. Under the default map, `approve` (acts on `draft`, `design`) lands in Design, and `dispatch`, `implement`, `deliver` land in Development and `release` in Testing. That equals `PHASE_WORKFLOWS` at `workflow.ts:143-149`.
- **Prose slice files, Changelog bullet, `AGENTS.md`.** Resolved. Every cited prose line holds: `MANIFESTO.md:109` names Endgame, `plot-board-setup/SKILL.md:514` names Endgame, `skills/plot/SKILL.md:182` holds the Testing sentence, `board-domain-model.md:22`, `:201` name Endgame. Changelog bullet 6 covers the slice, and the slice ends with `AGENTS.md` follows.
- **`parseLocalChecks` skips silently.** Resolved in the Design text.
- **Fleet grep proves nothing.** Resolved. The grep is a fact of today, and slice 2's acceptance is a payload test over a non-default map that also asserts the Approve control on Draft cards. Because `isDraft` reads `state`, that assertion fails if the slice leaves a literal `'Discovery'` gate, so it proves something.
- **Upgrade and release note (moderator).** Resolved. Changelog bullet 3 carries the restoring declaration. The declaration restores the columns: it places `draft` in Discovery and `design` in Design, as `toBoardPhase` does at `phase.ts:42-53`.

## New defects

- **N1. Two `Phase`-keyed board sites are missing from slice 2, so "the board slice lists every literal site" is not true.** `PlanCard.tsx:13` `PHASE_ACCENT: Record<Phase, string>` is read at `PlanCard.tsx:368` as `PHASE_ACCENT[card.phase]`. `Board.tsx:173` types `toggle(phase: Phase)`. When the wire field becomes a string, both fail typecheck, and under a non-default map a card gets no accent class. Typecheck catches both, so the slice still lands, but the plan should name them and say what a declared phase outside the five gets (no accent, like no leadership badge).
- **N2. A sibling `waits:` now waits for a stale reason.** `2026-10-12-the-fleet-verifies-what-it-delivered.md:150` waits on `feature/the-phases-are-a-declaration` "because ... that slice moves the `toBoardPhase` callers in `packages/board/src/server/board.ts`". After this revision slice 1 moves no board caller; slice 2 does. If the conflict in `board.ts` is the reason, the wait must name `feature/the-board-draws-the-declared-phases`. The defect is in the sibling's text, and this plan's revision caused it.
- **N3. The new bundle omits three gated registrations.** `board/plot-needs-design.mjs` needs a `shipped…` declaration in `packages/board/build.mjs` (pattern at `:1208-1209`), a `-merge` line in `.gitattributes` (pattern at `:58`, gated by `scripts/check-bundle-attributes.sh`), and a row in `skills/plot/scripts/README.md` (gated by `scripts/check-helper-table.sh`). Slice 4 names none of them. The gates catch each one, so this is a completeness note.
- **N4. `phaseDateOf` keyed on state mixes two sort keys in one column.** Today a Draft card sits alone in Discovery with key `''` (`board.ts:1175-1176`). Under the default map, Draft cards (key `''`) and Design cards (key from `design_raw`, `:1171-1172`) share the Design column. "Each card sorts as it does today" is true per card, but the column order changes. The plan should state the order inside a shared column.
- **N5 (note). `board.ts:2252` builds `columns` from `BOARD_PHASES`.** The slice 2 text implies the change ("board columns drawn from the declared map" in its `builds:` annotation) but does not cite the line. No action needed beyond a cite.

## Readiness

From the deliverable lens the plan is ready to approve. Every slice ships a named artifact. Each wave builds and keeps its tests passing alone. The Changelog bullets map one-to-one to slices: 1 and 2 map to slices 1 and 2, 3 maps to slice 2, 4 to slice 3, 5 to slice 4 and 6 to slice 5. Round-1 note F8 still holds: slice 3 reads nothing from slice 2 and could share wave 1, and the plan does not need to change for that.

## Unresolved findings (for Open Points)

- [ ] Slice 2 names `PHASE_ACCENT` (`PlanCard.tsx:13`, read at `:368`) and `toggle` (`Board.tsx:173`), and a declared phase outside the five default names gets no accent stripe.
- [ ] `the-fleet-verifies-what-it-delivered` line 150: move the wait to `feature/the-board-draws-the-declared-phases`, or restate its reason, because slice 1 no longer moves the `board.ts` callers.
- [ ] Slice 4 names the `build.mjs` output, the `.gitattributes` `-merge` line and the `skills/plot/scripts/README.md` row for `board/plot-needs-design.mjs`.
- [ ] State the card order inside a column that holds both `draft` and `design` plans (`phaseDateOf`, `board.ts:1165-1177`).
- [ ] Cite `board.ts:2252` as the column build that moves from `BOARD_PHASES` to the payload's phase list.
