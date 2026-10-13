## Implementation brief — the-board-has-three-tabs (wave: The plan-level row)

- **Plan (canonical):** [docs/plans/2026-10-12-the-board-has-three-tabs.md](../../docs/plans/2026-10-12-the-board-has-three-tabs.md) on `main`
- **Approved:** 2026-10-13, jwloka, plan-PR #1608 merged
- **Branch:** `feature/waiting-on-you-shows-a-failed-verification` (base: `main`)
- **Ends as:** one PR to `main`
- **Review of the code:** per repo convention (PR review)

This branch is independent of the plan's other slices — it waits on nothing outside the plan, and nothing waits on it.

### What to build

`/api/fleet` already carries a `verification` field (`VerificationStatusSchema`, `packages/board/src/contract/schema.ts:3977-3995`, shipped in #1635) with `halted`, `running`, `refusals` and `rows` (each row: `slug`, `reason`, `log`, `restart`, `stopped`, `fleetHalted`), and the domain already computes a per-plan row through `verificationRow(slug, commit, store, log, now)` (`packages/domain/src/rules/auto-verify.ts:321`). But nothing under `packages/board/src/app` reads `fleet.verification` — the schema's own comment says so (`schema.ts:4432`: "The board renders no row from it yet"). A failed or halted verification run is invisible on the board today. This slice closes that gap: it renders `verification.rows` in *Waiting on you*, `verification.running` in *Working*, and a halted-fleet sentence — and closes issue #1640's *The board row* item (H7).

### The decisions the plan settles — do not re-derive them

**A new row kind, not a reuse of `DraftPlanRowView`.** The plan defines `PlanLevelRow = { kind: 'verify' | 'spec'; plan: string; reason: string; log: string | null; restart: string | null; stopped: boolean; halted: boolean }` in a new file `packages/board/src/app/lib/agent-rows/plan-level-row.ts`, with a `PlanLevelRowView` component. It follows the same rendering path as `DraftPlanRowView` (`draft-plan-row.tsx:18`) — `tupleFromPlan` into `TupleRowView` — because both are "a plan, a sentence, no branch" rows, but it is its own type: `kind: 'verify'` is this slice's case, and `kind: 'spec'` is `the-fleet-writes-the-design`'s sibling case (see below). Do not bolt a `verify` variant onto `DraftPlan`/`DraftPlanRowView` — they're Draft-plan-specific (interrogation rounds badge, `/plot-approve` affordance) and this row has neither.

**`planFile` comes from the board card, not the payload.** `VerificationRow`/the schema's row carries only `slug`, never a plan file path. `PlanLevelRowView` resolves it the same way `App.tsx:700-709`'s `cardForPlanFile` does today for the plan modal: look up the board payload's card whose `slug` matches `plan` and take its `path`. Render the slug with no plan link when no card matches (a plan outside the walked directories is a real, non-degraded case — same reasoning as `cardForPlanFile`'s own doc comment). Don't invent a second plan-file lookup; thread the existing card list down to wherever `PlanLevelRowView` is instantiated.

**`verificationRows(verification)` is a board-side projection, not a domain rule.** It is plain mapping of an already-computed payload into render-ready rows — the judgment (`verificationRow`) already happened server-side in the domain. Its contract, exactly:
- `waiting`: one `{ kind: 'verify', ... }` row per `verification.rows` entry, with `plan` from `slug` and `reason`, `log`, `restart`, `stopped` copied unchanged from the payload row, and `halted` from that row's own `fleetHalted` (not from `verification.halted` directly — the payload already carries it per-row).
- `working`: one row per slug in `verification.running`, with `reason: 'verification running'`, `log: null`, `restart: null`.
- `haltedLine`: the sentence *"The fleet starts no verify run until a person restarts one."* — shown only when `verification.halted` is true AND no `waiting` row already carries `halted: true` (because that row's own `reason` already says so via `verificationRow`'s `parts.push('the fleet is halted on verification failures')`). It renders as a sentence above the section's rows, outside `tupleFromPlan`, and is never counted.
- `verification: null` (failed read) answers `{ working: [], waiting: [], haltedLine: null }` — no row, no line, no error surfaced by this helper (the existing `issueAnswer`/`issueError`-style sentence pattern is not duplicated here; the plan doesn't ask for one).

**Wiring into the existing sections, not a new one.** `AgentList.tsx:1123` already renders `drafts` (the Draft-plan rows) into the `waiting-on-you` group; add the `verify` kind's rows beside `drafts` there, and add `working`'s rows into the existing `working` section. The counts at `:1087-1091` (`countOf` for `working` is `workingRows.length`; for `waiting-on-you` it's `rows.length + brokenRows.length + draftRows.length`) must add the new rows too — extend both tallies, don't introduce a parallel count.

**The sibling reuses this exact type.** `the-fleet-writes-the-design` renders its own plan-level rows (spec-writing runs) through the same `PlanLevelRow`/`PlanLevelRowView`, with `kind: 'spec'` and `restart: 'plot-design.mjs restart <slug>'`; its `specRow` writes `halted` from its own store. That plan is a separate slice in a separate PR — this slice's job is only to make the type and the view general enough to take a second `kind` later (a discriminated union on `kind`, not a `verify`-only shape), not to build the `spec` arm itself.

### Done when

The plan's `## Acceptance` → **The plan-level row** entry is the specification:

> `packages/board/test/unit/plan-level-row.test.ts`: `verificationRows` answers one `kind: 'verify'` *Waiting on you* row per `verification.rows` row with its `reason`, `log` and `restart` taken unchanged from the payload, `stopped`, and `halted` from `fleetHalted`; one *Working* row per `running` slug; the halted line only when `halted` is true and no row carries `halted`; and nothing for `verification: null`. Browser: a payload with one failed row, one running plan and `halted: true` shows the failed row and its restart command in *Waiting on you*, the running row in *Working*, and each section count includes its row.

Concretely:
- Unit tests in `packages/board/test/unit/plan-level-row.test.ts` covering: one failed row → one `verify` waiting row with fields copied verbatim; one running slug → one working row; `halted: true` with a row that already carries `fleetHalted: true` → no separate `haltedLine`; `halted: true` with no row carrying it → `haltedLine` is the fixed sentence; `verification: null` → `{ working: [], waiting: [], haltedLine: null }`.
- A browser test case (in `agents-tab.browser.test.ts`, per the plan's Cost section) stubbing a payload with one failed verification row, one running plan slug, and `halted: true`: asserts the failed row and its restart command show in *Waiting on you*, the running plan shows in *Working*, and both section counts include the new rows.
- `AgentList.tsx:1123` and the `working`-section rendering both include the new rows; `:1087-1091`'s counts are extended, not duplicated.
- Closes #1640's *The board row* item (H7) — reference the issue number in the PR body.

Plus: the repo's gates — no bundle diff (the board artifact is generated; never hand-commit a rebuild), a changeset for `@plot-pm/board` (patch or minor per `## Versioning` in CLAUDE.md), and this slice touches no `.sh` file so `scripts/check-shell-lines.sh` is a no-op but still runs in CI. For tests, run `node skills/plot/scripts/board/plot-local-checks.mjs` before each push and run what it prints — it resolves the related `packages/board/src/**` tests and `pnpm run typecheck` for a change in this area. The suites in `CI suites` (`pnpm run test:e2e`, `test:contracts`, `test:board`, domain vitest with coverage, `test/reconcile/*.test.mjs`) run in CI on every PR — do not run `test:e2e` locally (CLAUDE.md Testing: it dispatches real workers into sandbox repos and is CI's gate, not a local one).

### Bookkeeping

Open the PR through the controller once the branch has its first real commit:

```bash
../plot/scripts/plot-open-pr.sh          # current branch
../plot/scripts/plot-open-pr.sh --draft  # while still moving
```

Do not run `gh pr create` — it has no way to find the plan or wave heading and will take its title from the last commit subject. `plot-open-pr.sh` reads which plan names the branch and opens the PR with the wave heading ("The plan-level row") as the title, the plan and this brief in the body.

When the PR is created, append `→ #<number>` to this branch's line in the plan's `## Slices` section (`docs/plans/2026-10-12-the-board-has-three-tabs.md:131`), and set its board status to "Ready" if a project board is configured (none declared in this repo's `## Plot Config`, so skip).

Push the first real commit as soon as it exists.

### Scope guard

This branch owns: `packages/board/src/app/lib/agent-rows/plan-level-row.ts` (new), its unit test, the wiring into `AgentList.tsx` (the `waiting-on-you` and `working` sections and their counts at `:1087-1091` and `:1123`), and the new browser test case(s) in `agents-tab.browser.test.ts`. It does not touch `packages/domain/src/rules/auto-verify.ts` (`verificationRow` is already built and shipped) or the `VerificationStatusSchema`/`fleet.verification` payload field (already shipped in #1635) — this slice is a pure render-side consumer of existing, already-tested domain and payload surface.

Other branches of this plan, in flight or not yet started: `feature/the-tabs-are-discovery-planning-delivery` (tab rename — touches `App.tsx` broadly, not `AgentList.tsx`'s sections), `feature/the-active-sprint-button-selects-every-active-sprint` (merged, PR #1661 — touched `lib/filters.ts` and `SprintFilter.tsx`/the sprint multiselect, not the Waiting-on-you/Working sections), `feature/people-names-a-tracker-account`, `feature/an-issue-names-its-assignee` and `feature/the-delivery-tab-filters-by-sprint-and-owner` (the ticket-assignee slices — touch `mine-filter.ts`, `ownership.ts` and the issue read paths, not the verification row). No file this slice owns is named by another slice's branch summary in `## Slices`.

If you find something the plan did not anticipate, report it rather than improvising outside scope.
