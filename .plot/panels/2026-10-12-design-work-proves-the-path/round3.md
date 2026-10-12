# Panel round 3 — design-work-proves-the-path

- **Subject:** `docs/plans/2026-10-12-design-work-proves-the-path.md`
- **Date:** 2026-10-12
- **Caller:** challenge-the-plan Phase 3P, round 3, run by a moderator agent for the batch of story `plot-works-in-five-phases`
- **Lenses:** contradiction, cost (a narrow round: the two lenses that raised the round-2 HIGH findings)
- **Rubric:** the three design moves of the round-2 revision — (1) `plot-approve.mjs --spike` under the `approve` action, (2) `approvalArm({phase, review})` keyed on the `design` state and the gate on the `Spike approved:` record, (3) the dispatch rewrite in slice 1 for about −28 net shell lines. Checked against the code: (a) does D10 hold on every channel, including `server/approve.ts:306` and a removed `State:` line; (b) can any path approve a Design plan with a spike and no person; (c) does the controller gate refuse a bare `plot-approve.mjs --spike`; (d) is the shell-line arithmetic right; (e) does the slice-1 dispatch rewrite change dispatch for non-Design plans, and do tests cover it; (f) is the plan ready to approve
- **Commitment:** `Position: proceed | amend | reject`
- **Siblings:** 5 read, 0 unread (story plot-works-in-five-phases)
- **Gate:** `plot-panel.mjs check` exited 0 for both jurors on the first run. No juror was sent back.
- **Reconcile:** `unanimous	amend	contradiction,cost`
- **Verdict files:** `round3-contradiction.md`, `round3-cost.md`. The round-1 and round-2 files are unchanged.

## Positions

| Lens | Position | Main finding |
|---|---|---|
| contradiction | amend | MEDIUM: the state gate passes a commit that removes `State:` and a commit that adds it where HEAD had none (`rules/state-transition.ts:131-141`). Two hand commits move a Design plan to `Draft`, and the plan's claim that the gate refuses a hand edit of `State:` is wrong. MEDIUM: the bundle's `inSession` (`entry/approve.ts:480`, `:488-491`) also decides the PR read and the merge, so routing the person arm through it breaks "an open plan PR still merges". MEDIUM: the dispatch rewrite drops the shell's fix-it words, and three contract tests assert them. |
| cost | amend | MEDIUM: the dispatch rewrite drops the next-command hint on five of nine refusal arms, and `dispatch.test.mjs:975` and `:1031` fail as the slice is written. MEDIUM: slice 1 is now the plan's widest PR (about 15 files) and changes dispatch for every plan, and the plan does not say so. LOW: the shell estimate is low; the net is about −16 to −21, not −28, and the slice still passes. |

## Where both agree

- **The three moves hold in their main claim.** `--spike` is in neither `NO_ENDPOINT` nor `VALUE_FLAGS` (`rules/ci-suite.ts:304-325`), so the controller gate classifies `plot-approve.mjs --spike` as `approve` and refuses it with no receipt. A plan with no `State:` line at approval time refuses `state-unreadable` (`workflows/approve.ts:169-174`). The removal of `plot-dispatch.sh:2954-3004` is 46 counted lines by the ratchet's own regex (`check-shell-lines.sh:43`), and slice 1 passes the ratchet.
- **The dispatch rewrite keeps the admission set and the exit codes for non-Design plans, and loses the words.** Both jurors compared the shell arms with `plangate` (`workflows/dispatch.ts:486`, `:527-546`). The shell's refusals name the next command (`/plot-approve`, `/plot-idea`, `/plot-implement`, the valid `Impl:` answers); the domain's do not. The plan's sentence "the contract tests read the domain's words" deletes assertions whose own comment says *"must say how to fix it, not just refuse"* (`test/reconcile/dispatch.test.mjs:975`). The moderator confirmed the assertions at `:975`, `:1004` and `:1030`.
- **`plangate` is not callable as the plan describes.** It is module-private (`dispatch.ts:486`), `plot-ask.mjs` has no `plangate` question, and it needs `source`, `refResolved` and the ref option in addition to the plan-meta JSON. The plan does not say that `plot-dispatch.sh` refuses when the bundle is missing or the call fails (LOW, both).
- **The bundle's `inSession` reading is the wrong place for the person arm.** Contradiction rates it MEDIUM, cost LOW; both cite `entry/approve.ts:487-491` and `workflows/approve.ts:249-254`.
- **No decision D1 to D27 needs to change.** Every finding is a sentence or a test in the plan.

## Disagreements

1. **Whether D10 holds against a `State:` edit.** Cost says yes: it read `state-unreadable` and stopped there. Contradiction says no: a commit that removes `State: Design` passes the gate (`after === ''`), and a following commit that adds `State: Draft` passes too (`before === ''`), so the plan reaches the `pr` arm with no person. The moderator read `stateTransitionOf` (`rules/state-transition.ts:131-141`) and confirmed both pass arms; its TSDoc states them. Nobody ran the two commits. Contradiction rates it MEDIUM rather than HIGH because the same hole already lets a hand edit write any phase on any plan, so it is not new with this plan; but the plan's sentence "the state gate already refuses a hand edit of it" is false, and `DESIGN-phases.md:177` repeats it. Contradiction also suspects a rename to another date prefix does the same in one commit, by reading only.
2. **The shell-line net.** Cost counted the additions and finds them low (realistic +25 to +30, net about −16 to −21). Contradiction counted only the removal and agrees with −43 for `plot-dispatch.sh`. Neither finds a refusal: the plan's stated margin (twice the estimate) covers cost's count.
3. **Findings held by one juror.** Contradiction only: the controller gate's refusal text names `POST /api/approve` without `"spike": true` (`controller-gate.ts:113`), so an agent that follows it runs a full approval, and `--spike --dry-run` is ungated (LOW); the HTTP script arm trusts the request body's `who` (`server/approve.ts:288-295`), so "every route" is a rule there, not a gate (LOW); `the-fleet-writes-the-design` line 27 and `DESIGN-phases.md:176` still cite the shell `case` copy as a dispatch-slice change (LOW); a Design plan with `Review: pr` approves on the `pr` arm between the merge of `feature/a-draft-can-need-design` and slice 2 (LOW). Cost only: slice 1's size and blast radius are unstated, and a revert of it stops being exact once later slices touch the same paths (MEDIUM); `POST /api/approve` answers no 409 for a plan with no `State:` line and starts an agent that can only refuse (LOW).

## Shared blind spot

Both jurors checked the approval paths that pass through a controller and the state gate. Neither checked the receipt the plan adds: the key `<plan path>#Spike approved` is new, and neither juror read whether `plot-state-gate.sh`'s receipt reader (through `board/plot-gate.mjs`) matches on the bare path, a prefix, or an exact string. If it matches by prefix, a `Spike approved` receipt spends as a `State:` receipt, or the reverse, which is the separation the plan claims. Round 2's resolution rests on that key, and no round has read its reader.

The second gap repeats round 2: both jurors read and counted, and neither executed. The one MEDIUM on D10 rests on reading `stateTransitionOf`; a `node -e` over the two commits would settle it in one command.

## What each juror looked at

- **Contradiction** read the plan, `round2.md`, the story decisions, `DESIGN-phases.md` §4 and §8 and two siblings, then the approve workflow and transition, `rules/state-transition.ts`, `ci-suite.ts`, `controller-gate.ts`, `eligible.ts`, `workflows/dispatch.ts`, the board's approve endpoint and bundle, `entry/gate.ts`, `entry/ladder.ts`, `plot-dispatch.sh:2920-3020` (Read tool), `check-shell-lines.sh`, `plot-approve.sh`, the `/plot-approve` skill and `dispatch.test.mjs`. It ran read commands only.
- **Cost** read the plan, its round-2 file, the siblings' slice lines, `check-shell-lines.sh`, the three shell scripts' touched regions, `ci-suite.ts`, the dispatch workflow and contract tests, and the approve bundle. It counted the removed lines with the ratchet's own regex and estimated the additions. It ran read commands only.
- **The moderator** read `check-shell-lines.sh:1-60`, `rules/state-transition.ts:115-145` and `dispatch.test.mjs:960-1048`, and ran the gate and the reconcile.
