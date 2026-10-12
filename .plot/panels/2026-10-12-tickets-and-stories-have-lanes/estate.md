# Estate juror: tickets-and-stories-have-lanes

Position: amend

## What I looked at

Plan and context read: the subject plan, the sibling `2026-10-12-the-board-has-three-tabs.md`, the story `STORY-plot-works-in-five-phases.md` (D1–D12, Open Points 7, 8) and `DESIGN-phases.md` §1 and §5. The other four siblings were listed and not read in full, because none of them touches the ticket or story lanes.

Code read (worktree at `a92db082b`, code equal to `origin/main`):

- `packages/domain/src/entities/issue.ts`, `packages/domain/src/ports/tracker.ts`
- `packages/domain/src/adapters/tracker/{tracker-github,tracker-shell,tracker-resolve,tracker-listers,tracker-none}.ts`
- `packages/domain/src/rules/issue-source.ts`
- `packages/domain/src/entities/pr-index.ts`, `rules/pr-index.ts`, `ports/pr-index.ts`, `adapters/pr-index/pr-index-file.ts` (exports and storage path only)
- `packages/domain/src/transitions/story.ts:36`, `:210-281`, `:380-425`; `entities/story.ts:36-45`
- `packages/board/src/server/fleet.ts:180-190`, `:1415-1575`, `:1619`, `:1670-1705`
- `packages/board/src/app/components/StoriesTab.tsx:1-235`; `packages/board/src/contract/schema.ts:3333-3363`
- `packages/fleet/src/shared/pr-refresh.ts` (grep for `foldPrIndex` and `issue`), `packages/fleet/test/unit/one-pr-index-writer.test.ts:1-40`
- `skills/plot/scripts/plot-host.sh:250-300`, `:2453-2525`, `:4617-4780`
- `docs/stories/the-master-agent-holds-the-fleet/DESIGN-index.md:100-160`
- `CLAUDE.md` `## Plot Config` (for a `Tracker` key)

Commands: `grep -rn` for `issueList(`, `trackerShell(`, `refreshIssues`, `issue-list`, `foldPrIndex`, `decodePrIndex`, `archived:`, `StoryStanding`, `issueIndex`, `released=`; `ls` on the tracker adapter directory and `scripts/check-shell-lines.sh`. No test, board or fleet command ran.

## Claim check (Motivation and Design)

- Held: `StoriesTab.tsx` groups Draft, Active, Done and Archived in the component, with Archived behind a toggle and the tag cloud from `server/topics.ts`.
- Held: `ports/tracker.ts:108` `issueList` lists open issues only; `plot-host.sh:4617` `issue-list` asks for open issues; `entities/issue.ts:33-59` carries no closing date.
- Held: `fleet.ts:1427` `referencedIssues` and `fleet.ts:1472` `refreshIssues` exist; `refreshIssues` keeps the result in memory; no issue index exists (no `issueIndex` or issue store in `packages/*/src` or the scripts).
- Held: `DESIGN-index.md` names the Jira delta `updated >= watermark` (the connector table at about `:118-124`).
- Did not hold: "the fleet is the one writer, as `fleet.ts` is for the PR index today". `foldPrIndex` has no caller in `packages/board/src/server/fleet.ts`; the writer is `packages/fleet/src/shared/pr-refresh.ts:1281`, gated by `packages/fleet/test/unit/one-pr-index-writer.test.ts`.
- Did not hold: "`tracker-github.ts` asks for closed issues with a `closed:>=` search, and `tracker-jira.ts` asks with `resolved >= <since>`". Both connectors hold no query; they delegate to `plot-host.sh` through `tracker-shell.ts:145-148`.
- Did not hold (in the spec the plan cites): `DESIGN-phases.md:214` says GitHub Issues have no status category. `plot-host.sh` gives every GitHub issue a category (see Finding 1).

## Findings

1. **GitHub issues always carry a category, so the `namedByPlan` rule never fires for them.** `plot-host.sh` derives `statusCategory` from the `--state` it asks for: every open GitHub issue gets `To Do` and a closed one gets `Done` (`plot-host.sh:4723-4734`, documented at `:258-275`). The plan's table puts the category rows first (`ticketLane`, plan *The ticket lane*), so a GitHub ticket that a plan names reads Open, never In progress. The only tickets with an empty category are Bitbucket `ON HOLD`, `INVALID`, `DUPLICATE` and `WONTFIX` (`plot-host.sh:4771-4775`). D7's In progress rule therefore applies to almost no ticket in the estate. The plan must state how a derived category is told apart from a stated one: the GitHub arm emits `''`, or the issue carries the source of its category, or `ticketLane` treats a derived `To Do` as no category. **Must change before approval.**

2. **The port path does not reach the git-host issue source, and Plot itself uses that source.** The board does not call `Tracker.issueList`; `refreshIssues` calls `hostSaid(['issue-list', …])` after `issueSource` decides between `tracker`, `git-host` and `nobody` (`fleet.ts:1477-1490`, `rules/issue-source.ts:46-66`). `trackerFor('')` resolves a repository with no `Tracker` key to `trackerNone` (`tracker-resolve.ts:36-45`), which answers `unaskable`. This repository declares no `Tracker` key (`CLAUDE.md` `## Plot Config`), so its issues come from the git host. If the index folds closed issues through `Tracker.issueListClosed`, Plot and every Bitbucket repository with git-host issues get no closed tickets, and the plan's "`trackerNone` answers `unaskable`" sentence states that outcome as intended. The plan must name the path: an `issue-list --state closed --since` arm on `plot-host.sh` read through the `issueSource` decision, as the inbox reads today, or a port that resolves the `git-host` source. **Must change before approval.**

3. **Bitbucket is absent from the plan.** `plot-host.sh` answers `issue-list` for Bitbucket by parsing `bb issue list --state new --state open` (`plot-host.sh:4744-4790`); that output has no `createdAt`, no URL and no closing date (`plot-host.sh:288-291`). The plan names only `tracker-github.ts` and `tracker-jira.ts`. It must say what the closed list answers on Bitbucket: an `unaskable` exit 4, or a `RESOLVED`/`CLOSED` read with no `closedAt`, which the 14-day rule cannot place. **Must change before approval** (one sentence suffices).

4. **The closed Jira query must carry the open query's scope.** The open JQL is `assignee = currentUser() AND resolution = EMPTY` plus the `Ticket prefixes` project clause, and `PLOT_JIRA_JQL` overrides all of it (`plot-host.sh:4652-4685`). The project clause exists because an unscoped query returned another customer's ticket on a shared instance (`plot-host.sh:2479-2490`). The plan's `resolved >= <since>` names no scope, no assignee and no rule for a set `PLOT_JIRA_JQL`. The plan must state that the closed query keeps the project scope, whether it keeps the assignee, and what an override does. **Must change before approval.**

5. **The ticket population is undecided.** Today the list is an inbox: `ISSUE_LIMIT = 50` (`fleet.ts:181-190`, "an inbox is only ever the top of the list"), Jira by default lists the reader's own tickets, and the board drops every ticket a plan names (`fleet.ts:1565-1575`). The Discovery lanes need the planned tickets too, so the Open and In progress lanes read a different set from *Waiting on you*. The plan must say whether the Discovery lanes and the inbox share one fetch, whether the 50-item cap applies to the open set, and that the Jira default makes the lanes show one person's tickets. **Can be an Open Point** if the plan names it; it is a scope fact, not a design defect.

6. **The writer is not named, and the fleet does not read issues today.** Issues are read only by the board server, on both the fleet-owned and the board-owned path (`fleet.ts:1686-1703`). `packages/fleet/src/shared/pr-refresh.ts` counts the issue call in its budget comments (`:139-213`) and makes none. "The fleet writes the issues it reads" therefore adds an issue read to `fleetd`, and the board must then read the store on the `fleetOwnsPrs` path as `readPrsFromStore` does (`fleet.ts:1686-1688`). The plan must name `packages/fleet/src/shared/pr-refresh.ts` (or another `fleetd` module) as the writer, and a one-writer test in the shape of `one-pr-index-writer.test.ts`. **Must change before approval**; Finding 2 and this finding are one slice decision.

7. **The PR index machinery exists to reuse, and the plan names none of it.** `entities/pr-index.ts` has `decodePrIndex`, `encodePrIndex` and `PR_INDEX_VERSION`; `rules/pr-index.ts` has `watermarkOf` (watermark from the rows, never from the clock), `answerKind` (`whole`, `delta`, `partial`), `foldPrIndex`, `prWindowFor` and `PrFullReadFailure`; `adapters/pr-index/pr-index-file.ts` resolves the path under the common git dir's `.plot/state/` with `PLOT_PR_INDEX_HOME` as the override (`:15-17`, `:92`). The plan should say the issue index takes the same parts and a parallel `PLOT_*_HOME` override, so that `scripts/owned-run.sh` isolates it in tests as it does the PR index. **Can be an Open Point.**

8. **`storyLane` introduces a third definition of "archived".** The board's `archived` today is the derived standing `derivedStanding`, "every plan released" (`transitions/story.ts:396-405`, read at `board.ts:1695`), and `StoriesTab.tsx:30-38` maps that standing onto the four columns, which is already the plan's `storyLane` table. The plan instead keys Archived on the `archived:` date. The story transition writes that date on every move to `done` (`transitions/story.ts:216-218`, refusal `archive-date-missing` at `:270`), so under the plan's rule a controller-made `done` story is always Archived, and the Done lane holds only hand-edited stories or stories `derivedStanding` lifted to `done`. The plan must state which reading decides (the derived standing, the frontmatter date, or the `docs/stories/archived/` directory), and should make `storyLane` take a `StoryStanding` so that `COLUMN_OF` moves into the domain unchanged. **Must change before approval**, because the Done lane's contents depend on it.

9. **`?released=1` does not exist yet, and two tabs share it.** No `released` URL parameter exists in `App.tsx` today; the sibling slice `feature/the-planning-tab-shows-design-to-testing` creates it. This plan's third slice declares no `waits:` on that slice. One parameter for both tabs also means that a viewer who turns on *Show released* on Planning sees archived stories and every closed ticket on Discovery. The plan should add the `waits:` or own the parameter, and say whether the two tabs share it. **Can be an Open Point.**

10. **`Issue.open` duplicates a reading the estate already has, and the contract schema is unnamed.** `statusCategory` is `Done` for every closed GitHub and Bitbucket `RESOLVED`/`CLOSED` issue, and `closedAt !== null` answers the same question. `IssueRowSchema` (`contract/schema.ts:3333`) and the hand projection in `fleet.ts:1535-1560` carry the issue fields to the client and must gain `closedAt`; the plan names neither. **Can be an Open Point.**

11. **The closed arm is shell, and the shell-line ratchet charges it.** The query lives in `plot-host.sh` (Finding 2 and the claim check), and `scripts/check-shell-lines.sh` requires an equal removal of shipped shell lines in the same change. The plan should name the file and the cost, or route the closed list through a bundle. **Can be an Open Point.**

## Unresolved finding for Open Points

- F1 derived GitHub category hides In progress (must change)
- F2 port path skips the git-host source Plot uses (must change)
- F3 Bitbucket closed list unstated (must change)
- F4 Jira closed query scope and override (must change)
- F5 ticket population and the 50-item inbox cap (Open Point)
- F6 index writer is fleetd, unnamed, with no one-writer test (must change)
- F7 reuse of the PR index decoder, fold and home override (Open Point)
- F8 three definitions of archived (must change)
- F9 `?released=1` ordering and sharing across tabs (Open Point)
- F10 `Issue.open` redundancy and `IssueRowSchema` (Open Point)
- F11 shell-line ratchet cost in `plot-host.sh` (Open Point)
