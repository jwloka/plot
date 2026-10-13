## Implementation brief — the-board-has-three-tabs (wave 1: The tabs and Planning)

- **Plan (canonical):** [docs/plans/2026-10-12-the-board-has-three-tabs.md](../../docs/plans/2026-10-12-the-board-has-three-tabs.md) on `main`
- **Approved:** 2026-10-13, jwloka, plan-PR #1608 merged
- **Branch:** `feature/the-tabs-are-discovery-planning-delivery` (base: `main`)
- **Ends as:** one PR to `main`
- **Review of the code:** PR review (plan `Review: pr`)

This is the first of six slices. Nothing waits on this branch by name, but it is the only slice with no `waits_on` — every other slice either follows it in file order or waits on `feature/the-index-holds-closed-issues` from a different plan. Land it first so the rename doesn't conflict under five other slices touching `App.tsx`-adjacent files.

### What to build

Rename the board's three tabs — `Stories` / `Plans` / `Agents` → `Discovery` / `Planning` / `Delivery` — as a domain rule rather than a component decision, add a *Show released* filter to the Planning columns, and move the empty-tab redirect so it survives the rename.

Today `type Tab = 'stories' | 'plans' | 'agents'` and `parseTab` live directly in `packages/board/src/app/App.tsx:118-135`, with no domain test — the tab decision happens in the component. 31 lines in `App.tsx` reference the three old values (from `:118` to the render gates at `:1066`, `:1069`, `:1075`, `:1090`, `:1104`, `:1112`), including `revealBranch` (`:683-685`) and an empty-tab redirect at `:985-996` that sends an empty Stories tab to Plans.

### The decisions the plan settles — do not re-derive them

**The tab is a domain answer, not a component decision.** Write `boardTabOf(param)` in `packages/domain/src/rules/board-tab.ts`. It returns the tab and, for a legacy value, the new value to redirect to: `stories`→`discovery`, `plans` and `board`→`planning`, `agents`→`delivery`. An absent or unknown value answers `planning` with no redirect (`plans` is today's default). `App.tsx` calls this in place of `parseTab` and replaces the URL silently, exactly as `parseTab` does today — this is a 1:1 swap of the decision's *location*, not a behavior change. Every one of the 31 grep-named `App.tsx` lines takes the new tab names; `revealBranch` writes `?tab=delivery` in place of `?tab=agents`.

**The empty-tab redirect moves here and stays, it does not get removed.** `App.tsx:985-996` is owned by THIS slice because two of its lines (`:989`, `:991`) are among the 31 the rename touches, and the sibling plan `tickets-and-stories-have-lanes` does not claim it. Keep the redirect working with the new names: an empty Discovery tab still opens Planning. Do **not** delete this effect — a later plan (`feature/tickets-and-stories-have-lanes`, see that plan's line `:273`) removes it once Discovery tab gets ticket lanes and "empty" stops meaning "no stories." That removal is out of scope here; this slice only renames the values the redirect checks.

**`PhaseColumn` and `ColumnSchema` gain `releasedOnly`, not a new filtering mechanism.** `PhaseColumn.releasedOnly: boolean` (currently 4 fields at `packages/domain/src/rules/workflow-phases.ts:208-215`: `name`, `leadership`, `accent`, `checklist`) is true only for a phase whose only plan state is `released` — `phaseColumns` (`:228`) sets it alongside the existing `checklist` computation. `ColumnSchema` (`packages/board/src/contract/schema.ts:772-783`, note the payload field is named `phase`, not `name`) gains `releasedOnly: z.boolean().default(false)`; `board.ts:2336`'s existing spread already carries new `PhaseColumn` fields through, so no new wiring is needed there beyond adding the field.

**Write `planningColumns(columns, showReleased)` as a pure filter over any column list.** Signature: `planningColumns(columns: { releasedOnly?: boolean }[], showReleased: boolean)`. It drops a column whose `releasedOnly` is true unless `showReleased` is on; a column with no `releasedOnly` key stays (so it's safe to call on any payload shape). Call it in `Board.tsx` over `board.columns` **before** `:212`'s `boardGridColumns(board.columns.length)` call — the grid must size by the *shown* column count, not the raw payload count, or the custom-map case breaks. With the default phase map this answers Design, Development, Testing — and Released only with the checkbox on.

**A custom phase map is not special-cased — it falls out of the rule as written.** If an adopter's custom map puts `plan:released` in the same phase as another plan state (e.g. merged with `plan:delivered`), `phaseColumns` only marks `releasedOnly` true when a phase's *only* plan state is `released` — so that mixed column keeps showing regardless of the checkbox. Don't add a second code path for this; it's already covered by the "only plan state" condition in `phaseColumns`.

**`?released=1` belongs to this tab alone — don't let it collide with Discovery's own toggle.** `App.tsx:633-638` keeps every URL parameter across a tab switch, so Planning's `?released=1` and Discovery's `?archived=1` are deliberately different parameter names, each scoped to its own tab's checkbox state.

**Filters that already exist on the Plans/Planning tab are untouched.** The sprint filter, story filter, *Story lanes*, and *Only my work* all stay as-is on this slice — this slice only adds the Released-column visibility toggle and the Planning-column filtering it implies.

### Done when

The plan's `## Acceptance` section (first two bullets, "The tabs and the redirect" and "The Planning columns") is the specification:

- `packages/domain/test/board-tab.test.ts`: `boardTabOf` answers `discovery`, `planning`, `planning`, `delivery` with redirects for `stories`, `plans`, `board`, `agents` respectively, and `planning` with **no redirect** for an absent or unknown value — this last case is easy to get backwards (redirecting when nothing needs it would rewrite every bookmarked URL with no `?tab=`).
- Browser, `agents-tab.browser.test.ts`: `?tab=agents` opens the Delivery tab, the URL reads `?tab=delivery`, and the tab bar shows the three new labels.
- `packages/domain/test/workflow-phases.test.ts`: `phaseColumns` sets `releasedOnly` only on the Released phase of the default map (not on a custom map's mixed phase); `planningColumns` answers Design/Development/Testing with `showReleased` off, adds Released with it on; a custom map's mixed column stays regardless of the checkbox; a column with no `releasedOnly` key stays (backward-compatible with any caller not yet updated).
- `packages/board/test/unit/`: the board payload's columns carry `releasedOnly` through `ColumnSchema`.
- Browser, `mock-board.browser.test.ts`: `?released=1` shows the Released column and the checked box; also add the *Show released* case to this file's payload stubs per the plan's Cost section ("Nine new cases in three existing files... *Show released* in `mock-board.browser.test.ts`").
- Three existing browser test files click a tab by its old label and need updating for the rename: `agents-tab.browser.test.ts`, `mine-filter.browser.test.ts`, `unreachable-overlay.browser.test.ts` (named explicitly in the plan's Cost section).
- 17 current files under `packages/board/src` and `plot-fleet-scan.sh` reference the old tab words in prose/comments and need the rename (the plan's Cost section lists this as the full scope — `grep -rlE "Agents tab|Plans tab|Stories tab|tab=(agents|plans|stories|board)"` over `skills`, `docs`, `README.md`, `packages/board/src`, outside `docs/plans` and `docs/stories`, minus the 7 dated release/sprint files that keep their historical words unchanged).
- `packages/board/src/app/lib/agent-rows/collapse.ts:25` is named explicitly in this slice's scope — check it for a tab-name reference.

Plus: the repo's gates — no bundle diff in the PR, a changeset naming this plan, and the shell-lines gate if any `.sh` file is touched (this slice's shell edit is two comments in `plot-fleet-scan.sh`, which the plan's Cost section says adds no net line). Run `node skills/plot/scripts/board/plot-local-checks.mjs` before each push and run what it prints; the suites in `CI suites` run in CI, and a failure there comes back as a correction. Do not run the full `test:e2e` locally — see CLAUDE.md's Testing section.

### Bookkeeping

Open the PR through the controller once the branch has its first commit:

```bash
skills/plot/scripts/plot-open-pr.sh          # current branch
skills/plot/scripts/plot-open-pr.sh --draft  # while still moving
```

Do not run `gh pr create` — it takes the title from the last commit subject, not the plan's wave heading. When the PR is created, append `→ #<number>` to this branch's line in the plan's `## Slices` section (`### The tabs and Planning` heading, the `feature/the-tabs-are-discovery-planning-delivery` line). Push the first real commit as soon as it exists.

### Scope guard

This slice owns: `packages/domain/src/rules/board-tab.ts` (new), `packages/domain/src/rules/workflow-phases.ts` (`PhaseColumn.releasedOnly`, `phaseColumns`, new `planningColumns`), `packages/board/src/contract/schema.ts` (`ColumnSchema.releasedOnly`), `packages/board/src/app/App.tsx` (the 31 grep-named lines, including the empty-redirect block at `:985-996`, renamed but not removed), `packages/board/src/app/Board.tsx` (call `planningColumns` before the `:212` grid-sizing call), `packages/board/src/app/lib/agent-rows/collapse.ts:25`, `packages/board/src/server/board.ts:2336` (pass `releasedOnly` through the existing spread), the three browser test files named above, and the 17 prose/comment files from the Cost-section grep.

No other slice of this plan touches these files — the other five slices (`feature/the-active-sprint-button-selects-every-active-sprint`, `feature/waiting-on-you-shows-a-failed-verification`, `feature/people-names-a-tracker-account`, `feature/an-issue-names-its-assignee`, `feature/the-delivery-tab-filters-by-sprint-and-owner`) are unclaimed as of this brief and touch different files (`lib/filters.ts`, `lib/agent-rows/plan-level-row.ts`, `rules/ownership.ts`, `entities/person.ts`, `adapters/tracker/*`, `rules/waiting-tickets.ts`). The spike PR #1647 (`feature/the-fleet-indexes-issues`, head `f04d2819d`) touches `packages/fleet/src/shared/issue-refresh.ts` and `packages/domain/src/entities/issue-index.ts` — unrelated to this slice's files.

If you find something the plan did not anticipate, report it rather than improvising outside scope.
