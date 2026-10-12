# Panel round 2: tickets and stories have lanes

- **Subject:** `docs/plans/2026-10-12-tickets-and-stories-have-lanes.md` (Draft, revised after round 1, decisions D13–D22 added)
- **Caller:** `/challenge-the-plan` Phase 3P, round 2
- **Commitment:** `Position: proceed | amend | reject`
- **Lenses:** estate, contradiction, deliverable, cost (four jurors, one rubric)
- **Rubric:** (1) did the revision resolve each round-1 point the plan marks resolved, checked in the code; (2) what new defect did the revision introduce; (3) is the plan ready to approve from this lens
- **Siblings:** 5 read, 0 unread (story plot-works-in-five-phases)
- **Gate:** `plot-panel.mjs check` exit 0 for all four jurors, with no re-run
- **Reconcile:** `unanimous	amend	estate,contradiction,deliverable,cost`

## Positions

| Lens | Position | Must change | Open points | Verdict file |
|---|---|---|---|---|
| estate | amend | 3 | 5 | `round2-estate.md` |
| contradiction | amend | 3 | 5 | `round2-contradiction.md` |
| deliverable | amend | 1 | 6 | `round2-deliverable.md` |
| cost | amend | 3 | 3 | `round2-cost.md` |

No juror rated the plan `reject`. Each juror said that the must-change items are text edits of one or two sentences, except cost, which asks for one design choice (see *Disagreements*).

## What each juror looked at

All four read the subject, the round-1 panel, the story with D1–D22, `DESIGN-phases.md`, and the siblings `the-board-has-three-tabs` and `the-phases-are-declared` in full. This closes round 1's blind spot, in which the jurors read the siblings by title only. No juror ran a test, the board or the fleet.

- **estate** checked every file:line that the plan cites. All exist. Two moved by one or two lines (`derivedStanding` is at `transitions/story.ts:397`, not `:395`). It found `trackerReads` (`tracker-shell.ts:120-170`) as the existing base for `trackerGitHost`, the `Story directory` key (`board.ts:1846`), the Jira incident comment (`plot-host.sh:2480-2484`), and `PrWorld` (`pr-refresh.ts:106-119`). It measured the host: 154 issues closed in the last 14 days, out of 194 closed in total.
- **contradiction** checked the issue index against the four rules of `CLAUDE.md` *A Decision Reads The Index*: one writer, the index never says no, only terminal answers are read, and answers never verdicts. The index passes all four. It read the tracker port doc (`ports/tracker.ts:66-72`, `:103`, `:114`) and `CLAUDE.md`'s connector paragraph, and the sibling `the-fleet-verifies-what-it-delivered` for a second reader of the index.
- **deliverable** traced each Changelog line and each Acceptance line to a slice, and checked each `waits:` against the sibling slice headings for a cycle. It found none. It read `the-board-has-three-tabs:71` for the `Issue.assignee` route.
- **cost** read `pr-refresh.ts`, `PR_REQUESTS_PER_REFRESH`, `cadence.ts`, `fleet-clock.ts` and the `plot-host.sh` budget recorders. It measured the host (154 closed in 14 days, 1145 GraphQL requests on this account in the last hour) and computed, without measuring, the PR-refresh delay from the `cadence.ts` arithmetic. It was the only juror to follow the cost into the pacing of PR refreshes.

## What the four agree on

1. **D20 with D22 widens *Waiting on you*, and three lines of the plan say it does not.** After `feature/the-lanes-read-the-whole-jira-project` drops `assignee = currentUser()`, a reader with no `jira:` spelling in `People` sees every ticket of the project (D22). No `People` entry has a `jira:` spelling today, so every Jira adopter sees this at upgrade. Changelog `:20`, Acceptance `:130` and Open Point `:106` promise a narrow inbox (estate, contradiction, deliverable must change; cost as an unbounded payload).
2. **`PR_REQUESTS_PER_REFRESH.github: 2` disagrees with the plan's own count.** The plan counts 2 open pages and 1 closed page (`:63`). Estate and cost measured 154 issues closed in 14 days, which is 2 closed pages. All four flag the figure. They disagree on what the right number is (see below).
3. **The derived `archived` standing has no place in the map.** `StoryStanding` is `StoryStatus | 'archived'` (`transitions/story.ts:36`), and the phase grammar declares only `story:<status>`. So `storyLane(map, standing, …)` cannot place a story whose plans are all released (estate, contradiction, deliverable). The jurors read the consequence differently: deliverable reads that `storyLane` hides it, contradiction reads that the table puts it in Done against D7. The plan says both: the table at `:93` says Done, and the rule at `:86` says `hidden` for a status the map does not declare.

## Disagreements

- **The GitHub request count.** cost rates it must change and names a mechanism: per-page budget records reach the cadence (`spend-rate`, `othersPerHour`), and its arithmetic moves a quiet account's PR refresh interval from about 120 s to about 300 s. The other three rate it an open point about a wrong number. The jurors also disagree on whether the open read "was already counted". cost reads `pr-refresh.ts:182-185` as covering `pr-list` only. The moderator read the same comment (`pr-refresh.ts:182-184`): it says the GitHub `issue-list` and `runs` calls ride the same budget and the board treats the refresh as one unit. So the plan's "already counted" has support in the code, and cost's figure of 1 → 2 being wrong rests on the new per-page records, not on the old count. The open question is whether a declared cost per refresh still means anything once each page writes its own record.
- **The Jira open read over the whole instance.** estate and contradiction rate it must change: with no `Ticket prefixes`, the scope is empty (`plot-host.sh:4674-4684`, confirmed by the moderator), so dropping the assignee clause reads every project of a shared instance. The plan requires prefixes for the closed read (`:54`) and not for the open read. cost reads the same slice as unpaced spend with no figure (up to about 330 Jira requests an hour per machine, computed). deliverable does not raise it. The silence is a gap in reading, not a counter-argument.
- **`trackerGitHost` against the port doc.** contradiction rates it must change: `ports/tracker.ts:68` says *"A TRACKER IS NOT A GIT HOST"*, `:103` and `:114` say a repository with no tracker answers `unaskable`, and `CLAUDE.md` says it gets `trackerNone`. estate reads the same connector as an existing shape (`trackerReads`) and raises no contradiction. Both are right about different things: the code can build it, and the docs say it must not exist. The plan names neither doc edit.
- **The hard-coded `docs/stories/archived/`.** Only estate raises it, as must change: the board reads `Story directory` (`board.ts:1846`, confirmed by the moderator), so the path breaks Project-Agnostic Design.
- **Acceptance `:134` against the toggle.** Only cost raises it, as must change: `GET /api/issues/closed` makes an `issue-list` call under a fleet, and Acceptance `:134` says the board makes none.
- **Who reaches the tracker.** estate (`PrWorld` has no tracker input) and deliverable (slice 2 does not say that the fold and the no-fleet read call `trackerForIssues` in place of `hostSaid`, `fleet.ts:1490`) raise the same gap as an open point. contradiction and cost do not.

## The shared blind spot

**No juror questioned whether D19's 14-day window bounds anything on this repository.** Two jurors measured 154 of 194 closed issues, 79 %, inside the window. The bound that round 1 asked for exists in the plan, and on this repository it leaves about 150 tickets in the default Done lane. Every juror treated D19 as binding and checked the plan against it. That is correct, but no juror reported that the default view and the toggle view differ by 40 tickets here. Round 1's second blind spot persists: no juror read the tab as a user sees it, and no juror asked how many rows a lane draws before it scrolls.

**A second one:** all four jurors read the Jira arms in the code, and none had a Jira instance to measure. The D20 request figures are computed, not measured.

## Round-1 points the plan marks resolved that are not

| Round-1 point | Round-2 reading | Lenses |
|---|---|---|
| The ticket source | Partly: the fleet fold and the no-fleet read do not name `trackerForIssues` in place of `hostSaid`; the port doc and `CLAUDE.md` still forbid a git-host tracker | deliverable, contradiction, estate |
| The meaning of archived | Partly: the derived `archived` standing has no lane under a declared map | estate, contradiction, deliverable |
| The phase map | Partly: same cause as the row above | estate, deliverable |
| The cost of the closed read | Partly: 2 closed pages on this repo, not 1; the GitHub figure does not match the count | estate, cost, contradiction, deliverable |
| Jira scope (round-1 estate F4, cost F3) | Reopened by D20 for the open read | estate, cost, contradiction |
| Entity text (contradiction 6) | Partly: the port doc and `CLAUDE.md` edits are not named | contradiction |
| The shell-line ratchet (cost F11) | Partly: an obligation with no named lines | cost |

The other round-1 points (In progress on GitHub, the index writer, `?archived=1`, the open-list cap, the `waits:` slice, and most of the smaller points) are resolved, by all four jurors' reading.

## For the caller

Unanimous `amend`, and narrower than round 1. Before approval, the plan needs text edits on the D20/D22 inbox promise, the Jira open-read scope, the port doc and `CLAUDE.md` for `trackerGitHost`, the `Story directory` path, the derived `archived` standing, and Acceptance `:134`. It also needs one decision on how an issue read is priced against the PR cadence. The panel decides nothing; acting on it is the caller's decision.
