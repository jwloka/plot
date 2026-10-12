# Estate juror, round 2: the-phases-are-declared

Lens: does this already exist, and do the plan's claims about what exists and what does not exist hold on this branch?

Position: proceed

## Verdict

The revision answers every round-1 estate finding, and the citations it adds hold on this branch within one or two lines. No artifact the plan builds exists on the branch or on `origin/main` (`75f093cb9`, the merge base): `parsePhaseMap`, `DEFAULT_PHASE_MAP`, `phaseOfPlan`, `planPhases`, `needsDesign` and `needs-design` return zero files in `packages` and `skills`. The new defects are small: two off-by-a-few citations, three unlisted literal sites, an existing `Card.status` field the plan does not name, and one sibling `waits:` whose stated reason the revision made false. None stops a slice from landing in its wave, so the plan can be approved with these as Open Points.

## What I looked at

- Read: the subject plan; round-1 `panel.md` and `estate.md`; the story's decision table (D1-D22) and Open Points; the five sibling plans (grep for this plan's branch names, symbols and `waits:`, then the matching ranges).
- Read on this branch: `rules/phase.ts:8-175`; `entities/workflow.ts:120-190`; `PlanCard.tsx:10-90`, `:538-550`; `lib/agent-rows/menus.tsx` (grep); `server/board.ts:1160-1180`, `:2078-2120`, `:2195-2260`; `contract/schema.ts:185-206`, `:420-427`, `:733-738`, `:1338-1350`, `:2478-2488` and the `CardSchema` field list; `server/fleet.ts:2224-2270`, `:5455-5466`, `:5832-5845`; `domain/entities/fleet.ts:696-708`; `Board.tsx:212-228`; `App.tsx:872-880`; `Swimlanes.tsx:62-68`, `:158-165`; `StoryModal.tsx:80-88`; `mock-fleet.ts:296-330`; `server/entry/gate.ts:244-256`; `rules/state-transition.ts:90-140`; `server/entry/ladder.ts:56-70`; `rules/controller-gate.ts:9-52`; `plot-state-receipt.sh:170-182`; `plot-state-gate.sh` (whole); `plot-plan-meta.sh:238-250`; `server/idea.ts:276-281`; `server/commission.ts:180-205`; `ports/plan-store.ts:126-133`; `rules/local-checks.ts:70-84`; `skills/plot-idea/SKILL.md` headings, `:82-97`, `:415`; the cited lines of `CLAUDE.md`, `skills/plot/SKILL.md`, `MANIFESTO.md`, `intro-to-using-plot.md`, `plot-board-setup/SKILL.md`, `docs/board-entity-properties.md`, `docs/board-domain-model.md` and `DESIGN-plan.md`.
- Grep: production readers of `phaseOrder`, `DevelopmentWorkflow`, `PHASE_WORKFLOWS`, `PHASE_LEADERSHIP`, `BOARD_PHASES`, `toBoardPhase`, `rowPhase`, `storyPhase` and `phaseOf` (tests and bundles excluded); literal phase comparisons and `Record<Phase` in `packages/board/src` and `packages/fleet/src`; test files with a `'Discovery'` literal (27, 25 under `packages/board`, 13 under `packages/board/test/integration`); stale `Endgame` and four-column prose outside plans and changelogs; `recordStateReceipt(` callers; the planned symbols on the branch and with `git grep` on `origin/main`.
- Ran no test, no board or fleet command, and edited no file except this verdict.

## Round-1 estate findings

1. `isDraft` reads `'Discovery'`: **resolved.** `PlanCard.tsx:83-85` holds it; the plan moves it to `state === 'draft'` (plan `:55`) and names its gates at `PlanCard.tsx:545`, `:549` and `menus.tsx:1464-1466`, which hold `isDraft`.
2. `idea/` row hard-coded to Discovery: **resolved.** `server/fleet.ts:5842` holds it; plan `:57` gives it the phase that holds `plan:draft`.
3. `phaseDateOf` switches on five names: **resolved.** `board.ts:1165-1177` holds the switch; plan `:56` keys it on state and `deliverable`.
4. Unguarded leadership lookups: **resolved.** `Board.tsx:217-219` and `Swimlanes.tsx:161-163` hold them; plan `:56` names the guard.
5. Three wire fields: **resolved.** `schema.ts:425`, `:736`, `:2486` each hold `z.enum(BOARD_PHASES)`; the re-export of `toBoardPhase` is at `schema.ts:1349`. `LANE_PHASES` (`Swimlanes.tsx:66`), `plansInStory` (`StoryModal.tsx:84`) and `mock-fleet.ts` are named. The column builder `board.ts:2252` (`BOARD_PHASES.map`) is covered by "puts `planPhases(map)` on the payload" but is not cited.
6. `storyPhase` has no production caller: **resolved.** The only production hit is its declaration at `rules/phase.ts:72`; plan `:30` states it, and plan `:48` names `tickets-and-stories-have-lanes` as the first caller, which that plan confirms (`tickets-and-stories-have-lanes.md:86`).
7. `rowPhase` caller needs the map: **resolved.** `server/fleet.ts:5463` calls it; plan `:57` passes the parsed map. The deletion must also drop the re-export at `server/fleet.ts:2269` and the domain re-export path; "`rowPhase` deleted" covers both.
8. Always-empty Discovery column: **resolved.** Plan `:52` draws `planPhases(map)` only and cites `2026-08-16-board-shows-discovery.md`; `the-board-has-three-tabs.md:39` builds on the same function.
9. `owningCommand` does not admit the write: **resolved.** The gate spends a receipt at `gate.ts:250-251`; `recordStateReceipt` is at `ladder.ts:64` and today has three callers (`entry/approve.ts:346`, `entry/deliver.ts:368`, `:703`); `plot-state-gate.sh:18` execs the same TS gate, so a TS receipt clears the shell gate too.
10. `Design:` record format: **resolved.** Plan `:62` changes the comment at `plot-plan-meta.sh:246-248`, which holds the `design_raw` description.
11. `parseLocalChecks` skips silently: **resolved.** `rules/local-checks.ts:73-82` returns `null` and filters; plan `:44` says `parsePhaseMap` refuses.
12. Two-question prose and the idea prompt: **resolved.** The design question is a separate step (plan `:64`), so `MANIFESTO.md:79` and `CLAUDE.md:166` stay true; `server/idea.ts:279` says "Stop at **Draft**", and the plan keeps it.
13. No phase map exists: **still holds.** Zero files for every planned symbol on the branch and on `origin/main`.
14. Citation ranges: **resolved.** `DESIGN-plan.md` §4 starts at `:688`; the plan now says `:688-900`.
15. Fleet grep is empty: **resolved.** Plan `:60` states it as today's fact and moves the acceptance to a payload test over a non-default map.

## New defects

- **Wrong citation.** Plan `:42` puts `PlanReadings.phase` at `rules/phase.ts:118`; the field is at `rules/phase.ts:115`.
- **Wrong citation.** Plan `:52` puts `config(key, fallback)` at `ports/plan-store.ts:131`; the signature is at `:133` (`:131` is its `@returns` line).
- **The plan does not name the existing `Card.status`.** `CardSchema` already carries `status: PlanStatusSchema.optional()` (`schema.ts:599`), and `planStatus` (`rules/phase.ts:147-163`) answers `approved` or `in-progress` exactly when the state is `approved` and the plan is not deliverable. So `isApproved` and `isReadyToStart` can read an existing field today. The new `state` field is needed only for `draft` against `design`, which `status` folds into `draft`/`open`. The plan should say why it adds `state` beside `status`, or read `status` where it answers.
- **Unlisted literal site.** `PlanCard.tsx:13` `PHASE_ACCENT: Record<Phase, string>` is read at `:368` with `card.phase`. Once `phase` is a string, a declared phase outside the five gets no accent class. Plan `:32` and `:56` do not name it.
- **Mock contradicts the new row rule.** `mock-fleet.ts:306` and `:325` are `idea/` rows with `phase: 'Discovery'`. After the board slice, `server/fleet.ts:5842` gives an idea row the phase that holds `plan:draft` (Design). Plan `:56` says "`mock-fleet.ts` keeps the default names", which leaves these two rows in Discovery against D1.
- **Unlisted prose.** `MANIFESTO.md:156` ("**Endgame fixes:**") sits in the *Lifecycle* section next to `:148`, and the prose slice does not list it. `skills/plot-idea/SKILL.md:415` prints `Progress: [x] Draft > [ ] Approved > …` in the summary, which reads wrong for a plan created with `State: Design`; the idea slice does not list it.
- **The tenth endpoint collides with existing text.** `CLAUDE.md:499` already says "A tenth, `merge`, has no endpoint". The Needs design slice "names the tenth endpoint" there without saying how the sentence about `merge` changes, and `the-fleet-writes-the-design` removes `/api/commission`, which changes the count again.
- **A sibling `waits:` reason is now false.** `the-fleet-verifies-what-it-delivered.md:128` waits on `feature/the-phases-are-a-declaration`, and its Note (`:150`) says that slice "moves the `toBoardPhase` callers in `packages/board/src/server/board.ts`". After this revision, slice 1 moves no board caller (plan `:94`); `feature/the-board-draws-the-declared-phases` does. The wait still orders the two plans, but the reason it gives points at the wrong branch. The defect sits in the sibling, and this revision caused it.
- **Minor drift between siblings.** `design-work-proves-the-path.md:125` cites the auto-bump as `board.ts:2082-2117`; this plan says `:2082-2115`. The code at `board.ts:2115` holds the bump.

## Open Points for the plan

- [ ] `PlanReadings.phase` is at `rules/phase.ts:115`, not `:118`; `config(key, fallback)` is at `ports/plan-store.ts:133`, not `:131`.
- [ ] Name the existing `Card.status` (`schema.ts:599`) and say why `CardSchema.state` is added beside it, or read `status` for `isApproved` and `isReadyToStart`.
- [ ] The board slice also covers `PHASE_ACCENT` (`PlanCard.tsx:13`, read at `:368`) and the column builder `board.ts:2252`.
- [ ] `mock-fleet.ts:306` and `:325`: the two `idea/` rows read the phase that holds `plan:draft`, not Discovery.
- [ ] The prose slice lists `MANIFESTO.md:156`; the idea slice lists the Progress line at `skills/plot-idea/SKILL.md:415`.
- [ ] The Needs design slice says how `CLAUDE.md:499` words the new endpoint beside "A tenth, `merge`, has no endpoint", and how the count reads after `the-fleet-writes-the-design` removes `/api/commission`.
- [ ] Cross-plan: `the-fleet-verifies-what-it-delivered.md:150` states a false reason for its wait on `feature/the-phases-are-a-declaration`; it should wait on `feature/the-board-draws-the-declared-phases` if the reason is the shared `board.ts`, or restate the reason.
