## Implementation brief — tickets-and-stories-have-lanes (wave: The lanes)

- **Plan (canonical):** docs/plans/2026-10-12-tickets-and-stories-have-lanes.md on main
- **Approved:** 2026-10-12, Jan Wloka, plan-PR #1608 merged
- **Branch:** `feature/tickets-and-stories-have-lanes` (base: `main`)
- **Ends as:** one PR to `main`
- **Review of the code:** pr

This is the last wave of the plan. `feature/the-fleet-indexes-issues` (#1647), `feature/the-tracker-lists-closed-issues` (#1653), `feature/the-board-reads-archived-stories` and `feature/the-index-holds-closed-issues` (#1657) are all merged, and the branch this slice waited on, `feature/the-tabs-are-discovery-planning-delivery` (#1651), merged 2026-10-13. Nothing blocks this slice. `feature/the-lanes-read-the-whole-jira-project` is the one sibling wave still open after this one and touches only the Jira adapter's query-building, not these files.

### What to build

Every lower-level piece this slice depends on already exists on `main`: `trackerForIssues`, `Tracker.issueListClosed`, the `issue-index.ts` entity, `Issue.closedAt`, and `archivedStories` on the board payload (`board.ts:2374`/`:2464`). What does **not** exist yet is the domain rules and the UI that turn those readings into lanes. Confirmed by direct search on `main` at this session's start: no `packages/domain/src/rules/ticket-lane.ts`, no `story-lane.ts`, and `packages/board/src/server/fleet.ts:1546`'s `refreshIssues` still calls `hostSaid(['issue-list', ...])` directly instead of `trackerForIssues(...).issueList(...)` — so the board-side tracker-resolver wiring the plan's Motivation describes as already done is this slice's job, not a given.

Build, per the plan's Design (`docs/plans/2026-10-12-tickets-and-stories-have-lanes.md:124-170`):

1. `packages/domain/src/rules/ticket-lane.ts` — `ticketLane(issue, reading, now)` answering `open | in-progress | done | hidden`, per the table at plan line 126-135, and `doneTickets(rows, expanded)` with `DONE_LANE_LIMIT = 20`.
2. `packages/domain/src/rules/story-lane.ts` — `storyLane(standing, location)` and `storyLanes(map, stories)`, per the table at plan line 143-148.
3. Board payload wiring: the lanes' open/closed rows on `/api/board` (at most 1000 each, no bodies); `GET /api/issues/closed` calling `trackerForIssues(...).issueListClosed(null, 1000)`, gated on the issue gate's `requests`/`nextAt`/`backoffUntil` — from `issues.json` under a fleet, from new `issueNextAt`/`issueRequests`/`issueBackoffUntil` fields on `CacheEntry` with no fleet (these fields do not exist on `CacheEntry` today — grep confirmed).
4. `refreshIssues` (`fleet.ts:1546`) switches from `hostSaid(['issue-list', ...])` to `trackerForIssues(...).issueList(...)`, matching the route the already-merged spike built for the index writer.
5. Discovery tab UI: tag cloud on top, then the tickets lane group and the stories lane group as separate groups, the Done lane's *show all done (\<n\> more)* link (view-local state, not URL), and the `?archived=1` toggle.
6. Remove the empty-Discovery redirect in `App.tsx` — the effect at `App.tsx:1011-1021` (`if (board.stories.length === 0) setTab('planning')`) — because a Discovery tab with ticket lanes is never empty just for holding no story.

### The decisions the plan settles — do not re-derive them

**`?archived=1` is a new, separate parameter — do not reuse `?lanes=1` or `?released=1`.** `App.tsx` already has an unrelated `lanes` toggle (line 143-144, 643-647) that controls the Swimlanes *board layout* view, not this feature. Two different toggles are both named "lanes" in conversation but are unconnected: this plan's ticket/story lane groups on the Discovery tab are a fixed layout with no toggle of their own, and the toggle this slice adds only reveals the Archived story lane plus every closed ticket. The Planning tab's `?released=1` (*Show released*) stays a wholly separate control — sharing it with this toggle would conflate D7's and D8's two concerns, per the plan's explicit call-out (line 152). Pick a parameter name that cannot be confused with either existing one; the plan names `?archived=1`.

**`ticketLane` ignores every derived category except Jira's.** GitHub and Bitbucket arms derive a `statusCategory` (`plot-host.sh:4730-4736`), but D7 places those two trackers under "no category" — `reading.categoryStated` is true only for the `jira` source. Building the lane from the derived category on GitHub/Bitbucket is the naive implementation the Acceptance test at plan line 176 and 246 exists to catch: "an open GitHub issue named by a plan reads In progress although its derived category is `To Do`."

**`namedByPlan` can be `null`, and that is not the same as `false`.** It comes from `referencedIssues` (`fleet.ts:1430`), which already answers `null` when plans cannot be read — confirmed still true in the current `refreshIssues` body. On `null`, the ticket lane group shows *plans could not be read* and keeps its last good lanes (the same rule `refreshIssues` already follows for PR failures at `fleet.ts:1567-1574`); it does not fall back to treating every ticket as `namedByPlan: false`, which would silently misplace tickets into Open that should be In progress.

**The derived story standing `archived` is read as `done`, not as a seventh `StoryStanding`.** `transitions/story.ts:397`'s `derivedStanding` can answer `archived` (every plan of the story released), but `StoryStatus`/`StoryStanding` entities do not declare it as a status — confirmed no such entry exists in `entities/story.ts`. `storyLane` and the phase-map lookup both read `archived` as `done`. Archived-the-**lane** is strictly about file location (`<Story directory>/archived/`, read via the already-merged `archivedStories` payload list), not about standing — a live, un-archived story with `status: done` is Done, never Archived, because only physical directory location decides the Archived lane.

**`storyLanes` restricts drawn lanes by what the phase map declares or what a story occupies — ticket lanes are not restricted this way.** D12's declared-map-driven grouping (`phaseOfStory`, from `the-phases-are-declared`) applies only to story lanes. Open/In progress/Done for tickets are fixed, not map-driven — do not generalize the map mechanism across both rule files; the plan explicitly separates them (line 141, "ticket lanes stay outside the map, because D12 maps plan states and story statuses only" — resolved Open Point at line 182).

**The toggle's closed-ticket read is on-demand, not on the periodic poll.** `GET /api/issues/closed` is called once when the toggle turns on and once on a page load with `?archived=1` already set — never on the board's 30 s/4 s polls. It reuses the issue gate's own `requests`/`nextAt`/`backoffUntil` for its own rate limiting (reading from `issues.json` under a fleet, or the new `CacheEntry` fields with none) so it never exceeds 30 requests/hour even while kept on continuously. Wiring it into the periodic refresh instead is the mistake the Acceptance test at plan line 196/234 exists to catch.

**Rules carried over unchanged:** `unaskable`/`failed`/`nobody` stay three distinct outcomes a lane group must render distinctly — a `nobody`, `unaskable` or `failed` answer with no kept rows reaches the lanes as `issueAbsence` text, never as three silently-empty lane groups (plan line 110). Absence is a state to show, not a state to hide.

### Done when

The plan's `## Acceptance` "The plan" section (docs/plans/2026-10-12-tickets-and-stories-have-lanes.md:238-256) is the specification for this slice (ignore "The spike" subsection above it — already merged and judged on its own PR). Assertions worth calling out because a naive implementation passes without them:

- `doneTickets` over 25 Done rows answers the 20 newest and a count of 5 — catches an off-by-one or a count that includes the shown rows.
- `storyLanes` over a map declaring no `story:paused` and no paused story returns Draft *without* `paused` as a key, but over `DEFAULT_PHASE_MAP` returns Draft, Active and Done — catches a lane list that is always the full three regardless of what the map actually declares.
- A ticket that closes and then reopens leaves Done and returns to Open or In progress on the next pass — catches a `hidden`/`done` state treated as sticky instead of recomputed each pass.
- A failed pass keeps the previous rows and `at`, and the lanes draw them under a failure line — catches a failure that clears the lane instead of showing stale-but-present data.
- `PR_REQUESTS_PER_REFRESH` keeps reading `github: 1`/`bitbucket: 3` and the PR pass's stretch does not rise when only the issue fold spends — catches double-counting the issue read's cost against the PR budget.
- The Discovery toggle writes and reads `?archived=1` and *no other* parameter — catches a toggle handler that also clears or sets `tab`/`highlight`/etc.

Plus: the repo's gates — build artifacts, changeset, platform constraints. For tests, run `node skills/plot/scripts/board/plot-local-checks.mjs` before each push and run what it prints; the suites in `CLAUDE.md`'s `CI suites` key run in CI, not here. List no full suite.

`scripts/check-shell-lines.sh` refuses a PR whose shell under `skills/` grows past its merge base — the plan's own cost table (line 160-168) estimates this slice's net shell-line change at 0 (TypeScript and React only), so no `.sh` file should need touching; if one does, pay for it in the same change.

A changeset is needed: `plot` or `@plot-pm/board` package, per `CLAUDE.md`'s versioning section — minor, since this adds a new board-visible section (lane groups) rather than fixing a bug.

### Bookkeeping

Open the PR through the controller once a branch exists: `skills/plot/scripts/plot-open-pr.sh` (or `--draft` while still moving). Do not run `gh pr create` directly. When the PR is created, append `→ #<number>` to this branch's line under `docs/plans/2026-10-12-tickets-and-stories-have-lanes.md`'s `### The lanes` heading, and set the PR to "Ready" on the project board if one is configured (none is configured on this repo's `## Plot Config`, so this step is a no-op here). Push the first real commit as soon as it exists.

### Scope guard

This branch owns: `packages/domain/src/rules/ticket-lane.ts` (new), `packages/domain/src/rules/story-lane.ts` (new), their test files, `packages/board/src/server/fleet.ts` (the `refreshIssues` tracker-routing change, `CacheEntry` issue-gate fields, the `/api/issues/closed` endpoint), `packages/board/src/server/board.ts` (payload wiring for lane rows), `packages/board/src/app/App.tsx` (the empty-Discovery redirect removal, the `?archived=1` toggle), and the Discovery tab component(s) that render the lane groups (likely a new component alongside the existing `StoriesTab.tsx`, which this slice's lane logic supersedes for Discovery but may not delete outright — check whether `StoriesTab.tsx` is still used by the Planning tab before removing it).

Other branches in flight, verified at brief-writing time: `feature/the-lanes-read-the-whole-jira-project` is the only other open slice of this plan, waiting on a sibling plan's slice (`the-delivery-tab-filters-by-sprint-and-owner` of `the-board-has-three-tabs`) and touching only `plot-host.sh`'s Jira query-building and `ports/tracker.ts` — no file overlap with this branch's scope. `feature/a-refuted-claim-opens-an-issue` (PR #1662) is open on an unrelated plan.

If you find something the plan did not anticipate, report it rather than improvising outside scope — in particular, confirm the naming collision between this slice's Archived *story* lane concept and the unrelated `?lanes=1` Swimlanes toggle does not leak into shared component or prop names.
