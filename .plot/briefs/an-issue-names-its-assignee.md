## Implementation brief — the-board-has-three-tabs (slice: The assignee)

- **Plan (canonical):** `docs/plans/2026-10-12-the-board-has-three-tabs.md` on `main`
- **Approved:** 2026-10-13, jwloka, plan-PR #1608 merged
- **Branch:** `feature/an-issue-names-its-assignee` (base: `main`)
- **Ends as:** one PR to `main`
- **Review of the code:** CI green, then squash-merge

This slice waited on `feature/the-index-holds-closed-issues`, which merged as PR #1657
(`The issue index`, 2026-10-13). The wait is clear: nothing else in this plan's wave order
blocks it. The sibling slice `feature/people-names-a-tracker-account` (→ #1666, `The ticket
owner`) already merged (2026-10-14) and changed the shape this slice builds on — see
**The sibling slice already shipped** below, because it changes what the plan's own prose says.

### What to build

`Issue` gains one field, `assignees: string[]` — the tracker's own logins or Jira accounts,
`[]` where the tracker states none — read on both paths the board already has for issues:
the fleet's indexed path (`issueIndexRowOf` in `packages/fleet/src/shared/issue-refresh.ts:71`,
`IssueIndexRowSchema` in `packages/domain/src/entities/issue-index.ts:33`) and the no-fleet
path (`issueOf` in `packages/domain/src/adapters/tracker/tracker-shell.ts:52`). Today neither
carries it: `issueIndexRowOf` builds `{ number, title, url, createdAt?, status?, statusCategory?,
closedAt? }` with no assignee, `IssueIndexRowSchema` is `.strict()` with the same six keys, and
`issueOf` maps `RawIssue` (`tracker-shell.ts:12-22`, no `assignees` key) the same way. The field
is a read, not a write: `Issue`'s own doc (`entities/issue.ts:21-31`) already states the
"Plot reads it and never writes it" rule for `status`/`statusCategory`, and this is the same
shape of exception — never a license to widen `ports/tracker.ts`'s write refusal.

### The decisions this plan already settled — do not re-derive them

**Reading the field costs nothing extra.** The plan's Cost section measured this at zero new
host or tracker calls: the assignee rides the existing `issue-list` reads, each arm adds one
key to an existing `--json`/`jq`/`fields` list, and `ISSUE_INDEX_VERSION` is not raised (see
below). Verify this stays true — no new `gh`/`bb`/curl call, no new page.

**No index version bump, by design.** `IssueIndexRowSchema` gains `assignees: z.array(z.string()).optional()`,
under the same "no `.default()`" contract the file already states (`issue-index.ts:29-32`) —
`.optional()` is correct, `.default([])` is not, because a default round-trips a value the
tracker never answered. A reader of an old row with no `assignees` key maps it to `[]` — plain
code in `issueIndexRowOf`'s consumer, not a schema default. This is deliberate: it lets a board
built before this slice still parse a new row (it will reject one that *carries* the key, which
is the whole point — see the Changelog's restart note), while a board built after this slice
reads an old row with no key as unassigned. Do not raise `ISSUE_INDEX_VERSION`.

**The three host arms, by exact line (read against `main` at this slice's base):**

- **GitHub** (`skills/plot/scripts/plot-host.sh:4702-4710`): `gh_json="number,title,url,createdAt"`
  at `:4702` gains `,assignees`; the `jq` projection at `:4707-4710` adds
  `assignees:[.assignees[]?.login]` (or equivalent) to the object literal. `gh issue list --json`
  supports `assignees` as a list of login objects — confirm the shape against a real `gh issue
  list --json assignees` call before assuming `.login` is the field name.
- **Jira** (`:4591-4684`): `fields="summary,created,status"` at `:4633` (and `:4647` for the
  closed arm, which also needs it if closed rows should carry it — check the plan's Acceptance
  wording, which only requires it on the arms this slice's Acceptance names) gains `,assignee`;
  the `jq` projection at `:4676-4683` adds `assignees: ([.fields.assignee.emailAddress //
  .fields.assignee.accountId] | map(select(. != null)))` or equivalent — a hidden email falls
  back to `accountId`, per the plan's Design paragraph "The assignee". Jira's `assignee` field is
  a single object or `null`, never a list, so the list wrapping happens in the `jq`/mapping layer,
  not in the API response.
- **Bitbucket** (`:4721-4782`): unchanged. `bb issue list` prints no assignee — the arm already
  documents `url:""` for a field the host omits (`:4774-4776`); the same reasoning applies: no
  key is added, and the read side's `.optional()` / `?? []` handles its absence.

Each key goes on an existing line, so this slice adds no net shell lines — verify with
`scripts/check-shell-lines.sh pr` before pushing, not after a review flags it.

**The two read paths, and why both need the field:**

- **Under a fleet:** `issueOf` is called where? — no: the fleet path is `rowOf`-equivalent,
  i.e. `issueIndexRowOf` (`issue-refresh.ts:71-78`), which the fold calls per `Issue` the tracker
  answered; it must copy `assignees` into the index row *only when not empty* (the existing
  pattern every other optional field in that function follows — see the `...(issue.status === ''
  ? {} : { status: issue.status })` spread shape and mirror it for `assignees`, keyed on
  `.length === 0` rather than `=== ''`). `IssueIndexRowSchema` declares it `.optional()`. The
  store's reader (wherever `readIssuesFromStore`-equivalent code lives in the board — this slice
  does not touch the board, only the domain/fleet read path and the schema; the board-side
  `readIssuesFromStore` and `refreshIssues` consumers are the next slice, `Waiting on you`) maps
  an absent key to `[]`.
- **With no fleet:** `issueOf` (`tracker-shell.ts:52-61`) gains `assignees: raw.assignees ?? []`,
  and `RawIssue` (`:12-22`) gains `assignees?: string[]`.

**Scope boundary — this slice does NOT touch the board, and `IssueRowSchema` is settled.**
`IssueRowSchema` lives at `packages/board/src/contract/schema.ts:3421` — board-only payload
schema, with exactly one non-test importer, `fleet.ts:4280` (`issues: z.array(IssueRowSchema)`).
It is not shared domain/fleet code. The plan's own slice bullet (line 141) names it alongside
`refreshIssues`' projection, but both of those are the board-facing read path, which belongs to
the next slice, `feature/the-delivery-tab-filters-by-sprint-and-owner` ("Waiting on you") — its
own bullet (line 145) names `refreshIssues` and `readIssuesFromStore` explicitly as what it
edits. **This slice's job stops at:** `Issue.assignees`, the two host arms, `issueOf`,
`issueIndexRowOf`, `IssueIndexRowSchema`, and the doc comments on `issue.ts:21-31` and the index
schema that name it as a read beside `status`. Do not touch `packages/board/src/**` at all.

### The sibling slice already shipped — read its result, not the plan's forward reference

The plan's Design section (lines 73, 137) was written before `feature/people-names-a-tracker-account`
merged, and that slice's own Notes entry (2026-10-14, bottom of the plan) records a mid-flight
correction: CI's gate *The domain names no vendor* refused the literal `'github' | 'bitbucket' |
'jira'` union the plan's prose describes. **`TicketSource` is not that union** — it is
`{ service, match, prefix? }`, and the vendor words now live in
`packages/domain/src/adapters/tracker/tracker-listers.ts` (`TRACKER_LISTERS`, `HOST_ISSUE_LISTERS`,
`TICKET_SOURCES`), already read above. This slice's `assignees` field is read material for that
shape (`IssueLister.assignees` and `HostIssueLister.assignees` already declare `{ service, match,
prefix? }` per lister, e.g. `{ service: 'github', match: 'host-login' }`), but this slice does
not need to touch `tracker-listers.ts` — that file is done. Read it to confirm your `Issue.assignees`
field is a plain `string[]` of raw tracker identifiers (logins/emails/account IDs), because
`ticketOwnership` (built by the already-merged slice) is what interprets them against a `match`
kind — this slice only has to produce the raw list correctly per tracker.

### Done when

The plan's `## Acceptance` → "The assignee read" paragraph is the specification:

- `test/reconcile/host.test.mjs`: the GitHub and Jira `issue-list` arms print `assignees` from
  fixtures with zero, one and two assignees, and a Jira assignee with a hidden email prints its
  `accountId`; the Bitbucket arm prints no key.
- `packages/domain/test/tracker-shell.test.ts`: `issueOf` reads an absent key as `[]`.
- `packages/domain/test/issue-index.test.ts`: `IssueIndexRowSchema` decodes a row with
  `assignees` and a row without it at the same `ISSUE_INDEX_VERSION` — this is the assertion that
  exists *because* a naive implementation would either reject the old row (forgetting
  `.optional()`) or require the new key (forgetting it must round-trip with nothing).
- `packages/fleet/test/unit/issue-refresh.test.ts`: a fold pass over an `Issue` with two
  assignees writes both into the index row.
- `scripts/check-shell-lines.sh pr` passes — this is the assertion that catches a key added by
  appending a new line instead of extending an existing one.

Plus: run `node skills/plot/scripts/board/plot-local-checks.mjs` before each push and run what it
prints — it names the tests and typecheck of the packages this slice's changed files touch. The
suites in the `CI suites` config key (`pnpm run test:e2e`, `test:contracts`, `test:board`, the
domain vitest coverage run, `node --test test/reconcile/*.test.mjs`) run in CI on every PR; do not
run the full set locally — `test:e2e` in particular is CI's gate, not a local one (CLAUDE.md
Testing section). Install dependencies first if `node_modules` is missing; never skip a failing
test.

**The shell gate.** `scripts/check-shell-lines.sh` refuses a PR whose shell under `skills/` is
longer than at its merge base. This slice touches `plot-host.sh`, and the brief above is written
so each new key lands on an existing line — if a diff review shows a net-positive line count,
remove shell elsewhere in the same change or move the logic into a `jq` expression on an existing
line, not a new one. The gate stores no number and has no override.

### Bookkeeping

Open the PR through the controller once the branch exists and carries a commit:

```bash
skills/plot/scripts/plot-open-pr.sh          # current branch
skills/plot/scripts/plot-open-pr.sh --draft  # while work is still moving
```

Do not run `gh pr create` — it takes its title from the last commit subject rather than the
plan's wave heading, and the plan's gate expects the slice's heading. Push the first real commit
as soon as it exists so the PR can open early (draft is fine while incomplete). When the PR is
created, append `→ #<number>` to this branch's line in the plan's `## Slices` section, under
"### The assignee".

### Scope guard

This branch owns: `packages/domain/src/entities/issue.ts` (the `assignees` field and its doc),
`packages/domain/src/entities/issue-index.ts` (`IssueIndexRowSchema.assignees`),
`packages/domain/src/adapters/tracker/tracker-shell.ts` (`RawIssue.assignees`, `issueOf`),
`packages/fleet/src/shared/issue-refresh.ts` (`issueIndexRowOf`), and
`skills/plot/scripts/plot-host.sh` (the GitHub and Jira `issue-list` arms, lines named above).
It does not own any file under `packages/board/src/**`, including `fleet.ts`'s `refreshIssues`
projection and `contract/schema.ts`'s `IssueRowSchema` — both belong to the next slice.

Verified at brief-writing time (2026-10-14): every other slice in this plan has already merged —
`feature/the-tabs-are-discovery-planning-delivery` (#1651), `feature/the-active-sprint-button-selects-every-active-sprint`
(#1661), `feature/waiting-on-you-shows-a-failed-verification` (#1664) and
`feature/people-names-a-tracker-account` (#1666). This slice is the fifth of six, with only
`feature/the-delivery-tab-filters-by-sprint-and-owner` left after it — which waits on both this
slice and `feature/the-index-holds-closed-issues` (already merged, #1657). Re-verify with
`gh pr list --state all --head <branch>` before assuming this is still accurate, since state
moves between brief-writing and dispatch — but there is no live collision to plan around today.

If you find something the plan did not anticipate, report it rather than improvising outside
scope — in particular, if `IssueRowSchema`'s ownership (board vs. shared) turns out ambiguous in
a way this brief did not resolve, say so rather than guessing either direction silently.
