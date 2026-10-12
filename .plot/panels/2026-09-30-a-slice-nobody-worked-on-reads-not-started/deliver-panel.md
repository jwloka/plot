# Delivery panel: a-slice-nobody-worked-on-reads-not-started

Caller: `/plot-deliver` step 5, 2026-09-30. Subject: the plan. Evidence: #1106 (merge `6e65021b`) and #1108 (merge `f1d63485`).

## Reconciliation

- Position: `unanimous supported` — deliverable, behaviour, changelog
- Evidence: `unanimous executed` — deliverable, behaviour, changelog

## Checklist

| # | Done when | Result | Evidence |
|---|---|---|---|
| 1 | blocked/waiting/unknown with no worker read NOT STARTED with their own sentence; a running worker reads WORKING; classifier covers 8 states; wip still abandoned | Done | 4 board unit files, 58/58, run by two jurors |
| 2 | a closed PR with a live agent stays in its open group with no `closed-pr` kind | Done | same run |
| 3 | `branch-state.test.ts` asserts the table, `:188` reads `waiting`, `fleet.test.mjs` passes whole | Done, one half on CI | domain file 65/65 executed; the whole `fleet.test.mjs` was not run locally and rests on #1108 CI `validate` (2170/2170) |
| 4 | complete-list NONE shim keeps the wave open; incomplete list reads `unknown` | Done | two named `fleet.test.mjs` tests executed |
| 5 | the refill path keeps field 11 | Done | named test executed; the check is indirect (a dropped field makes the bundle exit 2) |
| 6 | corpus fixtures agree with the bundle; a 10-field line exits 2 | Done | corpus 7/7; bundle driven directly, exit 2 printed |
| 7 | the #995 guard passes with its rebuilt fixture | Done | executed |
| 8 | the three measured rows land in NOT STARTED, NOT STARTED, WORKING | Done | `the-three-measured-rows.test.ts` executed |

## What the jurors shared

All three read the same new tests, and every behaviour claim rests on fixtures the implementing agents wrote. No juror ran the scan against the live estate to see a real zero-ahead ref reading `unknown`. The plan notes that on this repository the PR list is never complete (1011 PRs against `PR_LIST_LIMIT` 1000), so the live reading would be `unknown`, not `open`.

## Wording to fix before `/plot-release` (changelog lens)

1. `.changeset/zero-ahead-is-not-merged.md` omits `CLOSED`: a complete list with only a closed PR reads `open`, not `unknown`.
2. The same changeset says "an offline scan"; `unasked` also covers a repository with no git host.
3. The plan changelog's "whatever its PR history" is broader than the code: a live agent outranks a closed PR, not an open ready one.
4. The plan changelog's "a claimed branch" uses `claimed` outside the rule's meaning; the subject is a ref with zero commits ahead.

None of the four names behaviour the code lacks. They do not block delivery.
