# Panel round 1 — the-board-has-three-tabs

Reconciliation: unanimous amend (estate, contradiction, deliverable, cost). Each juror read the plan against main at 2026-10-13, after #1617, #1623, #1628, #1633, #1635 and #1638 merged. All four read code; none ran tests.

## What all four found

- **No `## Acceptance`.** The three sibling plans have one; this plan names no test for any Changelog claim (deliverable A1–A2, cost A3, contradiction A8). Required.
- **Only my work has no owner fact for branches without a PR and for builds.** `mine-filter.ts:73-88` says no fact on such a row gives its owner, and `rules/ownership.ts` has no `ticket`, `branch` or `build` kind (estate A2–A3, cost A1, deliverable A4, contradiction A5). Either name a zero-cost source or narrow the Changelog and D9's wording to rows that carry an owner. PRs and plans are already filtered today; the Changelog should name only what is new.
- **The assignee does not reach the board by the path the slice names.** The board reads tickets in `refreshIssues` (`fleet.ts:1473-1561`) into `IssueRowSchema`, not through `issueOf` (estate A1, contradiction A3, A7). Extend that projection in the slice, or wait on the lanes slices that move the board onto the tracker port; say which.
- **Two rules duplicate what exists.** *Active sprint* equals the existing multiselect with every Active sprint selected (`fleet.sprints` holds only Active sprints, `fleet.ts:6741`) (estate A4, cost A2, deliverable A6). `planningColumns(map, …)` needs a map the client never receives; a flag on `PhaseColumn` plus a client filter is smaller (estate A5, deliverable A8).
- **The failed-verification row has no owner.** The plan says `the-fleet-verifies-what-it-delivered` renders it; on 2026-10-13 that row moved to #1640 (contradiction A1, deliverable A5). Take it into a slice here or say #1640 owns it.

## Where they differ in weight, not in position

- Contradiction alone rates the empty default view as high: on this repository 0 of 126 open issues have an assignee, so a matched reader's *Waiting on you* is empty with no notice, against D22's "nothing is hidden silently" (contradiction A2). The others did not measure it. The moderation adopts it: the default view must say how many tickets it hides.
- Contradiction alone asks that a GitHub assignee login match without `People`, as `prOwnership` does for PRs (A4). Estate and deliverable only ask which of several assignees is kept (A6/A7). Both questions need one answer about multi-assignee tickets.
- Deliverable alone asks to split the Delivery slice into `waitingTickets` and `activeSprintScope` (A3), keeping the branch name the lanes plan waits on.

## Shared blind spot

All four judged the tabs, filters and toggles; none asked whether the tab rename needs a migration for saved links beyond `?tab=` (cost A3 counts 47 test files opening `tab: 'agents'`, but no juror checked external links or the plan's own docs list). Cost A4 asks for the docs grep and its count (24 files today).

## Amendments for round 2

1. Add `## Acceptance` with one unit test per rule and one browser test per seen state.
2. Name the owner source for branches and builds, or narrow *Only my work* to rows with an owner; add a `ticket` arm to `rules/ownership.ts` instead of a parallel resolver; state the rule for an unassigned ticket.
3. Route the assignee through `refreshIssues`/`IssueRowSchema`, or wait on the lanes slices; define multi-assignee tickets.
4. Make *Active sprint* a shortcut over the multiselect and `planningColumns` a filter over the payload's columns, or justify the second rule.
5. Say who renders the failed-verification row (#1640 or a slice here).
6. Show the count of hidden tickets in the default *Waiting on you* view.
7. State zero new host calls per scan, the payload growth, and the shell-line rule ("adds no net shell lines").
