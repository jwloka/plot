## Implementation brief — the-board-has-three-tabs (wave: Waiting on you)

- **Plan (canonical):** [docs/plans/2026-10-12-the-board-has-three-tabs.md](../../docs/plans/2026-10-12-the-board-has-three-tabs.md) on `main`
- **Approved:** 2026-10-13, jwloka, plan-PR #1608 merged
- **Branch:** `feature/the-delivery-tab-filters-by-sprint-and-owner` (base: `main`)
- **Ends as:** one PR to `main`
- **Review of the code:** per repo convention (PR review)

This is the plan's last slice. Its wait — `feature/the-index-holds-closed-issues` — merged 2026-10-13 (PR #1657). Its two in-plan dependencies, `feature/an-issue-names-its-assignee` (#1674) and `feature/people-names-a-tracker-account` (#1666), both merged 2026-10-14. Nothing blocks this branch starting now.

### What to build

The Delivery tab's *Waiting on you* section renders `fleet.issues` — the 50 newest unplanned open tickets — completely unfiltered (`AgentList.tsx:677`, `const filteredIssues = fleet.issues;`, with a comment explicitly stating this is deliberate today: an issue carries no owner, so nothing hides it). D9 and D22 ask for better: the server should decide which tickets are "yours" — the union of your tracker inbox and every open ticket actually assigned to you — and tell the client how many it hid and why, rather than showing 50 arbitrary rows and silently dropping the rest.

Build `waitingTickets(rows, inbox, reader, source, complete)` in a new file `packages/domain/src/rules/waiting-tickets.ts`, plus `hiddenSentence` and `shownSentence` beside it. Wire it into both board issue-read paths in `packages/board/src/server/fleet.ts` — `refreshIssues` (no-fleet, defined line 1678) and `readIssuesFromStore` (with-fleet, defined line 1839) — after the planned-ticket filter (~line 1625) and before the `ISSUE_LIMIT` (50, constant at line 198) cap. Add `FleetShape.waiting` to the payload schema (`packages/board/src/contract/schema.ts`, `FleetShape` starts line 4047, `issues`/`issueAnswer`/`issueError`/`issueAbsence` sit around 4273-4294). Add `ticketsForReader` beside `rowsForReader` in `packages/board/src/app/lib/agent-rows/mine-filter.ts`, applied at `AgentList.tsx:677` in place of the unfiltered `fleet.issues`.

**Plan line numbers for `fleet.ts` are stale — use these instead** (verified against current `main`, file is 7078 lines, not ~6400 as the plan's citations assume):
- `refreshIssues`: line 1678 (exported function), called at 1997
- `readIssuesFromStore`: line 1839, called at 1981
- `ISSUE_LIMIT`: line 198 (`const ISSUE_LIMIT = 50;`)
- `fleetOwnsPrs`: line 1901, called at 1901/1979
- `resolveBackend`: imported at line 82, called at 1913 and 2153
- planned-ticket filter: ~line 1625
- `/api/fleet` payload assembly: `buildFleet` at line 6777; `issues`/`issueAnswer` set ~6990-6991, `issueError`/`issueAbsence` ~7014-7015
- `fleet.sprints` (only Active sprints): line 6348 (unchanged from plan)

### The decisions the plan settles — do not re-derive them

**`TicketSource` is `{ service, match, prefix? }`, never the plan's original `'github' | 'bitbucket' | 'jira'` literal union.** The plan's own 2026-10-14 Note records why: CI's gate *The domain names no vendor* (`ci.yml:622-634`) refused the literal union and the vendor string comparisons. This is already built and merged — `packages/domain/src/rules/ownership.ts:43` declares `TicketSource`, `:48` and `:188-193` give `ticketSourceOf(source, backend, reading): TicketSource | null`, and `packages/domain/src/adapters/tracker/tracker-listers.ts:19-35` holds `TRACKER_LISTERS`, `HOST_ISSUE_LISTERS` and `TICKET_SOURCES`. `ticketOwnership(assignees, source, reader)` is at `ownership.ts:155`. Call these; do not reintroduce a vendor-string type to satisfy this slice — the gate will refuse it again.

**The reader comes from `server-info.ts`'s `identity` and `people`, and they are not exported yet — this slice must add `export`.** `packages/board/src/server/server-info.ts:178` (`people`) and `:206` (`identity`) are both module-private `const`s today; `serverInfo` (exported function at `:229`) calls them internally but nothing outside the file can. The plan says "the slice exports `identity` and `people` from `server-info.ts`" as if stating a fact — it's actually a one-line task this slice owns. Build the `Reader` (as `readerFrom` does in `mine-filter.ts:119`, which the plan-level examples follow) from these two exports inside the issue-read path; do not add a second identity read.

**Run the filter before the cap, not after.** The server holds up to `ISSUE_INDEX_OPEN_LIMIT` (1000) open rows; the client only ever sees `ISSUE_LIMIT` (50). `waitingTickets` must run over every open row the read holds — both reads already hold up to 1000 per `feature/the-index-holds-closed-issues` (merged) — and only the *result* (`tickets`) gets cut to 50. Filtering after the cap would hide tickets the reader owns simply because they weren't in the newest 50, which is exactly the D22 failure this slice fixes.

**The answer is a union, not a replacement.** `tickets` is `inbox` rows (today's `assignee = currentUser()` read, or `PLOT_JIRA_JQL` where set — absent today, since `feature/the-lanes-read-the-whole-jira-project` hasn't landed, so `inbox` is simply the open rows for now) unioned with every open row whose `ticketOwnership` reads `mine`, deduplicated, newest first, cut to 50. `shown` counts the full union before the cut; `hidden` counts every other unplanned open row. Both come from `hidden`/`shown`, never from the 50-row limit — the sentences must never imply "50" is the total.

**The sentences state an exact count when `complete` is true and a floor when it is not.** `complete` rides through from the index read (open rows truncated at 1000 read as `complete: false`). `hiddenSentence(hidden, complete)` → *"127 open tickets are not assigned to you — show every ticket."* or, not complete, *"at least 997 open tickets are not assigned to you — show every ticket."* `shownSentence(n, total, complete)` → *"Showing 50 of 127 open tickets."* or *"Showing 50 of at least 997 open tickets."* Never derive either number from `ISSUE_LIMIT`.

**Unmatched readers get a reason, not an empty result — and the three unmatched cases differ.** GitHub/Bitbucket reader with no known host login, or a `null` source (unresolved backend): every row, cut to 50, with a notice naming the reason and the count (e.g. *"The board knows no host login for you — showing 50 of 127 open tickets."*). Bitbucket itself (tickets carry no assignee at all): same treatment, no-assignee notice — never misread as GitHub-unmatched. Jira with no `jira:` spelling matching the reader: the `inbox` rows (or open rows if `inbox` absent) with **no notice and no count** — D23 says a Jira inbox must not silently widen at upgrade. Jira with a `jira:` spelling that matches the reader's handle but names none of the actual assignee values Jira returns (D35): the `inbox`/open rows again, but **with** a notice that names the literal value Jira returned, e.g. *"Jira names your tickets' assignee `5b10ac8d82e05b22cc7d4ef5`; `People` declares `jira:jan.wloka@quatico.com` for jwloka — add `jira:5b10ac8d82e05b22cc7d4ef5` to match."* Get these four cases right individually; they are not one "unmatched" branch with a shared message.

**`waiting: null` only for a failed read or a `nobody` source** — the section then falls back to the existing `issueError`/`issueAbsence` sentence, unchanged. Don't invent a new empty-state message for this slice; it reuses what's there.

**`ticketsForReader` is a client-side display filter over the already-unioned `tickets`, not a second ownership computation.** It applies *Only my work* to the ticket list the same way `rowsForReader` applies it to agent rows — hide a ticket whose `ticketOwnership` is `theirs`, keep `unknown` (unassigned) and `mine`. With *Only my work* off (today's default) it changes nothing; this is additive, not a rewrite of `filteredIssues`'s existing behavior for the default view.

**An empty `assignees` reads as `unknown`, never `theirs`.** `isMine` already keeps `unknown` rows visible — an unassigned ticket is nobody's business to hide. This matches the existing PR/plan ownership convention (`ownership.ts`), so no new rule is needed here, just the correct arm of `OwnedRow`'s `ticket` kind (already built, `ownership.ts:69-73`).

**`IssueIndexRowSchema.assignees` is already `.optional()`** (`packages/domain/src/entities/issue-index.ts:52`) — no version raise needed on this slice either; an absent key decodes as `[]`, matching the merged assignee slice's contract.

### Done when

The plan's `## Acceptance` → **Waiting on you, the default** and **Waiting on you, the unmatched reader** entries are the specification — read both in full in the plan before starting; they enumerate every test case (GitHub matched/unmatched, Jira matched/unmatched/declared-but-wrong, Bitbucket, `null` source, the sentence wording and counts, the *show every ticket* control, `ticketsForReader`'s three outcomes). Do not re-derive the test list; the plan already has it.

Concretely, the new/changed test files: `packages/domain/test/waiting-tickets.test.ts` (new), `packages/domain/test/ownership.test.ts` (extend the `ticket` arm, already partially built from the merged ticket-owner slice — check what's already covered before adding), `packages/board/test/unit/unplanned-issues.test.ts` (extend for `waiting`), `packages/board/test/unit/mine-filter.test.ts` (extend for `ticketsForReader`), plus a browser case in `mine-filter.browser.test.ts` for the *Only my work* / *show every ticket* interaction and in `agents-tab.browser.test.ts` for the hidden-count sentence and unmatched notice.

Plus: the repo's gates — no bundle diff (the board artifact is generated, never hand-committed; see `CLAUDE.md` *On a conflict in board-server.mjs* if a rebase/merge touches it), a changeset for `@plot-pm/board` (and `@plot-pm/domain` if its own package needs one — check `## Versioning`), and no net new shell lines (this slice touches no `.sh` file). For tests, run `node skills/plot/scripts/board/plot-local-checks.mjs` before each push and run what it prints — it resolves the related `packages/domain/src/**` and `packages/board/src/**` tests, both packages' typechecks, and the gate scripts for changed files. The suites in `## Plot Config`'s `CI suites` key (`pnpm run test:e2e`, `test:contracts`, `test:board`, `pnpm --filter @plot-pm/domain exec vitest run --coverage`, `node --test test/reconcile/*.test.mjs`) run in CI on every PR — do not run `test:e2e` locally (CLAUDE.md Testing: it dispatches real workers into sandbox repos; CI is the authority, not a local gate).

`scripts/check-shell-lines.sh` refuses a PR whose shell under `skills/` grew past its merge base — not relevant here since no `.sh` file is touched, but worth knowing if scope creeps into a helper script.

### Bookkeeping

Open the PR through the controller once the branch has its first real commit:

```bash
../plot/scripts/plot-open-pr.sh          # current branch
../plot/scripts/plot-open-pr.sh --draft  # while still moving
```

Do not run `gh pr create` — it has no way to find the plan or wave heading and will take its title from the last commit subject. `plot-open-pr.sh` reads which plan names the branch and opens the PR with the wave heading ("Waiting on you") as the title, the plan and this brief in the body.

When the PR is created, append `→ #<number>` to this branch's line in the plan's `## Slices` section (`docs/plans/2026-10-12-the-board-has-three-tabs.md:146`). No project board is declared in this repo's `## Plot Config`, so skip the board-status step.

Push the first real commit as soon as it exists.

### Scope guard

This branch owns:
- `packages/domain/src/rules/waiting-tickets.ts` (new) — `waitingTickets`, `hiddenSentence`, `shownSentence`
- `packages/board/src/server/fleet.ts` — wiring `waitingTickets` into `refreshIssues` and `readIssuesFromStore`, before the `ISSUE_LIMIT` cap
- `packages/board/src/server/server-info.ts` — exporting `identity` and `people`
- `packages/board/src/contract/schema.ts` — `FleetShape.waiting`
- `packages/board/src/app/lib/agent-rows/mine-filter.ts` — `ticketsForReader`
- `packages/board/src/app/components/AgentList.tsx:677` (and the *show every ticket* control render, nearby) — applying `ticketsForReader` in place of the unfiltered `fleet.issues`, and rendering the hidden-count sentence / notice
- the test files named above under **Done when**

All four other slices of this plan are already merged — there is no sibling branch in flight to collide with:
- `feature/the-tabs-are-discovery-planning-delivery` (#1660, merged) — tab rename, `boardTabOf`, `planningColumns`
- `feature/the-active-sprint-button-selects-every-active-sprint` (#1661, merged) — `activeSprintButton`
- `feature/waiting-on-you-shows-a-failed-verification` (#1664, merged) — `PlanLevelRow`, the plan-level verify row in the same `AgentList.tsx` sections this slice touches
- `feature/people-names-a-tracker-account` (#1666, merged) — `ticketOwnership`, `TicketSource`
- `feature/an-issue-names-its-assignee` (#1674, merged) — `Issue.assignees` on both read paths

Because the plan-level-row slice already landed in the same `AgentList.tsx` *Waiting on you*/*Working* sections (`:1087-1091`, `:1123` in the plan's original citations — re-check current line numbers, they will also have drifted), expect those renders to already be in the file; add the ticket list and its sentence beside them rather than assuming a clean insertion point.

If you find something the plan did not anticipate, report it rather than improvising outside scope.
