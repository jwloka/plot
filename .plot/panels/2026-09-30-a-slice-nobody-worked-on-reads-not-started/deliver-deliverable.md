# Delivery juror: Deliverable lens

Position: supported
Evidence: executed

Subject: docs/plans/2026-09-30-a-slice-nobody-worked-on-reads-not-started.md, read against the first-parent diffs of 6e65021b (#1106) and f1d63485 (#1108) and the code on main at ac593f98.

## Per-item findings

1. **Slice 1: blocked/waiting/unknown with worker none/elsewhere reads not-started with its own sentence; a running worker reads working; classifier-is-total covers eight states; a wip row still reads abandoned.** SUPPORTED. `packages/board/src/server/fleet.ts` (#1106 hunk at `@@ -5070`) adds the three arms after the worker block, with the three sentences from the plan's table, plus the `state ... not recognised` arm and a tail guarded on `state !== 'wip'`. The same diff adds the trailing `waitsOn` parameter, and `rowsFromPulse` passes `b.waits_on`. `classifier-is-total.test.ts` `STATES` gains the three states, and the count moves from 600 to 960. `a-slice-with-no-work-waits-in-not-started.test.ts` asserts each state under `none` and `elsewhere`, `working` under `running`, the unrecognised-word arm, and the `wip` control reading `no PR ever opened`. EXECUTED: 4 board unit files, 58/58 pass.

2. **Slice 1: a closed PR with worker running/waiting stays in its open group with no closed-pr kind; with no live worker it stays in DONE.** SUPPORTED. The `fleet.ts` hunks at `@@ -6544` and `@@ -6572` add `liveAgent`/`declined`. `rowQuietKind` receives `declined ? 'closed' : null`, and the note keeps `PR closed without merging` as a second fact. The test covers `running` and `waiting` (reads `working`, no `closed-pr`), and `none`, `elsewhere` and `finished` (reads `done`, `closed-pr`). EXECUTED (same run).

3. **Slice 2: branch-state.test.ts asserts every table row, :188 reads waiting, fleet.test.mjs passes whole offline.** SUPPORTED. The `describe('a ref behind main is decided by the host')` block covers all eight table rows: mainTip null, MERGED under all five reaches, unasked under four PR words, throttled/secondary/failed, unreadable, OPEN, none/CLOSED with a complete list, and none/CLOSED with an incomplete list. The prerequisite case now expects `waiting`. EXECUTED: the domain file passes 65/65. I did NOT run the whole of fleet.test.mjs, because the rubric forbids it. CI `validate` on #1108 runs `pnpm run test:contracts`, which covers `test/reconcile/*.test.mjs`, and it passed (run 36725577392). That half rests on CI evidence.

4. **Slice 2: under a host shim answering NONE with a complete list, the second slice's wave does not complete; with the list incomplete the slice reads unknown.** SUPPORTED. `test/reconcile/fleet.test.mjs` adds `a zero-ahead ref behind main with no PR in a complete list is open` (it asserts `open` and that wave Two is not `complete`). It also adds `... reads unknown when the PR list is incomplete` with `PLOT_PR_LIST_LIMIT=1`. EXECUTED: both pass.

5. **Slice 2: a merged prerequisite reads open through the refill path, proving field 11 survives :3923.** SUPPORTED. `plot-fleet-scan.sh` at `@@ -3923` re-appends `cut -f11` after the replaced field 10. The test `the prerequisite refill carries the list completeness` asserts `open`. The proof is indirect: a dropped field would make the bundle exit 2, and that assertion would fail. The shim's `pr-state` answers NONE for every branch. The prerequisite's MERGED comes from the `pr-list` line, not from `pr-state`. That still matches the plan's note. EXECUTED: passes.

6. **Slice 2: corpus fixtures for every table row agree between the rule and the bundle; the bundle refuses a 10-field line with exit 2.** SUPPORTED. `packages/domain/corpus/branch-state.corpus.test.ts` adds 12 fixture rows covering the table, runs them through the shipped `plot-branch-state.mjs` via `spawnSync`, and asserts zero disagreements. It also adds `refuses a ten-field line with exit 2`. `readingsFor` passes `prListComplete: prList.complete`. The bundle diff shows `p=11` and the new zero-ahead chain. EXECUTED: the corpus file passes 7/7.

7. **Slice 2: the #995 guard passes with its rebuilt fixture.** SUPPORTED. `a-failed-scan-keeps-the-last-sections.test.ts` rebuilds the three readings with `pr: 'MERGED', prListComplete: true`. EXECUTED: it passes within the 4-file board run.

8. **Slice 2, landing second: the three measured rows land in NOT STARTED, NOT STARTED and WORKING.** SUPPORTED. The new file `packages/board/test/unit/the-three-measured-rows.test.ts` derives the states `unknown`, `blocked` and `wip` through `branchState` and places them through `rowsFromPulse`. The groups are `not-started`, `not-started` and `working`. #1108 merged at 16:35, after #1106 at 15:55. EXECUTED: it passes.

## Other deliverables named in the Design

- The `entry/branch-state.ts` docs at `:15` and `:57-72` are updated to eleven fields: present in the #1108 diff.
- The `branch-state.test.ts:306-319` note is replaced: it was removed, and the new describe block states the host-decides rule.
- `BLOCKED_NOTE` is not reused: confirmed in the #1106 hunk.

## Residual observations (not refutations)

- The whole-file run of `fleet.test.mjs` was not executed here. Its pass rests on the CI `validate` job.
- The rule's tip-equality guard dropped `refTip !== null`. The `refTip === null` arm returns earlier, so this changes no behaviour.
