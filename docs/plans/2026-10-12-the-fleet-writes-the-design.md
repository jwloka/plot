# The fleet writes the design

> For a plan that a person put in `State: Design` and whose spec is empty, the fleet commissions an agent to write the spec, and after a person approves a plan's spike, automatic dispatch starts it. Approval stays a person's act.

## Status

- **State:** Draft
- **Type:** feature
- **Story:** plot-works-in-five-phases
- **Review:** pr
- **Rounds:** 1
- **Impl:** own branches

## Changelog

- With auto-dispatch on, the fleet dispatches a Design plan's spike as soon as a person approves it, and only after its brief exists.
- With `Auto-design: true` and a `Design command` declared, the fleet writes the design spec of a plan in `State: Design` whose `## Spec` section is empty. The agent works in its own worktree, pushes `idea/<slug>-spec` and opens a draft PR, and a person merges it.
- The fleet starts one spec run per plan, across every machine: the run's branch on origin is its claim.
- A failed spec run shows in *Waiting on you* with its log and a restart command. After 3 failed runs the fleet stops starting them.
- The board's *Commission design* button, its row-menu entry and `/api/commission` are removed.

<!-- Board impact: the Commission design button, its row-menu entry, the board's `commission` capability and /api/commission are removed; a going spec run shows as a row in the Agents tab's *Working* section and a failed one in *Waiting on you*. No change to the plan format, the template or the docs/plans layout. -->

## Motivation

D10 in [the story](../stories/plot-works-in-five-phases/STORY-plot-works-in-five-phases.md) gives the fleet the mechanical part of design work. Measured on `main` at `c7186b7be`, 2026-10-13:

- *Commission design* is a board route (`packages/board/src/server/commission.ts`, 424 lines). A person clicks it on a Draft plan, and an agent started with the `Idea command` in the operator's checkout (`tree: opts.repoRoot`, `commission.ts:406`) is told to move the plan to Design and add an empty `## Spec` section, and not to write the spec (`commission.ts:135-205`). Its agent edits `State:` by hand, which the state gate refuses where the gate is installed, so the route does none of its job today.
- `the-phases-are-declared` (Delivered) gives the move to Design to a person: `/plot-idea` writes `State: Design` on yes (#1628), and *Needs design* moves a Draft plan (#1633). Both write a `Design:` record and the `## Spec` placeholder `SPEC_PLACEHOLDER` (`packages/domain/src/workflows/needs-design.ts:5`).
- Since #1634, `sliceVerdict` admits the approved spike of a Design plan and refuses its other slices (`packages/domain/src/rules/eligible.ts:127-134`). Automatic dispatch still skips every non-`approved` plan, at six places in `packages/domain/src/rules/auto-dispatch.ts`: `planAutoDispatch` (`:531`), `startableBranches` (`:582`), `skippedClaimedBranches` (`:617`), `firstBrieflessBranch` (`:656`), `skippedPlans` (`:733`) and `dispatchCandidates` (`:798`). The fleet builds `missingBriefs` from `dispatchCandidates` only (`packages/fleet/src/shared/auto-dispatch.ts:333-335`).
- The fleet already starts one non-slice agent per plan: the verify run of #1635. `packages/domain/src/rules/auto-verify.ts` holds the failure store, `verifyStart` with named refusals and `verificationRow`; `packages/fleet/src/shared/auto-verify.ts` reads the `Verify command` and `Auto-verify` keys, bounds the run with `Worker bound` and starts it through `startBoardRun`. The spec run reuses that shape.

## Design

### Approach

The design spec is [DESIGN-phases.md](../stories/plot-works-in-five-phases/DESIGN-phases.md) §6, *In Design*.

**The person's decision.** The fleet writes a spec only for a plan that a person already put in Design. `State: Design` comes from `/plot-idea` (#1628) or *Needs design* (#1633), each with a `Design:` record that names who decided, and the state gate refuses a `State:` change by any other writer. The fleet moves no plan into Design (D3). The spec it writes is a proposal on a draft PR: a person merges it or closes it, and a person later approves the plan through the person arm. An operator opts in with `Auto-design: true`; the default is off.

**The spike.** No new rule. The six `plan.phase !== 'approved'` filters in `rules/auto-dispatch.ts` admit a `design` plan too, and the scan's `wave.verdict` decides, as it does for an approved plan. `sliceVerdict` answers `eligible` for the approved spike only, so every other slice of a Design plan stays out. Because `dispatchCandidates` (`:798`) and `firstBrieflessBranch` (`:656`) admit it, a briefless spike enters `missingBriefs`, is reported `no-brief`, is offered to the `Brief command` and is not dispatched.

**What the fleet reads.** `specOf` moves from `packages/board/src/server/entry/needs-design.ts:146-163` into the domain beside `SPEC_PLACEHOLDER`, and the board entry imports it. Three rules use it:

- `specIsEmpty(text)`: true when `specOf(text)` is `''` or `SPEC_PLACEHOLDER`. A section that holds only a link to a `DESIGN-*.md` file counts as written.
- `designWork(readings: { state: string; text: string; specRef: ClaimAnswer })`: `write-spec` when `state` is `design`, `specIsEmpty(text)` and `specRef` is `absent`; otherwise `none`. `specRef` is `claimTip`'s answer (`rules/claim.ts:15`) for `idea/<slug>-spec` on origin, so `unknown` answers `none`. The spike does not change the answer: a spec and a spike are two forms of design work (DESIGN-phases.md §4), and the spike dispatches through the verdict whatever the spec says.
- `specStart(input)`, beside `verifyStart`: refuses, in this order, `off`, `running` (a spec run or a verify run is going), `halted`, `stopped`, `waiting`, `queue-unread`, `no-free-agent`, `starved` (without `Machine override`). Its input names its readings as `VerifyStartInput` does (`rules/auto-verify.ts:124-149`).

The fleet reads the plans the pulse reports as `design`, their text at `origin/<main>` through `refs.showFile`, as `readVerifyCandidatesWith` does (`packages/fleet/src/shared/auto-verify.ts:293-330`).

**The spec run.** `packages/fleet/src/shared/auto-design.ts` follows `auto-verify.ts`:

- Two `## Plot Config` keys. `Design command` names the runner; an absent key starts nothing. It is its own key under the one-capability-one-key rule (`packages/fleet/src/shared/implement-run.ts:22-33`): writing a spec is not the idea binding. `Auto-design` turns the run on for the literal `true` only, and defaults off.
- The claim. Before it starts the agent, fleetd pushes `idea/<slug>-spec` to origin with one empty `plot: claim idea/<slug>-spec` commit (`CLAIM_SUBJECT_PREFIX`, `rules/empty-claim.ts:12`). A rejected push means another machine holds the run, and nothing starts. The branch on origin is the one-run record: every machine reads it, and it is in git (Manifesto Principle 1).
- The tree. The agent works in its own worktree at `.plot/state/design/<slug>/`, checked out on `idea/<slug>-spec`, never in the operator's checkout. fleetd removes the worktree when the run ends.
- The bound. `startBoardRun` takes `boundSeconds` from `Worker bound` (`DEFAULT_VERIFY_BOUND_SECONDS` 28800 where absent), as the verify run does (`auto-verify.ts:393`, `:526-536`).
- The prompt. *Commission design*'s prompt turned around: read the plan and its story, write the spec into `## Spec`, change no `State:` line, approve nothing, write nothing to a tracker, commit, push, and open a draft PR through `plot-host.sh pr-create --draft --head idea/<slug>-spec`. A spec branch is neither a slice nor a sprint, so `plot-open-pr.sh` does not apply; `plot-host.sh pr-create` is the adapter route a sprint PR takes.
- The failure store. `.plot/state/auto-design-in-flight.json` holds failures in the `VerifyStore` shape. A run that ends with its branch reading `claim-only` failed: fleetd deletes the claim ref, records the failure with `recordDeliveryFailure` keyed by the commit that added the plan's `Design:` record (`refs.recordCommit`), and `retryVerdict` decides `waiting` or `stopped` after 3. Three failures across plans since the last success halt every spec run. A run that leaves the branch reading `work` succeeded.
- The cap. A going spec run counts in `scaleUp`'s `running` (`packages/domain/src/workflows/assign.ts:229`) beside `verifying`, so it starts one slice agent fewer. `specStart` refuses while a verify run goes, and `verifyStart` gains the same refusal for a going spec run, so the machine keeps the `Parallel agents` + 1 bound that DESIGN-phases.md §6 states.

**The person's controls.** A failed run's row in the Agents tab's *Waiting on you* section (`packages/board/src/app/lib/agent-rows/sections.ts:27`) names the reason, the log and the restart command `node skills/plot/scripts/board/plot-design.mjs restart <slug>`. The command clears the plan's failure record and deletes the claim ref when it reads `claim-only`, or when it reads `work` and the spec PR is closed unmerged; it refuses an open spec PR by name. The next pass then starts a run. `/plot-fleet --status` prints the same line. A going run shows in *Working*.

**The cost.** One spec run is one `Design command` context (Opus in this repository's commands), two host writes (the push and `pr-create`) and one PR for a person to review. Runs follow person acts only: 0 plans read `State: Design` on `main` today, and a plan gets one run per claim.

**Removing *Commission design*.** The board route and every reader of it go: `packages/board/src/server/commission.ts`; `CommissionDesignButton.tsx`; `POST /api/commission` and `GET /api/commission/<slug>` (`packages/board/src/server/index.ts:34`, `:298-307`, `:484`, `:768-777`); the board's `commission` capability (`packages/board/src/contract/schema.ts:1246`, `packages/board/src/server/board.ts:2385-2388`); `CardControls.commission` (`packages/domain/src/rules/card-controls.ts:12`, `:81`); `askedWithoutTransport`'s `commission` (`packages/board/src/server/entry/ask.ts:153`); the reads in `App.tsx:489-491`, `:1150`, `AgentList.tsx:306`, `:1662`, `:1996` and `rows.tsx:238`, `:463`; the row-menu entry in `menus.tsx:11`, `:1381-1508`, `:1588-1590`. 26 test files name `commission`: the route's own tests go, and the others drop the name. `commissionLogPath` moves out of `commission.ts` with the `commission` log kind (`packages/fleet/src/shared/agent-log.ts:319`), which the spec run reuses, so `agent-log.test.ts` keeps its import. `test/reconcile/agent-settings-spawn.test.mjs:58` drops `commission` from `SITES` and adds the spec run's site. `CLAUDE.md:502` names `commission` twice, in the endpoint list and in the HTTP-only routes; both go, and `./scripts/check-agents-md.sh --write` regenerates `AGENTS.md`.

**What stays human.** The fleet moves no plan into Design, approves no spike, merges no spec and approves no plan (D3, D10).

### Open Points

- [ ] Where the spec commit goes (story Open Point 9). Plan default: always `idea/<slug>-spec` with a draft PR. The plan PR's head branch is dropped: under D13 the fleet reads plans on the default branch, and *Needs design* writes `State: Design` onto an open plan PR's head (`needs-design.ts:116-131`), so the fleet never sees a Design plan whose plan PR is open. Reaching it needs a host call per pass to list plan PRs and a read of each head, for plans that reach main at spike approval anyway.
- [ ] The command a spec agent runs (story Open Point 10). Plan default: a `Design command` key, under the rule in `implement-run.ts:22-33`.
- [ ] A manual trigger for a spec run (story Open Point 13). Plan default: the *Commission design* button is removed, and `plot-design.mjs restart <slug>` is the person's control; no board button replaces it.

## Slices

### The spike dispatches

- `feature/the-fleet-dispatches-an-approved-spike` — the six `plan.phase !== 'approved'` filters in `rules/auto-dispatch.ts` (`:531`, `:582`, `:617`, `:656`, `:733`, `:798`) admit a `design` plan and leave the decision to `wave.verdict`; tests over an approved briefed spike, a briefless one and an unapproved slice <!-- builds: automatic dispatch of an approved spike -->

### What the fleet reads

- `feature/the-fleet-reads-design-work` — `specOf` moved into the domain and imported by the board entry; `specIsEmpty`, `designWork` and `specStart` with unit tests; the design failure store type <!-- builds: specIsEmpty, designWork and specStart -->

### The spec run

- `feature/the-fleet-commissions-the-spec` — `packages/fleet/src/shared/auto-design.ts`: `Design command` and `Auto-design`; the claim push; the worktree; `Worker bound`; the prompt; the failure store and settlement; `running` in `assign.ts:229` and the mutual refusal with `verifyStart`; `board/plot-design.mjs restart` with its row in `skills/plot/scripts/README.md`; the `/plot-fleet --status` line, the `/api/fleet` field and the *Working* and *Waiting on you* rows <!-- builds: the fleet's spec run and its claim -->

### The button goes

- `feature/commission-design-is-removed` — every site listed under *Removing Commission design*; `commission` leaves both lists at `CLAUDE.md:502`, and `AGENTS.md` follows <!-- builds: the removal of Commission design -->

## Acceptance

- Spike dispatch, `packages/domain/test/auto-dispatch.test.ts`: a Design plan whose spike is approved and briefed gets `max: 1` from `planAutoDispatch` and appears in `startableBranches`; with no brief, `dispatchCandidates` names it, `firstBrieflessBranch` returns it and `skippedPlans` reports it `no-brief`, and `planAutoDispatch` starts nothing; an unapproved slice of the same plan is in none of the six answers. `packages/fleet/test/unit/auto-dispatch.test.ts`: a briefless approved spike reaches `missingBriefs` and the `Brief command` is asked.
- Spec reading, `packages/domain/test/design-work.test.ts`: `specIsEmpty` is true for an absent section, an empty one and `SPEC_PLACEHOLDER`, and false for a link-only section and for written text; `designWork` answers `write-spec` for `design` with an empty spec and `specRef: 'absent'`, and `none` for `claim-only`, `work`, `unknown`, a written spec and any other state.
- Start rule, same file: `specStart` answers each refusal in its order, including `running` while a verify run goes, and `halted` with 3 failures newer than the last success. `packages/domain/test/auto-verify.test.ts`: `verifyStart` refuses `running` while a spec run goes. A going spec run counts in `scaleUp`'s `running`.
- Spec run, `packages/fleet/test/unit/auto-design.test.ts`: with `Auto-design` absent or not `true`, or `Design command` absent, a pass starts nothing; with both, one pass pushes one claim and starts one run in `.plot/state/design/<slug>/`, never in `repoRoot`, with `boundSeconds` from `Worker bound`; a second pass starts none; a rejected claim push starts none; a run that ends `claim-only` deletes the claim and records a failure, and the third failure reads `stopped`.
- Restart, `test/reconcile/design-restart.test.mjs`: `plot-design.mjs restart <slug>` in a sandbox clears the failure record and deletes a `claim-only` ref, deletes a `work` ref whose PR is closed, and refuses an open spec PR by name.
- Board rows, `packages/board/test/integration/spec-run-rows.browser.test.ts`: one test that a going spec run shows in *Working*, and one that a failed run shows in *Waiting on you* with its restart command.
- Removal, `packages/board/test/unit/commission-is-removed.test.ts` (replaces `commission-route.test.ts`): `POST /api/commission` and `GET /api/commission/<slug>` answer 404, and the board payload carries no `commission` capability. `packages/domain/test/card-controls.test.ts`: `CardControls` has no `commission` field, and a Draft plan still reads `needsDesign`.

## Notes

- 2026-10-12: drafted by an unattended `/plot-idea` batch run from jwloka's decisions of the same day. Type, Review and Impl came from the prompt.
- 2026-10-12, deliverable search (`plot-deliverable-search.sh`): `specIsEmpty` returned no artifact. `commission` returned `commission.ts` and `CommissionDesignButton.tsx` on the board, `agent-log.ts:319` (the `commission` log kind, which the spec run reuses) and `implement-run.ts:29` in the fleet. This plan replaces the board route with a fleet action and keeps the log kind.
- 2026-10-13, panel round 1 revision: applied all 7 moderation amendments. The `dispatch-spike` arm is dropped and all six auto-dispatch filters admit a Design plan (estate A1, contradiction A1-A2, deliverable A2-A3, cost O1). The spec run takes the auto-verify shape with `Design command`, `Auto-design` default off, its own worktree, `Worker bound`, a failure store that stops after 3, a *Waiting on you* row and `plot-design.mjs restart` (estate A3, contradiction A4-A5, A8, deliverable A8, cost A1-A4). The one-run record is the claim ref `idea/<slug>-spec` on origin (contradiction A3). The plan-PR-head destination is dropped under D13 (estate A2, cost A5). `specIsEmpty` reuses `specOf` and `SPEC_PLACEHOLDER`, and `designWork` takes explicit readings (estate A4-A5, deliverable A5). The removal surface is listed and is its own slice; each slice heading holds one branch (estate A6, contradiction A6, A10, deliverable A4, A7). Added `## Acceptance`; "Delivery tab" became the Agents tab's *Working* and *Waiting on you*, which exist on main, instead of a wait on the Draft `the-board-has-three-tabs` (estate A7, contradiction A9, deliverable A6). Named `plot-host.sh pr-create` as the spec PR route (contradiction A7, deliverable O3), and stated the cost line (cost A7). Where estate A3 asked only for a spec start beside `verifyStart` and contradiction O1 asked for one admission rule, the plan takes both: `specStart` refuses while a verify run goes, and `verifyStart` refuses while a spec run goes, so the `Parallel agents` + 1 bound of DESIGN-phases.md §6 holds. The first slice's wait on `feature/the-spike-can-be-dispatched` is removed: #1634 merged it, so no slice waits on another plan, and the heading order alone orders the four slices. The spike-dispatch slice moved first, because it is small and starts no new agent (cost O2). Declined: contradiction O3 (correct D13's rationale in the story), because this brief edits only the plan.
