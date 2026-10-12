## Implementation brief — the-phases-are-declared (wave 3: The board draws the map)

- **Plan (canonical):** [docs/plans/2026-10-12-the-phases-are-declared.md](../../docs/plans/active/the-phases-are-declared.md) on `main`
- **Approved:** 2026-10-12, Jan Wloka, plan-PR #1608 merged
- **Branch:** `feature/the-board-draws-the-declared-phases` (base: `main`)
- **Ends as:** one PR to `main`, opened with `../plot/scripts/plot-open-pr.sh`
- **Review of the code:** per repo convention; the PR is reviewed as code

Both prior waves have merged to `main`: wave 1 (`feature/the-phases-are-a-declaration`, PR #1614) built `packages/domain/src/rules/workflow-phases.ts` with `parsePhaseMap`, `DEFAULT_PHASE_MAP`, `phaseOfPlan`, `phaseOfStory`, `planPhases` and `phaseWorkflows` — confirmed present, `phaseColumns` is **not** among them yet. Wave 2 (`feature/the-card-carries-its-controls`, PR #1617) added `CardSchema.controls` and made `isDraft`/`isApproved`/`isReadyToStart` read `card.controls.*` instead of `card.phase` literals — that work is done and this slice must not re-touch it. **You build on `main` directly.** `the-fleet-verifies-what-it-delivered`'s first slice (`feature/a-delivered-plan-carries-its-verification`) waits on this branch landing. Checked 2026-10-12: no open PR or local branch currently touches `board.ts`, `schema.ts`, `fleet.ts` or `workflow-phases.ts` — you have the field to yourself.

### What to build

Today the board still computes columns and phase labels from the hardcoded five-name constant `BOARD_PHASES` and the functions `toBoardPhase`/`rowPhase` in `packages/domain/src/rules/phase.ts` (both still present, lines 40 and 69). This slice is the actual map switch: it makes the board read the `Workflow phases` config key, parse it with `parsePhaseMap` (wave 1), and drive every column/phase/row decision from the parsed map instead of the five-name constant. Everything in wave 1 and wave 2 exists specifically so this slice has somewhere to plug in.

Build, in the domain first:

1. **`phaseColumns(map)`** in `packages/domain/src/rules/workflow-phases.ts` (new export, confirmed absent today). Per the plan's Design section (*View states are domain properties*): one entry per name of `planPhases(map)`, shape `{ name, leadership, accent, checklist }`. `leadership` is the `PHASE_LEADERSHIP` entry for a default name, `null` otherwise. `accent` is the name itself when it's one of the five default names, `'neutral'` otherwise — `PHASE_ACCENT` must map each default name plus `'neutral'` to a CSS class. `checklist` is `true` for the phase holding `plan:delivered`, `false` for every other.

2. **The board server reads the key.** In `packages/board/src/server/board.ts`, add the `Workflow phases` read as a fourth member of the concurrent config reads at `:1869-1875` (currently reads `Plan directory`, `Sprint directory`, `Story directory` via `Promise.all`) — so this adds no serial spawn. Parse with `parsePhaseMap`; on refusal, fall back to `DEFAULT_PHASE_MAP` and carry the refusal text on the payload (the plan: "the board renders the default map and puts the refusal text on the payload, and `Board.tsx` shows it above the columns").

3. **The column build.** `board.ts:2254` (`const columns: Column[] = BOARD_PHASES.map((phase) => ({...`) becomes `phaseColumns(map).map(...)` — read the map from step 2, not the constant.

4. **The auto-bump.** `board.ts:2083` (`const mapped = toBoardPhase(meta.phase, started)`) and `:2116` (`const phase = deliverable ? toBoardPhase('delivered')! : mapped`) become `phaseOfPlan(map, { state, deliverable })` calls per the plan's Design (*The auto-bump*). `phaseDateOf` (defined `:1166`, called `:2154`) keys on plan state and the `deliverable` flag as it does today — no change to its logic, only confirm it still receives what it needs once `toBoardPhase` is gone from this file.

5. **The wire schema — three `z.enum(BOARD_PHASES)` fields become plain strings.** Current locations (drifted from the plan's citations — use these): card field `schema.ts:426`, column field `schema.ts:745`, row field `schema.ts:2495` (nullable). Add a payload test asserting each field's value names a phase present in the payload's own column list — never re-validate against the old five-name enum. The `toBoardPhase` re-export at `schema.ts:1358` goes.

6. **Board.tsx.** `toggle` (`:173-174`) takes a string instead of the `BOARD_PHASES` enum type. The checklist-column decision and `PHASE_LEADERSHIP` indexing (`:217`, `:219`) read the payload's `phaseColumns` answer (`leadership`, `checklist`) instead of indexing a module-level constant by column name.

7. **Swimlanes.tsx.** `LANE_PHASES = BOARD_PHASES` (`:66`) reads the payload's column list instead of the constant. `PHASE_LEADERSHIP` indexing at `:161`, `:163` follows the same change as Board.tsx's.

8. **PlanCard.tsx.** `PHASE_ACCENT` usage at `:359` (declared `:13`) reads the column's `accent` field from the payload rather than indexing the constant by a literal phase name.

9. **StoryModal.tsx.** `plansInStory` (declared `:83`, called `:118`) reads the payload's column list — per the plan (D27), story lanes stay governed separately (`story:*` in Discovery); this function only needs to know which names are *plan* phases, which `planPhases(map)` already restricts to.

10. **fleet.ts — rows.** `rowsFromPulse` (`:4910`) takes the parsed map as a new parameter. The fleet render reads the `Workflow phases` key once per render, as one more member of its own concurrent reads at `:6526`, and passes the map through at the call site `:6555` — so this adds no serial `plot-config.sh` spawn either. Row phase assignment at `:5463` (`phase: rowPhase(plan.phase, b.state)`) becomes `phaseOfPlan(map, { state })` with **no** `deliverable` flag (rows don't auto-bump, matching today). The planless-branch row at `:5842` (`phase: /^idea\//.test(branch) ? 'Discovery' : null`) changes to give an `idea/` row the phase that holds `plan:draft` in the map, not the literal string `'Discovery'`.

11. **Delete `toBoardPhase` and `rowPhase`.** Both in `packages/domain/src/rules/phase.ts` (lines 40 and 69 today). Note while verifying: `fleet.ts` has **no reference to `toBoardPhase` at all** — the plan's citation of `fleet.ts:2269` as a `toBoardPhase` re-export is stale; what's actually at that neighborhood is the `rowPhase` re-export (`fleet.ts` re-exports `rowPhase`, not `toBoardPhase`), and the export-list entry the plan cites at `:2506` is `rowPhase,` not `toBoardPhase,`. Remove the `rowPhase` re-export and export-list entry from `fleet.ts`; there is no `toBoardPhase` re-export in that file to remove.

### Decisions the plan settles — do not re-derive them

- **This is a map-switch slice, not a controls slice.** Wave 2 already moved the Approve/Interrogate/Dispatch/ReadyToStart decision into `cardControls` and the `controls` wire field — that's done and out of scope here. This slice's only externally-visible change is *which column a card/row renders in* (and the three wire fields' type), driven by the parsed map instead of the five-name constant. Don't touch `CardSchema.controls`, `cardControls`, or the three predicates in `PlanCard.tsx` — wave 2 owns them.
- **No Discovery column for plans under the default map.** `planPhases(map)` counts only `plan:` members, so even though `Discovery = story:*` holds a member, it holds no `plan:` member and draws no column on the plans board — this is deliberate (D27), not a bug to "fix" by adding one.
- **A phase outside the five default names gets no leadership badge and the neutral accent (D26).** Don't invent leadership or a color for a name `PHASE_LEADERSHIP`/`PHASE_ACCENT` don't recognize — `phaseColumns` must answer `null`/`'neutral'` for it, by design, not as a gap.
- **`phaseOfStory` has no caller in this slice.** Its first production caller is the Discovery tab in `tickets-and-stories-have-lanes` (a separate plan). Don't wire story lanes through it here — `LANE_PHASES`/`Swimlanes.tsx` reads the payload's plan-column list, which `planPhases(map)` already produces; story lane handling is unchanged by this slice.
- **Rows never auto-bump.** `rowsFromPulse`'s `phaseOfPlan` call passes no `deliverable` flag — only the board's own payload build (`board.ts`) does that, for the auto-bump case specifically. Don't make rows deliverable-aware; that was true before this slice and stays true.
- **Line numbers drift — verify before you cite them in the PR.** Every citation above was re-measured against `main` at the time this brief was written (2026-10-12) and several differ from the plan's own citations (which were measured earlier, against an older `main`). Re-check with a fresh grep before editing — don't trust either this brief's or the plan's line numbers blindly once you've made your own edits shift things further.

### Done when

The plan's `## Design` (*The board* paragraph and its five sub-bullets: *The wire*, *Other literals*, *Card order in a shared column*, *Rows*, *The auto-bump*) and the *Tests per slice* entry for "The board draws the map" are the specification:

- `workflow-phases.test.ts` gains `phaseColumns` cases: leadership/accent/checklist for each of the five default names, `null`/`'neutral'` for a name outside them, and the checklist flag landing on exactly the phase holding `plan:delivered`.
- A new payload acceptance test (no browser) over a **non-default** map — the plan's own example: `Idea = plan:draft, plan:design; Build = plan:approved; Done = plan:delivered, plan:released`. Assert: every card, column and row names one of those three phases; `controls.approve` (wave 2's field) is still `true` on every Draft and Design card and `false` on every other, proving the map switch doesn't disturb wave 2's work; only `Done` carries `checklist: true`; no column carries `leadership`; every column's `accent` is `'neutral'`.
- The 25+ board test files holding a `'Discovery'` literal for a Draft plan (the plan names `test/unit/phases.test.ts`, `swimlanes.test.ts`, `fleet.test.ts`, `classifier-is-total.test.ts`, `merged-slices-reach-testing.test.ts`, `column-overflow.test.ts`, `agent-list.test.ts`, `mock-fleet.test.ts`, `catalogue/states.ts`, plus `tiny-garden.data.test.ts:34` and `port.test.mjs:90`) move to the new mapping — under the **default** map a Draft plan now reads in **Design**, not Discovery. Grep for the literal yourself; don't assume the plan's file list is exhaustive, since this slice is exactly where line-number drift has already shown up twice.
- `mock-fleet.ts`'s two `idea/` rows (currently hardcoded `'Discovery'` per the plan's citations `:306`, `:325` — re-locate, these have likely drifted too) read whichever phase holds `plan:draft` in the map they're given, which is `Design` under the default map.
- `packages/domain/test/phase.test.ts` and `packages/domain/test/workflow.test.ts` (wave 1 already dropped `storyPhase` from these; confirm no `toBoardPhase`/`rowPhase` assertions remain once you delete those functions).

Plus: a changeset bumping `@plot-pm/board` **and** `plot` minor — this is the user-visible column switch the plan's Changelog bullet 2 and *Adopting repositories* describe ("no Discovery column... a Draft plan reads in the Design column"), description first, `bumps:` block last per CLAUDE.md *Versioning*. Run `node ../plot/scripts/board/plot-local-checks.mjs` before each push and run what it prints — for this branch that's `packages/domain/**` vitest-related + `tsc --noEmit`, `packages/board/src/**` vitest-related + `pnpm run typecheck`, and the repo-wide `scripts/check-*.sh` gates. The suites under the `CI suites` config key (`test:e2e`, `test:contracts`, `test:board`, domain coverage, `test/reconcile/*.test.mjs`) run in CI on this PR only — do not run them locally, especially not `test:e2e` (CLAUDE.md *Testing*: it dispatches real workers into sandbox repos and is CI's gate, not a local one).

Name the shell gate if you touch any `.sh` file (you likely won't — this slice is domain + board TypeScript): `scripts/check-shell-lines.sh` refuses a PR whose shell under `skills/` grows past its merge base with no stored allowance.

### Bookkeeping

Open the PR through the controller, never `gh pr create`:

```bash
skills/plot/scripts/plot-open-pr.sh          # current branch
skills/plot/scripts/plot-open-pr.sh --draft  # while work is still moving
```

It reads which plan names this branch and opens the PR with the slice heading as title, the plan and this brief in the body. Push the first real commit as soon as it exists — a branch with no PR and no commits is invisible to the fleet. Once the PR exists, append `→ #<number>` to this branch's line in the plan's `## Slices` section, under *The board draws the map*.

### Scope guard

This branch owns:

- `packages/domain/src/rules/workflow-phases.ts` — adds `phaseColumns` only (don't re-touch `parsePhaseMap`, `phaseOfPlan`, `phaseOfStory`, `planPhases`, `phaseWorkflows` — wave 1 already shipped them correctly)
- `packages/domain/src/rules/phase.ts` — deletes `toBoardPhase` and `rowPhase`
- `packages/domain/test/workflow-phases.test.ts` — `phaseColumns` cases
- `packages/domain/test/phase.test.ts`, `packages/domain/test/workflow.test.ts` — drop any remaining `toBoardPhase`/`rowPhase` assertions
- `packages/board/src/contract/schema.ts` — the three `z.enum(BOARD_PHASES)` fields (card `:426`, column `:745`, row `:2495`) become plain strings; the `toBoardPhase` re-export (`:1358`) goes. Not `CardSchema.controls` — wave 2's.
- `packages/board/src/server/board.ts` — the concurrent config read, the column build (`:2254`), the auto-bump (`:2083`, `:2116`), `phaseDateOf`'s inputs if they shift
- `packages/board/src/server/fleet.ts` — `rowsFromPulse` (`:4910`) signature, the concurrent read (`:6526`) and call site (`:6555`), row phase assignments (`:5463`, `:5842`), removes the `rowPhase` re-export and its export-list entry (`:2506`)
- `packages/board/src/server/mock-fleet.ts` — the two `idea/` rows
- `packages/board/src/app/components/Board.tsx` — `toggle` (`:173-174`), the checklist/leadership reads (`:217`, `:219`)
- `packages/board/src/app/components/Swimlanes.tsx` — `LANE_PHASES` (`:66`), leadership reads (`:161`, `:163`)
- `packages/board/src/app/components/PlanCard.tsx` — `PHASE_ACCENT` usage (`:359`) only — not `isDraft`/`isApproved`/`isReadyToStart` (wave 2's)
- `packages/board/src/app/components/StoryModal.tsx` — `plansInStory` (`:83`/`:118`)
- the 25+ board test files/fixtures carrying a `'Discovery'`-for-Draft literal
- one changeset under `.changeset/`

It does not touch `CardSchema.controls`, `cardControls`, the three card-control predicates' bodies, `packages/fleet/src` (confirmed zero phase-name references there, and this slice adds none), or any `.sh` script. No other in-flight branch or open PR touches these files as of 2026-10-12 — you have this scope to yourself, but re-run `git fetch` and check before you push in case that's changed.

If you find something the plan did not anticipate — a predicate site the plan doesn't name, a line-number citation that's drifted further than this brief already found, a test file the plan's list misses — report it rather than improvising outside scope.
