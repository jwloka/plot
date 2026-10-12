# Round 3 — contradiction lens

- **Subject:** `docs/plans/2026-10-12-design-work-proves-the-path.md` at `8d7230934`
- **Lens:** contradiction — where the plan disagrees with itself, a sibling, the story's decisions, `CLAUDE.md`, or the code it cites

Position: amend

## Summary

The three design moves hold in their main lines. Move (1) holds: the controller gate classifies a `--spike` call as `approve`. Move (3) holds in arithmetic and in the admission set: the shell `case` arms and `plangate` admit and refuse the same phases and `Impl:` answers. Move (2) holds against the `Spike approved:` record, but the plan now makes the same kind of claim about the `State:` line that round 2 found false about the record, and the plan's own Motivation contradicts it. The plan also routes the person arm through a bundle variable that does three jobs, and its tests rewrite away a stated dispatch guarantee. No finding blocks approval alone; four need a sentence each.

## Findings

### 1. The `State:` line is not held against a remove-and-re-add or a rename (MEDIUM, rubric a, b)

The plan says (Design, *The approval of a Design plan is a person's act*): "The `State:` line is the key because the state gate already refuses a hand edit of it". The plan's own Motivation (line 34) says the opposite: "The state gate reads the `State:` line only, and passes a commit that removes a line". The code agrees with the Motivation. `stateTransitionOf` (`packages/domain/src/rules/state-transition.ts:131-141`) returns `null`, so the gate passes, when the committed text has no `State:` value (`after === ''`) and also when `HEAD` has no `State:` value (`before === ''`). A file with no `HEAD` version passes too (`head === null`).

Two plan-only hand commits therefore move a Design plan to Draft: commit 1 removes `State: Design`, commit 2 adds `State: Draft`. A rename to another date prefix with `State: Draft` does it in one commit, because the new path has no `HEAD` version and `slugOf` (`state-transition.ts:48-66`) keeps the slug. `approvalArm({phase: 'draft', review: 'pr'})` then answers `pr`, and `workflows/approve.ts:227-253` and `:270-274` approve a plan with a merged plan PR and no named person. The single-commit removal does refuse `state-unreadable` (`workflows/approve.ts:169-174`), as the plan says; the re-add is the gap.

This is the round-2 HIGH moved from the record to the `State:` line. I rate it MEDIUM and not HIGH because the same hole already lets a hand edit write `State: Approved` on any plan, so the person arm is no weaker than Manifesto P2 is today. The plan still claims D10 holds "on every route" (Changelog line 18), and `DESIGN-phases.md:177` repeats "the `design` state, which the state gate holds". Fix: slice 2 already teaches the gate to refuse a removal of the `Spike approved:` record; extend the same refusal to a removed `State:` line and to an added one on a file whose `HEAD` holds none, or narrow the claim to "a hand edit that changes the value".

### 2. The bundle's `inSession` reading does three jobs, and the plan routes the person arm through it (MEDIUM, rubric a)

The plan says the bundle's `inSession` reading (`packages/board/src/server/entry/approve.ts:480`) asks `approvalArm`, "so the unattended refusal at `:527` applies". In the code, `inSession` also decides `sameBranch` (`:488`), the PR branch, and whether the plan PR is read at all (`:489-491`). The workflow has its own `inSession` (`workflows/approve.ts:229`) that skips the PR state check (`:231-247`) and the `pr-ready`/`pr-merge` writes (`:254`). If an implementer sets `inSession = approvalArm(...) === 'person'`, a Design plan with `Review: pr` and an open plan PR never merges that PR. That contradicts the plan's own sentence "an open plan PR still merges pinned to its head, so a Design plan whose PR never merged reaches the default branch". Fix: name a separate `person` reading for the `--who` check, the channel word and the unattended refusal at `:527`, and keep `inSession` for the PR handling. The refusal text at `:528` ("declares 'Review: in-session'") is also wrong for a `Review: pr` Design plan.

### 3. The dispatch rewrite drops the shell's remediation lines, and three existing tests assert them (MEDIUM, rubric e)

I compared `plot-dispatch.sh:2957-3004` (read with the Read tool) with `plangate` (`packages/domain/src/workflows/dispatch.ts:527-574`) arm by arm. The admission set is the same for every non-Design plan: `approved` passes; `draft`, `delivered`/`released`, empty and every other word refuse; `own-branches`/`NONE`/empty pass; `same-branch`, `other-repo`, `none` and any other word refuse. Every shell arm exits 1. Two classifications differ in wording only: phase `NONE` hits the shell's `*)` arm ("is in phase 'NONE', not Approved") and the domain's `state-unreadable`; `design` and `UNKNOWN` hit `*)` and `state-wrong`.

The words differ, and the tests assert the shell's words as contracts:

- `test/reconcile/dispatch.test.mjs:974` asserts `/plot-approve/` with the message "must say how to fix it, not just refuse". The domain's `phase-draft` detail names no command.
- `:994` asserts `/phase/i` for a plan with no phase. The domain's `state-unreadable` detail says "state", and the gate source path holds no "phase".
- `:1042` asserts `/nothing to implement/i` for `Impl: none`. The domain says "knowledge-only work".

The plan says "the contract tests that assert the shell's refusal words read the domain's words". For `:974` that deletes a guarantee the test states. The shell also loses "To start new work: /plot-idea", "Implement on that branch instead: /plot-implement", and "Set the plan's 'Impl:' line to one of …", and `StartWorkButton.tsx:56` shows these words on the board. Fix: give `plangate`'s details the hints (both callers gain them), or state that the guarantee at `:974` is dropped and why. Name the exit code (1) of the new `plot-ask.mjs plangate` arm.

### 4. `plangate` is private and needs more than the plan-meta JSON (LOW, rubric e)

`plangate` is a module-private `const` (`workflows/dispatch.ts:486`), called once at `:267`. It reads `readings.gate.refResolved`, `.file`, `.parsed` and `.source` and `readings.slug`, not only the plan-meta fields. The plan says the script "pipes the plan-meta JSON it already holds"; it must also pass the slug and `$gate_source` (the `/origin\/main/` assertion at `dispatch.test.mjs:2552` needs the source). The plan does not say that the shell fails closed when `plot-ask.mjs` is missing or throws, which `dispatch.test.mjs:988-997` requires today.

### 5. The controller gate refuses `--spike`, and its refusal names the wrong body (LOW, rubric c)

`GATED` holds `plot-approve.mjs` (`packages/domain/src/rules/ci-suite.ts:233-239`). `--spike` is not in `NO_ENDPOINT` (`:304-305`) and not in `VALUE_FLAGS` (`:310`), so `actionFor` (`:313-319`) returns `approve`, and a bare `plot-approve.mjs --spike <slug> --who <h>` refuses as `plot-approve.mjs` does. `ControllerAction` (`controller-gate.ts:11`) and `_action_of` need no change. The refusal text names `POST /api/approve {"slug":"<slug>"}` (`controller-gate.ts:113`) with no `"spike": true`, so an agent that follows it runs the full approval. The plan does not say what `--spike --dry-run` does; `--dry-run` makes the call ungated.

### 6. The HTTP script arm names a person nobody authenticates (LOW, rubric a, b)

On the script arm, `who` comes from the request body (`packages/board/src/server/approve.ts:294-295`), and the comment at `:288-293` says "an agent on the machine can send a declared handle". The bundle's unattended refusal reads the board process's `PLOT_UNATTENDED`, not the caller's, so an unattended agent that sends `POST /api/approve {"slug":…,"who":"jwloka"}` approves a Design plan. This is the in-session channel's existing limit, and the plan's 409 change covers only the `Approve command` arm (`:306`). The plan says "on every route"; it should name this route as a rule, not a gate.

### 7. The shell-line arithmetic is right (no finding, rubric d)

`scripts/check-shell-lines.sh` counts non-comment, non-blank lines of every `.sh` under `skills/` and compares `HEAD` with the merge base (`:40-46`, `:96-106`). The phase `case` (`plot-dispatch.sh:2957-2978`) is 22 counted lines, the `Impl:` `case` (`:2983-3004`) is 22 (its comment lines `:2980-2982` count zero), and the two `sed` lines (`:2954-2955`) are 2. `gate_phase` and `gate_impl` have no other reader; `gate_meta` stays, because `:3094` reads it. Removal is −46, and the plan's −43 net for the file is right with a 3-line call. I did not count the `plot-plan-meta.sh` and `plot-fleet-scan.sh` additions line by line; the stated margin (+36 against −46) covers twice the estimate.

### 8. Stale cross-references to the shell copy (LOW)

`the-fleet-writes-the-design` line 27 and `DESIGN-phases.md:176` list `plot-dispatch.sh:2957-2978` as one of five places that `feature/the-spike-can-be-dispatched` changes. After this revision slice 1 deletes that copy, and slice 4 says the shell "follows with no change". Both lines need the new wording.

### 9. A window before slice 2 (LOW, rubric b)

Slice 2 waits on `feature/a-draft-can-need-design`, which lets a person move a plan to Design. Between that merge and slice 2's merge, a Design plan with `Review: pr` approves on the `pr` arm, and `/plot-approve` unattended proceeds on it (`skills/plot-approve/SKILL.md:121-124`). No spike approval exists in that window, so only a plan moved to Design without a spike is exposed.

## Rubric answers

- **a.** D10 holds on the bundle, the `Approve command` arm and a removed `State:` line. It does not hold against a remove-then-re-add or a rename (finding 1), and the HTTP script arm trusts the body's `who` (finding 6). Finding 2 can break the PR half of the person arm.
- **b.** Yes, through finding 1 (two hand commits, or one rename) and finding 6 (an agent names a declared handle). Both are holes that exist today for every plan; the plan should name them, not claim them closed.
- **c.** Yes. `plot-approve.mjs --spike` is gated as `approve` (finding 5).
- **d.** Yes for `plot-dispatch.sh` (−46 counted lines removed). The other two files are estimates (finding 7).
- **e.** The admission set and exit codes do not change for non-Design plans. The words change, and three existing tests assert the old words, one of them as a "must say how to fix it" contract (finding 3). The plan names no test that compares the two implementations arm by arm.
- **f.** Not yet. Findings 1 to 3 each need one sentence in the plan.

## What I looked at and ran

- Read the plan in full, `round2.md`, the story's decisions (D3, D4, D10, D13, D16, D17, D25 to D27) and `DESIGN-phases.md:166-177`, `:262`, `:304-305`; grepped `the-phases-are-declared` and `the-fleet-writes-the-design` for the gate, the controller list and the shell copy.
- Read `packages/domain/src/workflows/approve.ts:150-340`, `transitions/plan.ts:245-345`, `rules/state-transition.ts:40-200`, `rules/ci-suite.ts:215-320`, `rules/controller-gate.ts:1-140`, `rules/eligible.ts:30-50`, `workflows/dispatch.ts:440-575`.
- Read `packages/board/src/server/approve.ts:270-370`, `server/entry/approve.ts:470-535` and the `recordStateReceipt` call at `:346`, `server/entry/gate.ts:215-255`, `server/entry/ladder.ts:50-90`, `server/entry/main.ts` (questions and usage), `packages/board/build.mjs:160-215`.
- Read `skills/plot/scripts/plot-dispatch.sh:2920-3020` with the Read tool, grepped its `gate_*` readers and `exit` codes, read `skills/plot/scripts/plot-approve.sh`, `scripts/check-shell-lines.sh`, `skills/plot-approve/SKILL.md:105-135`, `:215-240`.
- Read `test/reconcile/dispatch.test.mjs:955-1050` and `:2530-2560`.
- Ran only read commands (`sed -n`, `grep`, `wc`, `git log`). Ran no test, no bundle and no fleet or board command.
