# Delivery juror: Behaviour lens

Position: supported
Evidence: executed

Plan: docs/plans/2026-09-30-a-slice-nobody-worked-on-reads-not-started.md. Evidence: #1106 (merge 6e65021b) and #1108 (merge f1d63485), read with `git show -m --first-parent`, and the code on local `main` (ac593f98). Node v24.21.0.

## Per Done-when item

1. **Slice 1: blocked/waiting/unknown with worker none or elsewhere reads not-started with its own sentence; a running worker reads working; classifier-is-total covers eight states; wip with commits, no PR and no worker still reads abandoned.** SUPPORTED, EXECUTED. `fleet.ts` `classifyGroup` gains the `waitsOn = ''` trailing parameter (line 4366) and three arms after the worker block, plus a `state !== 'wip'` guard (line 5113) that returns *state `<word>` not recognised*. `rowsFromPulse` passes `b.waits_on`. `a-slice-with-no-work-waits-in-not-started.test.ts` loops `none`/`elsewhere` for all three states (lines 38-56), tests "never reads any of the three as abandoned" (58), a running worker reads WORKING (76-82), wip is still abandoned (84), and an unrecognised word (94). `classifier-is-total.test.ts` STATES has 8 entries and the cross-product asserts 960. The vitest run passed.
2. **Slice 1: a closed PR with worker running or waiting stays in its open group with no closed-pr kind; with no live worker it stays in DONE.** SUPPORTED, EXECUTED. `fleet.ts:6601` has `declined = closedPr && !liveAgent`, and `rowQuietKind` receives `declined ? 'closed' : null`. The test at lines 138-153 covers `running`/`waiting` (no `closed-pr`) and `none`/`elsewhere`/`finished` (DONE, `closed-pr`). The run passed.
3. **Slice 2: branch-state.test.ts asserts every table row, `:188` reads `waiting`, and fleet.test.mjs passes whole.** SUPPORTED. The domain test EXECUTED and passed (65/65). The `describe('a ref behind main is decided by the host')` block (lines 296-351) covers mainTip null, MERGED under all five reaches, unasked keeps merged, throttled/secondary/failed read unknown, unreadable reads unknown, OPEN reads wip, and none/CLOSED read open when the list is complete and unknown when it is not. The behind-main case with an OPEN prerequisite asserts `waiting` (lines 180-188). The whole fleet.test.mjs was not run locally, per the rubric. That part is READ: the #1108 CI `validate` job ran `test:contracts` (all `test/reconcile/*.test.mjs`) with `# tests 2170 / # pass 2170 / # fail 0`, and `gh pr checks 1108` shows corpus and validate both pass.
4. **Slice 2: under a NONE shim with a complete list, the zero-ahead second slice does not complete its wave; with an incomplete list it reads unknown.** SUPPORTED, EXECUTED. Two new fleet.test.mjs tests ran with `--test-name-pattern` and both passed: "a zero-ahead ref behind main with no PR in a complete list is open" and "a zero-ahead ref behind main reads unknown when the PR list is incomplete".
5. **Slice 2: a merged `waits:` prerequisite reads open through the refill path, so field 11 survives.** SUPPORTED, EXECUTED. `plot-fleet-scan.sh:3933` rebuilds the line as `cut -f1-9` + prerequisite word + `cut -f11`. The test "the prerequisite refill carries the list completeness" passed. Without field 11 the bundle exits 2 and the scan refuses.
6. **Slice 2: corpus fixtures for every table row agree between the rule and the bundle, and a 10-field line exits 2.** SUPPORTED, EXECUTED. The corpus run `npx vitest run --config vitest.corpus.config.ts corpus/branch-state.corpus.test.ts` passed 7/7 in 63.65 s. It has 12 fixture rows plus "refuses a ten-field line with exit 2". The bundle was also driven directly (output below).
7. **Slice 2: the #995 guard passes with its rebuilt fixture.** SUPPORTED, EXECUTED. `a-failed-scan-keeps-the-last-sections.test.ts` fixtures now use `pr: 'MERGED', prListComplete: true`. The run passed.
8. **Slice 2: the three measured rows land in NOT STARTED, NOT STARTED and WORKING.** SUPPORTED, EXECUTED. `the-three-measured-rows.test.ts` derives `['unknown','blocked','wip']` through `branchState`, then asserts `not-started`, `not-started` and `working` through `rowsFromPulse`. The run passed.

## Commands and output

```
$ cd packages/board && npx vitest run test/unit/classifier-is-total.test.ts \
    test/unit/a-slice-with-no-work-waits-in-not-started.test.ts \
    test/unit/the-three-measured-rows.test.ts test/unit/a-failed-scan-keeps-the-last-sections.test.ts
 Test Files  4 passed (4)
      Tests  58 passed (58)

$ cd packages/domain && npx vitest run test/branch-state.test.ts
 Test Files  1 passed (1)
      Tests  65 passed (65)

$ cd packages/domain && npx vitest run --config vitest.corpus.config.ts corpus/branch-state.corpus.test.ts
 Test Files  1 passed (1)
      Tests  7 passed (7)   Duration 63.65s

$ env -u PLOT_UNATTENDED node --test --test-name-pattern='zero-ahead|prerequisite refill carries' test/reconcile/fleet.test.mjs
✔ fleet: a zero-ahead ref behind main with no PR in a complete list is open (1033ms)
✔ fleet: a zero-ahead ref behind main reads unknown when the PR list is incomplete (1034ms)
✔ fleet: the prerequisite refill carries the list completeness (1107ms)

$ printf 'false\tbbb\taaa\tfalse\tok\tNONE\t0\t0\t-\t?\n' | node skills/plot/scripts/board/plot-branch-state.mjs
plot-branch-state: line 1: expected 11 tab-separated fields, got 10
exit=2
$ (12 fields) -> "expected 11 tab-separated fields, got 12", exit=2
```

The bundle, one 11-field line per table row (refTip bbb, mainTip aaa, zero ahead):

| Reading | Bundle answer | Plan's table |
|---|---|---|
| mainTip `-` | unknown | unknown |
| MERGED | merged | merged |
| unasked, pr `-`, list false | merged | merged |
| throttled / secondary / failed | unknown / unknown / unknown | unknown |
| reach `partial` (read as failed) | unknown | unknown |
| ok, pr `-` (unreadable) | unknown | unknown |
| ok, OPEN | wip | wip |
| ok, NONE / CLOSED, list true | open / open | open |
| ok, NONE / CLOSED, list false | unknown / unknown | unknown |
| NONE, list true, waits prerequisite MERGED | open | open |
| NONE, list true, waits prerequisite OPEN | waiting | waiting (`:188`) |

```
$ gh pr checks 1108   -> corpus pass, validate pass
$ gh pr checks 1106   -> corpus pass, validate pass
```

## Remaining gap

The only item not executed locally is "fleet.test.mjs passes whole". It rests on the #1108 CI log (2170/2170 contract tests). No item was refuted.
