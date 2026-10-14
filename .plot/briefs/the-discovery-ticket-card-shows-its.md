## Implementation brief — the-discovery-ticket-card-shows-its

- **Plan (canonical):** [docs/plans/2026-10-14-the-discovery-ticket-card-shows-its.md](../../docs/plans/2026-10-14-the-discovery-ticket-card-shows-its.md) on `main`
- **Approved:** 2026-10-14, Jan Wloka, plan-PR #1691 merged
- **Branch:** `feature/the-discovery-ticket-card-shows-its` (base: `main`)
- **Ends as:** one PR to `main`
- **Review of the code:** PR review (plan's `Review: pr`)

Single-branch plan — one slice, no waves. Nothing else gates or waits on this branch.

### What to build

`TicketRowView` in `packages/board/src/app/components/StoriesTab.tsx:323-334` renders a ticket as one link wrapping its bare title (`<a href={ticket.url}><span>{ticket.title}</span></a>`). A person looking at the Discovery tab's ticket lanes cannot see the ticket's number, its state, or how old it is, and has no way to act on it — `CreatePlanButton` and `CreateStoryButton` exist and are wired up elsewhere (`packages/board/src/app/lib/agent-rows/menus.tsx`) but never reach this row.

Build a pure domain helper that turns a `TicketLaneRow` (`packages/board/src/contract/schema.ts:1176-1186`) plus `now` into everything the row needs to render: a GitHub-issue-list-shaped two-line card — first line the state icon, shorthand-prefixed title, linking to the ticket; second line muted, the repo/tracker reference and the age — plus which of *Create plan* / *Create story* to show. `TicketRowView` renders what the helper returns and decides nothing itself (CLAUDE.md § *Every rendered state is a domain property*).

### The decisions the plan settles — do not re-derive them

**There is no existing open/closed ticket icon to match.** The plan's Design section says to reuse "the icon the *Waiting on you* ticket rows use" for open/closed. That icon does not exist: `KindIcon` in `packages/board/src/app/components/TupleRow.tsx:511-532` renders exactly one glyph per row `kind`, and a ticket row's `kind` is always `'ticket'` — the glyph is Octicon `issue-opened` (`KIND_ICON_PATH.ticket`, `TupleRow.tsx:176-177`), the SAME glyph regardless of whether the ticket is open or closed. There is no Octicon `issue-closed` variant anywhere in `KIND_ICON_PATH`. Confirmed by reading the whole file and `tuple-row.ts`. **Do not go looking for a second icon that is supposed to already exist** — pick (or add) an open/closed icon pair yourself, matching the existing 14px/`currentColor`/`aria-hidden` SVG convention `KindIcon` already uses, and say in the PR that this is new rather than reused.

**The reference is derived from `url`, with no existing parser to reuse.** Searched `packages/domain/src` for an `owner/repo#number`-from-URL or Jira-key-from-URL helper: none exists. `tracker-github.ts` and `tracker-jira.ts` only ever *produce* URLs (e.g. `https://github.com/o/r/issues/42`), never parse one back apart. Write the parser as part of this slice's helper — a GitHub/Bitbucket issue URL gives `owner/repo#number`; a Jira browse URL (`.../browse/PROJ-123`) gives `PROJ-123`; anything else gives `''`, and the card then shows the shorthand alone with no reference line, never a guessed one (plan's own rule: "never an invented reference").

**`ticketLane` (`packages/domain/src/rules/ticket-lane.ts:44-53`) answers a different, 4-way question and is not what decides the card's open/closed icon or its actions.** It derives `'open' | 'in-progress' | 'done' | 'hidden'` from `statusCategory` trust and plan-naming, for the Discovery tab's LANE PLACEMENT — which lane (`open`/`in-progress`/`done`) a `TicketLaneRow` already sits in by the time `TicketRowView` ever sees it (`ticketLanes` in `ticket-lanes.ts` has already sorted it). The card helper's job is narrower: given a row ALREADY IN A LANE, decide the two-line text and whether to show the actions. Use the row's own `status`/`statusCategory`/`closedAt` fields directly for display text (same fields `ticketLanes.ts:56-63`'s `rowOf` already carries through) — do not re-run `ticketLane` from inside the card helper to re-derive a lane the caller already has.

**Actions show for Open and In progress, never for Done — decided by the person, not inferred from `statusCategory`.** The plan records this explicitly (`## Design > Decisions`, third bullet, dated 2026-10-14): both lanes hold tickets still open on the tracker, so the card helper's "show actions" boolean is a function of which LANE the row renders in (a parameter the caller already knows, since `StoriesTab.tsx:218-256` iterates `(['open', 'in-progress', 'done'] as const)`), not a second read of `statusCategory`/`closedAt` inside the helper. Passing the lane in avoids computing it twice from two different signals that could disagree.

**`CreatePlanButton`/`CreateStoryButton` take an `IssueRow` (`schema.ts:3421-3490`), not a `TicketLaneRow`.** The shapes differ: `IssueRow.number` vs `TicketLaneRow.id`, `IssueRow.ageMinutes`/`assignees` have no `TicketLaneRow` equivalent, `IssueRow.kind: 'ticket'` is a literal tag `TicketLaneRow` doesn't carry. The card helper must map the fields the buttons actually read (`number`, `title`, `url`, `status`, `statusCategory`) rather than force-casting one type to the other — `assignees: []` and `ageMinutes: null` are reasonable synthesized defaults since neither button reads them in a way the plan's scope touches. `menus.tsx` is the one other call site using these buttons today; read it before writing the mapping; do not change its usage.

**Scope is data the board already carries.** No `plot-host.sh`, issue index, or schema change — the plan says so and it checks out: `TicketLaneRow` already carries every field the card needs (`id`, `title`, `url`, `createdAt`, `status`, `statusCategory`, `closedAt`). No labels, no author, nothing fetched. The board needs no restart (plan's own Changelog note).

### Done when

The plan's `## Done when` is unwritten as a literal checklist, so treat the Design section's three bullets as the spec: (1) first line — state icon, shorthand-prefixed title (`1688: …` or `PROJ-12: …`), wraps to ≤2 lines, links to the ticket; (2) second line, muted — reference and age (`plot-pm/plot#1688 · opened 10m ago`); (3) actions show on Open and In progress only, none on Done, both keeping their existing arm-and-confirm interaction and refusals untouched (do not touch `CreatePlanButton.tsx` / `CreateStoryButton.tsx` internals — only call them with a mapped row).

Assertions a naive implementation would pass without:
- A ticket whose `url` the parser cannot read still renders a reference-less second line, not a blank one and not a thrown error.
- A Jira ticket's shorthand uses its key (`PROJ-12`), not a numeric `id` — easy to miss if the helper assumes GitHub/Bitbucket numeric ids.
- `closedAt` set but lane is `in-progress` (plan-named, not yet actually closed on the tracker) must still show actions — the lane, not `closedAt`, decides.
- Unit test the helper with a fixed `now` (same pattern as `ticket-lanes.test.ts`'s `NOW`/`ago()`), not `Date.now()`.
- The browser test must show the card AND both actions on an Open and an In progress ticket, and no action on a Done ticket — three distinct fixture rows, not one row asserted three ways.

Plus: run `node skills/plot/scripts/board/plot-local-checks.mjs` before each push and run what it prints — it resolves the tests and typecheck for the packages this slice touches (`packages/domain/**`, `packages/board/src/**`). The suites in the `CI suites` config key (`pnpm run test:e2e`, `test:contracts`, `test:board`, domain coverage, reconcile tests) run in CI on every PR; do not run them locally as a matter of course, and do not list them as a repo gate in follow-up work. A failing local check is never skipped — install dependencies and retry, or fix the regression.

`scripts/check-shell-lines.sh` only matters if this slice touches a `.sh` file under `skills/` — it does not need to, since everything here is TypeScript/TSX in `packages/domain` and `packages/board`.

Arrow functions for any new code in `packages/domain/src/**` (CLAUDE.md § *The Domain Package*) — `ticketLane`, `ticketLanes`, `cardControls` above are all `export const f = (...) => ...`; match that, not the board's function-declaration style.

### Bookkeeping

Open the PR through the controller, never `gh pr create`:

```bash
skills/plot/scripts/plot-open-pr.sh          # current branch
skills/plot/scripts/plot-open-pr.sh --draft  # while still moving
```

It reads the plan, titles the PR from the plan's wave heading, and refuses a branch no plan names or one a PR already carries. Push the first real commit as soon as it exists — a PR opened early (`--draft`) gives reviewers visibility sooner.

When the PR exists, append `→ #<number>` to this branch's line in the plan's `## Slices` section (`docs/plans/2026-10-14-the-discovery-ticket-card-shows-its.md`, the `feature/the-discovery-ticket-card-shows-its` bullet under `### Ticket card`).

### Scope guard

This branch owns: `packages/board/src/app/components/StoriesTab.tsx` (the `TicketRowView` function and its surrounding render), a new domain rule file under `packages/domain/src/rules/` (e.g. a ticket-card helper, name it for what it decides — not `ticket-card.ts` by default assumption, pick the name that matches the repo's existing naming judgment such as `ticket-lane.ts`/`card-controls.ts`), and that rule's unit test plus a new browser test under `packages/board/test/integration/`.

It does not own: `CreatePlanButton.tsx`, `CreateStoryButton.tsx` (call, don't edit), `ticket-lane.ts` / `ticket-lanes.ts` (read, don't edit — the plan's scope is the card, not the lane), `schema.ts`'s `TicketLaneRowSchema` (no new fields needed per the plan's own scope limit).

No sibling branches are in flight for THIS plan — it is the plan's only slice. But another plan's slice explicitly waits on this branch: `docs/plans/2026-10-14-the-discovery-tag-cloud-is-built.md`'s `feature/the-lanes-filter-by-topic` slice carries `<!-- waits: feature/the-topics-name-their-tickets, feature/the-discovery-ticket-card-shows-its -->` and that plan's own Design section says explicitly: "the lanes slice changes `StoriesTab.tsx`, so it waits on the ticket card slice." Merge this branch promptly — a slice in another plan is blocked on it. Keep the diff to `TicketRowView` and its ticket-lane rendering; avoid touching the story-lane or tag-cloud code above it in the same file so the other plan's rebase stays small.

If you find something the plan did not anticipate, report it rather than improvising outside scope.
