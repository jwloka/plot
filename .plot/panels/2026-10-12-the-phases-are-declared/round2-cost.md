# Cost lens, round 2: the-phases-are-declared

Position: proceed

## Summary

The revision resolves all eight round-1 cost findings, and the code on this branch confirms every citation I checked. The plan now names its spend: slice 1 is domain-only, the board churn sits in one named slice, the *Needs design* receipt costs no shell lines, and the upgrade move for adopting repositories is stated with a restoring declaration. The remaining cost defects are small. The board slice's test count misses three files that assert today's Discovery mapping without the quoted literal, and one of them (`approve.browser.test.ts:136`) inverts under the default map. These are Open Points for the implementing agent, not a reason to hold approval.

## What I looked at

- Read: the subject plan (all 117 lines); round-1 `cost.md`; `rules/phase.ts:30-140`; `entities/workflow.ts:78-82`, `:124-140`, `:174-188`; `rules/state-transition.ts:88-140`; `rules/controller-gate.ts:1-80`; `rules/local-checks.ts:70-84`; `ports/plan-store.ts:128-133`; `adapters/plan-store/plan-store-shell.ts:188-200`; `server/entry/gate.ts:240-256`; `server/entry/ladder.ts:55-80`; `server/board.ts:98-112`, `:1163-1180`, `:1858-1880`, `:2200-2206`, `:2245-2258`; `schema.ts:423-426`, `:734-737`, `:2484-2488`; `Board.tsx:214-226`; `Swimlanes.tsx:64-68`, `:158-165`; `StoryModal.tsx:82-86`; `App.tsx:875-879`; `server/fleet.ts:5838-5845`; `plot-state-gate.sh`, `plot-phase-gate.sh`; `scripts/check-shell-lines.sh:1-20`; `plot-plan-meta.sh:240-250`; every prose line the prose slice cites; `port.test.mjs:84-92`; `tiny-garden.data.test.ts:20-34`; `approve.browser.test.ts:130-142`; `classifier-is-total.test.ts:88-104`.
- Grepped: `'Discovery'` under `packages/*/test`; unquoted `Discovery` and `columns.length, 5` in board and domain tests; `toBoardPhase|rowPhase|storyPhase`; `BOARD_PHASES|PHASE_WORKFLOWS|phaseOrder|PHASE_LEADERSHIP`; phase-name literals in `packages/*/src`; `phase ===` comparisons; `isDraft|isApproved|isReadyToStart`; this plan's five branch names and `waits:` in the sibling plans; `Discovery|Endgame` in shipped shell.
- Ran: `git log --oneline -8`. No tests, builds, board or fleet commands.

## Round-1 points

1. **`isDraft` reads the column — resolved.** The plan (`:55`, slice `:98`) gives `CardSchema` a `state` and moves `isDraft` (`PlanCard.tsx:83-85`), `isApproved` (`:62-64`) and `isReadyToStart` (`:40-42`) to it. `menus.tsx:1204` and `:1464-1466` read these predicates, so they follow. The acceptance test (`:60`) asserts the Approve control on every Draft card under a non-default map, which proves the predicate and not the column.
2. **Literal phase names not counted — resolved.** My grep of `'(Discovery|Design|Development|Testing|Released)'` in `packages/board/src` (outside `mock-fleet.ts` and comments) returns exactly the sites the plan lists: `PlanCard.tsx:41`, `:63`, `:84`, `Board.tsx:224`, `App.tsx:877`, `board.ts:1165-1177`, `:2204`, `fleet.ts:5842`. The leadership index `PHASE_LEADERSHIP[...]` at `Board.tsx:217-219` and `Swimlanes.tsx:161-163` is also named. All three `z.enum(BOARD_PHASES)` fields are named (`schema.ts:425`, `:736`, `:2486`).
3. **Board churn sits in wave 1 — resolved.** Slice 1 (`:94`) moves no board caller and deletes only `storyPhase`, whose callers are `packages/domain/test/phase.test.ts` and `test/workflow.test.ts` alone (grep confirms). `toBoardPhase` and `rowPhase` stay until slice 2.
4. **Needs design misses its gate surfaces — resolved.** The state gate's decision is `gate.ts:248-251`: it spends a state receipt for `(path, after)`. `plot-state-gate.sh` is a launcher into that bundle. `recordStateReceipt` (`ladder.ts:64-69`) writes the same receipt in TypeScript, so `plot-state-receipt.sh` gains no arm. `mayRunController` (`controller-gate.ts:47-53`) matches only `plot-(dispatch|approve|deliver)`, so a `plot-needs-design.mjs` call passes the controller gate with no action receipt, as the plan says. `check-shell-lines.sh:9` counts non-comment, non-blank lines, so the `plot-plan-meta.sh:246-248` comment edit costs zero.
5. **Two false Motivation claims — resolved.** `:34` now says `DESIGN-plan.md` already separates phases from states and names the five; `DESIGN-plan.md:746-755` confirms. `DESIGN-story.md` is gone from the scope.
6. **Domain citations — still true.** `rules/phase.ts:41`, `:72`, `:99`; `workflow.ts:80` (`phaseOrder`), `:176-186` (`DevelopmentWorkflow`), `:126-137` (doc block); `plan-store.ts:131`; `local-checks.ts:73-82`; `state-transition.ts:93-105`.
7. **`server/fleet.ts:5842` unowned — resolved.** Named in Design (`:57`) and in the board slice (`:98`).
8. **No test files per slice — partly resolved.** `:70` names the domain and board test files, and the counts it states are true: 27 files hold `'Discovery'` (25 under `packages/board/test`, 2 under `packages/domain/test`), 13 under `test/integration/`. The list misses three files; see new defect 1. Slices 3 to 5 name no tests.

## New defects

1. **The board slice's test list misses three files** (`:70`, `:98`). They assert the Draft-in-Discovery mapping without the quoted literal the count greps for:
   - `packages/board/test/integration/approve.browser.test.ts:136` — *"offers Approve on NO card outside Discovery"*, asserted across Design, Testing and Released. Under the default map every Draft card is in Design and carries Approve, so this browser test fails in the board slice and must be restated against `state`.
   - `packages/board/test/integration/tiny-garden.data.test.ts:34` — `expect(counts).toEqual({ Discovery: 2, Design: 0, … })`.
   - `packages/board/test/port.test.mjs:90` — `assert.equal(board.columns.length, 5)`; the plans board draws four columns under the default map. `board.test.mjs:261` asserts the same and is already in the 25.
   The board slice therefore touches about 31 test files, 14 of them browser tests, not the 25 plus named files the plan suggests. The named list at `:70` also overlaps the 25 (`phases.test.ts`, `swimlanes.test.ts`, `fleet.test.ts`, `column-overflow.test.ts`, `catalogue/states.ts` are in both), so the sentence reads as a larger, less exact number than it is.
2. **The column builder is not named.** `board.ts:2252` builds columns from `BOARD_PHASES.map(...)`. The Design says the board "draws one column per listed phase" (`:52`) but cites no site; the slice list (`:98`) omits it. It is the line that removes the Discovery column, and the one that `port.test.mjs:90` and `board.test.mjs:261` measure.
3. **The fleet rows' map has no stated source.** `:57` says the agent-row build in `server/fleet.ts` "receives the parsed map", but the fleet scan does not run inside `buildBoard`. If `fleet.ts` reads `Workflow phases` on its own, that is one more `plot-config.sh` spawn per scan (`plan-store-shell.ts:193-196`; `board.ts:1866-1868` measures one spawn at about 58 ms). Reading it in the existing `Promise.all` at `board.ts:1871-1875` costs nothing extra for the board; the fleet path needs its own sentence.
4. **The *Needs design* record type widens two unions the plan does not name.** `transitions/plan.ts:138` types a record `field` as `'Approved' | 'Delivered' | 'Released' | 'Rejected' | 'Superseded'`, and `workflows/decision.ts:76` is a similar closed list. A `Design:` record needs `'Design'` in at least the first. Small, but it is a domain-type change outside `needsDesign` that the slice (`:106`) does not list.

## Is it ready to approve

Yes, from the cost lens. Every round-1 cost finding is resolved or reduced to a counting gap, the shell-line cost is zero and verified, and the upgrade cost to adopting repositories is stated with a one-line restore. The board slice remains the expensive one: one branch, about ten source sites, about 31 test files, 14 of them browser tests under `pnpm run test:board`, within a correction budget of 2. A behaviour-neutral first step (the card carries `state` and the predicates read it, while the default still maps Draft to Discovery) would take the predicate refactor off the fixture churn; I list it as an option, not a blocker.

## Open Points

- [ ] Board slice: add `approve.browser.test.ts:136` (inverts under the default map), `tiny-garden.data.test.ts:34` and `port.test.mjs:90` to the test list, and state the count as about 31 files, 14 browser tests, without overlap with the named list. — *panel round 2: cost*
- [ ] Board slice: name the column builder `board.ts:2252` (`BOARD_PHASES.map`) as the site that draws `planPhases(map)`. — *panel round 2: cost*
- [ ] Rows: say where `server/fleet.ts` gets the parsed map — passed in, or read once per scan — and if read, join an existing config read rather than adding a serial `plot-config.sh` spawn. — *panel round 2: cost*
- [ ] Needs design slice: list the `'Design'` member added to the record-field union at `transitions/plan.ts:138` (and `workflows/decision.ts:76` if the record passes through it). — *panel round 2: cost*
- [ ] Optional: split the board slice so `CardSchema.state` and the predicate moves land before the default-map switch, which separates the behaviour-neutral refactor from the 14 browser-test fixture changes. — *panel round 2: cost*
- [ ] Slices 3 to 5: name the tests each adds or changes (for *Needs design*: the transition, the bundle, the endpoint, and a state-gate test that a `Draft`-to-`Design` commit passes with the receipt and fails without it). — *panel round 2: cost*
