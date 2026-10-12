Position: amend
Evidence: executed
Lens: refute, round 3. macOS, plan and code read at origin/main 4cf00407 (`git fetch -q origin main; git rev-parse --short origin/main` → `4cf00407`). Read `branch-state.ts`, `entry/branch-state.ts`, `plot-fleet-scan.sh`, `fleet.ts` (`classifyGroup`, `rowsFromPulse`), `a-failed-scan-keeps-the-last-sections.test.ts`. Ran shell demonstrations of the scan's refill line and one `gh` count in a scratch dir. No suite run and no worktree created: no finding depends on a suite.

## Findings

1. **Round 2's six required changes are all answered in the design.** `partial` is now *the scan's `partial`, read as `failed` by `reachFrom`*; `pr unreadable` with the host asked has a row (`unknown`); the carrier is named (an eleventh positional field, 10 or 11 accepted, absent read as `false`) and the corpus's `readingsFor` gains it; the test inventory names the eight cases, `:188` and the #995 guard; the three arms sit after the worker block, and `waits_on` becomes a trailing parameter of `classifyGroup`; *"or wave order names"* is gone; Done-when names `test/reconcile/fleet.test.mjs` and replaces the corpus claim with a fixture comparison of rule and bundle.

2. **The slice-2 table is total, and the `waits` handling follows from the code order.** `HostReach` is `'ok' | 'unasked' | 'throttled' | 'secondary' | 'failed'` (`branch-state.ts:34`), `PrReading` is `'OPEN' | 'MERGED' | 'CLOSED' | 'none' | 'unreadable'` (`:45`). Read top to bottom the rows cover `mainTip null`, then `MERGED` for every reach, then `unasked`, then the three failures, then `ok` × {`unreadable`, `OPEN`, `none`/`CLOSED` × complete/incomplete}: every pair lands on exactly one row. The wait verdict is applied after `ownState` returns, not inside it:
   ```
   298:export const branchState = (readings: BranchReadings): BranchState => {
   299:  if (readings.deferredByPlan) return 'deferred';
   301:  const own = ownState(readings);
   303:  if (readings.waits !== null && REPLACEABLE_BY_PREREQUISITE.includes(own)) {
   304:    const verdict = waitVerdict(readings.waits.pr);
   ```
   `REPLACEABLE_BY_PREREQUISITE` is `['open', 'unknown']` (`:155`), so whether the zero-ahead arm answers `open` (list complete) or `unknown` (fixture default, no `prListComplete`), `:188`'s OPEN prerequisite gives `waitVerdict('OPEN')` = `waiting`. The zero-ahead arm (`:262-271`) needs only its final `return 'merged'` replaced; no restructuring.

3. **The eleventh field is dropped by the scan's own refill pass, and "absent read as `false`" turns that into a wrong answer instead of an error.** The scan builds each line as eight readings plus `waits` and `?` (`plot-fleet-scan.sh:3868`), so the eleventh field would go after `?`. When the bundle flags a branch for its prerequisite, the refill rebuilds the line from the first nine fields:
   ```
   3916:    waits_br=$(printf '%s' "$rd_line" | cut -f9)
   3923:      refill+="$(printf '%s' "$rd_line" | cut -f1-9)	$(waits_pr_state "$waits_br")"$'\n'
   ```
   Executed on an eleven-field line:
   ```
   $ line=$(printf 'false\taaa\tmmm\tfalse\tok\tNONE\t0\t0\tbug/prereq\t?\t1')
   first pass fields: 11
   refill fields: 10
   false	aaa	mmm	false	ok	NONE	0	0	bug/prereq	MERGED
   ```
   Consequence under the plan's own table: a zero-ahead ref behind main, host `ok`, `pr none`, list complete, whose prerequisite has MERGED. Pass 1 (11 fields) answers `open` with `needs=1` (`open` is replaceable, `waits` is null because of `?`). Pass 2 (10 fields) reads `prListComplete` as `false`, so `ownState` answers `unknown`, `waitVerdict('MERGED')` is `null`, and the final state is `unknown`. The branch the plan means to hand to `--next` is withheld, and the row reads *state unknown*. The bundle accepts the 10-field line silently, which is exactly what the "10 or 11" tolerance allows. Done-when's *"with the eleventh field present and absent"* does not reach this path. `plot-fleet-scan.sh` is the only caller (`git grep plot-branch-state origin/main` finds `:3620` alone outside docs and the bundle list); the corpus builds `BranchReadings` literals and never sends a line, so tolerance is not needed for any other caller.

4. **`false` for a caller that does not send the field changes no answer outside the zero-ahead arm.** `prListComplete` is read only in the new table; the no-ref arm (`:175-207`), the `commitsAhead > 0` arm (`:209-235`) and the tip-equality arm (`:262-266`) do not consult it. The only effect of an absent field is inside the zero-ahead, behind-main arm with host `ok` and `pr none`/`CLOSED`, which is finding 3's case.

5. **The #995 guard rebuild keeps its subject.** With `pr: 'MERGED'` and `commitsAhead: 0`, the new table's second row answers `merged`, so `stale === 'merged'` and `derived === 'done'` hold. The `fresh` fixture (`commitsAhead: 1, realCommitsAhead: 0`) returns `claimed` at `:215` before any PR check, so `expect(fresh).not.toBe(stale)` still holds. `sectionUnderFailure` is untouched. The fixture stops modelling the measured #995 branch (which had no PR), but the guard's subject is `sectionUnderFailure`, and `hostReach: 'unasked'` with `pr: 'none'` would be an equally valid alternative. Valid as written.

6. **The three arms are placeable after the worker block, and `waits_on` is available.** In `classifyGroup` the PR arm (`fleet.ts:4485`, all states but `merged`/`open`) and the worker block (`:4799-4979`, `if (state !== 'merged')`, returning for `running`, `waiting`, `failed`, `finished`, `stalled`, `ended`) both run before the `claimed` arm (`:4981`), the `merged` arm (`:5064`) and the `wip` tail (`:5073` onward). Arms inserted after `:4979` and before `:5079` are reached only with worker `none` or `elsewhere`, so a running worker still wins and the tail is never reached by the three states. `waits_on` is a field of every pulse branch (`packages/domain/src/entities/fleet.ts:200: waits_on: z.string().default('')`), so `rowsFromPulse` can pass `b.waits_on`.

7. **The `unknown` sentence is false for the case this repository will produce.** The plan's sentence for `unknown` is *state unknown — the host could not be asked*. On this repository the zero-ahead `unknown` comes from an incomplete list with the host asked and answering:
   ```
   plot-fleet-scan.sh:648: PR_LIST_LIMIT="${PLOT_PR_LIST_LIMIT:-1000}"
   $ gh pr list --state all --limit 2000 --json number -q 'length'
   1011
   ```
   `.list-complete` requires `_pr_rows -lt PR_LIST_LIMIT` (`:1078`), so it is never written here, and measured row 1 (`bug/the-suites-own-their-temp-root`, `pr-state` answers `NONE`) will land in NOT STARTED saying the host could not be asked while `hostReach` is `ok`. The plan's own motivation is a board row that states what is true; this row would state something false. `classifyGroup` already receives `hostUnasked`/`prUnknown`-style context, so the sentence can be split: one for a failed host, one for *no merged PR in the host's last 1000*.

8. **Done-when is testable, with one ambiguity.** Slice 1's first item says *"with no ref and no live worker classifies to `not-started`"*. The worker block returns for `failed`, `finished`, `stalled` and `ended` too (`:4909-4968`), none of which is live, so a `blocked` row with a `failed` worker does not reach the new arm. The item is testable only with worker `none` or `elsewhere`, and should say so. All other items are testable as written.

## What the plan must change

- Slice 2: name the refill line (`plot-fleet-scan.sh:3923`, `cut -f1-9` then the prerequisite's word) as a place that must carry the eleventh field through, for example `cut -f1-9`, the word, then `cut -f11`. Add a Done-when case: a zero-ahead behind-main branch with a complete list whose `waits:` prerequisite has MERGED reads `open` through the scan, not `unknown`. Either drop the 10-field tolerance (the scan is the only line-sending caller) or state why a 10-field line from the scan cannot occur.
- Slice 1: give `unknown` a sentence that is true when the host answered but the PR list is incomplete (for example *no merged PR in the host's list, and the list is incomplete*), distinct from the failed-host case; or name the one sentence neutrally. Measured row 1's fixture must assert that sentence.
- Done-when, slice 1 item 1: say worker `none` or `elsewhere` instead of *no live worker*.
