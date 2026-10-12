# The board has three tabs

> The board's tabs Stories, Plans and Agents become Discovery, Planning and Delivery, the old `?tab=` values redirect, the Planning tab shows plans from Design to Testing with a *Show released* checkbox, and the Delivery tab filters its tickets, its sprint and its owner.

## Status

- **State:** Draft
- **Type:** feature
- **Story:** plot-works-in-five-phases
- **Review:** pr
- **Impl:** own branches

## Changelog

- The board's tabs are Discovery, Planning and Delivery. `?tab=stories`, `?tab=plans`, `?tab=board` and `?tab=agents` redirect to the new tab, so existing bookmarks keep working.
- The Planning tab shows plans in Design, Development and Testing. A *Show released* checkbox, off by default, adds Released plans.
- The Delivery tab's *Waiting on you* shows only tickets assigned to you by default. An *Active sprint* toggle shows only the active sprint's plans and their PRs, branches, builds and agents. *Only my work* also filters tickets, branches, PRs and builds.

<!-- Board impact: tab names, URLs and the Delivery tab's filters change. The Issue entity gains a read-only assignee. No change to the plan format, the template or the docs/plans layout. -->

## Motivation

D6, D8 and D9 in [the story](../stories/plot-works-in-five-phases/STORY-plot-works-in-five-phases.md) name the tabs after the work each one shows. Measured on `main` at `75f093cb9`, 2026-10-12:

- `packages/board/src/app/App.tsx:118` declares `type Tab = 'stories' | 'plans' | 'agents'`, and `parseTab` (`:122`) redirects `?tab=board` to `plans`. The tab decision is made in the component and has no domain test.
- The Plans tab draws five phase columns (`components/Board.tsx`, `Swimlanes.tsx`) and has a sprint filter, a story filter, *Story lanes* and *Only my work* (`lib/agent-rows/mine-filter.ts:162` `boardForReader`).
- The Agents tab (`components/AgentList.tsx`) groups rows into the six sections of `lib/agent-rows/sections.ts:25`. *Waiting on you* holds unplanned tickets, broken agents and Draft plans with no branch (`AgentList.tsx:1123`, `:2367`). It has a sprint multiselect (`AgentList.tsx:597`).
- `Issue` carries no assignee by stated design (`packages/domain/src/entities/issue.ts:21-23`). D9 needs it to show a person their own tickets.
- The reader is a git host login, a git email and the `People` directory (`mine-filter.ts:119` `readerFrom`).

## Design

### Approach

The design spec is [DESIGN-phases.md](../stories/plot-works-in-five-phases/DESIGN-phases.md) §5.

**The tab is a domain answer.** A new rule `boardTabOf(param)` in `packages/domain/src/rules/board-tab.ts` returns the tab and, for an old value, the new value to redirect to: `stories` to `discovery`, `plans` and `board` to `planning`, `agents` to `delivery`. An absent or unknown value answers `planning`, as `plans` is the default today. `App.tsx` calls it and replaces the URL silently, as `parseTab` does today. The tab names are fixed (D6). The Discovery tab renders today's `StoriesTab` until `tickets-and-stories-have-lanes` rebuilds it.

**The Planning tab.** `planningColumns(map, showReleased)` returns the declared phases that hold plan states, in declared order, without the phase that holds `plan:released` unless `showReleased` is on. With the default map it answers Design, Development and Testing, and Released with the checkbox on. The sprint filter, the story filter, *Story lanes* and *Only my work* stay. *Show released* is off by default and is kept per viewer in the URL (`?released=1`).

**The assignee.** `Issue` gains `assignee: string`, the tracker's own login or account, `''` where the tracker states none. It is a read, under the same reasoning that admitted `status` and `statusCategory` (`issue.ts:25-31`): Plot reads it and never writes it. The status write's refusal to widen (`ports/tracker.ts:31-41`) is about writes and does not change. Both connectors, `tracker-github.ts` and `tracker-jira.ts`, read it in `issueList`.

**Waiting on you.** `waitingTickets(issues, reader)` keeps the tickets whose assignee is the reader. A ticket with no assignee is not the reader's. By default *Waiting on you* shows these, and a control in the section shows every unplanned ticket. A reader whose identity is unconfigured sees every ticket, as `rowsForReader` keeps a row whose owner cannot be determined today.

**Active sprint.** `activeSprintScope(rows, sprints)` keeps the plans of every sprint in state `Active` (`entities/sprint.ts:9`) and the rows that belong to them: PRs, branches, builds and agents. With no Active sprint the tab shows nothing and says so. The toggle sits beside today's sprint multiselect.

**Only my work.** `boardForReader` and `rowsForReader` extend to tickets (by assignee), branches and PRs (by author), plans (by `Assignee:`) and builds (by the branch's owner). The stored preference that governs both tabs today stays one preference.

**Every view state is a domain property.** The tab, its columns, which tickets *Waiting on you* shows, and which rows the two toggles keep come from the rules above, with unit tests. The components render them.

### Open Points

- [ ] How a tracker assignee matches the reader. A GitHub assignee is a host login and matches `hostUser`. A Jira assignee is a Jira account; the `People` key is a candidate for the match (story Open Point 7).
- [ ] *Active sprint* with more than one Active sprint shows their union (story Open Point 12).

## Slices

### The tabs are renamed

- `feature/the-tabs-are-discovery-planning-delivery` <!-- waits: feature/the-board-draws-the-declared-phases --> — `boardTabOf` and its redirects; the tab labels and URLs; the Discovery tab renders today's stories view; the docs that name the old tabs <!-- builds: boardTabOf and the three renamed tabs -->

### Planning and the assignee

- `feature/the-planning-tab-shows-design-to-testing` — `planningColumns`; the *Show released* checkbox, off by default, kept in `?released=1` <!-- builds: planningColumns and the Show released checkbox -->
- `feature/an-issue-names-its-assignee` — `Issue.assignee` read by `tracker-github.ts` and `tracker-jira.ts`; the entity's doc names it as a read beside `status` <!-- builds: Issue.assignee -->

### The Delivery tab

- `feature/the-delivery-tab-filters-by-sprint-and-owner` — `waitingTickets`; `activeSprintScope` and the *Active sprint* toggle; *Only my work* over tickets, branches, PRs, plans and builds <!-- builds: waitingTickets, activeSprintScope and Only my work over every row kind -->

## Notes

- 2026-10-12: drafted by an unattended `/plot-idea` batch run from jwloka's decisions of the same day. Type, Review and Impl came from the prompt.
- 2026-10-12: the first slice waits on `feature/the-board-draws-the-declared-phases` of `the-phases-are-declared`, because the Planning tab's columns come from the declared map.
- 2026-10-12, deliverable search (`plot-deliverable-search.sh`): `boardTab` returned no artifact. `parseTab` returned `App.tsx`, which the first slice replaces with a call to `boardTabOf`. `showReleased` returned no artifact. `assignee` returned the plan's `Assignee:` field (`ports/plan-store.ts:37`, `rules/ownership.ts:37`) and the refusal in `issue.ts:21`; nothing reads a tracker assignee. `activeSprint` returned no artifact. `mineOnly` returned `mine-filter.ts` and `App.tsx`, which the third wave extends.
