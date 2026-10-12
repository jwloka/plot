# Tickets and stories have lanes

> The Discovery tab shows the tag cloud, a tickets lane group (Open, In progress, Done) and a stories lane group (Draft, Active, Done), with one toggle that adds archived stories and every closed ticket. The tracker port lists closed issues, and the board reads them through the index.

## Status

- **State:** Draft
- **Type:** feature
- **Story:** plot-works-in-five-phases
- **Review:** pr
- **Impl:** own branches

## Changelog

- The Discovery tab shows tickets in three lanes, Open, In progress and Done, beside the stories in three lanes, Draft, Active and Done, under the tag cloud.
- A ticket's lane follows the tracker's own status category. Where the tracker has none, an open ticket that a plan's `Issue:` names is In progress, and a closed ticket is Done. Done shows tickets closed in the last 14 days.
- One toggle shows released and archived items: an Archived lane with every archived story, and every closed ticket in Done.

<!-- Board impact: the Discovery tab replaces the stories view; a new issue index file under .plot/state/ written by the fleet. No change to the plan format, the template or the docs/plans layout. -->

## Motivation

D7 in [the story](../stories/plot-works-in-five-phases/STORY-plot-works-in-five-phases.md) puts tickets and stories, the two subjects of Discovery, side by side. Measured on `main` at `75f093cb9`, 2026-10-12:

- `packages/board/src/app/components/StoriesTab.tsx` groups stories as Draft, Active, Done and Archived, with Archived behind a toggle and a TF-IDF tag cloud from `packages/board/src/server/topics.ts`. The grouping is decided in the component.
- The tracker port lists open issues only (`packages/domain/src/ports/tracker.ts:108` `issueList`), and `plot-host.sh issue-list` (`:4617`) asks for open issues. `Issue` carries no closing date (`entities/issue.ts:33-59`).
- Unplanned open issues render in the Agents tab's *Waiting on you*. No tab shows a ticket after a plan names it, or after it closes.
- `refreshIssues` (`packages/board/src/server/fleet.ts:1472`) asks the tracker on the PR timer and keeps the result in memory. No index holds an issue. DESIGN-index.md plans a Jira delta by `updated >= watermark` (`docs/stories/the-master-agent-holds-the-fleet/DESIGN-index.md:122`).

## Design

### Approach

The design spec is [DESIGN-phases.md](../stories/plot-works-in-five-phases/DESIGN-phases.md) §5, *Discovery*.

**Closed issues on the port.** `Tracker` gains `issueListClosed(since)`, which lists issues closed at or after `since`, without bodies. `Issue` gains `closedAt: string | null` and `open: boolean`. `tracker-github.ts` asks for closed issues with a `closed:>=` search, and `tracker-jira.ts` asks with `resolved >= <since>`. `trackerNone` answers `unaskable`, as for every other operation.

**The issue index.** The fleet writes the issues it reads into an issue index under `.plot/state/`, with a per-connector watermark, the shape `DESIGN-index.md` gives the PR index. The first fold reads every closed issue once; each later fold asks for issues updated after the watermark. The fleet is the one writer, as `fleet.ts` is for the PR index today. The board reads the file through a decoder that the domain exports. A missing, unparseable or other-version file makes the board ask the tracker directly, as the PR index does. The lanes are a view and not a decision, so a closed ticket that reopens moves at the next fold.

**The ticket lane.** `ticketLane(issue, namedByPlan, now)` answers `open`, `in-progress`, `done` or `hidden`:

| Ticket | Lane |
|---|---|
| category `To Do` | Open |
| category `In Progress` | In progress |
| category `Done`, closed within 14 days | Done |
| no category, open, `namedByPlan` false | Open |
| no category, open, `namedByPlan` true | In progress |
| no category, closed within 14 days | Done |
| closed more than 14 days ago | hidden; Done with the toggle on |

`namedByPlan` is true when a plan's `Issue:` field names the ticket, which `referencedIssues` (`fleet.ts:1427`) computes today to decide what is unplanned. A Jira ticket closed without the `Done` category (`WONTFIX`, for example) has no category; it reads Done by the closed rule, as D7 decides.

**The story lane.** `storyLane(story)` answers `draft` for `draft`, `ready` and `paused`, `active` for `active` and `in-review`, `done` for `done` without an `archived:` date, and `archived` for an archived story, which shows only with the toggle on.

**The Discovery tab.** The tag cloud stays on top. Below it, the tickets lane group and the stories lane group render as separate lane groups. One tab-wide toggle, off by default, adds the Archived story lane and every closed ticket. The tab keeps the toggle per viewer in the URL (`?released=1`), as the Planning tab's *Show released* does.

**Every view state is a domain property.** Which lane a ticket and a story take, and what the toggle adds, come from `ticketLane` and `storyLane`, with unit tests over each row of the tables above.

### Open Points

- [ ] How many closed tickets the index holds. The plan default is one full read, then a delta by watermark, with no bound (story Open Point 8).

## Slices

### Closed issues

- `feature/the-tracker-lists-closed-issues` <!-- waits: feature/the-tabs-are-discovery-planning-delivery --> — `issueListClosed(since)` on the port; `Issue.closedAt` and `Issue.open`; both connectors and `trackerNone`; the contract tests <!-- builds: issueListClosed, Issue.closedAt and Issue.open -->

### The issue index

- `feature/the-fleet-indexes-issues` — the fleet folds open and closed issues into an issue index under `.plot/state/` with a per-connector watermark; a domain decoder; the board reads the index and asks the tracker on a miss <!-- builds: the issue index, its fold and its decoder -->

### The lanes

- `feature/tickets-and-stories-have-lanes` — `ticketLane` and `storyLane`; the Discovery tab with the tag cloud, the tickets lane group, the stories lane group and the released toggle <!-- builds: ticketLane, storyLane and the Discovery tab's lanes -->

## Notes

- 2026-10-12: drafted by an unattended `/plot-idea` batch run from jwloka's decisions of the same day. Type, Review and Impl came from the prompt.
- 2026-10-12: the first slice waits on `feature/the-tabs-are-discovery-planning-delivery` of `the-board-has-three-tabs`, because the Discovery tab exists only after that slice.
- 2026-10-12, deliverable search (`plot-deliverable-search.sh`): `closedIssue` and `issueIndex` returned no artifact; the issue matches are agent-log kinds (`idea-issue`, `story-issue`). `ticketLane` and `storyLane` returned no artifact. `archived` returned `StoriesTab.tsx`, whose Draft, Active, Done and Archived grouping this plan moves into `storyLane`, and `App.tsx`. `topics` returned `StoriesTab.tsx` and `App.tsx`; the tag cloud and `server/topics.ts` stay as they are.
