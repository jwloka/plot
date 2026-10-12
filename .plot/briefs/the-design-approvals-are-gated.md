## Implementation brief — design-work-proves-the-path (the spike: the person arm)

- **Plan (canonical):** [docs/plans/2026-10-12-design-work-proves-the-path.md](../../docs/plans/2026-10-12-design-work-proves-the-path.md) on `main`
- **Approved:** 2026-10-12, Jan Wloka, plan-PR #1608 merged
- **Branch:** `feature/the-design-approvals-are-gated` (base: `main`)
- **Ends as:** one PR to `main`, closes issue #1611
- **Review of the code:** standard PR review

This branch is the plan's own spike — marked `<!-- spike -->` on its slice line — and it is alone under the first slice heading. Six sibling branches (`feature/a-slice-is-marked-spike` through `feature/a-tracer-plan-ships-with-its-dependent`) are held via `.plot/hold` entries (decision D29) until this slice's Acceptance criteria hold in CI. Nothing else in the plan opens until a person reads this slice's CI result and confirms or rewrites the remaining six slices. There is no dispatch gate for the spike marker yet — `plot-plan-meta.sh` reads no `spike` field until `feature/a-slice-is-marked-spike` ships — so this slice runs because a person is placing it, not because any mechanism admitted it.

### What to build

The claim at the center of the whole plan is that approving a plan in the **Design** phase needs a named person, on every review channel, not just `Review: in-session`. Three panel rounds read this claim and each found a channel the previous revision missed — that history is exactly why this is the spike and not slice 2. Build it, and prove each channel refuses the unattended path and accepts the named-person path.

Four pieces, all in `packages/domain` and `packages/board`:

1. **`approvalArm({ phase, review })`** — a new domain rule answering `'person' | 'pr' | 'ballot'`. It keys on **phase**, not on any record: a `design` plan answers `person` for `Review: pr`, `in-session`, `NONE`, and an empty field. A `ballot` plan answers `ballot` in every phase (the tally is already a named-people act, so `approve` keeps refusing it with `review-human`).
2. **The `person` reading beside `inSession`** — in `packages/domain/src/workflows/approve.ts`, `packages/domain/src/transitions/plan.ts`, and the bundle `packages/board/src/server/entry/approve.ts:480-528`. `inSession` (`review === 'in-session'`, unchanged) keeps deciding `sameBranch`, whether the plan PR is read, and whether the merge is skipped. A **separate** `person = approvalArm(...) === 'person'` reading decides: whether `--who` must name a handle in `People`, the record's channel word, and the unattended refusal. These are deliberately two readings because conflating them is exactly the bug this slice fixes (see *Decisions* below).
3. **The unattended refusal, worded for Design** — for a `person`-arm plan whose `Review:` is not `in-session`, the refusal names the Design phase and D10, not "declares `Review: in-session`" (today's wording at `entry/approve.ts:528`, which is literally false for a `Review: pr` Design plan).
4. **The 409 of `POST /api/approve`** (`packages/board/src/server/approve.ts:306`) — answers 409 on the agent arm for **every** `person` answer (not just `in-session`), and also answers 409 for a plan whose phase reads `NONE` or empty, naming `state-unreadable`, so the board never starts an agent that can only refuse.
5. **The state gate fix of #1611**, plus the same-slug rename case it does not name — in `stateTransitionOf` (`packages/domain/src/rules/state-transition.ts:131-141`) and its caller. Today the gate passes three things it should refuse: removing a `State:` line from a plan whose `HEAD` holds one, adding a line to a plan whose `HEAD` holds none, and (undocumented in #1611) a rename to another date-prefixed path with a changed value, because the new path has no `HEAD` version and the old path is deleted. Fix: a removal is a transition *to* none and needs a receipt; an addition is a transition *from* none and needs one too; a commit that deletes a plan file and adds one with the same slug (`slugOf`) reads the deleted file's value as `before` for the rename case. A brand-new file with no same-slug deletion still passes untouched — `/plot-idea` keeps creating Draft/Design plans with no prior history.

### Decisions already made — do not re-derive them

**Why `inSession` and `person` are two readings, not one.** Round 3 found that the bundle's `inSession` boolean was doing double duty: deciding the PR-merge mechanics *and* deciding whether a human must be named. Collapsing them meant a `Review: pr` Design plan whose plan PR had already merged took the `pr` arm for its *second* approval — exactly the contradiction panel round 1 flagged as HIGH. The fix is not a smarter `inSession` — it's recognizing these are different questions answered by different inputs (`review` alone vs. `approvalArm(phase, review)`), so they can disagree on a `Review: pr` Design plan: `inSession` is false (skip nothing, still check/merge the PR), `person` is true (still require `--who`, still refuse unattended). Both readers (workflow and bundle) need both booleans live side by side.

**Why `approvalArm` keys on phase, not on any record.** An earlier revision considered gating the person requirement on a `Spike approved:` record (so the arm would "turn off" once some marker was removed). Round 2 found this removable: nothing stops a hand-edit from deleting the record, which would silently flip the plan back onto the `pr`/`ballot` arm mid-flight. `approvalArm` reads only `phase` and `review` — values the state gate (once this slice fixes it) already protects — so there is no second thing to protect separately.

**Why the rename case belongs here and not in a later slice.** #1611 names the two-hand-commit path (remove line, then re-add with a different value) but not the single-commit rename (delete `docs/plans/<old-date>-slug.md`, add `docs/plans/<new-date>-slug.md` with a different `State:` value in one commit). Both defeat the same invariant — the gate not holding the `State:` line against any form of “no `HEAD` version to compare against” — and this slice is the one place that touches `stateTransitionOf`, so both ship together or the plan's state model has a known hole with no slice assigned to close it.

**Why this runs now, before the markers slice exists.** D29: the `<!-- spike -->` annotation gates nothing yet. This slice is approved and dispatchable only because a person (not a mechanism) placed it first and will manually un-hold the rest after reading its CI result — there is no automated eligibility check to lean on. Don't treat the annotation as load-bearing in this slice's own code; it's a declaration for humans and for the markers slice to come.

**Rules carried over unchanged, worth not re-breaking:**
- `PLOT_UNATTENDED=1` stops a *fleet* agent via the bundle reading the board **process's own** environment — never the HTTP caller's `who` field. The script arm of `POST /api/approve` still trusts `who` from the request body; that's a known, accepted gap (an agent on the machine can send a declared handle), not something this slice closes.
- `--who` authenticates nobody — it only requires a handle present in the `People` config. Don't add authentication; that's out of scope and not asked for anywhere in the plan.
- A refusal is a refusal, not advice: every new refusal arm (`state-wrong` reworded, the 409 cases, the gate's rename refusal) must actually stop the write, matching this repo's "Gates Over Rules" and "The Master Agent Uses The Controllers" conventions in `CLAUDE.md`.

### Done when

The plan's `## Acceptance` section is the specification for this slice — specifically the second bullet, *"What the spike must show before the remaining slices are confirmed,"* and its five sub-bullets. Each is a CI-run test on this branch's own PR, not a later slice's job:

- A `Review: pr` Design plan with a merged plan PR refuses approval with no `--who`, through all three routes: the bundle, the board-free route (`plot-state-receipt.sh --unowned-action approve`, then the bundle), and the board's script arm — tested **both before and after** a `Spike approved:` line and a `<!-- spike -->` annotation are present/removed (this slice doesn't write that record, but the test fixture must prove the refusal doesn't depend on it, per the "keys on phase, not a record" decision above). With `--who` naming a handle in `People`, it approves and records channel `in-session`.
- The same plan with an **open** plan PR and `--who` approves with a `pr-merge` pinned to the PR head SHA — proving the person reading does not skip the merge that `inSession` still owns.
- Refuses under `PLOT_UNATTENDED=1` through the bundle with a refusal naming the Design phase (not the old "declares `Review: in-session`" wording). `POST /api/approve` answers 409 with an `Approve command` declared, and starts no agent. A plan whose `State:` line reads `NONE` or empty also answers 409 with `state-unreadable`.
- A `Review: ballot` Design plan keeps its tally (refused `review-human` as today). A `Review: pr` plan in `draft` (not `design`) keeps the plain `pr` arm — this slice must not widen the person requirement to Draft plans.
- `plot-state-gate.sh` refuses, with no receipt: (a) a commit removing a plan's `State:` line, (b) a following commit adding `State: Draft` to it — refused at the **second** commit even if the first passed, matching the exact #1611 path — and (c) a rename of a Design plan to another date prefix with a changed `State:` value. A brand-new plan file with no same-slug deletion, and a controller write carrying its receipt, both still pass.

Plus: a commit that adds/changes/removes a `Spike approved:` record is **not** this slice's concern (that record and its gate belong to `feature/the-spike-is-approved-alone`) — don't build it here even though the Acceptance section mentions it in a later bullet.

Also: the repo's gates. Changeset `bumps: plot-approve: patch`, written with the description first and the `bumps:` block last (see `CLAUDE.md` *Versioning* — 11% of past changesets got this backwards and published a bare comment marker as their changelog entry). `CLAUDE.md`'s state-gate paragraph gets amended to name the removal, addition, and rename refusals. Run `./scripts/check-agents-md.sh --write` after that edit so `AGENTS.md` regenerates — CI refuses a mirror that differs. The PR body closes #1611.

For tests: run `node skills/plot/scripts/board/plot-local-checks.mjs` before each push and run what it prints — it resolves the related tests and typecheck for whatever package you touched (`packages/domain`, `packages/board`) plus the relevant `scripts/check-*.sh` gates. The suites under the `CI suites` config key (`test:e2e`, `test:contracts`, `test:board`, domain coverage, `test/reconcile/*.test.mjs`) run in CI on this PR — do not run them locally (`CLAUDE.md` *Testing*: `test:e2e` dispatches real workers into sandbox repos and is CI's gate, not a local one). A failure there comes back as a correction, not a local obligation.

Name the shell gate explicitly if you touch any `.sh` file: `scripts/check-shell-lines.sh` refuses a PR whose shell under `skills/` grows past its own merge base, with no stored allowance. This slice is specified as pure TypeScript/domain/bundle work — no shell line should move. If you find you need one, remove an equal number elsewhere in the same change.

### Bookkeeping

Open the PR through the controller, never `gh pr create`:

```bash
skills/plot/scripts/plot-open-pr.sh          # current branch
skills/plot/scripts/plot-open-pr.sh --draft  # while work is still moving
```

It reads which plan names this branch and opens the PR with the slice heading as title, the plan and this brief in the body. Push the first real commit as soon as it exists — a branch with no PR and no commits is invisible to the fleet. Once the PR exists, append `→ #<number>` to this branch's line in the plan's `## Slices` section (first heading, `feature/the-design-approvals-are-gated` line).

### Scope guard

This branch owns:
- `packages/domain/src/rules/approval-arm.ts` (new) or equivalent — the `approvalArm` rule
- `packages/domain/src/workflows/approve.ts` — the `person` reading beside `inSession`
- `packages/domain/src/transitions/plan.ts` — the `approve` transition's refusal wording
- `packages/domain/src/rules/state-transition.ts` — `stateTransitionOf` and its caller (the #1611 fix + rename)
- `packages/board/src/server/entry/approve.ts:480-528` — the bundle's `person`/`inSession` split and unattended wording
- `packages/board/src/server/approve.ts:306` — the 409 check
- `skills/plot-approve/SKILL.md` — the unattended instruction for `Review: pr`
- `CLAUDE.md` (state-gate paragraph) and generated `AGENTS.md`
- A changeset file

**No other branch is in flight on this plan yet** — all six siblings are held (D29) and none has an open worktree. This is genuinely the only active branch on `design-work-proves-the-path` right now; there is no collision to track. If you find something the plan did not anticipate — a seventh channel, a gate that doesn't fire the way *Decisions* describes — report it rather than improvising past this slice's scope. In particular, do not start building the markers slice's `spike` field, the `Spike approved:` record, or any dispatch-admission change; those are explicitly later slices and are currently held.
