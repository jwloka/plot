# Round 3 — contradiction lens

Position: amend

The round-2 mechanisms are mostly sound against the code: the issue gate's pacing holds at 30 requests an hour for every page count, the Bitbucket `pr-list` price of 3 matches the table's own comment, and the D23 inbox page stays inside the cap. Four statements still disagree with the code or with a settled rule. Each fix is one or two sentences.

## Findings

### 1. The PR pass subtracts a spend that the record does not hold (must change)

- Read: `spend-rate` defaults to the git host's connector and account (`skills/plot/scripts/plot-host.sh:5236-5237`), and `refreshPrs` reads it at `packages/fleet/src/shared/pr-refresh.ts:1341` with no connector argument. A Jira fold's pages are recorded under `jira` by `jira_curl` (`plot-host.sh:2648`), so they are not in `perHour`.
- The plan subtracts "the fold's derived spend" with no condition (plan:70), and in the same bullet it says "the git-host cadence does not read" the Jira spend. On a Jira source, the subtraction removes up to 30 requests an hour that the record never counted. `othersPerHour` (`packages/domain/src/rules/cadence.ts:97-101`) then under-counts other spenders, and the PR pass refreshes faster than its share on a busy account.
- The same condition applies to the shared backoff (plan:71). A `Tracker: github-issues` repository whose git host is Bitbucket spends the GitHub account, so a GitHub refusal must not shut the Bitbucket PR gate.
- Where the subtraction sits: in `refreshPrs` after `:1341` and before `scheduleNextPr` (`pr-refresh.ts:1024-1033`), which hands `rate` to `prRefreshMsFor` (`:665-672`) → `refreshIntervalMs` → `cadenceStretch` → `targetStretch` (`cadence.ts:136`) → `othersPerHour`. `entry.prSpendPerHour` (`:1345`) is the banner's number and keeps the unsubtracted value. `PrState` (`pr-refresh.ts:38-75`) has no field for the fold's pages or interval, and `PrWorld` "does not change" (plan:66). So the fold's spend can reach the pass only through a new `PrState` field, and the plan does not name it.
- Change: subtract the fold's spend, and share the backoff, only when the fold reads the git host's account (a `git-host` source, or a tracker whose connector is the git host's backend). Name the `PrState` field that carries the fold's spend.

### 2. The Bitbucket cost figure is wrong today, and Bitbucket spend rises without a fleet (must change)

- Read: with no fleet, `maybeRefreshPrs` runs `refreshPrs` priced at 4 and then `refreshIssues` on the same gate (`packages/board/src/server/fleet.ts:1694-1703`). That is 4 requests every 240 s, which is 60 an hour in total. The table's own comment says the same thing (`pr-refresh.ts:153-155`, "hourly spend stays 60 on both hosts").
- With a fleet, fleetd's `refreshPrs` makes no `issue-list` call. Only the comments in `pr-refresh.ts` mention `issue-list`. So fleetd makes 3 requests every 240 s, and the board's `refreshIssues` adds 60 an hour (`fleet.ts:1686-1688`, gate reset at `:1648`).
- Computed: `node -e` gives Bitbucket today = 105 an hour with a fleet and 60 an hour without one, not 120. After the change, both modes spend 3 × 3600/180 + 1 × 3600/120 = 90 an hour.
- So a board with no fleet on Bitbucket goes from 60 to 90 requests an hour (+50 %). Bitbucket is the host whose account-wide `HTTP 429` the table records (`pr-refresh.ts:157-160`). The plan states the opposite direction (plan:70, "120 today and 90 after").
- Change: correct the Bitbucket figures to 105/60 → 90. Then either accept the rise on the no-fleet path with that number stated, or keep a Bitbucket source's issue reads inside the PR unit when no fleet runs.

### 3. Under a fleet, the toggle endpoint cannot see the interval or the backoff it obeys (must change)

- Plan:77 says `GET /api/issues/closed` keeps its answer "for the issue gate's current interval" and "while the issue gate's backoff holds … asks nothing". Acceptance:178 tests this.
- Read: under a fleet, the gate and the backoff live in fleetd's memory (`prState` at `packages/fleet/src/server/entry/registryd-main.ts:2013`). The bridge carries only `prError` (`packages/domain/src/ports/fleet-state.ts:84`). The `issues.json` shape (plan:67) holds `at`, `answer`, `failedAt` and rows, but no interval and no backoff deadline. The board's `issueNextAt` exists only in the no-fleet path (plan:73).
- The toggle's host call itself does not contradict the Acceptance: Acceptance:173 covers the periodic refresh only, and a per-click read matches the pattern `issueView` already uses (`packages/domain/src/ports/tracker.ts:113-114`). The writer stays fleetd alone: the board keeps the answer in memory and writes no file, so *One writer* holds.
- Change: write the gate's interval and a host-named backoff deadline into `issues.json` (both are answers or derived from answers, like `askedAt`), and have the toggle read them. Otherwise, give the toggle a fixed retention of its own and drop the backoff clause under a fleet.

### 4. The port doc and CLAUDE.md keep two more sentences that `trackerGitHost` contradicts (must change)

- The plan amends `ports/tracker.ts:66-72`, `:103`, `:114` and "the `CLAUDE.md` connector sentence" (plan:50).
- Read: `ports/tracker.ts:77-82` says "EVERY IMPLEMENTATION IS A CONNECTOR … Each implementation therefore owns its OWN budget … a single implementation branching on scheme would have to hold two of each". `trackerGitHost` spends the `host` connector's budget on purpose (plan:46), and it serves `github` or `bitbucket` through one implementation with a backend tag.
- `CLAUDE.md:372-380` says "`tracker` reaches the issue tracker" and "two connectors rather than one adapter with a vendor branch: neither ever sees the other's credentials or budget." This is a paragraph, not one sentence, and after slice 1 every part of it is false.
- Line drift: the `@returns … unaskable` lines are at `ports/tracker.ts:106` and `:119`, not `:103` and `:114`. The "A TRACKER IS NOT A GIT HOST" paragraph runs to `:75`.
- The settled write rule does not conflict: `trackerFor` and `statusWrite` do not change, so `trackerNone` still answers `unaskable` on the write for a repository with no `Tracker` key (`CLAUDE.md:381-384`, `tracker.ts:132-140`).
- Change: add `tracker.ts:77-82` and all of `CLAUDE.md:372-384` to slice 1's amendment list. State that `trackerGitHost` reads through the host connector's account and is not a connector with a budget of its own. Correct the line numbers.

### 5. The shell-line payment does not add up (open point)

- Measured with the gate's own count (non-comment, non-blank lines; `scripts/check-shell-lines.sh` `count_rev`):
  - The `nobody` preamble has 5 lines at `plot-host.sh:4642-4649` and 5 at `:4831-4835`. One helper and two calls save at most 7 lines.
  - The `gh` failure blocks have 5 lines at `:4737-4745` and 5 at `:4863-4874`. `else` and `fi` stay at both sites, so a helper saves at most 3 lines.
  - The single Jira call at `:4693-4698` is 6 lines. A `nextPageToken` loop that serves the open, closed and inbox reads is longer than that, so this item adds lines instead of paying for them.
- Named payment: at most 10 lines. New code includes `--state`/`--since` parsing, the GitHub closed flags and per-page `budget_record_call`, two exit-4 arms (Bitbucket, and Jira without prefixes), the closed JQL, the page loop, and the D23 inbox call. By estimate this is well over 10 lines.
- Plan:120 says the arms "are paid for by these lines". The gate refuses any net growth and has no allowance.
- Change: drop the claim. State the expected net, and name the gate's second remedy (move the parsing into a domain bundle) as the fallback.

### 6. One `issues.json` per repository diverges from DESIGN-index, and `source` persists a verdict (open point)

- `DESIGN-index.md:128` says "The watermark is per connector, not per repository", the jira row (`:122`) gives a delta query with a daily full read, and PR index files are `<connector>.json` (`pr-index-file.ts:31`). The plan uses one file per repository with whole replacement (plan:67-68).
- The plan's reason (there is no watermark) removes the basis of the per-connector rule, but the plan does not name the divergence, and DESIGN-index's jira row then describes a mechanism that nothing builds.
- `source`, and the `nobody` file with its reason, persist an `issueSource` answer that the board can derive from config for free. `CLAUDE.md:485-487` makes `default-branch.json` "the one sanctioned exception … not a precedent for another".
- Change: state that `source` is a key that the board compares, never a value it decides on. Have the board derive the `nobody` reason itself, or write no file for `nobody`. Amend the jira row of DESIGN-index.md, or name the divergence in the plan's Notes.

### 7. "The inbox and the lanes come from the same rows" is false for Jira after D23 (note)

- Plan:73 says this. Plan:82-83 makes the Jira inbox a separate `inbox` read.
- Both reads run in one pass, so a ticket does not show two states across passes, but the sentence is wrong.
- Change: reword the sentence to say "from the same pass".

### 8. The D23 inbox read duplicates the open read without `Ticket prefixes` (note)

- With no prefixes, the open read "keeps today's query byte for byte" (plan:81), and the inbox read is the same query (plan:82). That is one wasted page per pass, and it stretches the gate.
- Change: skip the inbox read when the open read is today's query.

### 9. The cost units mix questions and pages (note)

- `pr-refresh.ts:1424-1426` says the rich `pr-list` "makes two host calls inside the one question, and the budget counts questions". The fold counts pages.
- Per the record, the GitHub PR pass writes about 2 lines a refresh. So the absolute figures of 120 and 90 are low, while the delta of −30 holds.
- The toggle's reads are not in the 90. Computed: 2 pages per 480 s here, 15 an hour at most. At the 1000 cap and a 240 s interval, 150 an hour.
- Change: state both, so that the figure matches what `spend-rate` will report.

### 10. The freshness wording disagrees with itself (note)

- Plan:70 says "tickets refresh every 120 s to 480 s here". Changelog:20 says "about every 8 minutes" on this repository. With 4 pages the interval is 480 s.
- Change: say "every 480 s here; 120 s on a repository whose pass is one page".

## Checked and consistent

- Q1 pacing (computed): `max(120, p×120)` gives exactly 30 requests an hour for every p ≥ 1, and 0 at p = 0. This repository has ⌈108/100⌉ + ⌈154/100⌉ = 4 pages, so 480 s, matching Acceptance:174.
- Q2: Bitbucket 4 → 3 matches the table's "3 for pr-list --state all, 1 for issue-list" (`pr-refresh.ts:155`, `:186-188`). GitHub stays 1, and its comment at `:182-184` is the one that changes.
- Q5: a Jira pass with prefixes makes at least 3 pages (open, closed, inbox), so 360 s and 30 an hour. The inbox read slows the pass but does not double the spend.
- Q4: one writer (fleetd, `one-issue-index-writer.test.ts` modelled on `packages/fleet/test/unit/one-pr-index-writer.test.ts`). A failed pass keeps its rows and does not move `at`, as with `askedAt`. A missing file or a mismatched `source` shows an absence sentence and never empty lanes. Only a view reads open rows. All of these keep *A Decision Reads The Index*, except finding 6.
- D23, D24 and D27 match the plan, `DESIGN-phases.md` §5 and `the-board-has-three-tabs` (`waitingTickets` takes `inbox` and `source`, sibling plan:49-52). `the-fleet-verifies-what-it-delivered`:115-117 uses `trackerForIssues` and the `unaskable` reasons as this plan defines them.

## What I looked at or ran

- Read the subject plan in full; story decisions D1–D27; `DESIGN-phases.md` §5; `DESIGN-index.md:100-140`; `CLAUDE.md:370-384`, `:479-487`; the sibling plans by grep.
- Read `packages/fleet/src/shared/pr-refresh.ts` (`:38-120`, `:130-226`, `:625-760`, `:860-1040`, `:1300-1440`), `packages/fleet/src/shared/fleet-clock.ts:120-160`, `registryd-main.ts:2000-2030`, `packages/domain/src/rules/cadence.ts:1-200`, `packages/board/src/server/fleet.ts:1300-1380`, `:1440-1720`, `packages/domain/src/ports/tracker.ts:1-140`, `packages/domain/src/port-result.ts`, `adapters/tracker/tracker-shell.ts:100-200`, `tracker-resolve.ts:25-60`, `ports/fleet-state.ts`, `skills/plot/scripts/plot-host.sh:3140-3160`, `:3370-3395`, `:4615-4900`, `:5192-5245`, `scripts/check-shell-lines.sh`.
- Ran `sed -n … | grep -vcE '^[[:space:]]*(#|$)'` on the named line ranges: 5, 5, 5, 5, and 6 for the Jira call.
- Ran `node -e` for the gate pacing, the page count, the Bitbucket and GitHub hourly spend before and after, and the toggle spend.
