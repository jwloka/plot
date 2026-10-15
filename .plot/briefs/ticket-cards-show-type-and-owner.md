## Implementation brief — discovery-and-planning-cards-show-the (wave 1: Ticket type and owner)

- **Plan (canonical):** docs/plans/2026-10-15-discovery-and-planning-cards-show-the.md on main
- **Approved:** 2026-10-15, Jan Wloka, plan-PR #1753 merged
- **Branch:** `feature/ticket-cards-show-type-and-owner` (base: `main`)
- **Ends as:** one PR to `main`
- **Review of the code:** standard PR review (plan `Review:` = pr)

This wave has no sibling to wait on — it is the plan's first and only slice targeted so far (`feature/plan-and-story-cards-show-type-and-owner` is the second, unstarted). Nothing blocks this branch and nothing waits on it.

### What to build

Issue #1750: no card in Discovery shows what kind of work an item is or who owns it. This slice is the ticket half only — `TicketLaneRow` (`packages/domain/src/rules/ticket-lanes.ts`) carries `id`, `title`, `url`, `createdAt`, `status`, `statusCategory`, `closedAt`, and nothing names the issue's type or its assignee. Add a `{ type, owner }` read for a ticket card, carry `type` and assignee through the issue index, and render both on the Discovery ticket card (`TicketRowView` in `packages/board/src/app/components/StoriesTab.tsx`) with no badge/name where the source holds nothing.

The render point already exists: `ticketCardView` in `packages/domain/src/rules/ticket-card.ts` returns the `TicketCardView` that `TicketRowView` renders verbatim. Add `type: string | null` and `owner: string | null` to that interface and compute them there — the component still decides nothing (CLAUDE.md, *Every rendered state is a domain property*).

### The decisions the plan settles — do not re-derive them

**Type comes from the tracker, not a label, not a guess.** The plan's Design table says "the Jira issue type, or the GitHub issue type where the issue has one, otherwise absent." The Open Questions list leaves the *label* path undecided ("Does a GitHub issue show its type from the issue-type field, from a label, or from both?") — that question is NOT this slice's to resolve by picking one. If the GitHub issue-type field is unavailable in practice, carry `type: null` for GitHub rather than inventing a label-mapping config key; that mapping is explicitly deferred to a future decision ("a label rule needs a declared mapping, for example a `Type labels` config key").

**Owner is the assignee, resolved through the `People` directory.** `packages/domain/src/adapters/tracker/tracker-listers.ts` already declares, per lister, how assignees are spelled (`TRACKER_LISTERS`, `HOST_ISSUE_LISTERS`) — a Jira assignee is a tracker account matched `jira:<account>`, a GitHub/Bitbucket assignee is a host login. `packages/domain/src/rules/ownership.ts`'s `ticketSourceOf` already reads this reading for the *Waiting on you* ownership rule. Reuse that machinery to resolve the raw assignee spelling to a `Person` via `resolvePerson` (`packages/domain/src/entities/person.ts`) rather than writing a second lookup. An undeclared handle renders as written (`resolvePerson`'s own contract) — never hidden and never guessed.

**The badge text is the source's own word, lowercased, no mapping table.** A Jira type `Story` shows `story`. Do not build a vocabulary-normalisation table; the plan is explicit that colour and any other presentation choice belongs to the card component, not the domain rule.

**`Issue` and the issue index have no `type` field today — this is an additive schema change, not a passthrough.** Confirmed by reading `packages/domain/src/entities/issue.ts` (no `type` on `Issue`) and `packages/domain/src/entities/issue-index.ts` (`IssueIndexRowSchema` is `.strict()`, no `type`). Adding `type?: string` to both is additive and keeps the `.strict()` contract honest (`NO .default() ANYWHERE` — an absent field means the tracker gave nothing, never `''` or a guess).

**The field must also travel through the shell boundary, and that is scope this slice owns.** `packages/domain/src/adapters/tracker/tracker-shell.ts`'s `issueOf` reads a `RawIssue` (`{ number, title, url, createdAt, body, status, statusCategory, closedAt, assignees, nextPageToken }`) — the shape `plot-host.sh`'s `issue-list`/`issue-view` ops print as JSON. There is no `type` in `RawIssue` today. Adding type support end-to-end means: `RawIssue.type?: string`, `issueOf` carrying it onto `Issue`, AND the host script(s) that produce that JSON (Jira and GitHub issue-list paths) emitting a `type` field. Check `skills/plot/scripts/plot-host.sh` and its Jira/GitHub issue-list implementations before assuming this is TypeScript-only — if the shell side is out of scope for this slice's size, say so explicitly in the PR rather than silently shipping a `type` field nothing ever populates.

**Rule carried over unchanged: absent is not false.** Per `Issue`'s own doc comment, `status`/`statusCategory` degrade to `''` only when the tracker explicitly said nothing; a field the op never asked for is modeled as *absent* (optional), not as an empty string. Model `type` the same way: optional on `RawIssue` and `Issue`, never defaulted.

**`ISSUE_INDEX_VERSION` bump is an open question the plan does not answer — ask, do not pick.** Plan Open Question: "Does the widened issue-index row bump `PR_INDEX_VERSION`'s sibling for `issues.json`, so an older file reads as *no index* rather than as rows without owners?" `IssueIndexRowSchema` is additive-compatible (`.optional()` new fields parse fine against old files, which simply lack them) — so a version bump is not mechanically required for the schema to keep parsing. But bumping is still a live design call (do we want an old on-disk `issues.json` to read as "no type data" silently, or to be invalidated and re-fetched once). Flag this in the PR description rather than deciding it unreviewed; default to NOT bumping unless review says otherwise, since silent forward-compatibility is what `decodeIssueIndex`'s whole contract is built around.

### Done when

The plan's `## Done when` is implicit in its one-line acceptance: ticket cards show a type badge and an owner name read through a domain property, and show neither where the source holds no value. Concretely:

- `ticketCardView` (or a new sibling rule alongside it) returns `type: string | null` and `owner: string | null`, unit-tested for: a ticket with a stated type and assignee, a ticket with neither, a ticket whose assignee is an undeclared `People` handle (renders raw, per `resolvePerson`), and a ticket whose type the tracker never set (renders no badge).
- `TicketLaneRow` and `TicketSourceRow` carry `type` and `assignee`-derived fields through `ticket-lanes.ts`'s `rowOf`, with a test proving a row missing `type` lanes correctly and renders no badge — this is the regression the naive implementation would miss: forgetting the optional-field passthrough in `rowOf` silently drops type and owner even once the schema carries them.
- `TicketRowView` renders the badge and name with no decision logic in the `.tsx` file (grep for a conditional on `type`/`owner` strings in the component — there should be none beyond `value ? <Badge/> : null`).
- A card whose ticket carries no type and no assignee renders exactly as the current (pre-slice) card — a regression test pinning this, since the prior plan (`the-discovery-ticket-card-shows-its`, Released) explicitly scoped out "no labels and no author" and this slice lifts that limit on purpose; the old card's shape must not break for tickets nothing was asked to carry.

Plus: `node skills/plot/scripts/board/plot-local-checks.mjs` run before each push, and whatever it prints — related domain/board tests and typecheck for touched packages. The `CI suites` config key (`pnpm run test:e2e`, `test:contracts`, `test:board`, domain coverage, `test/reconcile/*.test.mjs`) runs in CI on this PR; do not run `test:e2e` locally (it dispatches real workers into sandbox repos and is CI's gate, not a local one).

Name the shell gate explicitly if this slice touches `plot-host.sh` or any `.sh` file under `skills/`: `scripts/check-shell-lines.sh` refuses a PR whose shell under `skills/` grows past its merge base. If the host-script change above is in scope, its growth must be paid for by removing shell elsewhere in the same change, or by moving the logic into the domain and reaching it through a bundle — the gate has no override.

### Bookkeeping

Open the PR through the controller once the first real commit exists:

```bash
skills/plot/scripts/plot-open-pr.sh          # current branch
skills/plot/scripts/plot-open-pr.sh --draft  # while work is still moving
```

Do not run `gh pr create` — it has no access to the plan/wave title the controller derives. When the PR is created, append `→ #<number>` to this branch's line under `### Ticket type and owner` in the plan's `## Slices` section.

### Scope guard

This branch owns: `packages/domain/src/entities/issue.ts`, `packages/domain/src/entities/issue-index.ts`, `packages/domain/src/adapters/tracker/tracker-shell.ts` and `tracker-listers.ts`, `packages/domain/src/rules/ticket-lanes.ts`, `packages/domain/src/rules/ticket-card.ts`, `packages/domain/src/rules/ownership.ts` (read-only reuse of `ticketSourceOf`, no behaviour change there unless a gap surfaces), `packages/board/src/app/components/StoriesTab.tsx` (the `TicketRowView` rendering only), and — if the host-script change is taken on in this slice — the relevant `issue-list`/`issue-view` paths in `skills/plot/scripts/plot-host.sh`.

The sibling branch `feature/plan-and-story-cards-show-type-and-owner` (not yet started, no claim pushed) owns the plan-card and story-card `type`/`owner` reads — do not touch `packages/domain/src/rules` plan-row or story-row code, or the plan/story card components, from this branch; a collision there is a known fact from the plan's own slice split, not a surprise at merge time.

If the GitHub label-mapping question, the story-type question, the plan-owner-precedence question, or the author-source question (git-blame vs. a template field) turn out to matter for the ticket card specifically, they do not — those four Open Questions are scoped to the plan/story slice or to a future decision. If you find the ticket slice genuinely blocked on one of them, report it rather than deciding it here.
