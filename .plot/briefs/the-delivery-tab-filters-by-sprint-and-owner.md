## Implementation brief — the-board-has-three-tabs (wave: Waiting on you)

- **Plan (canonical):** [docs/plans/2026-10-12-the-board-has-three-tabs.md](../../docs/plans/2026-10-12-the-board-has-three-tabs.md) on `main`
- **Approved:** 2026-10-13, jwloka, plan-PR #1608 merged
- **Branch:** `feature/the-delivery-tab-filters-by-sprint-and-owner` (base: `main`)
- **Ends as:** one PR to `main`
- **Review of the code:** PR review (plan `Review: pr`)

This is the plan's last unbuilt slice. All five siblings are merged: the tab rename (#1651), the Active sprint button (#1661), the plan-level row (#1664), the ticket-ownership arm (#1666), and the assignee read on both issue paths (#1674). This branch's own `waits: feature/the-index-holds-closed-issues` is satisfied — that branch merged as PR #1657 on 2026-10-13. Nothing blocks starting this now.

### What to build

Wire the tracker's `assignees` field — which PR #1674 already put on `Issue`, the fleet's index fold, and both `plot-host.sh issue-list` arms — through to *Waiting on you* and *Only my work*, so the Delivery tab's ticket list is filtered by sprint (already shipped) and owner (this slice). Concretely: a new domain rule `waitingTickets` that decides which unplanned tickets a reader sees and how many it hides; a new `FleetShape.waiting` payload field the server computes; and a new `ticketsForReader` client filter that applies *Only my work* to tickets the way it already applies to PRs, plans and registry agents.

### The decisions the plan settles — do not re-derive them

**Three things PR #1674 was supposed to touch, per the Acceptance section, and did not.** Checked directly against the live tree and against `gh pr view 1674 --json files`: that PR touched `packages/domain/src/entities/issue.ts`, `issue-index.ts`, `tracker-shell.ts`, `packages/fleet/src/shared/issue-refresh.ts`, and `plot-host.sh` — the domain entity, the index fold, and the host CLI reads. It never touched `packages/board/src/contract/schema.ts` or `packages/board/src/server/fleet.ts`. So today: `Issue.assignees: string[]` exists on the domain entity and `IssueIndexRowSchema.assignees` is `.optional()` on the index row — but **`IssueRowSchema` (the board's wire contract) carries no `assignees` field at all**, and neither `refreshIssues` nor `readIssuesFromStore` in `fleet.ts` reads or projects it. This is not a gap in the plan; it is this slice's own job, named in its own Acceptance bullet ("The assignee read" lists `IssueRowSchema` gaining the field as part of *this* slice's test set, not #1674's). Don't assume the wiring is half-done elsewhere — add `assignees: z.array(z.string()).default([])` to `IssueRowSchema` yourself.

**The seam in both issue-read paths is `inboxOf`, and it is narrower than the plan's prose makes it sound.** `fleet.ts:1633` — `inboxOf(rows, referenced, now)` filters out planned issues and does `.slice(0, ISSUE_LIMIT)` in one pass, called once from `refreshIssues` (`:1786`, `entry.issues = inboxOf(rows, referenced, Date.now())`) and once from `readIssuesFromStore` (`:1883`, same call). `waitingTickets` must run on the **unplanned, unsliced** row set, before `inboxOf`'s own `.slice(0, ISSUE_LIMIT)` — because `shown`/`hidden`/`complete` are counts over every unplanned row the pass holds, not over the 50 the client gets. The cleanest seam is to compute `waitingTickets` on the same filtered-unplanned array `inboxOf` builds internally (its `.filter((row) => !referenced.has(...))` line) and set `entry.waiting` beside `entry.issues` in both functions, rather than trying to derive `waiting` from `entry.issues` after the fact — by then the cap has already been applied and `hidden` can no longer be computed.

**`identity` and `people` in `server-info.ts` are module-private today — exporting them is this slice's own change, not already done.** The plan says `waitingTickets` takes the reader from "the exported `identity` and `people` of `server-info.ts`," but as of this plan's latest Motivation measurement those were `const identity = async (...)` and `const people = async (...)` with no `export`, called only inside `serverInfo()`. Confirmed still true on `main` at the time of this brief. Add the `export` keyword to both; don't build a second reader path.

**`ticketOwnership`, `ticketSourceOf`, and the `ticket` arm of `OwnedRow` already exist — call them, don't rebuild them.** PR #1666 landed all three in `packages/domain/src/rules/ownership.ts`. `ticketOwnership(assignees, source, reader)` and `ticketSourceOf(source, backend, reading)` are live and tested. This slice's job is `waiting-tickets.ts`, which is a *new* file (`packages/domain/src/rules/waiting-tickets.ts` does not exist yet — confirmed by `ls`) that calls into the already-shipped ownership rule, and `ticketsForReader` in the board's `mine-filter.ts`, which is a thin wrapper around `isMine` the way `rowsForReader` already is.

**`AgentList.tsx:677` names its own missing piece in its own comment — this is the line to change.** `const filteredIssues = fleet.issues;` sits under a comment block that says *"UNTOUCHED BY THE OWNERSHIP FILTER, and that is the rule rather than an omission ... Filtering them would need a second rule this branch does not own."* That comment was true when every other slice landed and false the moment this one does. Replace `fleet.issues` here with `ticketsForReader(fleet.waiting?.tickets ?? fleet.issues, reader, source, mineOnly)` (exact source lookup: `ticketSourceOf` needs the resolved git-host backend or tracker scheme, available from the same payload fields `prOwnership` already reads at this call site) and update or remove the stale comment — don't leave it standing next to code it now contradicts.

**`FleetShape.waiting` is new — there is no existing field to extend or rename around.** `schema.ts:4752` has an unrelated `waiting: z.array(AttentionItemSchema).default([])` field, but that belongs to `AttentionSchema` (the `/api/attention` worker-door-held state), a completely different schema from `FleetShape`. Don't confuse the two or worry about a name collision — `FleetShape.waiting: { tickets, shown, hidden, complete, notice, source }` is a sibling field on a different top-level object and Zod won't conflict.

**The default view is not `isMine`-only — `waitingTickets` is a prior, stricter filter, and the two compose rather than duplicate.** D9's stricter default ("only tickets assigned to the current user") belongs in `waitingTickets` as the *Waiting on you* section's own inbox logic (hides and counts an unassigned ticket). `ticketsForReader`/`isMine`'s *Only my work* toggle is the separate, looser rule that keeps an unassigned ticket visible even when toggled on. Implementing `isMine`-only and skipping `waitingTickets` would make the default view show every ticket, which the plan explicitly rejects.

**Jira's unmatched and declared-but-wrong cases (D23, D35) are notice-only — don't add a second host call to produce them.** Both read fields the pass already fetched (`inbox` rows, or the open rows where `inbox` is absent); the "declared but matching nothing" notice (D35) names the raw value Jira returned so a person can fix their `People` entry's `jira:` spelling, but it is pure string formatting over data already in hand, not a new tracker query.

### Done when

The plan's `## Acceptance` section's "Waiting on you, the default", "Waiting on you, the unmatched reader", "The assignee read" (the parts naming `IssueRowSchema`, not the parts #1674 already covers), "The upgrade", and "*Only my work* over tickets" bullets are the specification — six separate test files: `packages/domain/test/waiting-tickets.test.ts` (new), `ownership.test.ts`'s `ticket` arm additions, `packages/board/test/unit/unplanned-issues.test.ts`, `mine-filter.test.ts`, and the two browser files (`agents-tab.browser.test.ts`, `mine-filter.browser.test.ts`).

Two assertions worth calling out because a naive pass would skip them:

- The **127-rows-0-assigned** case in `waiting-tickets.test.ts` (using this very repository's own live numbers as of plan-writing) is the test that catches an implementation that filters on `isMine` alone instead of the stricter inbox default — 0 assigned tickets must answer 0 shown and 127 hidden, not 127 shown.
- `issue-index.test.ts`'s "a row schema without `assignees` ... refuses a row that carries the key" is the one that proves the upgrade note in the Changelog is true — a board that hasn't restarted must fail closed on the new field rather than silently drop it.

Plus the repo's standing gates: a changeset (package `plot`, see Versioning in CLAUDE.md), and `scripts/check-shell-lines.sh pr` — the plan states this slice adds no shell, so if any `.sh` edit creeps in here it must be paid for by removing an equal number of lines elsewhere in the same change. Run `node skills/plot/scripts/board/plot-local-checks.mjs` before each push and run what it prints; the `CI suites` config key's suites run in CI, not here.

### Bookkeeping

Open the PR with `../plot/scripts/plot-open-pr.sh` (never `gh pr create`) once the branch exists, and append `→ #<number>` to this branch's line under the plan's `### Waiting on you` heading. Push the first real commit as soon as it exists — this is the only remaining open slice, so a stalled push here is the only thing standing between the plan and `/plot-deliver`.

### Scope guard

This slice owns: `packages/domain/src/rules/waiting-tickets.ts` (new), `packages/board/src/contract/schema.ts` (`IssueRowSchema.assignees`, `FleetShape.waiting`), `packages/board/src/server/fleet.ts` (`refreshIssues`, `readIssuesFromStore`, both call sites of `inboxOf`), `packages/board/src/server/server-info.ts` (export `identity` and `people`), `packages/board/src/app/lib/agent-rows/mine-filter.ts` (`ticketsForReader`), and `AgentList.tsx:677` (the `filteredIssues` assignment and its stale comment).

Every sibling branch this plan named is merged — there is no other in-flight branch in this plan to collide with. Verified via `gh pr list --head <branch> --state all` on all five siblings at the time of this brief: all report `MERGED`.

If you find `IssueRowSchema` or `fleet.ts` already partially wired for `assignees` by the time you start (unlikely, but confirm before assuming this brief is stale) — report it rather than silently reconciling, since that would mean a change landed between this brief and your start that the staleness preflight above did not see.
