# Panel: tickets and stories have lanes

- **Subject:** `docs/plans/2026-10-12-tickets-and-stories-have-lanes.md` (Draft)
- **Caller:** `/challenge-the-plan` Phase 3P, round 1
- **Commitment:** `Position: proceed | amend | reject`
- **Lenses:** estate, contradiction, deliverable, cost (four jurors, one rubric)
- **Siblings:** 5 read, 0 unread (story plot-works-in-five-phases)
- **Gate:** `plot-panel.mjs check` exit 0 for all four jurors, with no re-run
- **Reconcile:** `unanimous	amend	estate,contradiction,deliverable,cost`

## Positions

| Lens | Position | Must change | Open Points |
|---|---|---|---|
| estate | amend | 6 (F1–F4, F6, F8) | 5 |
| contradiction | amend | 6 (findings 1–6) | 6 |
| deliverable | amend | 7 | 3 |
| cost | amend | 7 (F1–F7) | 5 |

## What each juror looked at

All four read the subject, the story with D1–D12, and `DESIGN-phases.md` §5 in full. All four read the sibling `the-board-has-three-tabs` in full. The other four siblings were grepped or read by title only, because they do not touch the lanes. All four read code and did more than cite it. No juror ran a test, the board or the fleet.

- **estate** read the tracker port, its five adapters, `rules/issue-source.ts`, the PR-index entity, rule, port and file adapter, `transitions/story.ts`, `fleet.ts:1415-1705`, `StoriesTab.tsx`, `pr-refresh.ts` and `one-pr-index-writer.test.ts`, and the `plot-host.sh` `issue-list` arms. It checked the repo's `## Plot Config` for a `Tracker` key and found none.
- **contradiction** read the same port and adapters, `issue-source.ts`, `transitions/story.ts:380-405`, `board.ts:1670-1765`, `App.tsx:620-640`, `pr-refresh.ts:130-215`, `DESIGN-index.md:60-175` and `CLAUDE.md` "A Decision Reads The Index" and "The Layering Rule".
- **deliverable** read `issue.ts`, the port, the shell, GitHub, Jira and none adapters, both `plot-host.sh` arms, `schema.ts` issue rows, `StoriesTab.tsx`, and the plan template's wave and `waits:` semantics.
- **cost** read the tracker adapters, `fleet.ts` (`ISSUE_LIMIT`, `refreshIssues`, `maybeRefreshPrs`), `PR_REQUESTS_PER_REFRESH`, `App.tsx` poll intervals, `DESIGN-index.md` in full and `check-shell-lines.sh`. It was the only juror to measure the host: two GitHub searches on this repo returned 194 closed and 108 open issues.

## What the four agree on

The panel is unanimous, and the agreement rests on the same code read four times. Each claim below is cited by at least two jurors, and the moderator checked the first two in the code.

1. **The ticket rule cannot reach In progress on GitHub.** `plot-host.sh:4728-4736` gives every open GitHub issue `statusCategory "To Do"`, so the "no category, named by a plan" row never applies (estate F1, deliverable, cost F12). The plan does not mention that `Issue.statusCategory` exists (`issue.ts:58`).
2. **The plan routes closed issues through a port the board does not use for issues.** `refreshIssues` asks `plot-host.sh issue-list` through `hostSaid` (`fleet.ts:1490`), with `issueSource` choosing the git host when no `Tracker` key exists (`rules/issue-source.ts:46-50`). `trackerFor('')` resolves to `trackerNone` (`tracker-resolve.ts:35-44`). This repo declares no `Tracker`, so its Done lane stays empty (estate F2, contradiction 1, cost F1, deliverable). Bitbucket issues get no closed route (estate F3).
3. **The PR-index precedent is misquoted.** The PR index writer is fleetd's `packages/fleet/src/shared/pr-refresh.ts:1281`, not the board's `fleet.ts`, and the issue refresh runs in the board server. The plan names no process that folds issues (all four).
4. **The delta has no reading that can see a reopen.** The plan adds `issueListClosed(since)` and no "updated since" operation, `Issue` has no `updatedAt`, and the plan drops the periodic full read that `DESIGN-index.md:87,167` requires (contradiction 3, cost F4, deliverable).
5. **The `waits:` sits on the wrong slice.** Only the lanes slice needs the Discovery tab, so the annotation holds slices 1 and 2 back for no reason (deliverable, contradiction 11).

## Disagreements

The positions agree; the jurors disagree on what is fatal and what can wait.

- **`?released=1` shared with the Planning tab.** contradiction rates it must change: `App.tsx:633-638` keeps the parameter on a tab switch, so the Discovery toggle and the Planning tab's *Show released* become one toggle, against D7 and D8 as two separate toggles. estate (F9) and deliverable (F10) rate it an Open Point. The question is whether a shared URL parameter contradicts a binding decision or only needs a name. The moderator reads `App.tsx:633-638` as support for contradiction's reading: one parameter cannot hold two independent toggles.
- **What "archived" means.** estate (F8) and contradiction (4) rate it must change; deliverable and cost do not raise it. The moderator checked the code: `transitions/story.ts:216-218` writes the `archived:` date on every move to `done` and refuses a move without it (`:270`), so `storyLane` as written puts every controller-made `done` story in Archived and leaves the Done lane nearly empty. `derivedStanding` (`:402`) defines archived as "every plan released", and `board.ts:1746,1758` skips `docs/stories/archived/`, so D7's "every archived story" also cannot show. The two silent jurors did not look here; this is a gap in their reading, not a counter-argument.
- **The bound for story Open Point 8.** cost proposes a 14-day index for the default view and an on-demand read for the toggle, as `issueView` reads a body today; it rates the unbounded read and the 4 s `/api/fleet` payload (`App.tsx:32`) as must change (F2, F5–F7). estate, contradiction and deliverable leave the bound to the operator's Open Point 8. The disagreement is whether the plan may stay unbounded until the operator decides, or must name the cost of each answer first. D7 binds "every closed ticket" with the toggle on; cost's proposal keeps that and moves only where the read happens.
- **Jira scope.** estate (F4) and cost (F3) rate the missing project or assignee scope and page loop as must change, because the open query is scoped (`plot-host.sh:4652-4685`) and an unscoped `resolved >=` read leaks a shared instance. contradiction and deliverable record only the WONTFIX precedence and a `Done` ticket with no resolution date, as Open Points.

## The shared blind spot

**No juror tested the lanes against D12.** D12 says the board builds its columns and tab groupings from the declared phase map, and the sibling `the-phases-are-declared` moves the hard-coded mappings behind that declaration. `storyLane` hard-codes the story statuses (`draft`, `ready`, `paused` to Draft). All four jurors read that sibling by title or grep only, because "it does not touch the lanes". The panel therefore does not say whether `storyLane` must take the parsed map as a value, or whether story lanes inside Discovery are outside D12. The next round owes that question.

**A second, smaller one:** all four lenses read code paths and none read the tab as a user sees it. No juror asked how many tickets a lane shows before it scrolls, or what the tab shows while the index is absent and the tracker answers `unaskable`. The contradiction juror came closest (finding 6: an empty lane can read as "no issues").

## For the caller

Unanimous `amend`. The plan needs a new Design pass on four points before approval: the ticket source (issue source, not the `Tracker` port alone, and Bitbucket), the index writer and its delta (named process, `updatedAt`, periodic full read, request accounting), the meaning of archived, and the toggle's URL parameter. The panel decides nothing; acting on it is the caller's decision.
