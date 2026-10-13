# Panel round 3 — the-board-has-three-tabs

Reconciliation: unanimous amend (estate, contradiction, deliverable, cost), read at main 1ad9a9f4f, with the open spike PR #1647 read by the estate juror. Every juror confirms that the round-2 amendments and D31–D33 are applied; D34 does not concern this plan. Nearly every line reference holds. The findings are narrower than in round 2 and none questions the design; they are about where the filter's inputs come from and what the count can honestly say.

## What two or more jurors found

- **The 50-row cap still shapes *Waiting on you*.** The server reads up to 1000 tickets but cuts the view to 50; *show every ticket* renders the 50 newest under a notice that says it shows every ticket, so on this repository 77 tickets stay hidden with no word (deliverable, cost). After the lanes plan's project-wide Jira read, a matched reader's own tickets older than the 1000 newest drop out, though the `inbox` page the same pass reads holds them (cost). Fix: the reader's view is the union of the `inbox` rows and the open rows the reader owns; *show every ticket* says how many it shows of how many; the count sentence takes its number from `hidden`, with a unit test of the text.
- **The fleet path is not named.** After the lanes spike the board has two issue reads: the fleet's `issues.json` and the no-fleet `refreshIssues` (deliverable). The assignee slice does not name the spike's fold projection `rowOf` (`packages/fleet/src/shared/issue-refresh.ts:46` on #1647), so under a fleet `assignees` never reaches the index (estate). Name both paths in the slices and give each an Acceptance case.
- **The shared plan-level row.** `the-fleet-writes-the-design` expects this plan's plan-level row in both *Working* and *Waiting on you*, with a halted state on each row; this plan builds it on the `draftRows` path for *Waiting on you* only, with `{plan, reason, log, restart, stopped}` and one halted line (contradiction; the sibling's jurors found the same). Moderation: this plan owns the plan-level row and builds it for both sections, with a shape both plans use (`kind`, `plan`, `reason`, `log`, `restart`, `stopped`, `halted`).

## Raised by one juror

- The spike's `IssueIndexRowSchema` is `.strict()`: absent `assignees` needs `.optional()` plus a mapping in each reader, and a board built before the slice refuses rows carrying the new key, so the upgrade note must say board and fleetd restart together (estate).
- `ticketSourceOf` inherits `entry.backend ?? 'github'`; before the backend resolves, a Bitbucket repository hides and counts every ticket. Take the resolved backend and treat an unknown one as unmatched (estate).
- The declared-but-unmatched Jira notice is tested only with `inbox` rows present; the case without them, which is what ships first, has no test (deliverable).
- The Changelog already commits to the default of the unresolved Open Point on an unmatched `jira:` spelling; the Approved lanes plan says the opposite at `:23`, `:119`, `:242`, and the cross-file list names only one (contradiction). The empty-Stories redirect at `App.tsx:989-991` is said to belong to the lanes plan, which never mentions it (contradiction).
- Swapped `trackerReads`/`issueOf` line references; the Cost section omits the six serial fleet agents and the lanes payload growth (cost). Round-2 deliverable finding 10 (lanes `:260` still names a singular `assignee`) was neither applied nor declined.

## Decision for the person

- **The unmatched `jira:` spelling.** The plan's default — show the `inbox` rows plus a notice naming the value Jira returns — contradicts the Approved lanes plan's text. Confirm the plan's default as a D-number (recommended), and the revision then lists the lanes lines it edits.

## Amendments for round 4 (or approval)

1. Reader's view = `inbox` rows ∪ open rows the reader owns; *show every ticket* states "N of M"; the count sentence reads `hidden`; tests for each.
2. Name both issue read paths and the fold's `rowOf`; Acceptance for the fleet write and the no-fleet read.
3. Build the plan-level row for *Working* and *Waiting on you* with the shared shape, and say `the-fleet-writes-the-design` reuses it.
4. `.optional()` `assignees` with reader mapping and the restart note; resolved backend only.
5. Test the Jira notice without `inbox` rows.
6. Record the decision above and list every lanes line it edits (`:23`, `:119`, `:242`, `:260`, `App.tsx:989-991` owner).
7. Fix the references and the Cost section.
