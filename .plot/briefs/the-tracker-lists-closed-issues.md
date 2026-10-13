## Implementation brief — tickets-and-stories-have-lanes ("The readings")

- **Plan (canonical):** [docs/plans/2026-10-12-tickets-and-stories-have-lanes.md](../../docs/plans/2026-10-12-tickets-and-stories-have-lanes.md) on `main`
- **Approved:** 2026-10-12, Jan Wloka, plan-PR #1608 merged
- **Branch:** `feature/the-tracker-lists-closed-issues` (base: `main`)
- **Ends as:** one PR to `main`
- **Review of the code:** standard PR review

This is the second slice under its own heading, "The readings" — a sibling, `feature/the-board-reads-archived-stories`, is grouped under the same heading but is a separate, unrelated branch (don't pull its scope in here). The spike, `feature/the-fleet-indexes-issues`, merged 2026-10-13 (PR #1647), and the `.plot/hold` lines D29 placed on this branch and three others have already been lifted (`plot: lift the spike-first holds of tickets-and-stories-have-lanes`, committed on `main`). This branch is unclaimed and unblocked — nothing waits on it and it waits on nothing.

### What to build

The spike proved the index/gate mechanism using only today's open-issue read. This slice adds the other half of the read surface: closed issues, on the tracker port, through the shell. Concretely:

1. **`plot-host.sh issue-list` gains `--state open|closed` (default `open`), `--since <iso>` and `--page-token <t>`.** GitHub reuses its existing open arm with `gh_state=closed`, a `--search "closed:>=<since>"` filter and `closedAt` added to the `--json` fields. Jira adds a closed JQL arm: `project IN (<Ticket prefixes>) AND resolved >= "<since>"`, `ORDER BY resolved DESC`, scoped by `Ticket prefixes` — with none declared, the closed read **exits 4** with a stated reason and runs no `curl` at all (an unscoped `resolved >=` query would read the whole Jira instance, the same hazard `tracker_projects` already measured for the open read). Bitbucket's closed read **exits 4** too: `bb issue list` prints no closing date, so there is nothing honest to return.
2. **The Jira page loop moves out of the shell and into the TypeScript adapter.** `maxResults=100` (`ISSUE_PAGE_ROWS`, today's inbox default is 50 — that default is for the *inbox* read only, not this one) and the shell prints the response's `nextPageToken` as a trailing JSON line, which `trackerReads` strips and loops on with `--page-token`. One shell call reads one page; the shell holds no loop of its own. The GitHub arm already pages internally inside `gh issue list --limit <n>`, so it needs one extra budget record per 100 rows past the first (the `gh` wrapper records one call per process, `plot-host.sh:3382-3388`).
3. **`Issue.closedAt: string | null`** on the entity (`entities/issue.ts`) — the tracker's own closing time; `null` on an open issue and on a closed issue whose tracker states no date (Bitbucket, always).
4. **`Tracker.issueListClosed(since, limit)`** on the port (`ports/tracker.ts`) and on all three implementations that can answer it: `trackerGitHost`, `trackerGithub`, `trackerJira`. It lists issues closed at or after `since`, newest first, without bodies. A read that stops at `limit` reports `complete: false`.
5. **`unaskable` gets an optional `reason: string`** (`port-result.ts`). `trackerGitHost` fills it on every write (*"no Tracker declared; the git host's issues are read-only to Plot"*); `trackerNone` fills it with whatever `issueSource` already states (`rules/issue-source.ts:51-63`). A caller reading only `why` is unaffected — this is additive.
6. **Entity text.** `entities/issue.ts:20-31` gets `closedAt` documented beside `status` as a read, same register as the rest of the file.
7. **Contract tests** covering the new shell arms and the three readings bullets under `## Acceptance` below.

Close by pointing at the plan: `## Design` → *Closed issues on the port*, *Pages* and *The Jira project scope (D20, D23)*'s first two sentences (the project-wide widening itself is the **later** slice `feature/the-lanes-read-the-whole-jira-project` — don't build that here, only the `Ticket prefixes`-gated exit-4 behavior for the closed read) are canonical; this is orientation.

### Decisions already made — do not re-derive them

**Why the Jira closed read requires `Ticket prefixes` and the open read today does not (yet).** The closed read is brand new, so there is no existing behavior to preserve byte-for-byte — this slice can and must gate it on `Ticket prefixes` from day one. The *open* read's unscoped-without-`Ticket prefixes` behavior is deliberately left alone here; widening it waits on `feature/the-lanes-read-the-whole-jira-project`, which itself waits on the Delivery tab's assignee filter. Don't "fix" the open read's scope while you're in this file — that's explicitly out of scope and belongs to a held, later slice.

**Why the page loop moves to TypeScript and not just for this slice's arms.** Keeping the loop in shell would mean a `while` over `jq`-parsed `nextPageToken` per tracker, with the exit-code/stderr contract duplicated per arm. The design puts the loop once, in `trackerReads`, so every Jira-backed reader (today's inbox, this slice's closed read, and the project-wide read to come) shares one page-walking implementation. The shell's only job is to print one page and the next page's token as a trailing JSON line.

**Why GitHub's closed read is "the same arm with a different state," not a new arm.** `gh_state` already exists and already derives from the state being asked for (`:4730-4736` today). Reusing it instead of writing a second GitHub code path is why the *Shell lines* table below nets this slice at roughly −1 rather than positive — a second GitHub arm would have blown that budget.

**Why `complete: false` and not a silent truncation.** A closed read that hits `limit` has not told the caller everything — `complete: false` is the same "absent is not false" discipline `CLAUDE.md` states elsewhere in this estate (the issue index, the PR index). Don't let a page-capped read report as if it were exhaustive.

**Why `unaskable`'s `reason` is additive, not a breaking signature change.** Two implementations (`trackerGitHost`, `trackerNone`) need to say *why* a write was refused; `unaskable()` with no argument still works everywhere else. Don't touch call sites that don't care about the reason.

**The shell-line ratchet, named precisely so you don't guess at it mid-slice.** `scripts/check-shell-lines.sh` refuses a PR that grows the shipped shell under `skills/` past its merge base — measured on `plot-host.sh` at `e3c4ef35b`, the plan's own estimate for this slice is **roughly −1 net**:
- Removed (measured, −16 total): the `nobody` blocks collapse from 4 lines to 1 each (−6); the `gh` failure bodies collapse to one call each to a one-line `gh_fail` (−3); the Bitbucket category `case` folds into the existing `jq` program (−5); the Bitbucket limit check becomes one line (−2).
- Added (estimated, about +15): `--state`/`--since`/`--page-token` parsing (+3); the GitHub `--search` array and its extra-page budget record (+3); the Bitbucket closed exit-4 (+1); the Jira closed JQL with its `Ticket prefixes` guard (+4); the page-token argument (+2); the `closedAt` projection (+1); the `nextPageToken` trailing line (+1).

If your actual diff lands with a positive net, the plan's own fallback applies: move one more piece into the TypeScript adapter before merging — Bitbucket's closed refusal first (worth −1), then the GitHub `--search` array (worth −2). Don't merge with a positive net and don't ask for an exemption; there is none.

**Rules carried over unchanged, worth not re-breaking:**
- Absent is not false: a Bitbucket/unscoped-Jira exit 4 is a distinct, stated refusal — not an empty list masquerading as "no closed tickets."
- Three outcomes stay apart on every op: an answered empty list, a failure (non-zero exit, something on stderr), and exit 4 ("this host cannot be asked at all," a config fact, not an incident to retry). Don't collapse any two.
- `jq --argjson` is never the slurp mechanism past small payloads — the GitHub run-for-sha arm already works around this (128 KB cap on Linux); keep using the stdin-slurp pattern if you need to hand JSON through `jq`.

### Done when

The plan's `## Acceptance` → **"The plan"** bullets are the exact specification for this slice's share of the work — read the full list in the plan, but concretely for this branch:

- On this repository (no `Tracker` key, GitHub), `plot-host.sh issue-list --state closed --since <now−14d>` prints issues with a non-empty `closedAt`, and `trackerGitHost(...).issueListClosed` answers them; its `limit()` still reports only `github` buckets (unchanged from the spike).
- On Bitbucket, `plot-host.sh issue-list --state closed` exits 4 with a reason and runs no `bb` command.
- With Jira and no `Ticket prefixes`, the closed read exits 4 and runs no `curl`.
- A unit test per new reading path above (GitHub closed, Bitbucket closed refusal, Jira closed with/without `Ticket prefixes`).
- `one-issue-index-writer.test.ts` (from the spike) still passes unmodified — this slice adds no second writer of `issues.json`; it only widens what a `Tracker` can answer. (You are not touching `issue-refresh.ts`'s fold logic — that's `feature/the-index-holds-closed-issues`, a later held-then-released sibling, not this branch.)

Plus the repo's own gates: a changeset with `bumps: plot: patch` (or the matching skill bump, if a skill doc changes), written description-first with the `bumps:` block last (`CLAUDE.md` *Versioning* — 11% of past changesets got this backwards and were refused). Run `node skills/plot/scripts/board/plot-local-checks.mjs` before each push and run what it prints — it resolves the related tests and typecheck for whatever package you touch (`packages/domain` is the one this slice mostly lands in) plus the relevant `scripts/check-*.sh` gates, including `check-shell-lines.sh`. The suites under the `CI suites` config key (`test:e2e`, `test:contracts`, `test:board`, domain coverage, `test/reconcile/*.test.mjs`) run in CI on this PR — don't run them locally (`CLAUDE.md` *Testing*). A failure there comes back as a correction.

Name the shell gate explicitly since this slice is the one with real shell-line churn: `scripts/check-shell-lines.sh` refuses growth with no stored allowance — see the ratchet section above for the exact fallback if your diff lands positive.

### Bookkeeping

Open the PR through the controller, never `gh pr create`:

```bash
skills/plot/scripts/plot-open-pr.sh          # current branch
skills/plot/scripts/plot-open-pr.sh --draft  # while work is still moving
```

It reads which plan names this branch and opens the PR with the slice heading as title, the plan and this brief in the body. Push the first real commit as soon as it exists — a branch with no PR and no commits is invisible to the fleet. Once the PR exists, append `→ #<number>` to this branch's line in the plan's `## Slices` section (heading "The readings", `feature/the-tracker-lists-closed-issues` line).

### Scope guard

This branch owns:
- `skills/plot/scripts/plot-host.sh` — the `issue-list` op's `--state`, `--since`, `--page-token` parsing; the GitHub closed arm (reusing `gh_state`); the Bitbucket and unscoped-Jira exit-4 refusals; the Jira closed JQL arm; the trailing `nextPageToken` line
- `packages/domain/src/entities/issue.ts` — `closedAt: string | null` and its doc text
- `packages/domain/src/ports/tracker.ts` — `issueListClosed(since, limit)` on `Tracker`
- `packages/domain/src/port-result.ts` — the optional `reason` on `unaskable`
- `packages/domain/src/adapters/tracker/tracker-resolve.ts` — `issueListClosed` on `trackerGitHost`; the `reason` fill on its `unaskable` write
- `packages/domain/src/adapters/tracker/tracker-shell.ts` — the page-token loop in `trackerReads`, the `closedAt` projection in `issueOf`
- `packages/domain/src/adapters/tracker/tracker-github.ts`, `tracker-jira.ts`, `tracker-none.ts` — `issueListClosed` wiring; `trackerNone`'s `reason` fill
- Contract tests for the above
- A changeset file

**No other branch on this plan is in flight** (verified: `feature/the-board-reads-archived-stories`, `feature/the-index-holds-closed-issues`, `feature/tickets-and-stories-have-lanes` and `feature/the-lanes-read-the-whole-jira-project` all have no remote ref yet). Do not build the issue index's closed-row fold, the board's no-fleet gate fields, `PR_REQUESTS_PER_REFRESH`'s rebalancing, the archived-stories payload, the ticket/story lane rules, the Discovery tab, the Jira project-wide scope, or the D23 inbox read — those are later, still-held-until-opened slices, even though the plan's `## Design` describes them in the same prose block this slice's text lives in. If you find something the plan did not anticipate, report it rather than improvising outside scope.
