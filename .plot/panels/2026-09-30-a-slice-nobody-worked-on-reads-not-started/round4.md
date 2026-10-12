Position: proceed
Evidence: executed
Lens: refute, round 4. macOS, Node from PATH; plan and code read at origin/main 76fcbe6f (`git fetch -q origin main; git log -1 --oneline origin/main` → `76fcbe6f plot: amend a-slice-nobody-worked-on-reads-not-started after round 3`). Ran the shipped `plot-branch-state.mjs` (copied from origin/main into a scratch dir) on 10- and 11-field lines, and a shell reproduction of the refill line. No suite run, no worktree created.

## Findings

1. **Round 3's three required changes (five points) are answered.**
   - Refill named: the design now says the prerequisite refill at `plot-fleet-scan.sh:3923` *"rebuilds the line with `cut -f1-9` plus the prerequisite's word and would otherwise drop it"*, and every line-building path carries the field.
   - Done-when case added: *"a zero-ahead ref behind main whose `waits:` prerequisite has MERGED reads `open` through the scan's prerequisite refill path, proving the eleventh field survives `plot-fleet-scan.sh:3923`"*.
   - Tolerance dropped: *"the bundle requires exactly 11 after this slice, refusing any other count with exit 2"*, with the reason *"The scan is the only caller that sends lines, and the bundle and the scan ship in the same slice"*. Done-when adds *"the bundle refuses a 10-field line with exit 2"*.
   - `unknown` sentence: now *state unknown — the host's answer is incomplete*, one neutral sentence. It is true for the incomplete-list case this repository produces and for the no-ref failed-host case (`branch-state.ts:198-204`).
   - Slice 1 Done-when item 1 now says *worker `none` or `elsewhere`*.

2. **The scan is the only line producer, and no test feeds the bundle a line.**
   ```
   $ git grep -n 'plot-branch-state' origin/main -- . ':!docs/plans' | grep -v board-server.mjs
   .gitattributes:50, packages/board/build.mjs:509-510,1007, bundles.generated.ts:47,
   entry/branch-state.ts:15 (docstring example), :254 (error prefix),
   corpus/branch-state.corpus.test.ts:35 (comment), plot-fleet-scan.sh:3382 (comment), :3620 (the call)
   $ git grep -n "branchState(" origin/main -- packages | grep -v "/test/\|corpus"
   packages/board/src/server/entry/branch-state.ts:228
   ```
   Inside the scan, lines are built in two places only: pass 1a (`readings+="$(branch_readings "$br" "$deferred")	${waits:--}	?"`) and the refill at `:3923`. The other `cut -f` and `read` sites near there (`:3916 cut -f9`, `:3946 cut -f1` of answers, `:3955`, `:4026`) read the prerequisite name or the answer/state records, not a readings line, and are unaffected by an eleventh field. No test in `test/`, `packages/board/test` or `packages/domain` imports `entry/branch-state` or pipes lines to the bundle; `test/reconcile/*` reaches it only through the real scan. The plan's claim that no other caller exists holds.

3. **Callers the slice must touch that the plan does not list by name, none of which contradicts a claim.** Adding `prListComplete` to `BranchReadings` touches every literal of that type: `packages/domain/test/branch-state.test.ts:25` (the `unstarted` base; the helpers `reading`/`probe` spread it), `a-failed-scan-keeps-the-last-sections.test.ts:45-92` (three literals cast `as never`, already named for rebuild), the corpus `readingsFor` (`:238-260`, named), and `entry/branch-state.ts:194` (named as the bundle). The corpus can fill the field from data it already holds: `readPrList` returns `complete` (`corpus/production.ts:200,231`). The docstring example at `entry/branch-state.ts:15` and the field table at `:57-72` print ten fields and need updating; that is documentation inside the named file.

4. **The bundle refuses a wrong field count today, as the plan says.**
   ```
   $ printf 'false\taaa\tmmm\tfalse\tok\tNONE\t0\t0\t-\t-\n' | node bs.mjs; echo "exit=$?"
   merged	0
   exit=0
   $ printf 'false\taaa\tmmm\tfalse\tok\tNONE\t0\t0\t-\t-\ttrue\n' | node bs.mjs; echo "exit=$?"
   plot-branch-state: line 1: expected 10 tab-separated fields, got 11
   exit=2
   ```
   The first line is measured row 1's shape (zero ahead, behind main, host ok, pr none) and answers `merged` today: the defect is real on the shipped bundle.

5. **Carrying field 11 through the refill holds.** The refill keeps fields 1-9, replaces field 10 (`?`) with the prerequisite's word, and must re-append field 11:
   ```
   $ line='false aaa mmm false ok NONE 0 0 bug/prereq ? true' (tab-separated)
   $ r="$(cut -f1-9 <<<line)	MERGED	$(cut -f11 <<<line)"; awk -F'\t' '{print NF": "$0}'
   11: false	aaa	mmm	false	ok	NONE	0	0	bug/prereq	MERGED	true
   ```
   The flag that triggers the refill is computed as `waitsBranch !== '' && readings.waits === null && REPLACEABLE_BY_PREREQUISITE.includes(state)` (`entry/branch-state.ts:228-235`), and `waits` is null only while field 10 is `?`. With the new table, pass 1 answers `open` (list complete) with needs `1`, so the Done-when case does reach `:3923`. If the implementation dropped field 11 there, the exact-11 rule makes the second `ask_branch_states` exit 2 and the scan fail, so the Done-when case catches the defect either way instead of silently reading `unknown` (round 3's finding 3).

6. **Every Done-when item is testable as written.** Slice 1 references hold at origin/main: `classifyGroup` at `fleet.ts:4073`, `rowQuietKind` at `:5257`, `group = closedPr ? 'done' : openGroup` at `:6547`, `STATES` at `classifier-is-total.test.ts:77` (five states today, so *covers all eight* is a concrete count). Slice 2's shim cases are buildable with two constraints the implementer must respect, both stated by existing code rather than by the plan: the list only counts as complete when it holds at least one row (`plot-fleet-scan.sh:1078`, `_pr_rows -gt 0`), and *"under the same shim"* for the MERGED-prerequisite case means the shim answers `NONE` for the slice and `MERGED` for the prerequisite, which one shim with per-branch answers does.

7. **Residual imprecision, not blocking.** The one `unknown` sentence *the host's answer is incomplete* is inaccurate for the table's first row (`mainTip` null, a git reading, no host involved). That row needs `origin/<main>` unreadable, in which case the scan has larger failures. Round 3 also asked that measured row 1's fixture assert the sentence; the last Done-when item asserts only the section (NOT STARTED), while slice 1's first item already requires an `unknown` row to carry its own sentence. An implementer can add the assertion without a plan change.

## What the plan must change
