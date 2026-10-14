## Implementation brief — the-fleet-writes-the-design (wave 4: The button goes)

- **Plan (canonical):** [docs/plans/2026-10-12-the-fleet-writes-the-design.md](../../docs/plans/2026-10-12-the-fleet-writes-the-design.md) on `main`
- **Approved:** 2026-10-13, jwloka, plan-PR #1608 merged
- **Branch:** `feature/commission-design-is-removed` (base: `main`)
- **Ends as:** one PR to `main`
- **Review of the code:** per repo convention (standard PR review)

This branch is the fourth wave. It depends on the first three, all merged: `feature/the-fleet-dispatches-an-approved-spike` (#1665), `feature/the-fleet-reads-design-work` (#1672) and `feature/the-fleet-commissions-the-spec` (#1680, the spec run itself — `auto-design.ts`, `rules/design-work.ts`, `rules/fleet-run.ts` all now exist on `main`). This slice waits on nothing of its own — it moved ahead of *The spec rows* in the plan's heading order specifically so the removal does not wait on that sibling's Draft dependency (plan Notes, round 3: "*The button goes* moved ahead of *The spec rows*, so the removal does not wait on the Draft sibling"). The fifth and last wave, *The spec rows* (`feature/the-board-shows-the-spec-run`), waits on `feature/waiting-on-you-shows-a-failed-verification` from a different plan, not on this branch.

### What to build

Delete the *Commission design* board route and every reader of it. The observed reason: with the spec run merged (#1680), the fleet now writes a Design plan's spec automatically — the board button that used to kick off an agent which, per the plan's Motivation, "does none of its job today" (its own agent edits `State:` by hand, which the state gate refuses) is now not just broken but redundant. This slice is pure deletion with no new behavior.

Confirmed still present on `main` at the time of this brief: `packages/board/src/server/commission.ts` (424 lines) and `packages/board/src/app/components/CommissionDesignButton.tsx` both still exist. Removing them is this slice's entire job.

### The decisions the plan settles — do not re-derive them

**This is a removal slice, not a refactor.** Nothing here is rewritten to do the job differently — the capability is gone, full stop. Don't be tempted to fold any of `commission.ts`'s logic into `auto-design.ts`; the spec run already has its own complete prompt and pass logic from the prior slice, built independently of this route.

**The full removal surface is enumerated in the plan ("Removing *Commission design*") — treat it as the checklist, not as illustrative examples.** It names, with line numbers measured at a specific commit (`8b0180d52`), every site to touch:

- Delete outright: `packages/board/src/server/commission.ts`, `CommissionDesignButton.tsx`.
- Delete the route: `POST /api/commission` and `GET /api/commission/<slug>` in `packages/board/src/server/index.ts` (`:34`, `:298-317`, `:484`, `:768-798`).
- Delete the capability: `commission` in `packages/board/src/contract/schema.ts` (`:1234-1292`) and `packages/board/src/server/board.ts` (`:2389-2392`).
- Delete from `CardControls`: `packages/domain/src/rules/card-controls.ts` — the `commission: z.boolean()` field (`:12`), the comment naming it (`:43`), and the `commission: draft` assignment (`:81`).
- Delete from `askedWithoutTransport`: `packages/board/src/server/entry/ask.ts:153`.
- Delete the reads: `App.tsx:484-491`, `:1147-1164`; `AgentList.tsx:306`, `:1662`, `:1996`; `packages/board/src/app/lib/agent-rows/rows.tsx:233-260`, `:463`, `:524-526`, `:880`, `:1717`.
- Delete the row-menu entry: `menus.tsx:11`, `:1345-1508`, `:1588-1590`.
- **Update, don't just delete, every comment that names the route or file** in: `menus.tsx:295`, `:442`, `:511`, `:647`, `:832-839`; `DeliverButton.tsx:20`; `NeedsDesignButton.tsx:13`; `ResliceButton.tsx:16-18`, `:86`, `:161`; `implement.ts:51`, `:85`, `:235`; `interrogate.ts:15`; `mock-fleet.ts:454`; `reslice.ts:23`, `:69`, `:130`, `:312`, `:444`, `:466`; `packages/domain/src/rules/auto-dispatch.ts:671`; `packages/fleet/src/shared/implement-run.ts:24-33`; `skills/plot/scripts/plot-dispatch.sh:568`, `:580`.
- **26 test files name `commission`.** The route's own tests are deleted with it (`packages/board/test/unit/commission-route.test.ts` is explicitly replaced by `commission-is-removed.test.ts` per Acceptance). The other 25 just drop the name from their fixtures/assertions — they are not about commission, commission just appears in their test data.
- `test/reconcile/agent-settings-spawn.test.mjs:56-58`: drop `commission` from `SITES` (it should already carry `auto-design` from the prior slice — verify it's there, don't re-add it).
- `CLAUDE.md:502` names `commission` twice — once in the controller-endpoint list, once in the "still HTTP only" list. **Both go.** Then run `./scripts/check-agents-md.sh --write` to regenerate `AGENTS.md`; CI refuses a mirror that differs, so this is not optional.
- `DESIGN-phases.md:40` and `:143` cite `commission.ts:136-177` — rewrite both to name `needs-design.ts` and `SPEC_PLACEHOLDER` instead, since that's now where the empty-spec-placeholder logic actually lives (confirmed: `SPEC_PLACEHOLDER` is defined in `packages/domain/src/workflows/needs-design.ts:5` and used at `:173`).
- Log paths: delete `commissionPromptPath` and `commissionLogPath` from `commission.ts:77`, `:82` (they die with the file) and move `packages/board/test/unit/agent-log.test.ts:22`, `:119-120` onto the fleet's `designPromptPath`/`designLogPath` functions (already built in the prior slice at `packages/fleet/src/shared/agent-log.ts`).

**The `commission` log-kind string itself does NOT change.** The spec run (prior slice) deliberately reuses the existing `commission` log kind in `agent-log.ts:319` so log file names stay `plot-commission-<slug>.log` with no migration needed. Do not rename this string as part of removing the board route — the route and the log-kind label are different things, and only the route goes.

**`CardControls` loses a field, not a behavior.** After `commission: z.boolean()` is deleted from the schema, a Draft plan must still read `needsDesign` correctly — Acceptance states this explicitly ("`CardControls` has no `commission` field, and a Draft plan still reads `needsDesign`"). Don't let the schema edit accidentally touch the `needsDesign` logic sitting next to it.

### Done when

The plan's `## Acceptance` section, "Removal (Changelog 8)" paragraph, is the specification:

- `packages/board/test/unit/commission-is-removed.test.ts` (replaces `commission-route.test.ts`): `POST /api/commission` and `GET /api/commission/<slug>` answer `404`, and the board payload carries no `commission` capability.
- `packages/domain/test/card-controls.test.ts`: `CardControls` has no `commission` field, and a Draft plan still reads `needsDesign`.
- `test/reconcile/agent-settings-spawn.test.mjs`: `SITES` holds no `commission` and holds `auto-design`.

Pull out these assertions specifically because a naive deletion pass without them:

- **404, not "route absent" by omission.** The test asserts the endpoints actively answer 404 — don't just delete the route handler and leave the path unmatched by accident; confirm the board's router actually returns 404 for both the removed `POST` and `GET` paths rather than, say, falling through to a different handler.
- **The board payload must carry no `commission` key at all**, not merely `{ available: false }` — a capability object left in place with all-false fields still shows up in the schema and a naive "set available: false everywhere" fix wouldn't satisfy this. The schema field itself is deleted.
- **`needsDesign` must keep working after the `commission` field is gone** — this is a regression check on a neighboring field, which an isolated "remove commission" diff could silently break if the two fields share any computed logic in `card-controls.ts`.

Plus: this repo's gates. Run `node skills/plot/scripts/board/plot-local-checks.mjs` before each push and run exactly what it prints — the related tests and typecheck for `packages/board` and `packages/domain` (this slice touches both), plus the gate scripts under `**` (`check-agents-md.sh`, `check-plan-headings.sh`, etc.). The `CI suites` config key (`pnpm run test:e2e`, `test:contracts`, `test:board`, domain vitest coverage, `test/reconcile/*.test.mjs`) runs in CI on the PR — do not run the full suites locally.

Name the shell gate explicitly: `scripts/check-shell-lines.sh` refuses a PR whose shell under `skills/` grew past its merge base. This slice touches `skills/plot/scripts/plot-dispatch.sh` (comment updates only, at `:568`, `:580`) — comment-only edits should not grow line count, but if any shell line count does grow, pay for it by removing shell elsewhere in the same change.

Since this slice regenerates `AGENTS.md`, also run `./scripts/check-agents-md.sh` (no `--write`) as a final check that the committed `AGENTS.md` matches — CI gates on this exactly.

### Bookkeeping

Open the PR through the controller, never by hand:

```bash
../plot/scripts/plot-open-pr.sh          # current branch, ready
../plot/scripts/plot-open-pr.sh --draft  # while still moving
```

It reads the plan, titles the PR from this slice's wave heading ("The button goes"), and links the plan and this brief in the body. Push the first real commit as soon as it exists.

When the PR is created, append `→ #<number>` to this branch's line in the plan's `## Slices` → `### The button goes` heading. No project board is configured in this repo's `## Plot Config`, so skip the board-status step.

### Scope guard

This branch owns: `packages/board/src/server/commission.ts` (deleted), `packages/board/src/app/components/CommissionDesignButton.tsx` (deleted), `packages/board/src/server/index.ts` (route removal), `packages/board/src/contract/schema.ts` (capability field removal), `packages/board/src/server/board.ts:2389-2392`, `packages/domain/src/rules/card-controls.ts`, `packages/board/src/server/entry/ask.ts:153`, `App.tsx`, `AgentList.tsx`, `packages/board/src/app/lib/agent-rows/rows.tsx`, `menus.tsx`, the comment-only touches in `DeliverButton.tsx`, `NeedsDesignButton.tsx`, `ResliceButton.tsx`, `implement.ts`, `interrogate.ts`, `mock-fleet.ts`, `reslice.ts`, `packages/domain/src/rules/auto-dispatch.ts:671`, `packages/fleet/src/shared/implement-run.ts:24-33`, `skills/plot/scripts/plot-dispatch.sh` (comments only), the 26 test files naming `commission`, `test/reconcile/agent-settings-spawn.test.mjs`, `CLAUDE.md:502` plus the regenerated `AGENTS.md`, and `DESIGN-phases.md:40`, `:143`.

The fifth and last branch of this plan, *The spec rows* (`feature/the-board-shows-the-spec-run`), is not yet started and owns `packages/board/src/app/lib/agent-rows/spec-row.ts` plus the `/api/fleet` `design` field rendering — disjoint from this slice's files, no overlap expected. The three merged branches' files are not in flight.

If you find something the plan did not anticipate, report it rather than improvising outside scope.
