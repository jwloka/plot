## Implementation brief — design-work-proves-the-path (wave 3: Approving the spike)

- **Plan (canonical):** [docs/plans/2026-10-12-design-work-proves-the-path.md](../../docs/plans/2026-10-12-design-work-proves-the-path.md) on `main`
- **Approved:** 2026-10-12, Jan Wloka, plan-PR #1608 merged
- **Branch:** `feature/the-spike-is-approved-alone` (base: `main`)
- **Ends as:** one PR to `main`
- **Review of the code:** per repo convention (CI gates; no separate review channel declared for this slice)

This is slice 3 of 7. Slice 1 (`feature/the-design-approvals-are-gated`, the spike itself, PR #1616) and slice 2 (`feature/a-slice-is-marked-spike`, the markers, PR #1621) are both merged to `main`. This slice is the first to build the actual `approveSpike` mechanism — nothing in the shipped code calls it yet. The next slice, `feature/the-spike-can-be-dispatched`, depends on what this one writes (the `Spike approved:` record and its gate) to admit the spike branch to dispatch.

### What to build

A plan in the Design phase currently has no way to approve just its spike slice — `approve()` only knows the whole-plan transition. This slice adds that second, narrower transition: `approveSpike(plan, input)`, callable only on a `design` plan with exactly one slice marked `<!-- spike -->` (via `spikeOf`, already shipped in `packages/domain/src/rules/spike.ts`) in the first slice position, with no existing `Spike approved:` record. It writes `- **Spike approved:** <date>, <who>, <channel>` to the plan file, merges the plan PR pinned to the reviewed head (for `Review: pr`), and clears the spike branch's `.plot/hold` entry.

This is exposed as a new mode of the existing `approve` controller — `plot-approve.mjs --spike <slug> --who <handle>` and `POST /api/approve {"slug":"<slug>","spike":true}` — not as a new action. `GATED`, `ControllerAction` and `_action_of` do not change.

### Decisions the plan settles — do not re-derive them

**The spike approval is a mode of `approve`, not a new controller action.** The plan considered (implicitly, by never raising it as an open point) giving the spike approval its own `ControllerAction` entry. It does not: the action stays `approve`, so the controller receipt the endpoint records (`server/approve.ts:352`), `GATED` (`rules/ci-suite.ts:233`), and the board-free route all need zero changes. The only new surface is the `"spike": true` flag reaching through to a different domain transition. **Why this matters**: if you find yourself adding a fourth `ControllerAction` or a second name to the `plot-approve*` glob at `rules/ci-suite.ts:284-292`, you've gone off-plan — round 2's resolved contradiction (plan line 144) explicitly rejects a second glob name.

**`approveSpike` is a workflow-level operation with its own host writes, parallel to `approve`'s, not a branch of `approve`.** For `Review: pr` with an open plan PR it writes `pr-ready` then merges with `pr-merge` pinned via `--match-head` to the SHA the person reviewed — exactly the pattern `entry/approve.ts:586` already uses for the whole-plan approval. Reuse that pinning logic rather than re-deriving it. Then it writes the `Spike approved:` record as a booking commit on the default branch, the same shape as `workflows/approve.ts:304-311`'s existing booking commit for `Approved:`.

**No `Slices confirmed:` record.** Round 2 considered and dropped a second status line for "the slices were confirmed after the spike merged." `Approved:` appearing beside `Spike approved:` already carries that fact — a plan with both records implies a person read the spike's result and then approved the rest. Do not add a third status line.

**The person arm (`approvalArm`) already exists** (shipped in slice 1, #1616) and decides whether `--who` is required, the channel word, and the unattended refusal — for the *whole-plan* approval. `approveSpike` is a different transition and needs its own `--who` requirement: the plan states "It needs `--who` from `People` on every review channel, because D4 makes the spike approval a person's act" — i.e., every channel, unconditionally, not gated through `approvalArm`. Do not call `approvalArm` from inside `approveSpike`; it answers a question about the *remaining-slices* approval, not this one.

**Refusal names, not ad-hoc strings:**
- `spike-not-first` — the plan has a `<!-- spike -->` branch, but it isn't the first slice's only branch.
- `spike-none` — the plan has zero or more than one annotated branch. (`spikeOf` already returns `undefined` for both cases — the refusal just names *why* `spikeOf` returned nothing, which `spikeOf` itself does not distinguish. You may need to re-inspect the slices directly to tell "zero" from "more than one" for the error message, since `spikeOf` collapses both to `undefined`.)
- Standard "already approved" refusal when `Spike approved:` already exists — follow the existing `approve` transition's naming convention for an idempotent-reject case.

**The receipt key is `<plan path>#Spike approved`, distinct from the plain `State:` receipt key (the bare path).** This is deliberate separation, not an oversight: the plan requires "a test spends each of the two receipts against the other's transition" and asserts the refusal — i.e., a `State:` receipt must NOT satisfy the `Spike approved:` gate and vice versa. The receipt file is named by the git blob oid of the *whole key string* (`entry/ladder.ts:64` `recordStateReceipt`, and `gitBlobOid` at the same file), and `state-receipts-file.ts:24,32-33` compares the stored value by plain string equality with no prefix matching. So as long as you pass the literal string `<relative plan path>#Spike approved` as the `relPath` argument into `recordStateReceipt` and into the gate's spend call, the oid-based filenames naturally diverge from the `State:` receipt's filename (which is just the bare path) — you don't need special-case logic to keep them apart, just consistency in the key string on both the write and the spend side.

**The gate change is additive to `rules/state-transition.ts`, keying on a new transition kind.** Add `spikeApprovalOf(text)` (reads whether a `Spike approved:` line is present/absent/changed, parallel to how `statusStateOf`/`stateTransitionOf` read `State:`) and extend `stateTransitionOf`'s caller so that a commit which adds, changes, or removes the `Spike approved:` line is classified as a transition needing a receipt under the `#Spike approved` key — same shape as the existing `State:` transition logic, but keyed on a different line and a different receipt namespace. **Removal has no owning command** — no command ever removes a `Spike approved:` record (a dropped plan after its spike keeps the record, per D17) — so `owningCommand` for a removal-of-this-field case should name no command, same as the plan says for `State:` removal in `stateTransitionRefusal` (`:357`, `owningCommand` returning something falsy/empty for an unowned removal already has precedent — follow it, don't invent a new shape).

**`--spike --dry-run` must write nothing and must stay ungated.** `--dry-run` is already in `NO_ENDPOINT` (`rules/ci-suite.ts:306`) and the existing `entry/approve.ts:55` dry-run path already merges, writes, and pushes nothing — confirm `--spike` composes with that existing short-circuit rather than bypassing it, and add the test the plan requires asserting zero writes.

**The controller gate's refusal message must name the exact body `{"slug":"<slug>","spike":true}`** for a command line carrying `--spike` — not the plain `{"slug":"<slug>"}` body the vanilla `approve` refusal names. Round 3 explicitly fixed this (plan line 153, "the gate's refusal for `--spike` names the wrong body"), so if you copy the existing `approve` refusal text verbatim without parameterizing on the `--spike` flag, you've reintroduced the bug the panel caught.

**`CLAUDE.md:499`'s *The Master Agent Uses The Controllers* section gains one clause naming `--spike`**, and `./scripts/check-agents-md.sh --write` must be run afterward to regenerate `AGENTS.md` — this is a gate (`check-agents-md.sh` is referenced as checking the mirror), not optional cleanup.

**Manifesto Principle 2** (`skills/plot/MANIFESTO.md:21-23`) gains one sentence: a recorded spike approval licenses implementation of its one branch. Write this as a factual addition to the existing principle, not a new principle.

### Done when

The plan's `## Acceptance` section is the specification — in particular:
- A commit that adds, changes, or removes a `Spike approved:` record with no receipt is refused by `plot-state-gate.sh`. Write the test that spends a `State:` receipt against the `Spike approved:` transition (and vice versa) and asserts both refuse — this is the assertion that proves the two receipt keys don't cross-satisfy each other, which is the entire point of the separate key namespace.
- `check-shell-lines.sh pr` passes with no shell removed outside this slice's own PR — this slice is TypeScript, bundle, and skill-text only; it must add zero shell lines. If you find yourself touching a `.sh` file, stop and reread *The shell line ratchet* in the plan — this slice is not supposed to need any.

Plus the repo's standard gates: run `node skills/plot/scripts/board/plot-local-checks.mjs` before each push and run what it prints (the suites that name your changed files, related tests and typecheck for touched packages, and the gate `scripts/check-*.sh` scripts). The `CI suites` in `## Plot Config` run in CI on every PR — do not run the full local `test:e2e` suite yourself (see `CLAUDE.md` *Testing*, "test:e2e IS CI'S GATE, NOT A LOCAL ONE"). A changeset is required: `bumps: plot: minor, plot-approve: minor` per the plan's slice line, with its own Model Guidance row update if you touch a skill's step list.

### Bookkeeping

Open the PR through the controller once the branch has its first real commit:

```bash
../plot/scripts/plot-open-pr.sh          # on this branch
../plot/scripts/plot-open-pr.sh --draft  # while still moving
```

Do not run `gh pr create`. When the PR is created, append `→ #<number>` to this branch's line in the plan's `## Slices` section (the "Approving the spike" heading, line 173) in the same way slices 1 and 2 already show `→ #1616` and `→ #1621`.

### Scope guard

This branch owns: `packages/domain/src/rules/state-transition.ts` (new `spikeApprovalOf` and transition wiring), `packages/domain/src/workflows/` (new `approveSpike` workflow), `packages/domain/src/transitions/plan.ts` or equivalent (the `approveSpike` transition itself — check where `approve`'s transition lives today and add the sibling there), `packages/board/src/server/entry/ladder.ts` (receipt key usage — likely no change needed if you reuse `recordStateReceipt` with the new key string), `packages/board/src/server/entry/approve.ts` and `packages/board/src/server/approve.ts` (the `--spike` CLI flag and the `"spike": true` request body), `packages/domain/src/rules/controller-gate.ts` (the refusal body text for `--spike`), an *Approve spike* button component on the board, `CLAUDE.md:499`, the regenerated `AGENTS.md`, and `skills/plot/MANIFESTO.md` Principle 2.

Other branches in this plan, verified via `git ls-remote --heads origin` at brief-writing time: `feature/the-design-approvals-are-gated` (merged, PR #1616), `feature/a-slice-is-marked-spike` (merged, PR #1621) — both done, nothing to collide with. `feature/the-spike-can-be-dispatched`, `feature/the-slices-are-confirmed-after-the-spike`, `feature/a-tracer-plan-stays-in-design`, and `feature/a-tracer-plan-ships-with-its-dependent` have no remote ref yet — they fold after this one and read the `Spike approved:` record and receipt this slice creates, but no code in them exists to collide with today.

If you find something the plan did not anticipate, report it rather than improvising outside scope.
