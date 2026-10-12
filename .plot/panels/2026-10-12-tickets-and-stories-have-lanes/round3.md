# Panel round 3: tickets and stories have lanes

- **Subject:** `docs/plans/2026-10-12-tickets-and-stories-have-lanes.md` (Draft, revised after round 2, decisions D23–D27 added)
- **Caller:** `/challenge-the-plan` Phase 3P, round 3, a narrow round
- **Commitment:** `Position: proceed | amend | reject`
- **Lenses:** cost, contradiction (two jurors, one rubric)
- **Rubric:** ten questions on the mechanisms the revision added: the issue fold's gate, `PR_REQUESTS_PER_REFRESH`, the PR pass's subtraction, the backoff and `issues.json`, the D23 inbox read, `trackerGitHost` and the port doc, the toggle endpoint, the shell-line arithmetic, the 120 → 90 cost figure, and readiness
- **Siblings:** 5 read, 0 unread (story plot-works-in-five-phases)
- **Gate:** `plot-panel.mjs check` exit 0 for both jurors, with no re-run
- **Reconcile:** `unanimous	amend	cost,contradiction`

## Positions

| Lens | Position | Must change | Open points | Notes | Verdict file |
|---|---|---|---|---|---|
| cost | amend | 4 | 1 | 5 | `round3-cost.md` |
| contradiction | amend | 4 | 2 | 4 | `round3-contradiction.md` |

No juror rated the plan `reject`. Both jurors say the pacing formula is right and the defects are in how the plan wires and prices it.

## What each juror looked at or ran

Both jurors read the subject, rounds 1 and 2, the story with D1–D27, `DESIGN-phases.md`, the five siblings, `CLAUDE.md` *The Layering Rule* and *A Decision Reads The Index*, and `DESIGN-index.md`. Neither ran a test, the board, the fleet or a host CLI.

- **cost** read `pr-refresh.ts`, `cadence.ts`, `fleet.ts`, `registryd-main.ts`, `plot-host.sh` `spend-rate` and `check-shell-lines.sh`. It replayed `cadenceStretch` with `node -e` for today's fleet mode and computed that the fleetd PR pass settles at 480 s on a quiet GitHub account. It counted the named shell blocks with the gate's own rule (non-comment, non-blank) and sketched the new arms to estimate their size. Its baseline is a model of the code's rule, not a reading of the live ledger.
- **contradiction** read the same cadence path, `ports/fleet-state.ts`, `ports/tracker.ts`, `port-result.ts`, `CLAUDE.md:372-380` and `:485-487`, and `DESIGN-index.md:122-128`. It computed the Bitbucket spend for both modes, checked `issueIntervalMs` with `node -e` for every page count, and counted the dedupe savings with the gate's rule.

The moderator confirmed four citations: `plot-host.sh:5236` defaults `spend-rate` to the git host's connector; the rate read at `pr-refresh.ts:1341` also feeds the banner at `:1345`; `scheduleNextPr` is at `:1024-1033`; `ports/tracker.ts:77-82` says each implementation owns its own budget; `DESIGN-index.md:128` says the watermark is per connector, not per repository.

## What the two agree on

1. **The pacing arithmetic is right.** `max(120 s, pages × 120 s)` gives exactly 30 requests an hour for one page or more. This repository reads 4 pages, so the interval is 480 s. A Jira pass with the D23 inbox page stays at 30 an hour: the inbox page lengthens the interval and costs freshness, not budget.
2. **`bitbucket: 3` matches the table comment's price for `pr-list`** (`pr-refresh.ts:155`).
3. **The PR pass's subtraction has no named input and no source condition (must change).** No `PrState` field carries the fold's spend to the PR pass, and `PrWorld` does not change. `spend-rate` reads the git host's connector (`plot-host.sh:5236`), so on a Jira source the fold's pages are not in `perHour`, and a subtraction under-counts other spenders by up to 30 an hour. The shared backoff needs the same condition. Both name the place: in `refreshPrs` after the read at `pr-refresh.ts:1341` and before `scheduleNextPr` (`:1024-1033`), so the banner at `:1345` keeps the unsubtracted rate.
4. **The toggle endpoint cannot see the issue gate under a fleet (must change).** The interval and backoff live in fleetd's memory, the bridge carries only `prError` (`ports/fleet-state.ts:84`), and `issues.json` holds neither. So plan `:77` and Acceptance `:178` cannot hold with a fleet running. The toggle's reads are also outside the 90: up to 15 an hour on this repository and up to 150 at the 1000-row cap. Both agree the writer stays fleetd alone, because the board keeps the toggle's answer in memory.
5. **The shell-line payment does not add up.** cost counts about 1–7 saved lines against about 18–23 added; contradiction counts at most 10 saved and notes that `jira_search_pages` adds lines. The D20 slice names no lines. cost rates it must change, contradiction an open point.
6. **The "120 → 90" baseline is wrong** (see the disagreement on how).
7. **The port-doc amendment misses `ports/tracker.ts:77-82`** ("owns its OWN budget"). contradiction also names `CLAUDE.md:372-380` ("neither ever sees the other's credentials or budget") and rates it must change; cost lists `:77-82` as a note.
8. **The index rules hold:** one writer, the index never says no, open rows reach only a view, a failed pass keeps its rows.

## Disagreements

- **What "120 today" should be.** cost replays the cadence and finds today's GitHub spend under a fleet is 67.5 an hour, because the board's 60 s `issue-list` calls make the cadence stretch the fleetd PR pass to 480 s. So after the plan the total rises by about 22–30 an hour, and PR freshness moves from 480 s to 60 s. contradiction reads the absolute figure as low for another reason, that the PR table counts questions and the fold counts pages, and holds that the drop of 30 still stands. The two are not the same claim: cost says the direction of the change is wrong, contradiction says the scale is wrong and the direction right. The moderator reads cost's replay as the stronger evidence, because it follows the stretch rule that both jurors cite (`cadence.ts:97-101`); it is a model of a quiet account, and neither juror read the ledger.
- **Bitbucket without a fleet.** Only contradiction computes the no-fleet mode: 60 an hour today, 90 after, +50 % on the host whose HTTP 429 the cost table records. cost computes the fleet mode only (105 today). The two figures do not conflict; the plan states neither.
- **One `issues.json` per repository against `DESIGN-index.md`.** Only contradiction raises it, as an open point: `DESIGN-index.md:122` and `:128` say the index is per connector, not per repository, and describe a Jira delta read; and the `source` field persists a verdict the board can derive from config, which `CLAUDE.md:485-487` allows for `default-branch.json` alone. cost reads `source` as a guard only and raises no contradiction. Both read the same field; they disagree on whether a guard field is a verdict.
- **The shared backoff.** Only cost names the ordering rule: the backoff must not move the PR gate earlier, so `max(prNextAt, now + wait)`. Only cost names the Jira freshness cost of D20: the inbox refreshes every 22–42 minutes on a large project, and the plan names no Jira page size.
- **Smaller notes from contradiction alone:** "inbox and lanes come from the same rows" is false for Jira after D23 (same pass, not same rows); the D23 inbox read duplicates the open read when `Ticket prefixes` is absent; plan `:70` says "120–480 s here" where the value here is 480 s.

## The shared blind spot

**Neither juror read the live budget ledger,** and the two jurors' baselines for "today" differ by about 50 requests an hour. The rubric asked whether the 120 → 90 figure is consistent with the code, and both answered from the code's rule. Whether the stretched 480 s fleetd PR pass actually occurs on this account is a measurement, and round 2's cost juror measured 1145 GraphQL requests an hour on this account, which is far from a quiet account. Under that load, the replay's quiet-account premise does not hold, and the before/after figures of both jurors may both be wrong.

**A second one:** both jurors treated the 30-an-hour cap as per repository. cost notes that it is per fleetd and repository, not per account; neither asked what happens on an account that serves several repositories with fleets, where the caps add.

## For the caller

Unanimous `amend`, narrower than round 2 and with no new design question except one: how the fold's spend reaches the PR pass. Before approval the plan needs: a named `PrState` field and a source condition for the subtraction and the backoff; an issue gate the board can read under a fleet (a field in `issues.json` or the bridge), and the toggle's reads priced; a counted shell-line balance per slice; a corrected cost figure for both modes and both git hosts; and the port-doc edit extended to `ports/tracker.ts:77-82` and `CLAUDE.md:372-380`. The `issues.json`-per-repository divergence from `DESIGN-index.md` needs a sentence either way. The panel decides nothing; acting on it is the caller's decision.
