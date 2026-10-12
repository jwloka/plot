# Panel round 2: the-phases-are-declared

- **Subject:** `docs/plans/2026-10-12-the-phases-are-declared.md` at `5b9e68ce9` (revised after round 1; story decisions D13–D22 added)
- **Date:** 2026-10-12
- **Lenses:** estate, contradiction, deliverable, cost
- **Commitment:** `Position: proceed | amend | reject`
- **Rubric:** (1) did the revision resolve each round-1 Open Point the plan marks resolved, verified against the code with file:line; (2) what new defect did the revision introduce; (3) is the plan ready to approve from this lens
- **Siblings:** 5 read, 0 unread (story plot-works-in-five-phases)
- **Gate:** `plot-panel.mjs check` committed all four on the first run; no juror was re-run.
- **Reconcile:** `divided	proceed=estate,deliverable,cost	amend=contradiction`
- **Verdicts:** `round2-estate.md`, `round2-contradiction.md`, `round2-deliverable.md`, `round2-cost.md`

## Positions

| Lens | Position | What the juror looked at |
|---|---|---|
| estate | proceed | Read the plan, round-1 files, the story decisions, the five siblings and about 40 cited code ranges. Grepped every planned symbol on the branch and on `origin/main` (zero hits), and every production reader of `phaseOrder`, `PHASE_WORKFLOWS`, `toBoardPhase`, `rowPhase` and `storyPhase`. Ran nothing. |
| contradiction | amend | Read D1–D22, DESIGN-phases.md §2–§4, §7, §8, the five siblings, the released plan `2026-08-16-board-shows-discovery.md`, and the cited code and prose. Ran greps only. |
| deliverable | proceed | Read every slice against the Changelog and the cited code, and checked that each wave builds alone. Checked the bundle registrations (`build.mjs`, `.gitattributes`, scripts README). Ran greps only. |
| cost | proceed | Re-counted the test files that hold `'Discovery'` (27; 25 board; 13 integration) and searched for tests that assert the Draft-in-Discovery mapping without the literal. Read `check-shell-lines.sh` to confirm zero shell lines. Ran greps only. |

All four positions again rest on reading and grep. No juror ran a test, a typecheck or the board.

## Agreement

- **Every round-1 Open Point the plan marks resolved is resolved in its main claim.** Each juror verified its own round-1 findings at file:line. Among the verified points: `isDraft` (`PlanCard.tsx:83-85`), the three wire fields (`schema.ts:425`, `:736`, `:2486`), the receipt route (`ladder.ts:64`, `gate.ts:250-251`), slice 1 is domain-only, the `/plot-idea` step outside the ceremony questions, and `phaseWorkflows`. The citations and the counts (27 and 25 test files, 13 integration) are correct.
- **The revision made a sibling `waits:` reason false.** Estate, contradiction and deliverable each find independently that `the-fleet-verifies-what-it-delivered.md:150` (wait at `:128`) waits on `feature/the-phases-are-a-declaration` because "that slice moves the `toBoardPhase` callers in board.ts". After the revision, `feature/the-board-draws-the-declared-phases` moves them (plan `:94`, `:98`). The moderator found the same before the verdicts arrived. The fix belongs in the sibling.
- **The board slice's site list is not complete.** Three lenses name the column builder `board.ts:2252` (`BOARD_PHASES.map`). Estate and deliverable name `PHASE_ACCENT` (`PlanCard.tsx:13`, read at `:368`). Deliverable adds `toggle(phase: Phase)` at `Board.tsx:173`. Typecheck catches each one, so none stops the slice from landing.
- **The *Needs design* slice and `CLAUDE.md:499`.** Estate and contradiction both find that "the tenth endpoint" collides with existing text: `:499` already calls `merge` "a tenth", and `the-fleet-writes-the-design` removes `/api/commission`, so the count changes again.

## Disagreements

- **Whether the remaining findings block approval.** Estate, deliverable and cost say no: each remaining finding is a missing citation or a sentence, and each slice lands in its wave. Contradiction says yes, and its three blockers are findings no other juror raised, so this is a difference in what was found, not in how severe it is:
  - `needsDesign` names no write target. D13 (story `:88`) merges a `Review: pr` plan's PR with `State: Design`, so the `Design` write must reach the plan-PR branch. The approve pattern commits on a worktree cut from the default branch. The plan does not say which ref and which checkout `recordStateReceipt` keys on (`ladder.ts:59-66`). The moderator confirmed D13's text.
  - The upgrade note's restoring declaration (Changelog bullet 3) declares no `story:` member. After `tickets-and-stories-have-lanes` lands, a repository that uses the note draws no story lane (`tickets-and-stories-have-lanes.md:86`).
  - The board slice decides the checklist column, the leadership-badge rule and the card controls in `.tsx`, and the acceptance test asserts a render ("the Approve control shows on every Draft card", plan `:60`). That contradicts *Every rendered state is a domain property* in `CLAUDE.md` and DESIGN-phases.md §8.
- **Whether the state/phase split in the prose is resolved.** Estate, deliverable and cost mark it resolved. Contradiction says half: the prose slice adds `Design` as a state to text that calls the states "phases" (`CLAUDE.md:205-207`, `MANIFESTO.md:101`, `:148`, `skills/plot/SKILL.md:170`). After the slice the same files name five plan "phases" beside five declared phases, and both sets contain `Design`.
- **Whether `CardSchema.state` is the right field.** Estate says the existing `Card.status` (`schema.ts:599`) already answers `isApproved` and `isReadyToStart`, so the plan must say why it adds `state` beside it. The other three accept `state` without comment.
- **The board slice's size.** Cost counts about 31 test files, 14 of them browser tests, because `approve.browser.test.ts:136`, `tiny-garden.data.test.ts:34` and `port.test.mjs:90` assert the old mapping without the literal. It proposes, as an option, to land `CardSchema.state` before the default-map switch. Deliverable says the slice lands alone as written.

## Shared blind spots

- **The jurors read the round-1 list as a checklist.** Each juror verified its own round-1 findings and then looked for new defects near them. Only contradiction re-read the plan against the new decisions D13–D22, and that is where its three blockers come from. A second contradiction-style reading of D13–D22 against the other slices (for example the idea slice under D13) has not been done.
- **Nobody ran anything, again.** The equality `phaseWorkflows(DEFAULT_PHASE_MAP) = PHASE_WORKFLOWS`, the test count of about 31, and the claim that `approve.browser.test.ts:136` inverts are all readings of source.
- **Nobody asked what a `Design` card offers.** Draft and Design cards now share the Design column. `isDraft` reads `state === 'draft'`, so a Design card gets no Approve or Interrogate control, while `phaseWorkflows` says `approve` acts on `design`. Deliverable asked only about the sort order (`board.ts:1165-1177`).

## Round-1 points not resolved

- **States and phases in the prose** (round 1: contradiction): half resolved, per contradiction. Disputed by the other three.
- **Tests per slice** (round 1: cost): partly resolved. The board list misses three files, and slices 3 to 5 name no tests.
- All other round-1 points are resolved by all four jurors.

## For the caller

The panel is divided, three `proceed` against one `amend`. The `amend` rests on three findings that only one lens raised, and the moderator confirmed the one with the largest effect (D13 and the `needsDesign` write target). The findings are recorded as Open Points in the plan, tagged `panel round 2`. The panel decides nothing. Approval is the caller's decision.
