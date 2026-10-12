# Tickets and stories have lanes

> The Discovery tab shows the tag cloud, a tickets lane group (Open, In progress, Done) and a stories lane group (Draft, Active, Done), with one toggle that adds archived stories and every closed ticket. The tracker port lists closed issues from the source `issueSource` names, fleetd folds open issues and the last 14 days of closed issues into an issue index, and the board reads the index.

## Status

- **State:** Draft
- **Type:** feature
- **Story:** plot-works-in-five-phases
- **Review:** pr
- **Impl:** own branches
- **Rounds:** 1

## Changelog

- The Discovery tab shows tickets in three lanes, Open, In progress and Done, beside the stories in three lanes, Draft, Active and Done, under the tag cloud.
- A ticket's lane follows the tracker's own status category where the tracker states one (Jira). On GitHub and Bitbucket, an open ticket that a plan's `Issue:` names is In progress, another open ticket is Open, and a closed ticket is Done. Done shows tickets closed in the last 14 days.
- One toggle, kept in `?archived=1`, adds an Archived lane with every story under `docs/stories/archived/` and every closed ticket in Done. The Planning tab's *Show released* stays a separate control.
- On Bitbucket the Done lane says that Bitbucket lists no closing date, and lists no closed ticket.

<!-- Board impact: the Discovery tab replaces the stories view; the board reads docs/stories/archived/ for the Archived lane; a new issue index file under .plot/state/index/ written by fleetd. No change to the plan format, the template or the docs/plans layout. -->

## Motivation

D7 in [the story](../stories/plot-works-in-five-phases/STORY-plot-works-in-five-phases.md) puts tickets and stories, the two subjects of Discovery, side by side. Measured on `main` at `75f093cb9`, 2026-10-12:

- `packages/board/src/app/components/StoriesTab.tsx` groups stories as Draft, Active, Done and Archived, with Archived behind a toggle and a TF-IDF tag cloud from `packages/board/src/server/topics.ts`. `COLUMN_OF` (`StoriesTab.tsx:30-38`) decides the grouping in the component.
- The board reads open issues through `plot-host.sh issue-list` (`fleet.ts:1490` `hostSaid`), after `issueSource` (`rules/issue-source.ts:46-66`) decides between `tracker`, `git-host` and `nobody`. This repository declares no `Tracker` key, so its issues come from the git host. The `Tracker` port's `issueList` (`ports/tracker.ts:108`) has no production caller; the one production use of the port is `statusWrite` (`board/src/server/entry/issue-status.ts:134`). `trackerFor('')` resolves to `trackerNone` (`adapters/tracker/tracker-resolve.ts:35-44`).
- `plot-host.sh issue-list` (`:4617`) asks for open issues only. Its GitHub arm derives `statusCategory` from the state it asks for and gives every open issue `To Do` (`:4730-4736`). Its Bitbucket arm parses `bb issue list --state new --state open` (`:4758`), which prints no date. Its Jira arm scopes the default query to `assignee = currentUser()` and the `Ticket prefixes` projects, and reads one page (`:4652-4697`).
- `Issue` carries `status` and `statusCategory` (`entities/issue.ts:44-58`) and no closing date.
- The board's open list is capped at 50 (`fleet.ts:190` `ISSUE_LIMIT`), and the payload drops every ticket a plan names (`fleet.ts:1577`). The cost juror measured 108 open and 194 closed issues on this repository.
- `refreshIssues` (`fleet.ts:1472`) runs in the board on the 60 s PR gate, with and without a fleet (`fleet.ts:1688`, `:1703`), and keeps the result in memory. The PR index writer is fleetd's `packages/fleet/src/shared/pr-refresh.ts:1281`, reached from `fleetPrs` (`packages/fleet/src/shared/fleet-clock.ts:149`) in `plot-registryd`. No index holds an issue.
- `setStoryStatus` writes `archived:` on every move to `done` (`transitions/story.ts:216-218`, refusal `archive-date-missing` at `:270`). The story-tracking skill archives a story by `git mv` into `<home>/archived/` (`skills/story-tracking/SKILL.md:135-160`). `board.ts:1746` and `:1758` skip `docs/stories/archived/`, which holds 6 stories today.
- `App.tsx:633-638` keeps every query parameter on a tab switch.

## Design

### Approach

The design spec is [DESIGN-phases.md](../stories/plot-works-in-five-phases/DESIGN-phases.md) §5, *Discovery*. The lanes are a view: no decision reads the issue index, and the board renders its open and closed rows as it renders non-terminal PR rows from the PR store (`fleet.ts:1624-1647`).

**The issue source decides, and the port follows it.** A new resolver `trackerForIssues(declared, gitHost, context)` in `adapters/tracker/tracker-resolve.ts` reads `issueSource`: `tracker` resolves to `trackerFor(declared)`, `git-host` resolves to a new read-only connector `trackerGitHost`, and `nobody` resolves to `trackerNone` with the source's reason. `trackerGitHost` lists through `plot-host.sh issue-list` as the GitHub and Jira connectors do (`tracker-shell.ts:145`), and answers `unaskable` on `statusWrite`, so a repository that declared no tracker gets no tracker write. `trackerFor` and `statusWrite` do not change.

**Closed issues on the port.** `Tracker` gains `issueListClosed(since, limit)`, which lists issues closed at or after `since`, newest first, without bodies. `Issue` gains `closedAt: string | null`, the tracker's own closing time; `null` on an open issue and on a closed issue whose tracker states no date. No `open` field is added: a row's openness is the list that returned it. `plot-host.sh issue-list` gains `--state open|closed` (default `open`) and `--since <iso>`:

| Source | Closed read | `closedAt` |
|---|---|---|
| GitHub | `gh issue list --state closed --search "closed:>=<since>" --json number,title,url,createdAt,closedAt --limit <n>` | `closedAt` |
| Jira | `project IN (<Ticket prefixes>) AND resolved >= "<since>"`, with today's assignee clause, `ORDER BY resolved DESC`, `nextPageToken` loop to `<n>` | `resolutiondate` |
| Bitbucket | exit 4: `bb issue list` prints no closing date | — |

The Jira closed read requires `Ticket prefixes`: with none declared it exits 4 with the reason, because an unscoped `resolved >=` query reads the whole instance (`plot-host.sh` `tracker_projects`). `PLOT_JIRA_JQL` overrides the open inbox only, and the closed read does not read it. A read that returns `<n>` rows reports `complete: false`. Each arm records one budget call per page: the GitHub arm records one `budget_record_call` per 100 rows past the first, because the `gh` wrapper records one call per process (`plot-host.sh:3382-3388`), and `jira_curl` records each page itself (`:2648`).

**The open list.** The fold asks for every open issue up to `ISSUE_INDEX_OPEN_LIMIT = 1000`, with the GitHub page loop and per-page record above and a Jira `nextPageToken` loop, and reports `complete: false` at the limit. Planned tickets stay in the index; the inbox filter (`fleet.ts:1577`) moves to the board's read, so the Delivery tab's *Waiting on you* keeps today's content and the Discovery lanes get the planned tickets.

**The issue index.** fleetd writes the issue index; the board never writes it.

- **Writer.** `refreshIssueIndex` in a new `packages/fleet/src/shared/issue-refresh.ts`, called by `fleetPrs` (`fleet-clock.ts:149`) after `refreshPrs`, on the same gate. A failure of one does not blank the other. A test `packages/fleet/test/unit/one-issue-index-writer.test.ts` asserts one caller of the encoder, in the shape of `one-pr-index-writer.test.ts`.
- **Shape.** `entities/issue-index.ts` exports `IssueIndexSchema`, `decodeIssueIndex`, `encodeIssueIndex` and `ISSUE_INDEX_VERSION`. One file per source, `.plot/state/index/issues-<source>.json` under the common git dir (`issues-github.json`, `issues-jira.json`, `issues-bitbucket.json`), so it never overwrites the PR index's `<connector>.json` (`pr-index-file.ts:31`). `PLOT_ISSUE_INDEX_HOME` overrides the directory, and `scripts/owned-run.sh` sets it beside `PLOT_PR_INDEX_HOME` (`:246`). The file holds `v`, `at`, the fetch's `answer` (`answered`, `unsupported`, `failed`) with its reason, the open rows with `complete`, and the closed rows with `since`, `complete` and the closed read's own answer.
- **Fold.** Each pass replaces the file whole: the open list, and the closed issues since `at − 14 days`. Nothing is a delta, so there is no watermark, no `updatedAt`, and no separate periodic full read: every pass is the full read of both bounded sets. A ticket that reopens leaves the closed set and enters the open set at the next pass. A failed read keeps the previous rows and records `failed`, as `refreshIssues` keeps its last good list today.
- **Cost.** `PR_REQUESTS_PER_REFRESH` (`pr-refresh.ts:181`) changes: `github` 1 → 2 for the closed read (the open read moves from the board into fleetd and was already counted); `bitbucket` stays 4 (the open read moves; the closed read exits 4 and spends nothing). Jira calls spend the Jira account, which `budget_record_jira` records per page and this table does not pace. On this repository one pass is 2 GitHub open pages (108 issues) and 1 closed page. Under a running fleet the board's own 60 s `issue-list` call (`fleet.ts:1688`) stops.

**The board's read.** The board follows the PR store's switch, `fleetOwnsPrs` (`fleet.ts:1619`), and not the file's validity. With a fleet, it reads the issue index and asks the host nothing; a missing file shows *the fleet has left no issue index to read*, as `readPrsFromStore` does (`fleet.ts:1636`). With no fleet, `refreshIssues` reads the open list and the 14-day closed list itself into memory, on the same gate as today, and writes no file. In both modes the inbox (`entry.issues`) and the lanes come from the same rows, so one ticket cannot show two states on two tabs. A `nobody`, `unaskable` or `failed` answer reaches the lanes as `issueAbsence` text, never as three empty lanes.

**The toggle's closed read.** With the toggle on, the tab asks `GET /api/issues/closed`, which calls `issueListClosed` with no `since` and `limit` 1000, on demand, at a person's cadence, as `issueView` reads a body (`ports/tracker.ts:113-114`). The answer is not written to the index. Only the 14-day rows ride the board payload; no closed row rides the 4 s `/api/fleet` payload (`App.tsx:32`). Story Open Point 8 stays open below, because D7's last sentence also reads on the toggle.

**The ticket lane.** `ticketLane(issue, reading, now)` in `packages/domain/src/rules/ticket-lane.ts` answers `open`, `in-progress`, `done` or `hidden`. `reading` holds `categoryStated` and `namedByPlan`. `categoryStated` is true only for the `jira` source: the GitHub and Bitbucket arms derive a category from the state they ask for, and D7 places those trackers under "no category". So `ticketLane` ignores a derived category.

| Ticket | Lane |
|---|---|
| category stated `To Do` | Open |
| category stated `In Progress` | In progress |
| category stated `Done`, `closedAt` within 14 days | Done |
| category stated `Done`, `closedAt` null or older | hidden; Done with the toggle on |
| category not stated, open, `namedByPlan` false | Open |
| category not stated, open, `namedByPlan` true | In progress |
| category not stated, closed, `closedAt` within 14 days | Done |
| category not stated, closed, `closedAt` older | hidden; Done with the toggle on |

Jira states a category for every status, so the category decides a resolved Jira ticket (D7): one resolved in a `To Do`-category status reads Open. `namedByPlan` comes from `referencedIssues` (`fleet.ts:1427`). When the plans cannot be read it answers `null`, and the ticket lane group shows *plans could not be read* and keeps its last good lanes, as `refreshIssues` does at `fleet.ts:1567-1574`.

**The story lane.** D7 names three lanes and their statuses; D12 makes the board's groupings come from the declared map. `storyLanes(map)` in `packages/domain/src/rules/story-lane.ts` returns D7's lanes, in D7's order, restricted to the statuses that `phaseOfStory(map, status)` (from `the-phases-are-declared`) places in a phase; a lane with no declared status is not drawn. `storyLane(map, standing, location)` answers the lane, or `hidden` for a status the map does not declare:

| Story | Lane |
|---|---|
| under `docs/stories/archived/` | Archived (toggle on only) |
| standing `draft`, `ready`, `paused` | Draft |
| standing `active`, `in-review` | Active |
| standing `done` or derived `archived` | Done |

Archived means the location: a story moved under `docs/stories/archived/`, as the story-tracking skill archives one. A story with `status: done` and an `archived:` date still in the live directory is Done, because the controller writes the date on every move to `done` (`transitions/story.ts:216-218`). `standing` is `derivedStanding` (`transitions/story.ts:395`), which the board already reads (`board.ts:1695`), so `COLUMN_OF` moves into the domain. The board reads `docs/stories/archived/*/STORY-*.md` into a separate `archivedStories` list on the board payload; the story filter of the Planning tab keeps skipping them (`board.ts:1746`, `:1758`).

**The Discovery tab.** The tag cloud stays on top. Below it, the tickets lane group and the stories lane group render as separate lane groups. One tab-wide toggle, off by default, adds the Archived story lane and every closed ticket. The tab keeps it per viewer in `?archived=1`, a parameter of its own: `App.tsx:633-638` keeps every parameter on a tab switch, so sharing `?released=1` with the Planning tab's *Show released* would make D7's and D8's two toggles one. A lane group whose fetch answered `unsupported` or `failed` shows the absence sentence.

**Every view state is a domain property.** Which lane a ticket and a story take, which story lanes the map draws, and what the toggle adds come from `ticketLane`, `storyLanes` and `storyLane`, with one unit test per table row. The components render them.

**Entity text.** `entities/issue.ts:20-31` names `closedAt` as a read beside `status`, and states that the issue index is a cache of one fetch, replaced whole each pass and stamped with `at`, not a mirror Plot edits. Its WONTFIX sentence (`:51-56`) states that the lane places an uncategorised closed ticket in Done by D7.

### Open Points

- [ ] **Needs operator decision. How many closed tickets the index holds** (story Open Point 8). D7 fixes Done to 14 days and the toggle to every closed ticket, and its last sentence says the closed list is read through the index.
  - (a) The index holds 14 days; the toggle reads every closed ticket on demand, outside the index (the plan default above).
  - (b) The index holds every closed ticket: a paginated full read on the first pass and once a day, the 14-day window on every pass, served to the client only with the toggle on.
  - (c) The index holds a declared number of days, a `## Plot Config` key with 14 as the default.
  - Recommendation: (a). It bounds the file, the pass and the payload, and spends the full read only when a person asks; (b) costs up to 10 GraphQL pages per day at the 1000 cap on GitHub.
- [ ] **Needs operator decision. Which Jira tickets the lanes show.** The Jira inbox lists `assignee = currentUser()` (`plot-host.sh:4684`), so on Jira the lanes show the reader's tickets, while on GitHub they show the repository's.
  - (a) Keep the assignee clause for the open and closed reads (the plan default): the lanes show my tickets on Jira.
  - (b) Drop the assignee clause and keep the project scope: the lanes show the project's tickets, and *Waiting on you* shows only mine once D9's filter and story Open Point 7 land.
  - Recommendation: (b) after story Open Point 7 is decided, (a) until then, so the Delivery inbox does not widen before its filter exists.
- [x] [Domain] The ticket source. Resolved: `trackerForIssues` follows `issueSource`, a read-only `trackerGitHost` connector lists for a repository with no `Tracker` key, and the Bitbucket closed read exits 4 with a stated reason. — *panel round 1: estate, contradiction, cost and deliverable*
- [x] [Domain] The In progress rule on GitHub. Resolved: `ticketLane` reads `categoryStated`, true only for Jira, so it ignores the category that `plot-host.sh:4730-4736` derives; the Motivation names `Issue.statusCategory` (`issue.ts:58`). — *panel round 1: estate, deliverable, cost*
- [x] [Technical] The index writer and its delta. Resolved: fleetd's `refreshIssueIndex`, called from `fleetPrs` on the PR gate, replaces the file whole each pass over two bounded sets, so no watermark, `updatedAt` or separate full read exists; the board switches on `fleetOwnsPrs`, its 60 s call stops under a fleet, `PR_REQUESTS_PER_REFRESH.github` becomes 2, and the fetch's answer is kept in the file. — *panel round 1: contradiction, estate, deliverable, cost*
- [x] [Technical] The meaning of archived. Resolved: Archived is a story under `docs/stories/archived/`, which the board now reads into `archivedStories`; `storyLane` takes `derivedStanding`, so a live `done` story with an `archived:` date is Done. — *panel round 1: estate, contradiction*
- [x] [UX] The toggle's URL parameter. Resolved: the Discovery toggle uses `?archived=1`, separate from the Planning tab's `?released=1`. — *panel round 1: contradiction (must change); estate, deliverable (Open Point)*
- [x] [Performance] The cost of the closed read. Resolved: the pass reads 14 days of closed issues, the toggle reads on demand with a 1000 cap and `complete: false`, each GitHub page and Jira page is recorded, the Jira read requires `Ticket prefixes`, and no closed row rides `/api/fleet`. The retention bound stays the operator decision above. — *panel round 1: cost, estate*
- [x] [Technical] The open list cap. Resolved: the fold reads every open issue up to 1000 with a page loop and `complete: false`, keeps planned tickets in the index, and applies the inbox filter at the board's read. — *panel round 1: cost, deliverable, estate*
- [x] [Domain] The phase map. Resolved: `storyLanes(map)` and `storyLane(map, …)` take the parsed map and draw only lanes whose statuses the map declares; ticket lanes stay outside the map, because D12 maps plan states and story statuses only. — *panel round 1: moderator, a blind spot the four jurors share*
- [x] [Technical] The `waits:` slice. Resolved: the `waits:` moved to the lanes slice. — *panel round 1: deliverable, contradiction*
- [x] [Domain] Smaller points. Resolved, one line each. — *panel round 1: deliverable, contradiction, estate, cost*
  - A resolved Jira ticket in a `To Do` category reads Open, because Jira states a category and D7 puts it first.
  - A stated `Done` ticket with no `closedAt` is hidden until the toggle is on.
  - `Issue.open` is dropped; openness is the list that returned the row.
  - `namedByPlan` `null` shows *plans could not be read* and keeps the last good lanes.
  - Three plans widen `Issue` and `Tracker`: whichever of this plan's index slice and `feature/an-issue-names-its-assignee` lands second adds its field to `IssueIndexSchema` and raises `ISSUE_INDEX_VERSION`; `issueOpen` (`the-fleet-verifies-what-it-delivered`) is a write and does not touch the index.
  - The issue index reuses the PR index's file adapter pattern and `connectorFile`, and not `foldPrIndex`, because a whole replacement needs no fold by watermark.
  - The shell-line ratchet: the first slice's new `plot-host.sh` arms pass `scripts/check-shell-lines.sh` by removing an equal count of shipped shell lines, named in its PR.

## Acceptance

- On this repository (no `Tracker` key, GitHub), `plot-host.sh issue-list --state closed --since <now−14d>` prints issues with a non-empty `closedAt`, and `trackerForIssues('', 'github', …).issueListClosed` answers them.
- On Bitbucket, `plot-host.sh issue-list --state closed` exits 4 with a reason and runs no `bb` command.
- With Jira and no `Ticket prefixes`, the closed read exits 4 and runs no `curl`.
- A unit test per row of the ticket table and the story table; an open GitHub issue named by a plan reads In progress although its derived category is `To Do`.
- `storyLanes` over a map that declares no `story:paused` returns Draft without `paused`, and over `DEFAULT_PHASE_MAP` returns Draft, Active and Done.
- `one-issue-index-writer.test.ts` finds one caller of `encodeIssueIndex`, in `packages/fleet/src/shared/issue-refresh.ts`.
- With a fleet running, the board makes no `issue-list` call; with no fleet, it writes no file under `.plot/state/index/`.
- A ticket that closes and then reopens leaves Done and returns to Open or In progress on the next pass.
- `PR_REQUESTS_PER_REFRESH` reads `github: 2` and `bitbucket: 4`.
- The `/api/fleet` payload carries no closed issue; `GET /api/issues/closed` answers only on request.
- Toggling *Show released* on the Planning tab does not change the Discovery toggle, and the reverse.
- A story under `docs/stories/archived/` shows in the Archived lane with `?archived=1` and is absent from the Planning tab's story filter.

## Slices

### The readings

- `feature/the-tracker-lists-closed-issues` — `plot-host.sh issue-list --state closed --since` for GitHub and Jira, exit 4 for Bitbucket; the open-list page loop and per-page budget records; `Issue.closedAt`; `Tracker.issueListClosed`; `trackerForIssues` and `trackerGitHost`; the entity text; the contract tests <!-- builds: issueListClosed, Issue.closedAt, trackerForIssues and trackerGitHost -->
- `feature/the-board-reads-archived-stories` — the board reads `docs/stories/archived/*/STORY-*.md` into an `archivedStories` payload list, outside the story filter <!-- builds: archivedStories on the board payload -->

### The issue index

- `feature/the-fleet-indexes-issues` — `entities/issue-index.ts` with its decoder, encoder and version; the file adapter and `PLOT_ISSUE_INDEX_HOME` in `owned-run.sh`; `refreshIssueIndex` in `packages/fleet/src/shared/issue-refresh.ts` called from `fleetPrs`; `PR_REQUESTS_PER_REFRESH.github` 2; the one-writer test; the board reads the index under `fleetOwnsPrs`, reads in memory without a fleet, and applies the inbox filter at its read <!-- builds: the issue index, its fleetd writer and its decoder -->

### The lanes

- `feature/tickets-and-stories-have-lanes` <!-- waits: feature/the-tabs-are-discovery-planning-delivery --> — `ticketLane`, `storyLanes` and `storyLane`; the lanes on the board payload; `GET /api/issues/closed`; the Discovery tab with the tag cloud, the tickets lane group, the stories lane group and the `?archived=1` toggle <!-- builds: ticketLane, storyLanes, storyLane and the Discovery tab's lanes -->

## Notes

- 2026-10-12: drafted by an unattended `/plot-idea` batch run from jwloka's decisions of the same day. Type, Review and Impl came from the prompt.
- 2026-10-12: the lanes slice waits on `feature/the-tabs-are-discovery-planning-delivery` of `the-board-has-three-tabs`, because the Discovery tab exists only after that slice; that slice waits on `feature/the-board-draws-the-declared-phases`, so `phaseOfStory` exists before the lanes. The readings and the index wait on nothing outside this plan.
- 2026-10-12, deliverable search (`plot-deliverable-search.sh`): `closedIssue` and `issueIndex` returned no artifact; the issue matches are agent-log kinds (`idea-issue`, `story-issue`). `ticketLane` and `storyLane` returned no artifact. `archived` returned `StoriesTab.tsx`, whose Draft, Active, Done and Archived grouping this plan moves into `storyLane`, and `App.tsx`. `topics` returned `StoriesTab.tsx` and `App.tsx`; the tag cloud and `server/topics.ts` stay as they are.
- 2026-10-12: revised after panel round 1 (`.plot/panels/2026-10-12-tickets-and-stories-have-lanes/`). Cross-plan changes this revision needs, not made here: `DESIGN-phases.md` §5 says GitHub has no category (`:214`) and should say the GitHub arm derives one that the lane ignores, and should name `?archived=1`; `the-board-has-three-tabs` should state that `?released=1` belongs to the Planning tab alone, and that its `Issue.assignee` joins `IssueIndexSchema` if it lands after the index; `the-fleet-verifies-what-it-delivered` should resolve `issueOpen` through `trackerForIssues` so a repository with no `Tracker` key opens issues on its git host or answers `unaskable` by the same decision; the story's Open Point 8 should name the three options above; `CLAUDE.md` *A Decision Reads The Index* should name the issue index as a second fleetd-written index.
