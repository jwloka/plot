## Implementation brief — the-board-has-three-tabs (slice: The ticket owner)

- **Plan (canonical):** [docs/plans/2026-10-12-the-board-has-three-tabs.md](../../docs/plans/2026-10-12-the-board-has-three-tabs.md) on `main`
- **Approved:** 2026-10-13, jwloka, plan-PR #1608 merged
- **Branch:** `feature/people-names-a-tracker-account` (base: `main`)
- **Ends as:** one PR to `main`
- **Review of the code:** per repo convention (PR review)

This branch waits on nothing outside the plan, and nothing waits on it (see the plan's *Cost* › *The waits*: only the assignee slice and *Waiting on you* wait on `feature/the-index-holds-closed-issues`). It is independent of every sibling slice and can run concurrently with all of them.

### What to build

Today `isMine`/`ownership` (`packages/domain/src/rules/ownership.ts`) judges three row kinds — `pr`, `agent`, `plan` — against a `Reader`'s host login. There is no `ticket` kind: an `Issue` carries no assignee at all yet (`entities/issue.ts:21-23` states that by design, and will gain `assignees: string[]` only in the sibling slice `feature/an-issue-names-its-assignee`). This slice builds the **rule** that will judge a ticket's ownership once that field exists — the matching logic, decoupled from the read path.

Add:

1. **`ticketSourceOf`** — maps the resolved git-host backend (and tracker scheme) to a narrower source word the ownership rule can match against. Signature and cases per the plan's Acceptance (*Waiting on you, the unmatched reader* › `ownership.test.ts`): answers `tracker` for `jira`, `tracker` for `github-issues`, `git-host` for `github`, `git-host` for `bitbucket`, and `null` for an unresolved backend (an unresolved backend is read as unmatched downstream, per Moderation 4 of the panel round-3 revision).
2. **The `ticket` arm of `OwnedRow`** — add `{ kind: 'ticket'; assignees?: string[]; source?: TicketSource }` (or equivalent fields — check the Acceptance wording below for the exact cases your fields must support) to the `OwnedRow` union in `rules/ownership.ts`, and a `ticketOwnership(...)` matcher wired into the `ownership()` switch.
3. **The `People` tracker-account grammar** — extend `parsePersonDirectory`'s documented grammar (`entities/person.ts:62-75`) so a spelling with a tracker prefix (`jira:jan.wloka@quatico.com`) declares that tracker's account for the handle, alongside ordinary `login = Name` spellings. Update the doc comment on `parsePersonDirectory` to state the new form.
4. **The `skills/plot/scripts/README.md` config row** — the `plot-config.sh` row documenting `People` needs the new `<tracker>:<account>` grammar named alongside the existing `handle = Spelling, Spelling` form. No shell script changes.

### The decisions the plan settles — do not re-derive them

**`ticketOwnership` and `ticketSourceOf` supersede `assigneeHandle`.** `DESIGN-phases.md` §8 (`:319`) still names an earlier signature, `assigneeHandle(assignee, source, directory)` — that line is frozen at an earlier design revision. The plan's slice text and its 2026-10-13 panel-round-1 revision note explicitly replace it: *"Replaced `assigneeHandle` with a `ticket` arm of `OwnedRow`"*. Build `ticketOwnership` and `ticketSourceOf`, not `assigneeHandle`. Where the plan and the design doc disagree, the plan is canonical (it is the later, revised text).

**An unassigned ticket is `unknown`, not `theirs`.** Per the same revision note, a ticket with `assignees: []` is `unknown` and is *hidden-and-counted in the inbox default* — it is not silently shown nor silently dropped by `isMine`; `isMine` keeps `unknown` visible (it only excludes `theirs`), consistent with the existing contract on `pr`/`plan` rows.

**Matching mirrors `prOwnership`'s undeclared-login rule, not `planOwnership`'s stricter one.** The Acceptance text (*`Only my work` over tickets*) says: *"a GitHub assignee equal to an undeclared reader login is `mine`"* — this is `prOwnership`'s behavior (an exact-login match counts even with no `People` entry), not `planOwnership`'s (which requires the directory to declare the other spelling before calling it `theirs`, else `unknown`). A ticket is closer to a PR in this respect: a host login that matches exactly is a strong signal with no need for a declared spelling.

**Two assignees, any match wins.** *"a second of two assignees equal to the reader is `mine`"* — the matcher must check every element of `assignees`, not just the first, and return `mine` on any hit.

**Jira matches only through the declared `jira:` spelling.** *"a Jira assignee named by a `jira:` spelling of the reader's handle is `mine`, of another handle `theirs`, of no handle `unknown`"* — unlike the GitHub/Bitbucket (`git-host`) case, a Jira ticket's assignee (an email or `accountId`) is never compared to the host login directly; it only resolves through a declared `jira:` spelling in `People`. No declared `jira:` spelling anywhere that names the assignee → `unknown`, not `theirs` and not a silent `mine`.

**This slice builds the rule only — not the read.** `Issue.assignees` does not exist on `main` yet; it is built by the sibling `feature/an-issue-names-its-assignee`, which this slice does not wait on (verified via the plan's wave-order Notes: *"the Delivery slice depends on it by slice order"* refers to a different slice). Your unit tests for `ticketOwnership`/`ticketSourceOf` construct `OwnedRow`/reader fixtures directly — they do not need a live `Issue.assignees` field to exist in the entity. Do not add `assignees` to `Issue` here; that is out of scope for this branch.

### Done when

The plan's `## Acceptance` has two entries that apply to this slice (the third-listed bullet under *Waiting on you, the unmatched reader* and the final bullet, *`Only my work` over tickets* — read both at `docs/plans/2026-10-12-the-board-has-three-tabs.md:112-113`, quoted here for convenience):

> `ownership.test.ts`: `ticketSourceOf` maps `tracker` `jira`, `tracker` `github-issues`, `git-host` with `github` and `git-host` with `bitbucket`, and answers `null` for `git-host` with an unresolved backend.

> `packages/domain/test/ownership.test.ts`, the `ticket` arm: a GitHub assignee equal to an undeclared reader login is `mine`; a second of two assignees equal to the reader is `mine`; another declared person is `theirs`; `[]` is `unknown` and `isMine` keeps it; a Jira assignee named by a `jira:` spelling of the reader's handle is `mine`, of another handle `theirs`, of no handle `unknown`.

These are the specification — write the test cases exactly as enumerated (six distinct cases for the `ticket` arm, four for `ticketSourceOf`) before anything else, per this repo's TDD convention. The browser-level `mine-filter.browser.test.ts` case named in the same Acceptance section belongs to the sibling `feature/the-delivery-tab-filters-by-sprint-and-owner` slice (it exercises the live read path) — do not add it here.

Plus: the repo's gates. No bundle diff (`board-server.mjs` is generated; never hand-commit it). A changeset for `@plot-pm/board` and/or `plot` (per `## Versioning` — this touches both the domain package's `ownership.ts`/`person.ts` and the skills README row, so check which package(s) your changed files fall under). `scripts/check-shell-lines.sh` is a no-op here — this slice makes no shell-script edit, so growth isn't a concern, but the gate still runs in CI. For tests, run `node skills/plot/scripts/board/plot-local-checks.mjs` before each push and run what it prints: for `packages/domain/src/**` changes that resolves to `pnpm --filter @plot-pm/domain exec vitest related --run` plus `tsc --noEmit`. The suites in `CI suites` (`pnpm run test:e2e`, `test:contracts`, `test:board`, the domain vitest run with coverage, `test/reconcile/*.test.mjs`) run in CI on every PR — do not run `test:e2e` locally (CLAUDE.md Testing section: it dispatches real workers into sandbox repos and is CI's gate, not a local one).

### Bookkeeping

Open the PR through the controller once the branch has its first real commit:

```bash
../plot/scripts/plot-open-pr.sh          # current branch
../plot/scripts/plot-open-pr.sh --draft  # while still moving
```

Do not run `gh pr create` — it has no way to find the plan or slice heading and takes its title from the last commit subject instead. `plot-open-pr.sh` reads which plan names the branch and opens the PR with the slice heading ("The ticket owner") as the title, the plan and this brief in the body.

When the PR is created, append `→ #<number>` to this branch's line in the plan's `## Slices` section (`docs/plans/2026-10-12-the-board-has-three-tabs.md:136`). No project board is configured in this repository's `## Plot Config`, so skip the board-status step.

Push the first real commit as soon as it exists.

### Scope guard

This branch owns:
- `packages/domain/src/rules/ownership.ts` — the `ticket` arm of `OwnedRow`, `ticketOwnership`, `ticketSourceOf`
- `packages/domain/src/entities/person.ts` — the `parsePersonDirectory` doc comment, extended for the `<tracker>:<account>` grammar (and the parsing logic itself, if the existing comma-spelling parser needs a change to recognize a tracker prefix — read `:1-90` closely; it may already parse this shape unchanged since every spelling is free text today, in which case only the doc and the matching logic are new)
- `packages/domain/test/ownership.test.ts` — the six `ticket`-arm cases and the four `ticketSourceOf` cases
- `skills/plot/scripts/README.md` — the `plot-config.sh` row's `People` grammar description

Other branches of this plan, read from the plan's `## Slices` section (not re-verified at dispatch time — confirm with `/plot-pulse` before starting if timing matters):
- `feature/the-tabs-are-discovery-planning-delivery`, `feature/the-active-sprint-button-selects-every-active-sprint` (→ #1661), `feature/waiting-on-you-shows-a-failed-verification` (→ #1664) — all touch `packages/board/src/app/**`, not `packages/domain/src/rules/ownership.ts` or `entities/person.ts`. No expected overlap.
- `feature/an-issue-names-its-assignee` — touches `entities/issue.ts`, `issueOf`, the fleet fold (`issue-refresh.ts`), `IssueIndexRowSchema`, `refreshIssues`. No file overlap with this slice, but it is the slice that will later *consume* `ticketOwnership`/`ticketSourceOf` through the `ticket` `OwnedRow` arm this branch adds — keep the arm's field names stable once merged, since that slice and `feature/the-delivery-tab-filters-by-sprint-and-owner` build on top of it.
- `feature/the-delivery-tab-filters-by-sprint-and-owner` — touches `rules/waiting-tickets.ts`, `mine-filter.ts`, `server-info.ts`. Waits on `feature/the-index-holds-closed-issues` (a different plan's slice), so it will not run concurrently with the lanes plan's own slices touching the same files, per the plan's Notes (O3). No file overlap with this branch.

If you find something the plan did not anticipate, report it rather than improvising outside scope.
