## Implementation brief — tickets-and-stories-have-lanes (wave: The lanes)

- **Plan (canonical):** `docs/plans/2026-10-12-tickets-and-stories-have-lanes.md` on main
- **Approved:** 2026-10-12, Jan Wloka, plan-PR #1608 merged
- **Branch:** `feature/tickets-and-stories-have-lanes` (base: `main`)
- **Ends as:** one PR to main
- **Review of the code:** repo convention (CI green + review)

This is the fourth wave. Every branch it needs is merged: the spike
`feature/the-fleet-indexes-issues` (#1647, *The issue gate*), `feature/the-tracker-lists-closed-issues`
(#1653, *The readings*) and `feature/the-index-holds-closed-issues` (#1657, *The issue index*) are
all on `main` as of `6e457a7d2`. The plan's D29 holds on this branch are gone — approval already
cleared them, and the spike met its Acceptance in CI. Its sibling in the same wave,
`feature/the-board-reads-archived-stories`, has no PR yet but `archivedStories` already rides the
board payload (`board.ts:2374`, `:2464`) — read it, don't rebuild it. The next wave,
`feature/the-lanes-read-the-whole-jira-project`, waits on this one merging.

### What to build

Today `StoriesTab.tsx` groups stories into Draft/Active/Done/Archived with a local `COLUMN_OF`
lookup (`:31-38`), and the board makes no distinction between tickets at all — there is no ticket
lane, no `/api/issues/closed` route, and the Discovery tab shows only the story board. Everything
the fold needs already exists: `tracker.issueListClosed`, `ISSUE_INDEX_OPEN_LIMIT`,
`ISSUE_INDEX_CLOSED_DAYS` and the closed rows on `issues.json` (`issue-index.ts`, `fleet.ts:1581-1636`).
This slice is the first one that reads any of it from a UI.

Build, in the domain:

- `ticketLane(issue, reading, now)` in `packages/domain/src/rules/ticket-lane.ts` — `open` /
  `in-progress` / `done` / `hidden`, per the plan's table (Design § *The ticket lane*, plan lines
  124-137). `reading` carries `categoryStated` (true only for a Jira source — GitHub and Bitbucket
  derive a category from the state asked for, and `ticketLane` must ignore that derived value) and
  `namedByPlan` (from `referencedIssues`, `fleet.ts:1430`; `null` when plans can't be read).
- `doneTickets(rows, expanded)` in the same file — newest-`closedAt`-first, nulls last, the top
  `DONE_LANE_LIMIT = 20` plus the count of the rest.
- `storyLane(standing, location)` and `storyLanes(map, stories)` in
  `packages/domain/src/rules/story-lane.ts` — D7's four lanes (Draft/Active/Done/Archived), restricted
  to lanes a `PhaseMap` (`phaseOfStory`, `workflow-phases.ts:167`) declares or that hold a story. This
  replaces `COLUMN_OF`: move the lookup out of the component into the domain, keyed on
  `derivedStanding` (`transitions/story.ts:397`, already read at `board.ts:1695`), which answers
  `done` for the undeclared standing `archived` too.

Wire it in `fleet.ts` / the board payload: add `ticketLane`/`storyLanes` fields the Discovery tab can
render directly, and a `GET /api/issues/closed` route in `packages/board/src/server/index.ts` beside
the other raw `url.pathname === '/api/...'` checks (this router has no Express) that calls
`trackerForIssues(...).issueListClosed(null, 1000)`.

Render the Discovery tab: tag cloud on top (unchanged), then the tickets lane group and the stories
lane group as separate groups, one `?archived=1` toggle (off by default) that adds the Archived story
lane and the rest of Done. Remove the empty-state redirect at `App.tsx:1010-1021` — a Discovery tab
with ticket lanes is never empty just because `board.stories.length === 0`.

### The decisions the plan settles — do not re-derive them

**`categoryStated` is true only for Jira — never derive "in progress" from a GitHub/Bitbucket state.**
GitHub and Bitbucket arms derive a category from the state they asked for
(`plot-host.sh:4730-4736`), and D7 places those trackers under "no category" on purpose. `ticketLane`
must ignore that derived value entirely — an open GitHub issue a plan names reads In progress through
`namedByPlan`, not through any category GitHub supplied. A unit test for this exact case is in
Acceptance (plan line 246): "an open GitHub issue named by a plan reads In progress although its
derived category is `To Do`."

**A stated-`Done` ticket with no `closedAt` is `hidden`, not `done`.** This is the WONTFIX case: Jira
can resolve a ticket without recording a resolution date. `hidden` means absent from the lanes until
the toggle is on, at which point it joins Done. Don't fold it into `done` directly — the hidden state
is what lets the toggle add it later without a second lookup.

**`namedByPlan: null` is a distinct state from `false`, and it wins over everything.** When
`referencedIssues` can't read the plans directory, the whole ticket lane group shows *plans could not
be read* and keeps its last good lanes (plan line 137, mirroring `fleet.ts:1567-1574`'s existing
pattern for the inbox). Don't collapse `null` into `false` — a `null` silently reading as "not named"
would misclassify every ticket a plan names as merely Open.

**`doneTickets`' ordering puts a null `closedAt` last, not first or by insertion order.** This matters
because a `hidden` ticket (no `closedAt`) only becomes visible through the toggle, and when it does it
must not jump to the top of Done ahead of genuinely recent closures.

**The Done lane shows 20 rows with a count, never all of them inline (D24).** On this repository
that's 20 of 154. The *show all done (<n> more)* link's expansion state is per-view, not kept in the
URL — only `?archived=1` is a URL parameter. Don't add a second query param for Done's expansion.

**`?archived=1` is the Discovery tab's own toggle — never share `?released=1`.** `App.tsx:633-638`
preserves every query parameter across tab switches, so if Discovery's toggle reused the Planning
tab's `?released=1`, turning on one would turn on the other. They must stay two separate parameters
even though both default off and both add an "everything" view.

**`/api/issues/closed` is request-driven, never polled.** The tab calls it once when the toggle turns
on and once on a page load with `?archived=1` already set — never on the existing 30 s `/api/board`
poll. The endpoint keeps its last answer for `max(issueIntervalMs(requests), issueIntervalMs(p))`
where `requests`/`backoffUntil` come from `issues.json` under a fleet or `CacheEntry` without one
(both already plumbed into `PrWorld.issueGate` by the issue-index slice) — a second request inside
that window must hit no `plot-host.sh` command at all, and a request during an active `backoffUntil`
asks nothing and serves the backoff's reason. This endpoint is new to this slice; the budget reads it
depends on already exist.

**The empty-Discovery redirect is removed outright, not special-cased.** `App.tsx:1010-1021` sends an
empty-of-stories Discovery tab to Planning. After this slice a Discovery tab with zero stories still
shows ticket lanes, so the condition that triggered the redirect (`board.stories.length === 0`) is no
longer a valid proxy for "nothing to show here." Delete the effect; don't add a second condition to it.

**Every lane decision is a domain property with its own unit test — nothing decided in the `.tsx`.**
This repo's binding rule (`CLAUDE.md` *Every rendered state is a domain property*): a decision made in
a component can only be tested by rendering it, and this repo's 42-of-43 browser-test history is the
cost of that mistake. One test per row of the ticket table and the story table (plan line 246) is the
acceptance bar, not a suggestion.

### Done when

The plan's `## Acceptance` "The plan" section (lines 238-256) is the specification — every bullet
there is a test, not prose. The ones a naive pass would miss:

- The GitHub-named-ticket-reads-In-progress case above, specifically because its *derived* category
  says `To Do` — this is the one row that looks wrong if you trust the tracker's own category.
- `doneTickets` over 25 rows answers 20 + a count of 5 (not 25, not 20 with no count).
- `storyLanes` over a map with no `story:paused` declared and no paused story returns Draft without a
  `paused` lane — i.e., an empty lane the map doesn't mention is omitted, not rendered blank.
- A story with derived standing `archived` reads Done under a map that lists statuses without
  `story:*` at all — the fallback path when the map is silent on archival.
- `/api/fleet` must still carry **no closed issue**, capped at 50 inbox rows as today — this slice
  only adds the closed read to `/api/board` and the new `/api/issues/closed` route, never to the 4 s
  poll.
- A story under `<Story directory>/archived/` shows in Archived with `?archived=1` set, and is still
  absent from the Planning tab's own story filter (`board.ts:1746`, `:1758`) — the two filters must
  not interfere with each other.

Plus the repo's gates: a changeset (`'plot': patch` or appropriate bump — this is new UI surface, so
consider `minor` on `@plot-pm/board` for the lanes, `patch` on `plot` if any skill doc needs a line),
and this branch adds no new shell. Run
`node skills/plot/scripts/board/plot-local-checks.mjs` before each push and run what it prints — the
related `packages/domain` and `packages/board` vitest/tsc suites will fire on `rules/ticket-lane.ts`,
`rules/story-lane.ts` and the board's server/app changes. The suites under `CI suites` run in CI only;
a failure there comes back as a correction, not something to chase locally.

`scripts/check-shell-lines.sh` refuses a PR that grows the shipped shell under `skills/`. This slice
is pure TypeScript/TSX (domain rules, `fleet.ts`, `index.ts`, `App.tsx`, `StoriesTab.tsx`) — it should
add zero shell lines. If anything here ends up touching a `.sh` file, that growth must be paid for in
the same change.

### Bookkeeping

Open the PR through the controller once the branch has its first commit:

```bash
../plot/scripts/plot-open-pr.sh          # current branch
../plot/scripts/plot-open-pr.sh --draft  # while still moving
```

Do not run `gh pr create` directly. When the PR exists, append `→ #<number>` to this branch's line
in the plan's `## Slices` section (*The lanes* heading), and push the first real commit as soon as
it exists rather than batching everything into one late push.

### Scope guard

This branch owns: `packages/domain/src/rules/ticket-lane.ts` (new), `packages/domain/src/rules/story-lane.ts`
(new) and their tests; the board payload additions in `packages/board/src/server/fleet.ts` and the new
route in `packages/board/src/server/index.ts`; `packages/board/src/app/App.tsx` (the empty-redirect
removal and the `?archived=1` toggle) and `packages/board/src/app/components/StoriesTab.tsx` (replacing
`COLUMN_OF` with `storyLane`/`storyLanes`, and the new tickets lane group).

Do not touch: `packages/domain/src/entities/issue-index.ts`, `packages/domain/src/adapters/tracker/*`,
or `packages/fleet/src/shared/issue-refresh.ts` — all merged and settled by the three prior waves. The
only sibling branch still open in this wave, `feature/the-board-reads-archived-stories`, already has
`archivedStories` on the board payload (`board.ts:2374`); read that field, don't re-derive archived
stories here. The next wave, `feature/the-lanes-read-the-whole-jira-project`, waits on this branch and
touches the Jira JQL scope in `plot-host.sh` and the inbox rows — out of scope here.

If you find something the plan did not anticipate, report it rather than improvising outside scope.
