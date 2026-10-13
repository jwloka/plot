## Implementation brief — tickets-and-stories-have-lanes ("The issue index")

- **Plan (canonical):** [docs/plans/2026-10-12-tickets-and-stories-have-lanes.md](../../docs/plans/2026-10-12-tickets-and-stories-have-lanes.md) on `main`
- **Approved:** 2026-10-12, Jan Wloka, plan-PR #1608 merged
- **Branch:** `feature/the-index-holds-closed-issues` (base: `main`)
- **Ends as:** one PR to `main`
- **Review of the code:** standard PR review

This is the only branch under its own heading, "The issue index" — no sibling shares it. The spike, `feature/the-fleet-indexes-issues`, merged 2026-10-13 (PR #1647) and met its Acceptance in CI. The reader half of this slice's dependency, `feature/the-tracker-lists-closed-issues` (PR #1653, "closed issues on the tracker port"), is also merged to `main`: `Tracker.issueListClosed`, `trackerForIssues`, `trackerGitHost` and `Issue.closedAt` already exist and are callable today. The `.plot/hold` line D29 placed on this branch has been lifted (`plot: lift the spike-first holds of tickets-and-stories-have-lanes`, committed on `main`; `.plot/hold` is now empty). This branch is unclaimed and unblocked — nothing waits on it and it waits on nothing.

### What to build

Two slices already gave you the pieces; this slice wires them together. Verified against `main` at the time of writing:

- `packages/domain/src/entities/issue-index.ts` exports `IssueIndexSchema` with `ISSUE_LIST_LIMIT = 50` and **no `closed` field** — the open-only shape the spike shipped.
- `packages/fleet/src/shared/issue-refresh.ts`'s `refreshIssueIndex` folds only the open read (`issueIntervalMs`, the one-writer test, the gate fields) — it does not call `issueListClosed`.
- `packages/board/src/server/fleet.ts`'s `refreshIssues` (around line 1528) still calls `scriptsFor(opts).hostSaid(['issue-list', '--limit', String(ISSUE_LIMIT)])` directly — it does not go through `trackerForIssues`, and `CacheEntry` carries no `issueNextAt`, `issueRequests` or `issueBackoffUntil`.
- `packages/fleet/src/shared/pr-refresh.ts`'s `PR_REQUESTS_PER_REFRESH` (around line 205) already reads `github: 1`, but `bitbucket: 4` with a comment saying the 4th request is `issue-list`, which "now reaches the network instead of exiting 4" — that comment describes the state *before* this slice's no-fleet rewiring.

Concretely, this slice:

1. **Widens the fold.** `refreshIssueIndex` (`issue-refresh.ts`) also asks `world`'s tracker for `issueListClosed(since, ISSUE_INDEX_OPEN_LIMIT)` where `since = at − 14 days`, and the open read's limit rises from `ISSUE_LIST_LIMIT` (50) to a new `ISSUE_INDEX_OPEN_LIMIT = 1000` with a page loop (the Jira/GitHub page-walking already lives in `trackerReads`/`trackerShell`'s adapter from the merged closed-issues slice — this slice just asks for more rows and reports `complete: false` at the cap). `IssueIndexSchema` gains an **optional** `closed` field (open rows unaffected; absent decodes as "not read," so no version bump per the plan's *The issue index* bullet) holding the closed rows, `since` and the closed read's own `answered`/`unsupported`/`failed` answer. A closed read that fails independently of the open read (or answers `unsupported`) must not blank an otherwise-successful open pass — the plan's *A failed pass* rule (closed and open track their own `answer` and `failedAt`).
2. **Rewires the board's no-fleet path.** `refreshIssues` (`fleet.ts`) stops calling `hostSaid(['issue-list', ...])` directly and calls `trackerForIssues(declared, entry.backend, context).issueList(...)` instead — the same resolver `issue-refresh.ts` already uses, so there is exactly one route from "something wants the open list" to the shell, fleet or no fleet. `CacheEntry` gains `issueNextAt`, `issueRequests` and `issueBackoffUntil`, run on `refreshIssues`'s own `issueIntervalMs` gate (mirroring how `prNextAt` already gates `refreshPrs`) — this is the board's *own* fold when no fleetd is folding for it, not a second writer of `issues.json` (the board with no fleet writes no file; see Scope guard).
3. **Builds the no-fleet `PrWorld.issueGate`.** The `PrWorld` built at `fleet.ts` (around line 1663-1671 pre-slice numbering) gets an `issueGate` reader returning `{ connector, account, requests: entry.issueRequests, nextAt: entry.issueNextAt, backoffUntil: entry.issueBackoffUntil }` from `CacheEntry` — the same shape fleetd's own `issueGate` reader already returns from `issues.json`. `cadenceRateOf` and the backoff hold in `refreshPrs` (`pr-refresh.ts:1387-1388`) are unchanged; this slice supplies the missing *reader*, not new subtraction logic.
4. **Rebalances `PR_REQUESTS_PER_REFRESH`.** `bitbucket` falls from 4 to 3 and its comment stops saying the issue read rides the PR refresh — once the no-fleet board reads issues through its own `issueIntervalMs` gate (step 2), `refreshPrs` itself makes no `issue-list` call on Bitbucket, so 4 over-declares the cost from this slice on. `github` stays 1; its comment gets one clause noting the issue reads run on their own gate.
5. **Amends `DESIGN-index.md`.** The jira row at `:122` ("JQL `updated >= "$watermark"`, daily, full read") and the general index-shape line at `:57` ("one file per connector per repository") both describe a delta-plus-daily-full-read pattern this plan does not build for issues — the issue fold replaces two bounded sets whole every pass (*Fold* in the plan's Design), no watermark, no `updatedAt`, no separate full read. Add a note at both sites, in the register the rest of that doc uses, saying the issue index (`tickets-and-stories-have-lanes`) does not follow this row's shape and why (whole-replacement fold over two bounded sets, not a delta).

Close by pointing at the plan: `## Design` → *The open list*, *The issue index*, *Fold*, *A failed pass* and *The PR pass reads the issue gate (D28)* are canonical; this is orientation, and the two merged slices already did the harder design work (the gate math, the port, the closed-read shell arms).

### Decisions already made — do not re-derive them

**Why this slice does not touch `trackerForIssues`, `issueListClosed` or the shell.** Both exist and are tested (`the-fleet-indexes-issues` built the resolver and gate math; `the-tracker-lists-closed-issues` built the closed-read port method and shell arms, including the `Ticket prefixes` guard and the Bitbucket/unscoped-Jira exit-4 refusals). This slice is purely the *consumer* wiring: call what already exists, from two more places (the fold, and the no-fleet board), and store one more field. Resist the urge to "improve" the tracker port or the shell arms while you're adjacent to them — that is not this branch's scope, and both are already merged and covered by their own tests.

**Why the no-fleet board needs its own gate instead of sharing fleetd's.** The no-fleet board has no `issues.json` to read — nothing is folding for it. It must run its own copy of the same cadence math fleetd runs, exactly as `refreshPrs`'s no-fleet path already keeps its own `prNextAt` independent of fleetd's PR index. `CacheEntry.issueNextAt`/`issueRequests`/`issueBackoffUntil` are that copy — in-memory only, never written to `.plot/state/index/issues.json`. Writing that file from the no-fleet board would be a second writer, which the plan's *One writer* rule (and the one-writer test from the spike) forbids.

**Why the closed fold uses `at − 14 days`, not a configured window.** D19 (resolved Open Point 8) fixed the index's retention at 14 days; the toggle's on-demand read is the uncapped path (1000-row cap, not time-bounded) and is **not** this slice — it is already built as part of `feature/tickets-and-stories-have-lanes`'s `GET /api/issues/closed` endpoint reading the same gate this slice exposes. Don't build a configurable retention window; 14 days is fixed by the resolved Open Point.

**Why `ISSUE_INDEX_OPEN_LIMIT` is 1000 and not infinite, and why a capped read sets `complete: false`.** Same "absent is not false" discipline the merged closed-issues slice already applied to its own page cap — a truncated read that silently reports as exhaustive would hide tickets from the lanes with no signal to the reader. Carry the same `complete` field through for the open read's new higher cap.

**Why `PR_REQUESTS_PER_REFRESH.bitbucket` moves to 3 in this slice and not the previous one.** The comment currently blames the 4th request on `issue-list` "now reaching the network" — that became true only once `refreshIssues` (the no-fleet board) itself made the call inline with the PR refresh's cost accounting. This slice is what moves the no-fleet issue read onto its *own* gate (step 2 above), which is exactly what makes the 4th request no longer part of the PR refresh's own cost. Moving the constant in an earlier slice would have been premature — the behavior it describes didn't exist yet.

**Rules carried over unchanged, worth not re-breaking:**
- Only a terminal answer is read from the index for a *decision*; the open/closed rows and the gate fields are read for *display and cadence math only* — no lifecycle step, merge or slice decision may read `issues.json`. This slice adds a reader (the no-fleet `issueGate`) that follows the same rule: it feeds `cadenceRateOf`'s rate subtraction, a display/scheduling concern, never a lifecycle one.
- `source` is a key a reader compares against its own `issueSource` reading, never a value decided from. Nothing in this slice changes that — the closed rows inherit the same `source` field the open rows already carry, written once per file.
- A failed pass keeps the previous rows and `at`; `at` moves only on an answered read. Apply this per-set: a closed-read failure with an open-read success keeps the open rows fresh and the closed rows stale, each under its own `answer`/`failedAt`.

### Done when

The plan's `## Acceptance` → **"The plan"** bullets this slice is responsible for:

- The fold reads every open issue up to `ISSUE_INDEX_OPEN_LIMIT` (1000) with a page loop and the closed issues of the last 14 days into `closed`, each reporting `complete` and its own `answer`.
- With a fleet running, the board's periodic refresh still makes no `issue-list` call (unchanged from the spike — confirm it still holds with `closed` now in the mix); with no fleet, `refreshIssues` calls through `trackerForIssues` on its own `issueIntervalMs` gate and writes no file under `.plot/state/index/`.
- A ticket that closes and then reopens leaves `closed` and returns to the open rows on the next pass (exercise this against the whole-replacement fold, not a delta).
- A failed closed-read pass keeps the previous closed rows and their `at`, independent of the open read's own success or failure.
- `PR_REQUESTS_PER_REFRESH` reads `github: 1` and `bitbucket: 3`, and the PR pass's stretch does not rise when only the issue fold spends (this is an existing assertion from the spike's Acceptance — re-run it against the new constant).
- `one-issue-index-writer.test.ts` still finds exactly one caller of `encodeIssueIndex`, in `issue-refresh.ts` — this slice widens what that one writer folds; it does not add a second writer. The no-fleet board's `CacheEntry` fields are read-only mirrors of the same cadence math, never serialized to disk.
- `DESIGN-index.md`'s jira row and `:57` carry a note that the issue index is a whole-replacement fold over two bounded sets, not the delta-plus-daily-full-read shape the rest of the table describes.

Plus the repo's own gates: a changeset — this slice touches `packages/domain` (schema), `packages/fleet` (the fold) and `packages/board` (the no-fleet path), so bump whichever packages the diff actually touches (likely `plot: patch` if it's purely internal wiring with no board-facing behavior change visible without a fleet, or check whether `@plot-pm/board`'s `CacheEntry` shape change warrants its own bump), written description-first with the `bumps:` block last (`CLAUDE.md` *Versioning*). Run `node skills/plot/scripts/board/plot-local-checks.mjs` before each push and run what it prints — it resolves the related tests and typecheck for `packages/domain`, `packages/fleet` and `packages/board`, whichever this diff touches, plus the relevant `scripts/check-*.sh` gates. The suites under the `CI suites` config key (`test:e2e`, `test:contracts`, `test:board`, domain coverage, `test/reconcile/*.test.mjs`) run in CI on this PR — don't run them locally (`CLAUDE.md` *Testing*). A failure there comes back as a correction.

This slice's own shell-lines row in the plan reads "none / none / 0" — it is TypeScript-only (the entity schema, the fold, the board's fleet.ts, the PR-refresh constant) plus one markdown doc edit. `scripts/check-shell-lines.sh` should see no change; if your diff touches `.sh` anywhere, that is a sign you've drifted into the already-merged closed-read slice's territory.

### Bookkeeping

Open the PR through the controller, never `gh pr create`:

```bash
skills/plot/scripts/plot-open-pr.sh          # current branch
skills/plot/scripts/plot-open-pr.sh --draft  # while work is still moving
```

It reads which plan names this branch and opens the PR with the slice heading as title, the plan and this brief in the body. Push the first real commit as soon as it exists — a branch with no PR and no commits is invisible to the fleet. Once the PR exists, append `→ #<number>` to this branch's line in the plan's `## Slices` section (heading "The issue index", `feature/the-index-holds-closed-issues` line).

### Scope guard

This branch owns:
- `packages/domain/src/entities/issue-index.ts` — the optional `closed` field on `IssueIndexSchema`, `ISSUE_INDEX_OPEN_LIMIT`
- `packages/fleet/src/shared/issue-refresh.ts` — widening `refreshIssueIndex`'s fold to call `issueListClosed` and to page the open read to the new limit
- `packages/board/src/server/fleet.ts` — rewiring `refreshIssues` to call `trackerForIssues(...).issueList(...)` instead of `hostSaid`; the new `issueNextAt`/`issueRequests`/`issueBackoffUntil` fields on `CacheEntry`; the no-fleet `PrWorld.issueGate` reader
- `packages/fleet/src/shared/pr-refresh.ts` — the `PR_REQUESTS_PER_REFRESH` constant and its comments only (not `cadenceRateOf`, not the backoff hold — both already merged by the spike)
- `docs/stories/the-master-agent-holds-the-fleet/DESIGN-index.md` — the jira-row and `:57` amendment
- Contract/unit tests for the above
- A changeset file

**No other branch on this plan is in flight.** `feature/the-fleet-indexes-issues` (#1647) and `feature/the-tracker-lists-closed-issues` (#1653) are both merged to `main` — their code is available to build on, not to re-touch. `feature/the-board-reads-archived-stories` has its own brief and its own, disjoint files (`board.ts`'s story walk, not its issue-refresh path — if you find yourself near `collectStories` or `archivedStories`, stop, that's not this branch). `feature/tickets-and-stories-have-lanes` and `feature/the-lanes-read-the-whole-jira-project` have no remote ref yet and are still held; do not build `ticketLane`, `doneTickets`, `storyLanes`, the Discovery tab, `GET /api/issues/closed`, or the Jira project-wide scope here — this branch's whole job ends at the index holding closed issues and the no-fleet board sharing the same gate math fleetd already has. If you find something the plan did not anticipate, report it rather than improvising outside scope.
