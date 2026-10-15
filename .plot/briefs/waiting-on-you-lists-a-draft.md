## Implementation brief — waiting-on-you-lists-a-draft

- **Plan (canonical):** `docs/plans/2026-10-15-waiting-on-you-lists-a-draft.md` on `main`
- **Approved:** 2026-10-15, Jan Wloka, plan-PR #1741 merged
- **Branch:** `bug/waiting-on-you-lists-a-draft` (base: `main`)
- **Ends as:** one PR to `main`, opened with `skills/plot/scripts/plot-open-pr.sh`
- **Review of the code:** per repo convention — the PR is reviewed as code; CI is the authority for e2e

This plan has one slice, no waves — the whole change lands on this one branch.

### What to build

Waiting on you currently shows a Draft plan's slice rows, then a separate plan row for the same plan, instead of nesting the slices under the row. Seen 2026-10-15 on the board: plan `a-lifecycle-micro-pr-merged-past` (Draft, PR #1738) showed three SLICE rows (Retry, Pin, Identities), each reading "waiting on approval — plan not approved yet — still in review", followed by its own PLAN row.

Root cause, already diagnosed in the plan (`CLAUDE.md`'s *the plan is canonical*, don't re-derive it):

- `fleet.ts:4949`'s `carriesDraftPlan` arm gives the plan's `idea/` PR branch a row of kind `plan`, with no `wave`.
- `draftPlacement` (`fleet.ts:3476` and three sibling call sites) puts every slice of a Draft plan into `waiting-on-you` as `wave` rows.
- Both land in the same plan group (`groupByPlan`).
- `planHeads` (`AgentList.tsx:1649-1651`) heads a group with its `PlanRow` only when `ungroupedRows(group.rows, key, slices).length === 0`. The plan-kind row carries no `wave`, so `sliceGroupsFor`/`ungroupedRows` treats it as unclaimed by any slice group — it comes back as an ungrouped row, the `=== 0` gate fails, and the whole group falls back to flat, unheaded rows. The plan row then sorts wherever its own timestamp puts it: after its slices.

Not a regression — the gate dates to `f85a8ca1b` (#680, 2026-09-03) and `028e4311a`. Draft plans with named slices only recently started appearing in `waiting-on-you` together with their plan row.

### Decisions the plan settles — do not re-derive them

**The fix is a new return shape, not a tweak to the existing boolean.** Build a function — the plan suggests placing it in `sections.ts` beside `ungroupedRows` — that classifies a plan group's rows into `{ head, slices, loose }`: a `plan`-kind row carrying the group's plan slug becomes `head`, is excluded from `loose`, and the predicate `planHeads` needs becomes "a head row exists, **or** every remaining row is slice-grouped" instead of today's "every row is slice-grouped." Do not special-case the Draft/plan-kind row inline inside `AgentList.tsx`'s `planHeads` expression — `sectionTally` needs the identical classification (see next point), and a second inline copy is exactly the duplicated-predicate failure this plan is fixing.

**Two call sites read this today and both must read the new shape, or the header count drifts from the render.** `AgentList.tsx:1649-1651` computes `planHeads`; `sections.ts:471`'s `sectionTally` repeats the same `loose.length === 0 && grouped.length > 0` predicate to keep the section's header figure (`plans`/`slices`/`branches`) equal to what actually renders. Changing one without the other makes `sectionTally`'s invariant (*the top-level lines a reader sees while collapsed equal `plans + branches + tickets + agents`*, `sections.ts:432`) false the moment a Draft plan's plan-row-plus-slices group renders nested but is still tallied as flat rows.

**Why this lives in `sections.ts`, not as a render-time check in `AgentList.tsx`:** per `CLAUDE.md`'s *Every rendered state is a domain property* — a decision made in the component is untestable without a browser. The grouping shape must be assertable in a unit test; the browser test only has to prove the shape renders as expected, not decide it.

**Scope is `waiting-on-you` only.** `planHeads` in `AgentList.tsx` is computed inside the `!countsPlans` branch (`countsPlans = key === 'not-started'`, `AgentList.tsx:1198`), and NOT STARTED's own fold decision runs through the separate `showsSliceFold` predicate (`sections.ts:813`, used at `AgentList.tsx:1668` inside the `countsPlans && group.plan` branch). The new `{ head, slices, loose }` shape changes only the `!countsPlans` path — confirm this stays true as you implement (this is the plan's second open question) rather than assuming it; a plan-kind row reaching NOT STARTED or DONE with the same no-`wave` shape would need checking against `showsSliceFold` separately, but nothing in the current code suggests it does.

**The plan's first open question — what the head row states once it heads the group — is intentionally left for you to resolve by reading existing code, not by guessing:** `sliceRowsShown` and the sole-slice verdict path already in `AgentList.tsx` (around `:1658-1660`, `sliceRowsShown(planHeads, group.rows, planSliceGroups.length, group.plan, openPlans)`) decide this for every other section that heads a plan with its slices. Reuse that same answer rather than inventing new wording for the Draft case — the existing `PlanRow` rendering path (referenced directly in the plan: *"keeps the existing `sliceRowsShown` and `PlanRow` rendering"*) is not meant to change.

Rules carried over, unchanged:

- Arrow functions and factual TSDoc in `packages/domain/**` only — `sections.ts` and `AgentList.tsx` are board code, not domain, so this does not bind here, but don't introduce new domain-package code for this.
- No decision narrative in code comments; that goes in the commit message and this brief.

### Done when

The plan's `## Done when` is implicit in its single slice line — treat the slice description itself as the spec: the `{ head, slices, loose }` shape exists in `sections.ts` with unit tests for a mixed group (one `plan`-kind row plus `wave` rows), `planHeads` and `sectionTally` both read it, and one browser test shows a Draft plan's slices nested under its plan row in Waiting on you. The assertions a naive implementation would pass without:

- **A unit test asserting the mixed-group shape directly**: given one `plan`-kind row (no `wave`) plus N `wave` rows for the same plan, the new classifier returns that `plan`-kind row as `head` and the N rows end up slice-grouped, not in `loose`. Catches an implementation that only patches the `AgentList.tsx` boolean without touching the shared classification.
- **`sectionTally`'s count stays correct for this mixed case.** A test that builds the fixture from the plan's own motivating example (Draft plan, 3 slice rows + 1 plan row, as seen on `a-lifecycle-micro-pr-merged-past`) and asserts the section's tallied `plans`/`slices` figures match what the render actually shows (one plan line, 3 slices). This is the assertion that would silently drift if `sectionTally` is left reading the old predicate while `AgentList.tsx` reads the new one.
- **A homogeneous Draft-plan group (no mixed kinds) still heads exactly as before** — don't regress the existing all-`wave` or all-slice-grouped cases covered by `planHeads`'s current tests.
- **NOT STARTED and DONE render unchanged** for existing fixtures — confirm by running their existing tests, not by inspection alone, since this answers the plan's second open question.
- **One browser test** extending or sitting beside `packages/board/test/integration/plan-moves-through-sections.browser.test.ts`, showing the nested render (plan row with a caret, slices underneath) for a Draft plan with named slices in Waiting on you.

Plus the repo gates:

```bash
nvm use                      # Node 24 — pnpm crashes on 26
pnpm install
pnpm test
pnpm run typecheck
pnpm run test:board          # rebuilds board-server.mjs; commit the artifact
pnpm run test:contracts
```

Run `node skills/plot/scripts/board/plot-local-checks.mjs` before each push and run what it prints. Do not run `pnpm run test:e2e` locally — CI runs it. Add one changeset, description first, `bumps:` block last (`CLAUDE.md` › Versioning), naming `@plot-pm/board` (this is board-only: `sections.ts` and `AgentList.tsx` under `packages/board/src/`).

No `.sh` file is touched by this slice, so `scripts/check-shell-lines.sh` does not apply.

### Bookkeeping

- Push the first real commit as soon as it exists.
- Open the PR with `skills/plot/scripts/plot-open-pr.sh` (`--draft` while it's still moving). Never `gh pr create`.
- When the PR exists, append `→ #N` to this branch's line in the plan's `## Slices` section on `main`.

### Scope guard

This branch owns:

- `packages/board/src/app/lib/agent-rows/sections.ts` — the new `{ head, slices, loose }` shape, `sectionTally`'s read of it
- `packages/board/src/app/components/AgentList.tsx` — `planHeads`'s read of the new shape
- new/extended unit tests for `sections.ts` and a new browser test in `packages/board/test/integration/`
- one `.changeset/*.md`, and the rebuilt `board-server.mjs`

Other branches in flight, verified 2026-10-15 at brief time: `feature/a-merged-pending-check-is-asked-again`, `idea/a-desk-that-ended-cleanly-at`, `plot/release-no-controller-resumes-a-claimed-slice` — none touch `sections.ts` or `AgentList.tsx`. No collision expected.

If you find something the plan did not anticipate, report it rather than improvising outside scope.
