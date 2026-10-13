## Implementation brief — tickets-and-stories-have-lanes ("The readings")

- **Plan (canonical):** [docs/plans/2026-10-12-tickets-and-stories-have-lanes.md](../../docs/plans/2026-10-12-tickets-and-stories-have-lanes.md) on `main`
- **Approved:** 2026-10-12, Jan Wloka, plan-PR #1608 merged
- **Branch:** `feature/the-board-reads-archived-stories` (base: `main`)
- **Ends as:** one PR to `main`
- **Review of the code:** standard PR review

This is the other slice under "The readings" — a sibling, `feature/the-tracker-lists-closed-issues`, is grouped under the same heading but is a separate, unrelated branch with its own brief (don't pull its scope in here; it touches the tracker port and `plot-host.sh`, this one touches only the board's story walk). The spike, `feature/the-fleet-indexes-issues`, merged 2026-10-13 (PR #1647) and met its Acceptance in CI; the `.plot/hold` lines D29 placed on this branch and three others have already been lifted (`plot: lift the spike-first holds of tickets-and-stories-have-lanes`, committed on `main`, `.plot/hold` now empty). This branch is unclaimed and unblocked — nothing waits on it and it waits on nothing.

### What to build

Today `collectStories` (`packages/board/src/server/board.ts:1753`) discovers stories on two paths — from `origin/<default branch>` via `readPlansFromRef`, and from the working tree via `fs.readdirSync` — and both paths **skip** anything under an `archived/` segment (`:1794`, `:1806`), so an archived story never reaches the Planning tab's filter list. That skip stays exactly as it is. This slice adds a second, separate read: a dedicated walk of `<Story directory>/archived/*/STORY-*.md` (default `docs/stories/archived/`, from the `Story directory` config key, `board.ts:1846` in the pre-slice numbering) into its own `archivedStories: StoryCard[]` list on the board payload — outside the existing `stories` field and outside the Planning tab's story filter entirely. The board payload object is assembled and returned starting at `board.ts:2354` (`return { generatedAt, columns, ... stories, ... }`); add `archivedStories` as a sibling field there, populated by the new walk, computed alongside the existing `collectStories(...)` call at `:2342`.

This is infrastructure for a later slice. `feature/tickets-and-stories-have-lanes` (not this branch) consumes `archivedStories` to draw the Discovery tab's Archived lane behind the `?archived=1` toggle. This branch's whole job is to make that list exist and be correct — it builds no UI and no toggle.

Close by pointing at the plan: `## Design` → the paragraph beginning "Archived means the location" and the one beginning "Every view state is a domain property" (both land in the `### Open Points` region of the Design section) are canonical for the archived-story semantics; this is orientation.

### Decisions already made — do not re-derive them

**Archived is a location, not a status.** A story counts as archived because it lives under `<Story directory>/archived/`, exactly as the story-tracking skill moves one there (`git mv` into `<home>/archived/`, `skills/story-tracking/SKILL.md:135-160`), which also stamps `archived: <date>` via `setStoryStatus`'s write on every move to `done` (`transitions/story.ts:216-218`). The new walk is a location-based glob, not a status filter — don't try to derive "archived" by reading `derivedStanding()` and filtering for some archived-like value; there isn't one. (`derivedStanding`'s `archived` return value, discussed below, is a *different* thing: a story whose location is still live but whose plans are all released.)

**Don't confuse the two meanings of "archived."** `derivedStanding` (`transitions/story.ts:397`) can return a derived standing of `archived` for a story that is **still in the live directory** — every one of its plans released (`transitions/story.ts:402`). That derived standing is not a `StoryStatus` (`entities/story.ts:15`), so no lane map declares it, and it is *not* what this slice's walk is about. A story with that derived standing stays wherever `collectStories` already finds it (the live tree) and is not moved into `archivedStories`. This slice's `archivedStories` list is populated purely by directory location — only stories whose files physically live under `archived/`. The sibling slice (`feature/tickets-and-stories-have-lanes`) is the one that later reads `derivedStanding() === 'archived'` and maps it to the Done lane; that is unrelated to the list you are building and lives in a different branch.

**Read through the ref first, the working tree second — same merge direction `collectStories` already uses, and for the same reason.** `collectStories`'s existing two-path read (ref then working tree, ref wins, measured bug report 2026-09-04: Stories filter and Topics list went empty on any checkout whose `docs/stories/` differed from `origin/<default>`) is the reason `archivedStories` must do the same thing rather than reading the working tree alone. Reuse the same `ref`/`refs` plumbing `collectStories` already receives (`board.ts:1753` signature) rather than inventing a second read path with different trust rules.

**No story-status map lookup, no `COLUMN_OF`-equivalent.** `StoriesTab.tsx`'s `COLUMN_OF` (`:30-38`) is the component-side grouping this whole plan is migrating into domain rules (`storyLane`), but that migration is the later lanes slice's job, not this one's. This branch produces a flat list; it does not decide which lane an archived story belongs to (the later slice decides that's "Archived, unconditionally, when the toggle is on" — simpler than the live-story lane logic, because location already answered the question).

**Rules carried over unchanged, worth not re-breaking:**
- Absent is not false: if `<Story directory>/archived/` does not exist, `archivedStories` is `[]`, not an error and not an omitted field.
- Every view state is a domain property (`CLAUDE.md` *The Layering Rule*) — the walk itself (which files exist where) is the kind of thing that belongs in a function returning data the board can unit-test without a browser; don't let this logic hide inside a component.

### Done when

This slice has no `## Acceptance` bullet naming it directly today (the plan's acceptance list is written against the finished Discovery tab, which is a later slice) — the concrete deliverable per the plan's `## Slices` entry for this branch is: **the board reads `<Story directory>/archived/*/STORY-*.md` into an `archivedStories` payload list, outside the story filter.** Treat that sentence as the spec, and additionally satisfy the plan's later-stated acceptance bullet that depends on this list existing: *"A story under `<Story directory>/archived/` shows in the Archived lane with `?archived=1` and is absent from the Planning tab's story filter, with the default key and with a declared `Story directory`"* — the second half of that sentence (absence from the Planning tab's filter) is already true today via the existing skip and must stay true; this slice is responsible for the list existing and being correct, not for the lane or the toggle.

Concretely:
- A unit test: a fixture repo with a story under `docs/stories/archived/<slug>/STORY-<slug>.md` produces that story in `archivedStories` and not in `stories`.
- A unit test with a declared non-default `Story directory` key: the walk reads `<that directory>/archived/`, not the default.
- A unit test with no `archived/` directory present: `archivedStories` is `[]`.
- A unit test proving the ref-then-working-tree merge direction matches `collectStories`'s existing behavior (ref wins on conflict).
- The `BoardPayload` contract schema (`packages/board/src/contract/schema.ts`) gains `archivedStories: StoryCard[]` so the client-side type and any schema validation see the new field.

Plus the repo's own gates: a changeset with `bumps: '@plot-pm/board': patch` (this slice is pure board/domain code, not a skill), written description-first with the `bumps:` block last (`CLAUDE.md` *Versioning*). Run `node skills/plot/scripts/board/plot-local-checks.mjs` before each push and run what it prints — for this slice that resolves to the board's related-test run and `pnpm run typecheck`. The suites under the `CI suites` config key (`test:e2e`, `test:contracts`, `test:board`, domain coverage, `test/reconcile/*.test.mjs`) run in CI on this PR — don't run them locally (`CLAUDE.md` *Testing*). A failure there comes back as a correction. This slice touches no `.sh` file, so `scripts/check-shell-lines.sh` is not in play (confirmed by the plan's own shell-lines table: this branch's row reads "none / none / 0").

### Bookkeeping

Open the PR through the controller, never `gh pr create`:

```bash
skills/plot/scripts/plot-open-pr.sh          # current branch
skills/plot/scripts/plot-open-pr.sh --draft  # while work is still moving
```

It reads which plan names this branch and opens the PR with the slice heading as title, the plan and this brief in the body. Push the first real commit as soon as it exists — a branch with no PR and no commits is invisible to the fleet. Once the PR exists, append `→ #<number>` to this branch's line in the plan's `## Slices` section (heading "The readings", `feature/the-board-reads-archived-stories` line).

### Scope guard

This branch owns:
- `packages/board/src/server/board.ts` — the new archived-story walk function and its call site inside the board payload assembly (around the existing `collectStories(...)` call and the `return { ... }` of the payload builder)
- `packages/board/src/contract/schema.ts` — `archivedStories: StoryCard[]` on the board payload schema
- Unit tests for the above

Do not touch: `StoriesTab.tsx`, `App.tsx`, the `?archived=1` toggle, `storyLane`/`storyLanes`, `ticketLane`/`doneTickets`, the issue index, or anything under `plot-host.sh` — those belong to `feature/tickets-and-stories-have-lanes`, `feature/the-tracker-lists-closed-issues`, `feature/the-index-holds-closed-issues` or `feature/the-lanes-read-the-whole-jira-project`, none of which this branch waits on or should pre-empt.

**No other branch on this plan is in flight except `feature/the-tracker-lists-closed-issues`** (verified at brief-writing time: that sibling has a brief and is about to be claimed; `feature/the-index-holds-closed-issues`, `feature/tickets-and-stories-have-lanes` and `feature/the-lanes-read-the-whole-jira-project` have no remote ref yet). `feature/the-tracker-lists-closed-issues` touches `plot-host.sh` and the tracker port/adapters exclusively — no file overlap with this branch's scope above, so the two can proceed concurrently with no collision. If you find something the plan did not anticipate, report it rather than improvising outside scope.
