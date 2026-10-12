# Panel round 1 — a-pr-refresh-reads-the-history-once-a-day

- **Subject:** docs/plans/2026-10-01-a-pr-refresh-reads-the-history-once-a-day.md at `0d2b4d5c`
- **Commitment:** `Position: proceed|amend|reject`
- **Gate:** all three verdicts committed (`plot-panel.mjs check`, exit 0)
- **Reconcile:** `unanimous amend` (skeptic, operator, domain)
- **Host calls by jurors:** 0 listing calls (all three read code and the local store only)

## Positions

| Lens | Position | Verdict file | Evidence |
|---|---|---|---|
| Skeptic who measures | amend | skeptic.md | Traced the alternation in code; re-read the live store (18:14Z, same shape as the plan); counted stored `checks`/`review` values |
| Operator, GitHub and Bitbucket limits | amend | operator.md | Traced cadence (`PR_REFRESH_MS`, `PR_REQUESTS_PER_REFRESH`), the Bitbucket window path, the banner path and the backoff |
| Domain and layering | amend | domain.md | Traced the fold, window, shell readers of the store, version-2 fixtures and bundles |

## Agreement

All three confirm the diagnosis: a delta writes `complete: false` (`pr-index.ts:104`, `:172`, `fleet.ts:3007`) and the next refresh reads in full (`pr-index.ts:164`). The operator puts it at about 30 rich 1000-row reads per hour per GitHub board. All three accept slice 3 as written.

## Changes the panel requires

1. **Slice 1 keeps `fleet.ts:3039` keyed on the answer kind `whole`, never on the folded store's `complete`** (skeptic, domain). After the change a delta fold reads `complete: true`, and a controller reading that flag serves the window's rows as the whole map. `pr-store.test.ts:442` stays green unchanged; a new case serves 1000 PRs after a 0-row delta over a whole store.
2. **The answer kind is decided in the domain** (domain). `PrWindow.complete` (`pr-index.ts:125`) becomes the kind, and one exported arrow maps window plus partial answer to `whole | delta | partial`; `fleet.ts:3007` stops doing the arithmetic.
3. **The version bump names every reader** (domain, skeptic). Fixtures writing `v: 2` (`pr-index.test.ts:249`, `impl-status-index.test.mjs:313`, `scan-index.test.mjs:279`, `registryd-main.test.ts:1268`), a rebuilt `plot-pr-index-lookup.mjs` and `board-server.mjs`, and one test that a v2 store costs exactly one full read. `pr-index.test.ts:365` joins the rewrite list (operator).
4. **The Bitbucket claim is wrong and is corrected** (operator). A windowed Bitbucket listing narrows through `bb_window_listing` (`plot-host.sh:933`, `:3959-3960`), and a healthy three-state answer is `answered`, not partial. Slice 1 therefore changes Bitbucket too; it needs a Bitbucket fixture test and corrects the stale comments at `plot-host.sh:89-99` and `fleet.ts:233-238`.
5. **A failed due full read does not repeat the heaviest query every minute** (operator, skeptic). After a 504 `hostReaction` returns `null` and the full read stays due. The plan names one answer — fall back to a delta and retry the full read later, or back off on `timeout` — with a test.
6. **Slice 2 states its fields and its absent forms now** (all three). The plain GitHub arm lacks `draft`, `url` and `updatedAt` (`plot-host.sh:3902` against `entities/pr-index.ts:38,42`). A terminal row with no stored row takes the absent values the Bitbucket arm already emits (`checks: "unknown"`, `mergeable: "unknown"`, `review: ""`, `failing_checks: []`), so no second version bump.
7. **Slice 2 defines the two calls as one answer**: `whole` only when both answered; either failing writes nothing; a test for each failure (operator, domain).
8. **Slice 2's Done-when measures at least three runs and the GraphQL `used` delta**, old against new (skeptic, operator).

## Disagreement

**Where slice 2's split lives.** The operator wants the open/terminal split inside the GitHub arm of `pr-list`, so the board makes one call and Bitbucket does not pay 4 requests for nothing (`fleet.ts:202-246`). The domain juror wants the carry-over of stored verdict fields as a rule in `foldPrIndex`, because only the fold reads `held`. These are compatible and the amendment takes both: the adapter makes the two GitHub calls and returns terminal rows without verdict fields; the domain fold carries the held verdicts for a row with the same number. Neither juror examined the other's half, so the amended slice must show both in its tests.

## Shared blind spot

No juror observed the alternation on a running board's call log; all three derived it from code. The derivation leaves no other path, but the first slice's PR should show the call sequence of three real refreshes. No juror asked whether slice 2 is still worth its cost once slice 1 makes the full read daily and change 5 stops the retry loop; the skeptic's argument for it rests on the retry loop that change 5 removes.
