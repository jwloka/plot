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
- The Delivery tab's *Waiting on you* shows only tickets assigned to you by default, where `People` matches your account. On GitHub and Bitbucket an unmatched reader sees every ticket and a sentence that names the missing match; on Jira an unmatched reader sees the tickets Jira assigns to them, as today. An *Active sprint* toggle shows only the active sprint's plans and their PRs, branches, builds and agents. *Only my work* also filters tickets, branches, PRs and builds.

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

**The Planning tab.** `planningColumns(map, showReleased)` builds on `planPhases(map)` from `the-phases-are-declared`, which answers the declared phases that hold at least one plan state, in declared order. It drops the phase that holds `plan:released` unless `showReleased` is on. With the default map it answers Design, Development and Testing, and Released with the checkbox on. The sprint filter, the story filter, *Story lanes* and *Only my work* stay. *Show released* is off by default and is kept per viewer in the URL (`?released=1`). `?released=1` belongs to the Planning tab alone: the Discovery tab's toggle uses `?archived=1` (`tickets-and-stories-have-lanes`), because `App.tsx:633-638` keeps every parameter on a tab switch and one shared parameter would make two toggles one.

**The assignee.** `Issue` gains `assignee: string`, the tracker's own login or account, `''` where the tracker states none. It is a read, under the same reasoning that admitted `status` and `statusCategory` (`issue.ts:25-31`): Plot reads it and never writes it. The status write's refusal to widen (`ports/tracker.ts:31-41`) is about writes and does not change. The value comes from the `plot-host.sh issue-list` arms: the GitHub arm adds `assignees` to its `--json` list (`:4732`) and its `jq` projection, and the Jira arm adds `assignee` to `fields=` (`:4696`). `issueOf` in `trackerReads` (`tracker-shell.ts:46`, `:120`) parses the field, and `trackerReads` serves `trackerGithub`, `trackerJira` and the `trackerGitHost` of `tickets-and-stories-have-lanes` alike, so a matched reader on a repository with no `Tracker` key also sees their tickets. Bitbucket's `bb issue list` prints no assignee, so a Bitbucket source answers `''` for every ticket. If this slice lands after the issue index of `tickets-and-stories-have-lanes` (`feature/the-fleet-indexes-issues`), it adds `assignee` to `IssueIndexSchema` and raises `ISSUE_INDEX_VERSION`; whichever of the two lands second makes that change.

**Waiting on you.** The section keeps today's content, tickets, broken agents and Draft plans with no branch, and lists the failed-verification row `verificationRow`, which `the-fleet-verifies-what-it-delivered` builds and renders in this section (`feature/the-fleet-verifies-a-delivered-plan`). That row shows the run's log and reason and the restart command `/plot-deliver --verify <slug>`, and the same row names a fleet that the 3-failure guard stopped. `waitingTickets` keeps the tickets whose assignee is the reader. A ticket with no assignee is not the reader's. By default *Waiting on you* shows these, and a control in the section shows every unplanned ticket. A reader that `People` does not match is answered under *An unmatched reader* below.

**The assignee filter comes before a project-wide Jira read (D20).** Today the Jira rows are the user's only because the Jira query reads `assignee = currentUser()` (`plot-host.sh:4684`). D20 makes the Discovery lanes project-wide, and the inbox reads the same rows as the lanes. So D9's default becomes this filter on `Issue.assignee`, and `tickets-and-stories-have-lanes` drops the clause only in `feature/the-lanes-read-the-whole-jira-project`, which waits on this plan's `feature/the-delivery-tab-filters-by-sprint-and-owner`. That slice keeps today's query as a second Jira read and stores its rows in the issue index as `inbox` (D23). On a Jira source the filter applies only to a reader whose handle carries a `jira:` spelling in `People`; an unmatched reader sees the `inbox` rows, today's content.

**The assignee match (D21).** `People` keeps its form `handle = Spelling, Spelling; handle = Spelling` (`entities/person.ts:75` `parsePersonDirectory`), and a tracker account is one more spelling with a tracker prefix: `jwloka = Jan Wloka, jira:jan.wloka@quatico.com`. A spelling whose text before the first `:` names a tracker (`jira`) is that tracker's account. Today's parser already reads such a spelling as a spelling of the handle, so every existing `login = Name` entry keeps its meaning, and `plot-config.sh get People` and the config port's `config('People', '')` return the raw value unchanged; the domain parses it. The form is a comma spelling and not `Jan Wloka <jira:…>`, because today's parser would read `jan wloka <jira:…>` as one spelling and the display name `Jan Wloka` would stop resolving. `assigneeHandle(assignee, source, directory)` in `entities/person.ts` answers the handle a ticket's assignee resolves to: for `github-issues` and `bitbucket` it resolves the host login through `resolvePerson`, and for `jira` it looks up the spelling `jira:<assignee>`. The Jira connector reads the assignee's `emailAddress`, or its `accountId` where Jira hides the email, so a `jira:` spelling names that value. The reader is the host login (`readerFrom`, `mine-filter.ts:119`), resolved to a handle through the same directory. A ticket is the reader's when both resolve to one handle.

**An unmatched reader (D22, D23).** `waitingTickets(issues, inbox, reader, directory, source)` answers the tickets and a notice. `inbox` is the index's `inbox` rows, which a Jira source holds after `feature/the-lanes-read-the-whole-jira-project`; before that slice, and on every other source, it is absent and the open rows are the inbox. The answer depends on the source:

- **GitHub and Bitbucket.** When the reader's host login resolves to no declared handle, or the source states no assignee (Bitbucket answers `''` for every ticket), it answers every ticket, as today, and a notice that names the missing match, for example *jwloka is not declared in `People` — showing every ticket.* A Bitbucket source therefore never shows an empty inbox because its tickets carry no assignee.
- **Jira.** When no `jira:` spelling names the reader's handle, it answers the `inbox` rows, today's `assignee = currentUser()` read, with no notice (D23). D22's notice applies to GitHub and Bitbucket sources only, so no Jira inbox widens at upgrade.

The notice is a domain property with a unit test per reason; the section renders it. Nothing is hidden silently, and the inbox shows no less than today before the match exists.

**Active sprint.** `activeSprintScope(rows, sprints)` keeps the plans of every sprint in state `Active` (`entities/sprint.ts:9`) and the rows that belong to them: PRs, branches, builds and agents. With no Active sprint the tab shows nothing and says so. The toggle sits beside today's sprint multiselect.

**Only my work.** `boardForReader` and `rowsForReader` extend to tickets (by assignee), branches and PRs (by author), plans (by `Assignee:`) and builds (by the branch's owner). The stored preference that governs both tabs today stays one preference.

**Every view state is a domain property.** The tab, its columns, which tickets *Waiting on you* shows, and which rows the two toggles keep come from the rules above, with unit tests. The components render them.

### Open Points

- [x] How a tracker assignee matches the reader (story Open Point 7). — resolved by D21 and D22: a `jira:` spelling in `People`, the host login as the reader, and every ticket with a notice for an unmatched reader. `feature/people-names-a-tracker-account` builds the match.
- [ ] *Active sprint* with more than one Active sprint shows their union (story Open Point 12).

## Slices

### The tabs are renamed

- `feature/the-tabs-are-discovery-planning-delivery` <!-- waits: feature/the-board-draws-the-declared-phases --> — `boardTabOf` and its redirects; the tab labels and URLs; the Discovery tab renders today's stories view; the docs that name the old tabs <!-- builds: boardTabOf and the three renamed tabs -->

### Planning and the assignee

- `feature/the-planning-tab-shows-design-to-testing` — `planningColumns`; the *Show released* checkbox, off by default, kept in `?released=1` <!-- builds: planningColumns and the Show released checkbox -->
- `feature/an-issue-names-its-assignee` — `Issue.assignee` read in the `plot-host.sh issue-list` arms (GitHub `--json assignees`, Jira `fields=assignee` with `emailAddress`, else `accountId`) and parsed by `issueOf` in `trackerReads` for every lister; Bitbucket answers `''`; the entity's doc names it as a read beside `status`; the PR states the net count of `check-shell-lines.sh pr` <!-- builds: Issue.assignee -->
- `feature/people-names-a-tracker-account` — the `People` grammar with `<tracker>:<account>` spellings stated in the doc of `parsePersonDirectory` (`entities/person.ts:62-75`); `assigneeHandle`; unit tests that a `login = Name` entry resolves as today, a `jira:` spelling resolves to its handle, and a `jira:` spelling two handles claim resolves to nobody; the `plot-config.sh` row in `skills/plot/scripts/README.md` names the grammar; no shell change, because `plot-config.sh` returns the raw value <!-- builds: assigneeHandle and the People tracker-account spelling -->

### The Delivery tab

- `feature/the-delivery-tab-filters-by-sprint-and-owner` — `waitingTickets` with the D20 assignee filter through `assigneeHandle`, the `inbox` input for a Jira source (D23), and the D22 unmatched-reader notice for GitHub and Bitbucket, a source with no assignee included, as a domain property rendered in *Waiting on you*; `activeSprintScope` and the *Active sprint* toggle; *Only my work* over tickets, branches, PRs, plans and builds <!-- builds: waitingTickets, activeSprintScope and Only my work over every row kind -->

## Notes

- 2026-10-12: drafted by an unattended `/plot-idea` batch run from jwloka's decisions of the same day. Type, Review and Impl came from the prompt.
- 2026-10-12: the first slice waits on `feature/the-board-draws-the-declared-phases` of `the-phases-are-declared`, because the Planning tab's columns come from the declared map.
- 2026-10-12, deliverable search (`plot-deliverable-search.sh`): `boardTab` returned no artifact. `parseTab` returned `App.tsx`, which the first slice replaces with a call to `boardTabOf`. `showReleased` returned no artifact. `assignee` returned the plan's `Assignee:` field (`ports/plan-store.ts:37`, `rules/ownership.ts:37`) and the refusal in `issue.ts:21`; nothing reads a tracker assignee. `activeSprint` returned no artifact. `mineOnly` returned `mine-filter.ts` and `App.tsx`, which the third wave extends.
- 2026-10-12, decision D20: the Delivery slice's assignee filter is the precondition of the project-wide Jira read in `tickets-and-stories-have-lanes`, whose last slice waits on it. The cross-plan changes named in `tickets-and-stories-have-lanes`' revision note (`?released=1`, `Issue.assignee` in `IssueIndexSchema`) are applied here.
- 2026-10-12, decisions D21 and D22: the assignee match is decided. `feature/people-names-a-tracker-account` builds it in the second wave, so the Delivery slice in the third wave depends on it by wave order and waits on no open point.
- 2026-10-12, cross-plan alignment after round 2: the three changes that `tickets-and-stories-have-lanes` listed after decisions D23 and D24 are applied: D23 in *The assignee filter* and *An unmatched reader*, with `waitingTickets` taking the `inbox` rows; `Issue.assignee` read in the `plot-host.sh issue-list` arms that `trackerReads` parses; a Bitbucket source read as unmatched. The failed-verification row names its restart command and the 3-failure guard, as `the-fleet-verifies-what-it-delivered` asks. `planningColumns(map, showReleased)` already built on `planPhases(map)`.
