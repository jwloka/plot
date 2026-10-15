## Implementation brief — a-desk-started-by-plot-dispatch (wave: Repair)

- **Plan (canonical):** [docs/plans/2026-10-15-a-desk-started-by-plot-dispatch.md](../../docs/plans/2026-10-15-a-desk-started-by-plot-dispatch.md) on `main`
- **Approved:** 2026-10-15, Jan Wloka, plan-PR #1776 merged
- **Branch:** `bug/a-free-agent-desk-is-continuable` (base: `main`)
- **Ends as:** one PR to `main`
- **Review of the code:** per repo convention (CI + reviewer)

Waits on the Reproduce slice, `bug/a-free-desk-block-reproduces` → #1779, now merged (commit `798960dd4`). This branch is the only other branch in the plan's `## Slices` section, so nothing waits on it.

### What to build

A free agent that `plot-dispatch --start` hands a slice to can end up stuck claimed forever if its prompt never starts. Measured 2026-10-15 (issue #1773): `free-7f744c29` failed to launch `claude -p` three times (an account-change error) on `feature/plan-and-story-cards-show-type-and-owner`, wrote `PLOT-BLOCKED.md`, and ended with reason `unstarted`. `plot-continue-command.mjs` and `POST /api/continue` both refused `no-manifest` — the agent's manifest was already gone, and `continueTarget`'s fallback (`packages/domain/src/rules/continue-target.ts:153`) only accepts an ending reason of `blocked` or `holding-work`, not `unstarted`. The slice stayed claimed; fleetd never re-dispatched it, and no controller could answer it.

The Reproduce slice (#1779, merged) added a failing test (`it.fails`) in `packages/board/test/unit/continue-route.test.ts` that pins exactly this: an ending with reason `unstarted`, a `PLOT-BLOCKED` marker still in the tree, no manifest naming the desk — `continueTarget` must return `{ kind: 'continue', manifest: 'write' }`, not refuse `no-manifest`.

The fix is **repair 1** from the plan's Design section (not repair 2): widen `continueTarget`'s fallback reason check at `continue-target.ts:153` to accept `'unstarted'` alongside `'blocked'` and `'holding-work'`, and update the function's doc comment (lines ~122-128, "Only for `unnamed`: an ending that read `blocked` OR `holding-work`...") to name the third reason. Then remove `.fails` from the test the Reproduce slice added (`describe('a free desk whose prompt never started — #1773', ...)`), so it runs as a normal green assertion.

### The decisions the plan settles — do not re-derive them

**Why repair 1, not repair 2.** The plan's Design section offered two approaches: (1) widen `continueTarget`'s accepted reasons, keeping the existing `manifest.worktree`-field join the 2026-10-01 plan `a-desk-and-its-manifest-name-each-other` settled, or (2) have the continue controller resolve an unnamed desk by its checked-out branch — a second join mechanism that plan deliberately removed. The Reproduce slice's measurement answered the plan's open questions directly: the ending record **did** read, named the correct branch, and the marker **was** present — `unnamed`, branch matched, marker present, confirmed by `assert.equal(deskManifestFor(...).kind, 'unnamed')` in the reproduction test. The reading reached the rule correctly; the rule's own reason list was too narrow. That rules out repair 2 outright — there is no missing join to add, only a reason the fallback doesn't yet recognize. Do not touch `deskManifestFor`, the manifest join, or add a branch-based resolution path.

**Why `unstarted` specifically, and not a broader change to the reason check.** `unstarted` means the prompt never ran at all — no slice was attempted, so nothing the fallback already trusts (`blocked`, `holding-work`) changes in kind: the desk is still waiting for exactly the answer a person would give, with an unanswered `PLOT-BLOCKED` marker as proof. The other four ending reasons (`bound`, `quiet`, `unreadable`, `spent`, `unregistered`, `limited`) describe different situations — a clock running out, an idle agent, a context limit, a usage limit, a vanished manifest — none of which carry the same "I wrote a question and I'm done" signal `blocked`/`holding-work`/`unstarted` share. Adding only `unstarted` is the narrowest fix that resolves the measured defect; do not add the other reasons without a separate measurement showing each one leaves the same marker-present, branch-matched, unnamed-manifest shape.

**The rule stays in the domain.** Per `CLAUDE.md`'s layering rule, `continueTarget` is a pure domain rule (`packages/domain/src/rules/continue-target.ts`) — no I/O, no ports. The fix is a one-line change to its reason-equality check plus a doc-comment update. Nothing in an adapter or script needs to change: the reading that reaches `continueTarget` was already correct per the Reproduce slice's own assertion.

### Done when

The plan's `## Done when` is implicit in its `## Slices` wording: "the repair the measurement selects, with the test from the first slice passing." Concretely:

- `continueTarget` returns `{ kind: 'continue', manifest: 'write' }` for an `unnamed` manifest, an ending read as `ended` with reason `unstarted` naming the asked branch, and `question: true` (unanswered marker present) — matching the existing `blocked`/`holding-work` behavior.
- The Reproduce slice's test in `packages/board/test/unit/continue-route.test.ts` (`describe('a free desk whose prompt never started — #1773', ...)`) passes with `.fails` removed — do not weaken the assertion to make it pass; the fix is in `continue-target.ts`.
- The existing `blocked` and `holding-work` fallback behavior is unchanged — this is an addition to the reason list, not a restructuring. The "control" test in the same `describe` block (ending reason `blocked`) must keep passing unmodified.
- The doc comment on `continueTarget` (the "4. **The fallback.**" paragraph, lines ~122-128) is updated to name `unstarted` as a third accepted reason — stale comments here are exactly what the plan's own prose keeps warning against elsewhere in this repo.

Plus: run `node skills/plot/scripts/board/plot-local-checks.mjs` before each push and run what it prints — it resolves which tests and typecheck apply to a change touching `packages/domain/src/rules/continue-target.ts` and `packages/board/test/unit/continue-route.test.ts`. The suites in `CI suites` run in CI on every PR; do not run them locally (`test:e2e` especially — see `CLAUDE.md`'s Testing section). A changeset is needed (`.plot/templates` convention / `check-changeset-packages.sh`): package `plot` (this is a bug fix to shipped domain behavior reachable via the board/skills), patch level, and it may optionally name this plan on a `plan:` line — description first, `bumps:` block last.

`scripts/check-shell-lines.sh` is not implicated — this slice touches no `.sh` file.

### Bookkeeping

Open the PR through the controller once the first real commit exists:

```bash
skills/plot/scripts/plot-open-pr.sh          # current branch
skills/plot/scripts/plot-open-pr.sh --draft  # while still moving
```

Do not run `gh pr create` directly. When the PR is created, append `→ #<number>` to this branch's line in the plan's `## Slices` → `### Repair` section.

### Scope guard

This branch owns:

- `packages/domain/src/rules/continue-target.ts` — the reason-check widen and doc-comment update
- `packages/board/test/unit/continue-route.test.ts` — removing `.fails` from the #1773 test block only
- a new changeset file under `.changeset/`

Other branches in flight, verified at dispatch time (2026-10-15):

- `feature/plan-and-story-cards-show-type-and-owner` — unrelated board feature work (the branch the original #1773 incident happened on; not touched by this fix)
- `bug/a-clean-wait-end-writes-no-marker` — a different ending-record defect (#1716-adjacent); does not touch `continue-target.ts`

If you find something the plan did not anticipate — e.g. the fallback needs more than one reason added, or the test still fails after the reason-list widen — report it rather than improvising outside scope; the plan's open questions (#4, whether #1743 changes which ending reasons the fallback accepts) are explicitly not yet closed and may need their own slice.
