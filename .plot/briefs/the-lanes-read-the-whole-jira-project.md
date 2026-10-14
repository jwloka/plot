## Implementation brief — tickets-and-stories-have-lanes (wave 5: The Jira project scope)

- **Plan (canonical):** docs/plans/2026-10-12-tickets-and-stories-have-lanes.md on main
- **Approved:** see plan `## Status`
- **Branch:** `feature/the-lanes-read-the-whole-jira-project` (base: `main`)
- **Ends as:** one PR to `main`
- **Review of the code:** per repo convention (CODEOWNERS / standard PR review)

This branch waits on `feature/the-delivery-tab-filters-by-sprint-and-owner` of
`the-board-has-three-tabs`, which owns the `Issue.assignees` filter that scopes
the Delivery inbox to a matched reader. That branch has merged (PR #1677), so
this slice is unblocked. This is also the last branch of this plan — every
other slice (`the-fleet-indexes-issues`, `the-tracker-lists-closed-issues`,
`the-index-holds-closed-issues`, and the Discovery-lanes slices) has merged.

### What to build

Today, `plot-host.sh`'s Jira `issue-list` open read always sends
`assignee = currentUser() AND resolution = EMPTY<scope> ORDER BY created DESC`
(`plot-host.sh:4625`) — `<scope>` is the `project IN (...)` clause built at
`:4616-4621` from `Ticket prefixes`, but the `assignee = currentUser()` clause
is unconditional. So even a repository that declares `Ticket prefixes` still
gets only the reader's own tickets in the Discovery lanes — there is no
project-wide read anywhere yet, and `IssueIndexSchema`
(`packages/domain/src/entities/issue-index.ts`) has no `inbox` field to hold
one.

This slice makes three changes:

1. **The lanes read drops the person clause.** Where `Ticket prefixes` is
   declared (`scope` non-empty), the open-read JQL becomes
   `resolution = EMPTY${scope} ORDER BY created DESC` — no `assignee` term —
   so the lanes show every ticket of the declared projects. Where `Ticket
   prefixes` is absent (`scope` empty), the JQL is byte-identical to today's:
   `assignee = currentUser() AND resolution = EMPTY ORDER BY created DESC`.
   `PLOT_JIRA_JQL` keeps overriding both, exactly as it does today. The closed
   read (`:4635-4647`) already requires `Ticket prefixes`, but its JQL
   (`:4646`) still opens with `assignee = currentUser()` unconditionally — see
   the open question below on whether this slice drops that clause too.
2. **The D23 inbox read.** Where `Ticket prefixes` is declared, a Jira pass
   makes one additional read — today's exact query,
   `assignee = currentUser() AND resolution = EMPTY${scope} ORDER BY created DESC`
   (the string the open read used to send unconditionally) — one page of 50,
   and the issue index holds its rows under a new `inbox` field. Where `Ticket
   prefixes` is absent, skip this read: the open read already **is** today's
   query, so the board takes the inbox from the open rows (pass `inbox` as
   `undefined`, the fallback `waitingTickets` already handles — see below).
   `PLOT_JIRA_JQL` overrides this read the same way it overrides the inbox
   today, not the lanes read.
3. **Wire the populated `inbox` through to the domain rule.** `waitingTickets`
   (`packages/domain/src/rules/waiting-tickets.ts`) already accepts and unions
   an `inbox` parameter — this logic shipped already via `the-board-has-three-tabs`.
   The only production caller, `waitingOf` in
   `packages/board/src/server/fleet.ts` (around line 1755), currently calls
   `waitingTickets(rows, undefined, reader, source, complete)` — hardcoded
   `undefined`. This slice threads the real `inbox` array from the issue index
   through `waitingOf`'s signature to that call.

### The decisions the plan settles — do not re-derive them

**The union/notice logic is already built; this slice is data plumbing, not
rule design.** `waiting-tickets.ts`'s tracker-account branch already does
exactly what D23 describes: an unmatched reader sees `inbox` (or `rows` if
`inbox` is `undefined`) with a notice naming the raw assignee value and the
missing `People` spelling; a matched reader sees `unionDedup(inbox ?? [],
mine)`, deduped by ticket number, newest first. Do not re-implement any of
this in `fleet.ts` or anywhere else — the only gap is that `waitingOf` passes
`undefined` where it should pass the index's `inbox` rows.

**`IssueIndexSchema` needs an `inbox` field before any of this can be wired.**
Grep confirms no such field exists today (`packages/domain/src/entities/issue-index.ts`).
Model it the same shape as `closed`'s rows — an optional array of
`IssueIndexRow` — since, like `closed`, it is absent entirely on an instance
with no `Ticket prefixes` declared (not an empty array: absent means "no
inbox read happened," never "the inbox is empty").

**The inbox read belongs in `refreshIssueIndex`'s fold, gated on the same
`Ticket prefixes` check as the lanes read.** `packages/fleet/src/shared/issue-refresh.ts:214`
is the one fold that calls `tracker.issueListOpen` and (conditionally)
`tracker.issueListClosed`; grep confirms no inbox-specific logic exists there
yet. Add the inbox call alongside the open/closed calls, gated the same way
`plot-host.sh` gates it — on `Ticket prefixes` being declared — and skip it
otherwise so the fold's request count does not grow for an adopter who never
set the key.

**The inbox counts in the pass's existing request gate, and that is
deliberate (D30).** Do not give the inbox read a gate of its own. One more
request per pass (when `Ticket prefixes` is declared) lengthens the pass
interval slightly — the plan's own numbers: a 1000-open-ticket project goes
from 10 requests to 11, a pass every 22 minutes instead of 20. A dedicated
gate is explicitly deferred to "when an adopter reports a stale inbox" — do
not build it preemptively.

**The Delivery-tab filter is NOT this slice's job.** `waitingTickets`'s filter
by `Issue.assignees` for a reader with no `jira:` spelling (D21/D22) is owned
by `the-board-has-three-tabs` and has already merged — this slice supplies
data, that slice already supplies behavior. Do not touch the matching logic
in `waiting-tickets.ts`.

**Absence, not an empty array, is the signal throughout.** Consistent with
the `closed` field's existing convention and `waitingTickets`'s own
`inbox !== undefined` checks: a repository with no `Ticket prefixes` must
produce an index with `inbox` absent (`undefined`), never `inbox: []` — the
rule treats those two states differently (absent falls back to `rows`; an
empty array is a candidate set of zero, which changes the `matched` and
`candidates.length > 0` branches in `waitingTickets`).

**The three doc sites all currently describe the OLD "undeclared key keeps
the instance-wide query" framing backwards from what this slice makes true.**
`skills/plot-board-setup/SKILL.md:229-231`, `skills/plot-init/SKILL.md:205-208`,
and `plot-config.sh:180-183` (the `Ticket prefixes` comment block, around line
179) currently say roughly "a repository that declares it gets an inbox
holding its own tickets; one that declares nothing keeps the instance-wide
query." After this slice, invert it: an **undeclared** key keeps today's
person-scoped inbox (unchanged from before), and the **declared** key is what
turns on the project-wide lanes and closed read, with the inbox read split
out separately. Match the plan's own replacement language under "The docs."

### Done when

The plan's `## Done when` / Acceptance bullets this slice is responsible for:

- With Jira and no `Ticket prefixes`, the closed read exits 4 and runs no
  `curl`, and the open read sends today's JQL byte for byte, with
  `assignee = currentUser()`.
- With `Ticket prefixes` declared, the Jira lanes read builds a JQL with no
  `assignee` clause and a `project IN (…)` clause, the inbox read builds
  today's JQL, and *Waiting on you* shows the `inbox` rows to a reader with no
  `jira:` spelling, with no notice, and the `inbox` rows unioned with the
  project rows whose assignee resolves to the reader, to a reader with one.
- `ports/tracker.ts` and `CLAUDE.md` name `trackerGitHost` as the issue reader
  for a repository with no `Tracker` key (unaffected by this slice, but
  `./scripts/check-agents-md.sh` must still pass after the `CLAUDE.md`/doc
  edits above — run it, don't assume prose-only changes are exempt).

Plus assertions a naive implementation would pass without:

- A repository with no `Ticket prefixes` must see **zero** behavior change —
  same JQL, same request count, `inbox` absent on the index. Test this
  explicitly rather than only testing the declared-key path; it is the easy
  case to break by accident (e.g. by making the inbox read unconditional).
- `inbox` absent vs. `inbox: []` are different states to `waitingTickets` —
  a test asserting the fallback-to-`rows` behavior must construct an index
  with the field genuinely absent, not an empty array, or it will pass
  against the wrong branch.
- The closed read's JQL currently also opens with `assignee = currentUser()`
  (`plot-host.sh:4646`) even though it already requires `Ticket prefixes` —
  confirm whether D20's "no read without a person clause leaves the declared
  projects" means the closed read drops that clause too in this slice, or
  whether the closed read's person clause is intentionally untouched (the
  plan's slice text does not name the closed read explicitly). If in doubt,
  re-read the plan's Acceptance bullet on the closed read before changing it,
  and report back rather than guessing either way.

Plus the repo's own gates: a changeset — this slice touches `packages/domain`
(schema), `packages/fleet` (the fold), `packages/board` (`fleet.ts` wiring),
and `skills/plot/scripts/plot-host.sh` — bump whichever packages the diff
actually touches, written description-first with the `bumps:` block last
(`CLAUDE.md` *Versioning*). Run
`node skills/plot/scripts/board/plot-local-checks.mjs` before each push and
run what it prints — it resolves the related tests and typecheck for
whichever of `packages/domain`, `packages/fleet`, and `packages/board` this
diff touches, plus the relevant `scripts/check-*.sh` gates. The suites under
the `CI suites` config key (`test:e2e`, `test:contracts`, `test:board`,
domain coverage, `test/reconcile/*.test.mjs`) run in CI on this PR — don't
run them locally (`CLAUDE.md` *Testing*). A failure there comes back as a
correction.

This slice touches `plot-host.sh`, so `scripts/check-shell-lines.sh` applies:
the plan's own "shell lines" table estimates this slice at roughly net zero
(a small reduction in the scope-build block offset by the new inbox-read
branch), but treat that as an estimate, not a budget — if the diff grows
shell lines under `skills/`, remove an equal number elsewhere in the same
change, or move the new logic into the domain and reach it through a bundle.
The gate stores no number and has no override.

### Bookkeeping

Open the PR through the controller, never `gh pr create`:

```bash
skills/plot/scripts/plot-open-pr.sh          # current branch
skills/plot/scripts/plot-open-pr.sh --draft  # while work is still moving
```

It reads which plan names this branch and opens the PR with the slice heading
as title, the plan and this brief in the body. Push the first real commit as
soon as it exists — a branch with no PR and no commits is invisible to the
fleet. Once the PR exists, append `→ #<number>` to this branch's line in the
plan's `## Slices` section (heading "The Jira project scope",
`feature/the-lanes-read-the-whole-jira-project` line).

### Scope guard

This branch owns:

- `skills/plot/scripts/plot-host.sh` — the Jira `issue-list` open-read JQL
  (`:4611-4625`), the closed-read JQL's person clause (`:4636-4647`, pending
  the open question above), and the new inbox-read branch
- `packages/domain/src/entities/issue-index.ts` — the new `inbox` field on
  `IssueIndexSchema`
- `packages/fleet/src/shared/issue-refresh.ts` — `refreshIssueIndex`'s fold,
  adding the gated D23 inbox call
- `packages/board/src/server/fleet.ts` — `waitingOf`'s signature and its
  `waitingTickets(...)` call site (around line 1755), threading the real
  `inbox` array instead of `undefined`
- `skills/plot-board-setup/SKILL.md:229-231`, `skills/plot-init/SKILL.md:205-208`,
  and the `Ticket prefixes` comment block in `plot-config.sh` (around
  `:178-185`) — the doc inversion described above
- Contract/unit tests for the above
- A changeset file

**Do not touch `packages/domain/src/rules/waiting-tickets.ts`** — its union
and notice logic is already correct and already merged; this slice only
supplies real data to it. **No other branch of this plan is in flight** —
every prior wave (`the-fleet-indexes-issues`, `the-tracker-lists-closed-issues`,
`the-index-holds-closed-issues`, and the Discovery-lanes slices) has merged
to `main`; their code is available to build on, not to re-touch. If you find
something this brief or the plan did not anticipate, report it rather than
improvising outside scope.
