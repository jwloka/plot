# Skeptic — round 1

Position: amend

## What I reproduced (zero host calls)

- Diagnosis traced in code on origin/main 0d2b4d5c, and it holds. `prWindowFor` returns `{ since: watermark, complete: false }` for a delta (`packages/domain/src/rules/pr-index.ts:172`), `fleet.ts:3007` folds `window.complete && partialSaid === null`, `foldPrIndex` writes `complete: update.complete` (`rules/pr-index.ts:104`), and the next window returns full on `!held.complete` (`rules/pr-index.ts:164`). The alternation is deterministic from the code. The plan does not observe it on a running board, but no observation is needed: the rule leaves no other path.
- Live store `.git/.plot/state/index/github.json` read 18:14Z: v 2, 1000 rows (964 MERGED, 36 CLOSED, 0 OPEN), `complete: false`, `watermark 2026-10-01T13:19:29Z`, which equals the newest `updatedAt` in the rows. Numbers #41 to #1143. All match the plan.
- Cited lines are true within two lines: `pr-store.test.ts:350/474/493/535/558`, `pr-index.test.ts:350` (*a delta is never complete*), `fleet.ts:311` (`PR_FULL_READ_MS` 24 h), `plot-host.sh:474` (`host_failure_kind`, three kinds), `:527` (`auth login`), `:564` (`host_repair` in `pr_list_failed`). The board itself prints no `auth login`; the banner text comes from the adapter's stderr, so slice 3 is placed correctly.
- The four timings I did not reproduce, by constraint. They are one sample each. #1087 reports 46-68 s for the call measured here at 43.0 s, so the spread between runs is about 1.5x.

## Findings

- Slice 1 misses the second reader of `complete` in `refreshPrs`. `fleet.ts:3039` serves the pass's own rows when `complete || folded === null`. The slice must keep that branch keyed on *this answer was whole*, never on the folded store's `complete`. If an implementer derives it from the new store flag, a delta over a whole store serves its 0 rows as the whole map, and every branch reads as having no PR. That is #912 on screen. The slice text names only `fleet.ts:3007`.
- Slice 2 under-states what the plain arm lacks. The plain GitHub arm asks `number,title,state,headRefName,author` (`plot-host.sh:3902`) and emits no `draft`, `url` or `updatedAt`. `PrIndexRowSchema` requires `draft: z.boolean()` and `url: z.string()` (`packages/domain/src/entities/pr-index.ts:38,42`). The plan names only `updatedAt`, `checks` and `review`. The 7.3 s figure is for the field set without these three fields, so it is not the cost of the call slice 2 will make.
- The 15 s target rests on 7.3 s + 2.5 s from two single samples taken on different days. At the 1.5x spread above, the sum is 14.7 s. The target is plausible but not shown, and one PR-body run cannot prove it.
- The store already answers part of open point 1: all 1000 stored rows carry `review: ''`, so the absent form of `review` is the value terminal rows hold today. `checks` is not: 963 green, 18 failing, 19 none. `fleet.ts:2233` filters on `checks === 'failing'` over the map it is given, so the slice must say whether a terminal row can reach it.
- Slice 1's value without slice 2 is real: one 43 s call a day instead of one per two refreshes. Slice 2 still matters for the 504, because a failed full read leaves the store unchanged, the window stays full, and the board repeats the 43 s rich call at normal cadence until one succeeds (`fleet.ts` catch: only rate limits slow down). The plan should state this, since it is the reason slice 2 is not gold-plating.
- Rules: vendor words stay in `plot-host.sh`, no new script, one writer kept, the index still never says no (`answerLookups` answers `ask` for every missing row whatever `complete` says). Layering is respected.

## Required changes

1. Slice 1 names `fleet.ts:3039` beside `:3007` and adds a `pr-store.test.ts` case: a delta of 0 rows over a whole 1000-row store serves 1000 PRs by number and by head, and the store reads `complete: true`.
2. Slice 2 lists every field the plain arm must add or carry from a stored row: `draft`, `url` and `updatedAt` (`plot-host.sh:3902` against `entities/pr-index.ts:38,42`). It names the absent form for a row with no stored row for each required field, not only for `checks` and `review`.
3. Slice 2's Done-when measures the final two-call read at least three times on this repository and reports each time and the median, with the final field set of the plain arm. This replaces the single run. The host spend stays at most 6 listing calls.
4. The Motivation records that a failed full read repeats at normal cadence while the store stays in a full window, as the reason slice 2 serves the 504 symptom and not only latency.
5. Slice 1's Tests add one case for the version bump: a v2 store with `complete: true` decodes as `null` and costs exactly one full call, so the 24 h cadence restarts from `wholeAt`.
