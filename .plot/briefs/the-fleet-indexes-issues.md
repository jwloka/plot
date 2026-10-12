## Implementation brief — tickets-and-stories-have-lanes (the spike: the issue gate)

- **Plan (canonical):** [docs/plans/2026-10-12-tickets-and-stories-have-lanes.md](../../docs/plans/2026-10-12-tickets-and-stories-have-lanes.md) on `main`
- **Approved:** 2026-10-12, Jan Wloka, plan-PR #1608 merged
- **Branch:** `feature/the-fleet-indexes-issues` (base: `main`)
- **Ends as:** one PR to `main`
- **Review of the code:** standard PR review

This branch is the plan's own spike — marked `<!-- spike -->` on its slice line, alone under the first slice heading ("The issue gate"). Five sibling branches (`feature/the-tracker-lists-closed-issues`, `feature/the-board-reads-archived-stories`, `feature/the-index-holds-closed-issues`, `feature/tickets-and-stories-have-lanes`, `feature/the-lanes-read-the-whole-jira-project`) are already held via `.plot/hold` (decision D29, lines already committed on `main`) until this slice's Acceptance criteria hold in CI. Nothing else in the plan opens until a person reads this slice's CI result and removes those five hold lines. There is no dispatch gate for the spike marker itself — the annotation gates nothing until `design-work-proves-the-path` ships the markers slices — so this branch runs because a person placed it, not because a mechanism admitted it.

### What to build

The plan's whole mechanism rests on one claim panel review found risky across three rounds: that fleetd can fold an issue read into its own file-backed index, that the PR pass can read that index's gate state and subtract its spend from its own cadence without breaking its own banner math, and that the board can read the same gate under a fleet with no HTTP call of its own. Build the smallest fixture of that whole path — one page, one source (today's `issue-list --limit 50` call the board already makes), no closed issues yet — and prove the three joints hold:

1. **The issue gate's cadence math** — `issueIntervalMs(requests)`, `issueSpendPerHour(requests)`, and `cadenceRateOf(rate, gate, backend, account, now)` in `packages/domain/src/rules/cadence.ts`.
2. **The index file and its one writer** — `entities/issue-index.ts` (`IssueIndexSchema`, `decodeIssueIndex`, `encodeIssueIndex`, `ISSUE_INDEX_VERSION`), the file adapter for `.plot/state/index/issues.json`, `PLOT_ISSUE_INDEX_HOME` wired into `scripts/owned-run.sh` beside `PLOT_PR_INDEX_HOME`, and `fleetIssues`/`refreshIssueIndex` in `packages/fleet/src/shared/issue-refresh.ts` run from `IssueWorld`, built at `registryd-main.ts:2013-2020` beside `PrWorld`.
3. **The PR pass's read of that gate** — `PrWorld.issueGate(): Promise<IssueGateReading | null>`, fleetd's decoder for it, the backoff hold (`prNextAt = max(prNextAt, backoffUntil)` with `prNextIsBackoff` true) and the subtraction via `cadenceRateOf` feeding `scheduleNextPr`, while the banner (`prSpendPerHour`) keeps the unsubtracted rate.
4. **The tracker resolver and its read-only git-host arm** — `trackerForIssues(declared, gitHost, context)` in `adapters/tracker/tracker-resolve.ts`, and `trackerGitHost` (built from `trackerReads`, tagged with the git host's backend word so `limit()` reports only the `host` connector's bucket) over today's open-issue read. This is also where the port doc gets corrected — see *Decisions* below.
5. **The board's read under a fleet** — `fleetOwnsPrs` switches the board to read its inbox from `issues.json` (applying the inbox filter and the 50-row cap at the read, not the write) and stop its own `issue-list` call.

Close by pointing at the plan: `## Design` (the "This plan's spike" paragraph and everything through "The PR pass reads the issue gate (D28)") is canonical; this is orientation. The plan is long because three panel rounds argued it; treat every sentence in `## Design` as settled, not as background.

### Decisions already made — do not re-derive them

**Why this is a spike and not slice 2.** Three panel rounds each found a wire the previous revision missed in this exact mechanism (the gate math, the shared backoff, the subtraction, the toggle's read of the gate under a fleet). Re-deriving any of it from scratch risks reintroducing a wire a prior round already closed. If CI's Acceptance criteria below pass, the mechanism is proven; if they don't, the remaining five slices get rewritten before anyone touches them — report rather than patch around a failing Acceptance criterion.

**Why `trackerGitHost` reads through the git host connector's budget, not its own.** The two-connector model (`CLAUDE.md` *There are now two connector ports*) says every tracker implementation owns its own budget. `trackerGitHost` is the deliberate exception: it is not a connector reaching a distinct remote service — it is a read-only view over the git host connector a repository already has. Giving it a budget of its own would double-count spend that `plot-host.sh`'s existing `host` bucket already tracks. `limit()` on `trackerGitHost` must report only the `host` connector's buckets; a second budget here is the bug, not a safety margin.

**Why the port doc changes land in this slice, not later.** `ports/tracker.ts:70-75` ("A TRACKER IS NOT A GIT HOST") and `:77-82` ("EVERY IMPLEMENTATION IS A CONNECTOR"), plus the `@returns` lines at `:106`/`:119` and `CLAUDE.md:372-384`, all currently state a model `trackerGitHost` contradicts (a repository with no `Tracker` key gets `trackerNone` and reads nothing). Round 3 moved this edit into the spike specifically because the spike is what builds the contradicting code — shipping `trackerGitHost` without correcting the doc leaves the doc lying about what the port does the moment this PR merges. Rewrite all four passages per the plan's `## Design` → *The port doc changes with it*; run `./scripts/check-agents-md.sh --write` after, since `AGENTS.md` mirrors `CLAUDE.md` and CI refuses a stale mirror.

**Why the backoff check and the subtraction are two separate reads, not one.** A shared backoff (the git host told the PR pass to wait) must hold the PR gate open regardless of spend math; the subtraction (the issue fold is spending some of the account's budget) only ever narrows the PR interval, never widens it past a backoff. Collapsing them would let a stale subtraction override a live backoff, or vice versa. `refreshPrs` must check backoff first (`prNextAt = max(prNextAt, backoffUntil)`), then compute the subtracted rate separately — both gated on the reading's `connector`/`account` matching the PR pass's own, because a Jira reading or a reading on another account must not touch the GitHub/Bitbucket PR gate at all.

**Why a failed pass still writes `requests` and `nextAt`.** A rate-refused request was still spent — not writing the count would let the gate reopen too early and spend again into the same refusal. Keep the previous rows and `at` on failure (mirroring `refreshIssues`'s existing behavior at `fleet.ts:1466-1470`), but always advance `requests`/`nextAt`, and set `backoffUntil` on a rate refusal specifically.

**Why `source` in the index file is a key the reader compares, never a value it decides from.** A reader (the PR pass, the board) checks `issues.json`'s `source` against its own `issueSource` reading and refuses the rows on a mismatch — it does not read a lifecycle decision, a lane, or a merge verdict out of `source`. This keeps the file inside *Answers, never verdicts* (`CLAUDE.md` *A Decision Reads The Index*): everything else in the file (`connector`, `account`, `requests`, `backoffUntil`, `nextAt`) records what a pass did and what the host said, not a decision about what should happen next.

**Rules carried over unchanged, worth not re-breaking:**
- Absent is not false: a missing `issues.json`, a `nobody` source, or a `failed` answer with no kept rows are each distinct states a reader must name, not collapse into "no issues." The spike's own Acceptance criteria test the missing-file and backoff cases explicitly — don't let a convenience `?? []` erase the distinction.
- One writer, same shape as the PR index: fleetd writes `issues.json`; nothing else does, matching `one-pr-index-writer.test.ts`'s pattern. The spike's own test, `one-issue-index-writer.test.ts`, asserts exactly one caller of `encodeIssueIndex`.
- The issue pass and the PR pass are independent passes over independent state: a failure of one must not touch the other's file. `IssueWorld` gets a **read-only** view of the PR state's backoff — it never writes `PrState`, and the PR pass never writes `issues.json`.

### Done when

The plan's `## Acceptance` section, specifically its first subsection **"The spike"**, is the exact specification — CI judges these on this branch's PR, and the remaining five slices are confirmed only after they pass:

- `issueIntervalMs(1)` = 120000, `issueIntervalMs(4)` = 480000, `issueSpendPerHour` = 30 for every request count 1–21 — this is the cadence math the whole spend-sharing claim rests on; get the formula `max(ISSUE_REFRESH_MS, requests × ISSUE_PAGE_MS)` exactly, not approximately.
- One fleetd pass on a fixture repo with one page of open issues writes `issues.json` with `connector: github`, `requests: 1`, `nextAt` 120s after the pass, `backoffUntil: null` — proves the writer's basic shape, and `one-issue-index-writer.test.ts` catches a second caller sneaking in.
- `refreshPrs` with a stub spend rate of 90/hr and a fresh `github` gate reading of `requests: 1` hands **60** to `scheduleNextPr` and leaves `prSpendPerHour` at 90 (the banner shows the raw rate, not the subtracted one) — this is the "subtraction changes the schedule, never the display" assertion; a Jira reading, a reading on another account, or a stale reading (`nextAt` more than one interval in the past) must each leave the rate at 90 unchanged.
- `refreshPrs` with a `github` reading whose `backoffUntil` is 300s out asks the host nothing and sets `prNextAt` to that time with `prNextIsBackoff` true; with `prNextAt` already 600s out it does not move `prNextAt` earlier; a `jira` reading lets the pass run normally — this is the "backoff never gets overridden by a less urgent reading" case.
- The issue pass itself asks nothing while the PR state holds a backoff **on its own connector and account**, and runs normally when the PR state's backoff belongs to a different connector — the mirror image of the previous bullet, proving the shared-backoff respect goes both directions.
- A rate-refused issue read writes `backoffUntil` and keeps the previous rows and `at` — the failed-pass-keeps-state rule, concretely.
- With a fleet running, the board's periodic refresh makes **no** `issue-list` call, and *Waiting on you* shows `issues.json`'s rows minus the tickets a plan names, capped at 50 — today's content, read from the new source.
- The spike adds no shell line: `scripts/check-shell-lines.sh pr` prints a net of 0 or less. The plan's `## Design` → *The shell lines* table says this slice is TypeScript-only (`scripts/owned-run.sh`'s env wiring lies outside `skills/` and does not count).
- **The escape valve:** if any test shows the PR pass cannot subtract without moving the banner's displayed rate, or that the board cannot read the gate from the file under a fleet, the remaining slices get rewritten before the plan is re-approved — that is a plan-level finding, not something to patch around inside this branch.

Plus the repo's own gates: a changeset with `bumps: plot: patch` (or the appropriate skill bump if a skill file changes), written description-first with the `bumps:` block last (`CLAUDE.md` *Versioning* — 11% of past changesets got this backwards). If the `ports/tracker.ts` or `CLAUDE.md` edits land, run `./scripts/check-agents-md.sh --write` so `AGENTS.md` regenerates; CI refuses a stale mirror.

For tests, run `node skills/plot/scripts/board/plot-local-checks.mjs` before each push and run what it prints — it resolves the related tests and typecheck for whatever package you touch (`packages/domain`, `packages/fleet`, `packages/board`) plus the relevant `scripts/check-*.sh` gates. The suites under the `CI suites` config key (`test:e2e`, `test:contracts`, `test:board`, domain coverage, `test/reconcile/*.test.mjs`) run in CI on this PR — don't run them locally (`CLAUDE.md` *Testing*: `test:e2e` dispatches real workers into sandbox repos and is CI's gate, not a local one). A failure there comes back as a correction.

Name the shell gate explicitly since this slice is specified as pure TypeScript: `scripts/check-shell-lines.sh` refuses a PR whose shell under `skills/` grows past its own merge base, with no stored allowance. If `owned-run.sh`'s env wiring somehow needs a shell line inside `skills/`, pay for it by removing an equal number elsewhere in the same change.

### Bookkeeping

Open the PR through the controller, never `gh pr create`:

```bash
skills/plot/scripts/plot-open-pr.sh          # current branch
skills/plot/scripts/plot-open-pr.sh --draft  # while work is still moving
```

It reads which plan names this branch and opens the PR with the slice heading as title, the plan and this brief in the body. Push the first real commit as soon as it exists — a branch with no PR and no commits is invisible to the fleet. Once the PR exists, append `→ #<number>` to this branch's line in the plan's `## Slices` section (first heading, "The issue gate", `feature/the-fleet-indexes-issues` line).

When CI is green on this PR, tell a person: they read the Acceptance result and remove the five `.plot/hold` lines naming `feature/the-fleet-indexes-issues` as the condition (`.plot/hold:13-17`) in a commit that carries only `.plot/` paths. That un-hold is explicitly a person's job — no command writes or removes `.plot/hold` lines (D29 names this gap). Don't do it yourself from this branch.

### Scope guard

This branch owns:
- `packages/domain/src/rules/cadence.ts` — `issueIntervalMs`, `issueSpendPerHour`, `cadenceRateOf`
- `packages/domain/src/entities/issue-index.ts` (new) — `IssueIndexSchema`, `decodeIssueIndex`, `encodeIssueIndex`, `ISSUE_INDEX_VERSION`
- `packages/domain/src/adapters/tracker/tracker-resolve.ts` — `trackerForIssues`, `trackerGitHost`
- `packages/domain/src/ports/tracker.ts:70-75`, `:77-82`, `:106`, `:119` — the port doc correction
- `CLAUDE.md:372-384` and generated `AGENTS.md` — the connector-doc correction
- `packages/fleet/src/shared/issue-refresh.ts` (new) — `fleetIssues`, `refreshIssueIndex`, `IssueWorld`
- `packages/fleet/src/shared/pr-refresh.ts` — `PrWorld.issueGate`, the backoff hold and subtraction in `refreshPrs`
- `packages/fleet/src/registryd-main.ts:2013-2020` — building `IssueWorld` beside `PrWorld`
- `packages/fleet/test/unit/one-issue-index-writer.test.ts` (new)
- `packages/board/src/server/fleet.ts` — the `fleetOwnsPrs`-gated read of `issues.json` in place of the board's own `issue-list` call (the no-fleet `refreshIssues` path, `CacheEntry`'s `issueNextAt`/`issueRequests`/`issueBackoffUntil`, and `GET /api/issues/closed` are later slices' territory — don't build them here)
- `scripts/owned-run.sh` — `PLOT_ISSUE_INDEX_HOME` beside `PLOT_PR_INDEX_HOME`
- A changeset file

**No other branch on this plan is in flight.** All five siblings are held (D29, `.plot/hold:13-17`) and none has an open worktree — this is the only active branch on `tickets-and-stories-have-lanes` right now, so there is no collision to track. Do not start building `Issue.closedAt`, `issueListClosed`, the `unaskable` reason field, the archived-stories payload, the ticket/story lane rules, the Discovery tab, or the Jira project-wide scope — those are the five held slices, explicitly out of scope here even though the plan's `## Design` describes them in the same prose. If you find something the plan did not anticipate, report it rather than improvising outside scope.
