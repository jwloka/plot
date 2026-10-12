Position: amend
Evidence: executed
Lens: refute, round 2. macOS, Node v24.21.0, detached scratch worktree at origin/main 823edde8 (`git worktree add --detach`). Read `branch-state.ts`, `entry/branch-state.ts`, `plot-fleet-scan.sh`, `fleet.ts`, `registryd-main.ts`, `queue-reading.ts`, the corpus, `branch-state.test.ts`, `classifier-is-total.test.ts`, `a-failed-scan-keeps-the-last-sections.test.ts`; ran the committed `plot-branch-state.mjs` bundle. No suite run: no finding depends on one.

## Findings

1. **Round 1's list: seven of eight answered in the design, one partly.** The `unasked` answer, `mainTip: null`, `OPEN → wip`, dropping `mergeSubjectFound`, the reversal note, `.list-complete`, the slice order (slice 1 is the first wave, so slice 2 waits for it by wave order), the `unknown`/`blocked`/`waiting` arms with their own sentences and a fallback, `STATES`, `closed = null` for a live worker, and the queue bullet all appear in the design. Two items are only partly answered. The table is not total over the readings (finding 2). The test inventory misses two assertions (finding 4).

2. **Slice 2's table is not total, and one of its rows names a value that does not exist.**
   `grep -n "HostReach =\|PrReading =" packages/domain/src/rules/branch-state.ts`:
   ```
   34:export type HostReach = 'ok' | 'unasked' | 'throttled' | 'secondary' | 'failed';
   45:export type PrReading = 'OPEN' | 'MERGED' | 'CLOSED' | 'none' | 'unreadable';
   ```
   (a) `partial` is not a `HostReach`. It is a scan verdict (`plot-fleet-scan.sh:100`, `:743`) that the bundle's `reachFrom` maps to `failed`, because it accepts only the five words:
   ```
   $ printf 'false\t-\tmmm\tfalse\tpartial\tNONE\t0\t0\t-\t-\n' | node skills/plot/scripts/board/plot-branch-state.mjs
   unknown	0
   ```
   The table's outcome for `partial` is therefore correct, but `hostReach === 'partial'` does not typecheck. The row must say *the scan's `partial`, which `reachFrom` reads as `failed`*.
   (b) `pr: 'unreadable'` with `hostReach: 'ok'` has no row. The table names `none`, `CLOSED`, `OPEN` and `MERGED` for an asked host. This reading is not hypothetical: the corpus's `prFor` (`branch-state.corpus.test.ts:205-210`) answers `unreadable` for every branch missing from an incomplete list, while the scan's `host_pr_state` answers `NONE` for the same branch (`plot-fleet-scan.sh:1177-1182`, *"NONE when the list arrived"*). On this repository the list is incomplete (1010 PRs against `PR_LIST_LIMIT` 1000), so the corpus feeds `ok` + `unreadable` + incomplete while the scan feeds `ok` + `none` + incomplete for the same branch. Both must answer `unknown`, or the corpus reports a disagreement. `branch-state.test.ts:343-351` already exercises `unreadable` on this arm (`it.each(['OPEN','CLOSED','unreadable'])`), so the rewrite needs an answer for it.

3. **`prListComplete` is available in both host arms, but the plan does not say how it reaches the rule.** `.list-complete` is written on one path for both hosts (`plot-fleet-scan.sh:1070-1081`): after a stated sweep (the Bitbucket per-branch sweep via `pr_sweep_report`), or by row count below the limit (GitHub). So the reading exists. The wire is fixed at ten positional fields and refuses anything else:
   ```
   $ printf 'false\taaa\tmmm\tfalse\tok\tNONE\t0\t0\t-\t-\t1\n' | node skills/plot/scripts/board/plot-branch-state.mjs; echo rc=$?
   plot-branch-state: line 1: expected 10 tab-separated fields, got 11
   rc=2
   ```
   `ask_branch_states` (`plot-fleet-scan.sh:3619-3622`) turns that into `exit 2`, so the scan and the bundle must change in one commit. The last two fields (`waitsBranch`, `waitsPr`) are appended by the caller, and `prListComplete` is one value per scan, not per branch. The plan must name the carrier: an eleventh field and its position, or an argument or environment variable to the bundle. It must also name the corpus side: `readingsFor` (`branch-state.corpus.test.ts:239-259`) builds `BranchReadings` as a literal and needs `prListComplete: prList.complete`. The only other `BranchReadings` literal outside the domain tests is in `a-failed-scan-keeps-the-last-sections.test.ts`, which casts with `as never` (finding 4).

4. **Two assertions that flip are not named, and the count of seven is wrong.** `grep -n "toBe('merged')" packages/domain/test/branch-state.test.ts` returns 13 lines. With the fixture default `hostReach: 'ok', pr: 'none'` (`:30-31`), the lines that change under the table are `:188`, `:316`, `:321`, `:335`, `:349` (three `it.each` cases) and `:374`: six lines, eight cases. `:188` is `does NOT replace the merged of a behind-main ref`. Under the table its reading becomes `unknown`, which is in `REPLACEABLE_BY_PREREQUISITE` (`:152`), so the `waits` with an `OPEN` PR turns it into `waiting`. That is a second behaviour change: a behind-main ref with a `waits:` annotation now reads `blocked` or `waiting`, and slice 1's new arms receive it. The plan does not state it.
   Outside the domain, `packages/board/test/unit/a-failed-scan-keeps-the-last-sections.test.ts` pins the old answer for the exact reading this plan changes:
   ```
   57:    expect(stale).toBe('merged');          // refTip aaa111, mainTip main999, ok, none, 0 ahead
   89-92: const derived = stale === 'merged' ? 'done' : 'not-started'; expect(derived).toBe('done');
   ```
   The fixture is cast `as never` and carries no `prListComplete`, so under the table it reads `unknown` and both tests fail. That file is the #995 guard (*"If this ever stops differing, the fix below is guarding nothing"*). The plan must name it and say what the #995 reproduction becomes. Under the table a stale claim-only pulse reads `merged` only when the host is `unasked`.

5. **Slice 1 does not place the new arms relative to the worker arm, and one placement breaks its own rule.** In `classifyGroup` the worker block runs for every state except `merged` (`fleet.ts:4775-4815`: `if (state !== 'merged') { if (worker === 'running') return { group: 'working', … }`). The `open` and `deferred` arms return before it, but `blocked`, `waiting` and `unknown` reach it today. A running worker on one of those branches therefore reads WORKING. If the three new NOT STARTED arms sit before that block, a live agent on a `waiting` branch moves to NOT STARTED. That contradicts the plan's own *"a live agent outranks"*. The case is reachable: the supervisor's queue ignores `waits:` (#1100, cited by the plan), so an agent can hold a slice whose prerequisite has not merged. The design must say that the arms sit after the worker block, or that they yield to `running` and `waiting` workers, and Done-when item 1 needs a worker-running case. `classifier-is-total.test.ts:77-85` crosses `STATES` with all eight `WORKERS`, so the totality test will reach this pair but does not assert the group.

6. **The prerequisite name exists on the pulse row, but `classifyGroup` does not take it.** The pulse carries `waits_on` (`plot-fleet-scan.sh:4138`, `entities/fleet.ts:200`). `fleet.ts` reads it nowhere (`grep -n waits_on packages/board/src/server/fleet.ts`: no match), and `classifyGroup`'s signature ends at `hostUnasked` (`fleet.ts:4200-4207`). The sentence *waits for `<prerequisite>`* therefore needs a new trailing parameter fed from `b.waits_on`. The file's own rule is *LAST, BECAUSE IT IS THE NEWEST*, because spread-tuple callers shift silently. The plan says *"which the row already carries"*, which is true of the pulse row and not of the classifier. It also says *"or wave order names"*, which is wrong: `blocked` and `waiting` come only from `waitVerdict` over a `waits:` annotation (`branch-state.ts:131-135`), never from wave order. Wave order yields the slice verdict `blocked`, which `BLOCKED_NOTE` already covers.

7. **`openGroup` is right for a live worker.** For a branch with a closed PR, `pr` is open-only and therefore null, so no PR arm fires. The branch state is `wip` or `claimed`, and the worker block (`fleet.ts:4776-4786`) returns `working` for `running` and `waiting`. `closedPr` already excludes `merged` (`fleet.ts:6542`). Measured row 3 (`wip`, `running`) lands in WORKING under the plan's change.

8. **The queue claim holds.** `registryd-main.ts:534-541` shows `claimedBranches` returning every `origin/*` ref (`refs.listBranches(true)`, stripped of `origin/`). An unreadable list answers `new Set(['*'])`. `queue-reading.ts:181` reads it as the claimed set. An existing ref of any state is therefore never queued, and the plan's statement that the operator's hold still holds against the supervisor is correct.

9. **Done-when testability.** Items 1, 2, 3, 4 and 6 are testable. Item 3 says `fleet.test.mjs`, and two files have that name: `test/reconcile/fleet.test.mjs` (163 tests, runs `--offline`; round 1 measured this one) and `test/e2e/fleet.test.mjs` (CI-only by the repository's rule). Item 3 must name `test/reconcile/`. Item 5 is still not testable as written. The corpus compares STATES, not readings, and reads only the live estate (`branch-state.corpus.test.ts:97-158`), so *"for these shapes"* holds only if a zero-ahead behind-main ref exists on the estate when CI runs. The plan should require a unit test of the bundle's parser with the new field instead, or state that the corpus proves the wire and nothing more about these shapes.

## What the plan must change

- Slice 2 table: replace `partial` with *the scan's `partial`, read as `failed` by `reachFrom`*. Add a row for `pr: 'unreadable'` with the host asked. It answers `unknown`, so the corpus (`unreadable`, list incomplete) and the scan (`none`, list incomplete) agree.
- Slice 2: name how `prListComplete` reaches `plot-branch-state.mjs`: an eleventh field and its position relative to the appended `waits` pair, or a per-invocation argument. Name the corpus's `readingsFor` gaining `prListComplete: prList.complete`, and name the bundle's `FIELDS` and its header table.
- Slice 2: correct the test inventory. It covers `branch-state.test.ts:188`, `:316`, `:321`, `:335`, `:349` (three cases) and `:374`, and `packages/board/test/unit/a-failed-scan-keeps-the-last-sections.test.ts:57` and `:89-92`. State what the #995 reproduction asserts afterwards. State that a behind-main ref with a `waits:` annotation now reads `blocked` or `waiting` (via `REPLACEABLE_BY_PREREQUISITE`) instead of `merged`.
- Slice 1: place the `blocked`, `waiting` and `unknown` arms after the worker block, or make them yield to a `running` or `waiting` worker. Add a Done-when case with a running worker on a `waiting` branch that stays in WORKING.
- Slice 1: say that `classifyGroup` gains a trailing parameter carrying `b.waits_on`. Drop *"or wave order names"*, because the branch states `blocked` and `waiting` come only from a `waits:` annotation.
- Done-when: name `test/reconcile/fleet.test.mjs`. Replace the corpus item with a claim it can prove (a bundle parser test for the new field), or limit it to the wire.
