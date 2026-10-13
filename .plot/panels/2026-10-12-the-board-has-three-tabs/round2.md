# Panel round 2 — the-board-has-three-tabs

Reconciliation: unanimous amend (estate, contradiction, deliverable, cost), read at main 553c4777b–df0fd4349. Every juror confirms that its round-1 amendments were applied or declined with a reason. The remaining findings are new defects in the revised text, plus two decisions the revision made that D9 does not cover.

## What three or four jurors found

- **The 50-row cap breaks the hidden count and D22.** `refreshIssues` reads `--limit 50` (`fleet.ts:1492`, `ISSUE_LIMIT` `:192`) and then drops planned tickets, so the client-side count can never say "127 hidden" on this repository; the other 77 or more are hidden with no word. After the lanes plan's project-wide Jira read, a matched reader can lose their own tickets past the cap (estate, contradiction, deliverable, cost). Fix: apply `ticketOwnership` on the server before the cap, where the reader is known, and send the hidden total; add an Acceptance case.
- **The client lacks the inputs of `waitingTickets`.** `/api/fleet` carries neither the issue source nor the Jira `inbox` rows (`FleetShape`, `schema.ts:3994-4428`; `issueSource` is computed at `fleet.ts:1480` and not stored), and GitHub and Bitbucket both send `assignees: []`, so the client cannot tell the notice from the hidden count (estate, contradiction, deliverable). The lanes plan also has the server choose the same Jira inbox rows (lanes `:110`, `:277`): one decision, two owners. This and the cap point the same way: decide on the server.

## Raised by fewer jurors

- **The payload does change.** `releasedOnly` must enter `ColumnSchema` (`schema.ts:772-783`), and `planningColumns` over `PhaseColumn.name` cannot take the payload's `Column.phase` (estate, contradiction).
- **Wave order.** The *Active sprint* button (wave 5) and the verification row (wave 6) wait behind the assignee slice (wave 3), which waits on the lanes spike; neither needs the assignee (deliverable). Move them before wave 3.
- **The verification row** can follow the existing plan-level `DraftPlanRowView`/`draftRows` path instead of a new `AgentRow` kind (estate).
- **A Jira reader whose `People` spelling is an email**, on an instance that returns only `accountId`, sees an empty inbox; the plan names no way to find the right spelling (cost, contradiction).
- Stale text elsewhere: `the-fleet-verifies-what-it-delivered.md:24`, `:28` and `DESIGN-phases.md:256`, `:324` still place the verification row with the verify plan (contradiction).

## Decisions for the person (not the panel's to settle)

1. **D9, *Only my work*.** The revision narrows it to rows that carry an owner (PRs, plans, tickets) and leaves branches without a PR and builds shown, because no owner source costs zero host calls. D9 and `DESIGN-phases.md` §5 say the toggle filters branches and builds too.
2. **D9, *Active sprint*.** The revision makes it a button that selects every option of the existing multiselect, not a toggle. D9 says toggle.
3. **The unmatched reader.** The revision matches an undeclared GitHub login as the reader (as `prOwnership` does for PRs); §5 *An unmatched reader* defines that reader as unmatched (every ticket plus a notice).

## Amendments for round 3

1. Filter tickets by owner on the server before the cap; send the hidden total and the source; add Acceptance cases for a capped repository and a capped Jira project.
2. Name the payload change for `releasedOnly` and make `planningColumns` take the payload's columns.
3. Move the *Active sprint* and verification-row slices ahead of the assignee slice; build the row on `draftRows`.
4. Say how a Jira reader finds their `accountId` spelling, or match by email where the instance returns it.
5. Record the person's answers to the three decisions above, and list the cross-file edits (DESIGN-phases §5, D9 wording, the verify plan's lines) the plan's slices make.
