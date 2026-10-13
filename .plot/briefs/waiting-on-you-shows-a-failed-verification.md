## Implementation brief — the-board-has-three-tabs (wave: The plan-level row)

- **Plan (canonical):** [docs/plans/2026-10-12-the-board-has-three-tabs.md](../../docs/plans/2026-10-12-the-board-has-three-tabs.md) on `main`
- **Approved:** 2026-10-13, jwloka, plan-PR #1608 merged
- **Branch:** `feature/waiting-on-you-shows-a-failed-verification` (base: `main`)
- **Ends as:** one PR to `main`
- **Review of the code:** per repo convention (PR review)

This branch is independent of the plan's other slices — it carries no `<!-- waits: ... -->` annotation and nothing waits on it. No sibling branch has a pushed remote ref as of this writing (`git ls-remote --heads origin` is empty for every slice of this plan); the rename slice has unpushed local work in a worktree, see Scope guard.

### What to build

`/api/fleet` has carried a `verification` field (`VerificationStatusSchema`) since PR #1635 — the halt flag, running plans, per-plan refusal reasons, and `rows` of `{ slug, reason, log, restart, stopped, fleetHalted }` for a plan whose verify run failed and is waiting on a person. **Nothing under `packages/board/src/app` reads it.** The schema's own doc comment at `packages/board/src/contract/schema.ts` (near the `verification` field, by the `FleetShape` definition) says so explicitly: *"The board renders no row from it yet."* Issue #1640 tracks this gap as *The board row (H7)*, and this slice closes it.

Build a new row kind, `PlanLevelRow`, that renders a run the fleet makes **on a plan rather than on a branch** — a plan, a sentence, no branch — in both the *Waiting on you* section (a failed/stopped run) and the *Working* section (a run still going). It follows the same path `DraftPlanRowView` already uses for the other non-branch row kind in *Waiting on you*.

### The decisions the plan settles — do not re-derive them

**The shape is exactly `PlanLevelRow = { kind: 'verify' | 'spec'; plan: string; reason: string; log: string | null; restart: string | null; stopped: boolean; halted: boolean }`**, in a new file `packages/board/src/app/lib/agent-rows/plan-level-row.ts`. The `kind` field exists *because this row type is shared*: `the-fleet-writes-the-design` (a sibling plan, in flight in parallel) renders its own spec-run rows through this same `PlanLevelRow`/`PlanLevelRowView`, with `kind: 'spec'` and a different `restart` (`plot-design.mjs restart <slug>`). Do not build a verify-only type — the `kind` discriminant and the `spec` arm are not speculative, they're a named consumer in an adjacent plan. You only populate the `verify` arm; leave `spec` as a valid-but-unused-by-you variant the type admits.

**`verificationRows(verification)` is the one function that turns the payload into rows**, answering `{ working: PlanLevelRow[], waiting: PlanLevelRow[], haltedLine: string | null }`:
- `waiting` holds one `kind: 'verify'` row per `verification.rows` entry — `plan` from `slug`, and `reason`, `log`, `restart`, `stopped` copied unchanged from the payload row (the board computes no command and no reason; the domain/fleet side already wrote them). `halted` comes from that row's own `fleetHalted`, not a recomputation.
- `working` holds one row per slug in `verification.running` — `reason: 'verification running'`, `log: null`, `restart: null`.
- `haltedLine` is the sentence *"The fleet starts no verify run until a person restarts one."* — but **only** when `verification.halted` is true **and no `waiting` row already carries `halted: true`** (that row's own `reason` already says so via `verificationRow`'s `parts.push('the fleet is halted on verification failures')` — see `packages/domain/src/rules/auto-verify.ts`). This line renders above the section rows, outside `tupleFromPlan`, and is never included in any section's count.
- `verification: null` (server state file unreadable) answers no rows and no line at all — not an empty-state message, just nothing added.

**Rendering reuses `tupleFromPlan` + `TupleRowView` + `cardForPlanFile`, exactly as `DraftPlanRowView` does** (`packages/board/src/app/lib/agent-rows/draft-plan-row.tsx` is your template). Build `PlanLevelRowView` the same way: `tupleFromPlan({ plan, planFile, issues: [], phase: ..., waitingDays: null })` and a `TupleRowView`. The payload carries no plan *file* on `VerificationStatusSchema`'s rows (only `slug`), so `planFile` must come from `cardForPlanFile`-style matching: `App.tsx:700-709`'s `cardForPlanFile(planFile)` matches cards by `path`, so here you need the inverse — find the board payload's card whose `slug` equals the row's `plan`, and take **that card's `path`** as `planFile`. Where no card matches, render the slug with no plan link (same degradation `cardForPlanFile` documents for "a plan outside the walked directories").

**Wiring into `AgentList.tsx`:** the *Waiting on you* section already composes `rows`, `issues` (`:key === 'waiting-on-you'`), `broken` and `drafts` before rendering (see the block around `:1110-1130` — `drafts` is `draftRows` from `AgentList.tsx:475`, built via `draftPlanRows(fleet?.draftPlans ?? [], fleet?.rows ?? [])`). Add the `waiting` plan-level rows **beside `drafts`**, same section, same list-composition pattern. Add the `working` plan-level rows into the *Working* section's row set (that section currently renders from the agent registry, not branch `rows` — see the `workingSection` comment block at `AgentList.tsx:1080-1090` explaining WORKING is special-cased on registry entries; your plan-level working rows are an *addition* alongside those registry rows, not a replacement).

**The counts must include the new rows.** `AgentList.tsx:1087-1091` computes each section's count: WAITING ON YOU's count is `rows.length + brokenRows.length + draftRows.length` today — add the plan-level `waiting` rows' length to that sum. WORKING's count is `workingRows.length` today — add the plan-level `working` rows' length. Get this wrong and Acceptance's *"each section count includes its row"* case fails even though the rows render.

### Done when

The plan's `## Acceptance` → **The plan-level row** entry is the specification:

> `packages/board/test/unit/plan-level-row.test.ts`: `verificationRows` answers one `kind: 'verify'` *Waiting on you* row per `verification.rows` row with its `reason`, `log` and `restart` taken unchanged from the payload, `stopped`, and `halted` from `fleetHalted`; one *Working* row per `running` slug; the halted line only when `halted` is true and no row carries `halted`; and nothing for `verification: null`. Browser: a payload with one failed row, one running plan and `halted: true` shows the failed row and its restart command in *Waiting on you*, the running row in *Working*, and each section count includes its row.

Concretely, lift these assertions — each exists because a naive implementation passes without it:
- A `verification.rows` entry whose own `fleetHalted` is `true` must **not** also trigger the separate `haltedLine` — the naive bug is double-reporting the halt (once in the row's `reason`, again as a redundant banner).
- `verification: null` must produce **zero** rows and **no** `haltedLine` — not a placeholder "no verification data" row. A naive implementation that treats `null` as "empty object" will synthesize a false halted line or empty-state text.
- The section counts (`:1087-1091`) must count the new rows — a correct-looking render with a stale count is the easy mistake, since the count math lives ~40 lines away from the row composition.
- `restart`, `log`, `reason` on a `waiting` row are **copied verbatim from the payload**, never recomputed — the board owns no business logic here (per the plan's "the board computes no command and no reason").

Plus: the repo's gates — no bundle diff (the board artifact is generated, never hand-committed), a changeset for `@plot-pm/board` (patch or minor per `## Versioning`; this is new rendering, likely minor). This slice touches no `.sh` file, so `scripts/check-shell-lines.sh` is a no-op but still runs in CI. For tests, run `node skills/plot/scripts/board/plot-local-checks.mjs` before each push and run what it prints — it resolves the related `packages/board/src/**` tests and `pnpm run typecheck` for a change in this area. The suites in `CI suites` (`pnpm run test:e2e`, `test:contracts`, `test:board`, domain vitest with coverage, `test/reconcile/*.test.mjs`) run in CI on every PR — do not run `test:e2e` locally (CLAUDE.md Testing: it dispatches real workers into sandbox repos and is CI's gate, not a local one).

### Bookkeeping

Open the PR through the controller once the branch has its first real commit:

```bash
../plot/scripts/plot-open-pr.sh          # current branch
../plot/scripts/plot-open-pr.sh --draft  # while still moving
```

Do not run `gh pr create` — it has no way to find the plan or wave heading and will take its title from the last commit subject. `plot-open-pr.sh` reads which plan names the branch and opens the PR with the wave heading ("The plan-level row") as the title, the plan and this brief in the body.

When the PR is created, append `→ #<number>` to this branch's line in the plan's `## Slices` section (`docs/plans/2026-10-12-the-board-has-three-tabs.md:131`), and set its board status to "Ready" if a project board is configured (none declared in this repo's `## Plot Config`, so skip). Close #1640's *The board row* item (H7) in the PR description or with a linking keyword, since this slice is explicitly what resolves it.

Push the first real commit as soon as it exists.

### Scope guard

This branch owns:
- `packages/board/src/app/lib/agent-rows/plan-level-row.ts` — new file: `PlanLevelRow`, `verificationRows`, `PlanLevelRowView`
- `packages/board/src/app/components/AgentList.tsx` — the `drafts`-adjacent row composition in *Waiting on you* (near `:1123`), the *Working* section's row list, and the section counts (`:1087-1091`)
- `packages/board/test/unit/plan-level-row.test.ts` — new unit tests
- the relevant browser test file (`agents-tab.browser.test.ts`, per the plan's Cost section)

Other branches of this plan — none has a pushed remote ref as of this writing, so treat the following as **expected future collision risk**, not confirmed-live work:
- `feature/the-tabs-are-discovery-planning-delivery` — has unpushed local commits in a worktree (`.worktrees/free-8502deaf`, currently marked `PLOT-BLOCKED`), touching `App.tsx`, `Board.tsx`, `workflow-phases.ts`, `collapse.ts` and three browser test files that click a tab by label. It does **not** touch `AgentList.tsx`'s row-composition or count logic — low collision risk, different region of the file tree.
- `feature/the-active-sprint-button-selects-every-active-sprint` — touches `filters.ts`, `SprintFilter.tsx`, and `AgentList.tsx` only near the sprint multiselect wiring (`:527`, `:890-920`). Does not touch the *Waiting on you*/*Working* composition or count lines this branch owns — low collision risk, but both branches edit `AgentList.tsx`, so expect a straightforward textual merge conflict if both land before the other rebases, not a logical one.
- `feature/people-names-a-tracker-account`, `feature/an-issue-names-its-assignee`, `feature/the-delivery-tab-filters-by-sprint-and-owner` — touch `ownership.ts`, `issue.ts`, `waiting-tickets.ts`, `mine-filter.ts`, `fleet.ts`'s issue-read paths, and the ticket rows in `AgentList.tsx` (`:659`, `:1111`). No expected overlap with the plan-level row's file or line ranges.

If you find something the plan did not anticipate, report it rather than improvising outside scope.
