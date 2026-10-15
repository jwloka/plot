## Implementation brief — discovery-and-planning-cards-show-the (wave 2: Plan and story type and owner)

- **Plan (canonical):** docs/plans/2026-10-15-discovery-and-planning-cards-show-the.md on main
- **Approved:** 2026-10-15, Jan Wloka, plan-PR #1753 merged
- **Branch:** `feature/plan-and-story-cards-show-type-and-owner` (base: `main`)
- **Ends as:** one PR to `main`
- **Review of the code:** standard PR review (plan `Review:` = pr)

This is the plan's second and last wave. The first wave, `feature/ticket-cards-show-type-and-owner`, merged as #1766 (`a40bd7639`) — this branch is eligible now. It owns the plan-card and story-card halves of issue #1750 that wave 1 explicitly scoped out.

### What to build

Issue #1750: no card in Discovery shows what kind of work an item is or who owns it. Wave 1 solved this for ticket cards. This slice solves it for **plan cards** and **story cards** — and unlike the ticket slice, almost none of the rendering path exists yet:

- **Plan cards have no render path in Discovery/Planning at all today.** `PlanRow` as a type was deleted from the board package (see the comment at the top of `packages/board/src/app/lib/tuple-row.ts`: *"`Row`, `PlanRow` and `IssueRowView` are gone"*). What exists is `PlanRecord` (`packages/domain/src/ports/plan-store.ts`), which already parses `type` (the plan's `Type:` field) and `approvedRaw` (the `Approved:` record as one **verbatim string**, not a structured `{date, approver}` pair). There is no `plan-card.ts` domain rule to extend — you are creating one, following the shape of `packages/domain/src/rules/ticket-card.ts`.
- **Story cards already carry `author` end-to-end** — `Story.author` (`packages/domain/src/entities/story.ts`) and `StoryCardSchema.author` (`packages/board/src/contract/schema.ts`) are populated today from the story file's YAML frontmatter (`parseStoryContent` in `packages/board/src/server/board.ts`), but `StoryCardView` in `packages/board/src/app/components/StoriesTab.tsx` does not render it. This half is wiring a value that already exists, not deriving a new one. Stories have **no `type` field anywhere** — if this slice renders a story type, that field does not exist yet and is new work, not a passthrough.

The pattern to copy for rendering is already landed: `TicketRowView` in `packages/board/src/app/components/StoriesTab.tsx` renders `view.type`/`view.owner` from `ticketCardView()` with a `value ? <Badge/> : null` conditional and `data-ticket-type`/`data-ticket-owner` attributes. Mirror that shape — the domain rule computes, the component only renders.

### The decisions the plan settles — do not re-derive them

**The plan's five Open Questions are still open — wave 1 did not answer any of them, because none applied to tickets.** They are this slice's to answer, not re-litigate from scratch:

1. *Does a story have a type?* The issue lists a story owner but no story type source. If you add one, it is new schema (`Story`, `StoryCardSchema`) with no existing adapter reading it — name where the value comes from and why, in the PR description.
2. *Is a plan's owner its author or its approver once Approved?* The plan's Design table says: author before approval, approver once Approved (`entities/person.ts` + `approvedRaw`). This is the one question the Design section (not just Open Questions) already answers — read it as settled: **author pre-Approved, approver post-Approved**, not a user choice.
3. *Is the author read from the first commit that added the file, or a template field?* No git-blame-for-author-name utility exists in this codebase today. `packages/domain/src/adapters/refs/refs-git.ts`'s `recordCommitOf` finds the **sha** of the commit that first added a `**Field:**` record line — it does not read `%an`/`%ae`. If you take the git-history path, you are writing a new reader, not reusing one, and the Design section names its cost explicitly: "a git read per plan on every board refresh." If you take the template-field path instead, existing plans have no such field and render no author until backfilled — say which tradeoff you picked and why in the PR.
4. *GitHub issue type via field vs. label* — scoped to tickets, not this slice (wave 1's brief named this explicitly; it is closed for tickets, and plan/story cards have no comparable ambiguity since a plan's `Type:` field is plain text).
5. *Does the widened issue-index row bump `PR_INDEX_VERSION`'s sibling for `issues.json`?* — this one is about the **ticket** issue-index schema wave 1 touched, not plans or stories. Not this slice's to resolve; it was already left open after wave 1 (wave 1's brief defaulted to not bumping).

**The approver comes out of a verbatim string, not a parsed field.** `PlanRecord.approvedRaw` is the full `**Approved:** 2026-10-15, Jan Wloka, plan-PR #1753 merged` line text. No existing parser extracts a name from it. Decide the extraction format (this plan's own records read as `<date>, <name>, <ceremony detail>` — comma-separated, name second) and add a parser, or add a new structured field to the plan-store adapter if extraction from free text proves too fragile. Either way it is new code: confirm with a grep before assuming otherwise (`grep -rn "approvedRaw" packages/domain/src`).

**A name resolves through the `People` directory, exactly as wave 1 did it for ticket owners.** `resolvePerson` (`packages/domain/src/entities/person.ts`) takes a raw spelling and the declared directory (`## Plot Config`'s `People` key, e.g. `jwloka = Jan Wloka; eins78 = Max Albrecht`) and resolves to a handle, or renders the raw spelling unresolved — never a guess. Both the plan author/approver name and the story author name should resolve through this, the same as the ticket owner did, rather than rendering a raw git/frontmatter string directly.

**The badge text is the source's own word, lowercased, no mapping table — same rule as wave 1.** A plan `Type: feature` renders `feature`. Do not build a vocabulary-normalisation table.

**Rule carried over unchanged: absent is not false.** A plan or story field the source never stated is modeled as `null`/absent, never `''` and never a guessed default. This is the same contract `Issue.type` and `IssueIndexRowSchema` kept in wave 1 (`NO .default() ANYWHERE`).

**`PlanRow` is gone on purpose — do not resurrect it as a monolith.** The board's own history (per `tuple-row.ts`'s comment) already moved away from one fat row type toward purpose-built adapters (`tupleFromPlan`, etc.). Add a narrow plan-card view (e.g. `planCardView` returning `{ type, owner }`) rather than reviving a general-purpose `PlanRow`.

### Done when

The plan's `## Done when` is implicit in its one-line acceptance: plan and story cards show a type badge and an owner name read through a domain property, and show neither where the source holds no value. Concretely:

- A new plan-card domain rule (parallel to `ticketCardView`) returns `type: string | null` and `owner: string | null`, unit-tested for: a Draft/unapproved plan (owner = author), an Approved plan (owner = approver, resolved from `approvedRaw`), a plan with no stated `Type:`, and an owner spelling undeclared in `People` (renders raw).
- `StoryCardView` renders the already-populated `author` field (resolved through `People`), with a test proving a story with no author renders no name — this is the regression a naive implementation misses: `Story.author` defaults to `''` in some code paths today (`StoryCardSchema.author` has `.default('')`), and `''` must render as *nothing*, not as an empty badge.
- If a story `type` is added: a test proving a story with no type source renders no badge, matching the ticket card's contract for the same case.
- The plan-card and story-card components render the badge/name with no decision logic in the `.tsx` file (grep for a conditional on `type`/`owner` strings beyond `value ? <Badge/> : null`).
- A plan or story card with nothing to show renders exactly as the current (pre-slice) card — a regression test pinning this.

Plus: `node skills/plot/scripts/board/plot-local-checks.mjs` run before each push, and whatever it prints — related domain/board tests and typecheck for touched packages. The `CI suites` config key (`pnpm run test:e2e`, `test:contracts`, `test:board`, domain coverage, `test/reconcile/*.test.mjs`) runs in CI on this PR; do not run `test:e2e` locally (it dispatches real workers into sandbox repos and is CI's gate, not a local one).

Name the shell gate explicitly if this slice touches any `.sh` file under `skills/`: `scripts/check-shell-lines.sh` refuses a PR whose shell under `skills/` grows past its merge base. Growth is paid for by removing shell elsewhere in the same change, or by moving logic into the domain and reaching it through a bundle — the gate has no override.

### Bookkeeping

Open the PR through the controller once the first real commit exists:

```bash
skills/plot/scripts/plot-open-pr.sh          # current branch
skills/plot/scripts/plot-open-pr.sh --draft  # while work is still moving
```

Do not run `gh pr create` — it has no access to the plan/wave title the controller derives. When the PR is created, append `→ #<number>` to this branch's line under `### Plan and story type and owner` in the plan's `## Slices` section.

### Scope guard

This branch owns: a new plan-card domain rule and its tests (likely `packages/domain/src/rules/plan-card.ts`), `packages/domain/src/ports/plan-store.ts` and its shell adapter (`packages/domain/src/adapters/plan-store/plan-store-shell.ts`) if `approvedRaw` needs a parsed sibling, `packages/domain/src/entities/story.ts` and `packages/board/src/contract/schema.ts` (`StoryCardSchema`) only if a story `type` field is added, and `packages/board/src/app/components/StoriesTab.tsx` for the plan-card and `StoryCardView` rendering.

The sibling branch `feature/ticket-cards-show-type-and-owner` already merged (#1766) and owns the ticket-card half: `packages/domain/src/entities/issue.ts`, `issue-index.ts`, `adapters/tracker/*`, `rules/ticket-lanes.ts`, `rules/ticket-card.ts`, and the `TicketRowView` rendering in `StoriesTab.tsx`. Do not re-touch those files for ticket behaviour — if you need to read `ticketSourceOf` or `resolvePerson`, that is reuse, not a rewrite, and should show as no behaviour change to the ticket path.

If you find something the plan did not anticipate — particularly if any of the five Open Questions turns out to need a design decision bigger than this slice can make unreviewed — report it in the PR description rather than deciding it silently.
