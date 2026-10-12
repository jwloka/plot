Position: amend
Evidence: executed
Lens: refutation juror, round 3; macOS darwin 24.6.0, Node 24; judged origin/main at 1988fafe (`git fetch -q origin main; git log -1 --oneline origin/main` → `1988fafe plot: amend a-plan-row-says-its-verdict-once after round 2 (#1103)`). Local HEAD is 4cf00407 and `git diff --stat origin/main -- packages/board/src` is empty, so `stuck.ts` was bundled from the working tree with `packages/board/node_modules/.bin/esbuild` into the scratch dir and probed with node. Source files were read from `git show origin/main:<path>`. No test suite and no browser suite was run.

## Findings

1. **Round 2's five points are answered in the design.** (1) The table now says `soleRowStatus` is empty only for a PR in state `unknown` and puts `delivered`, `deferred`, `open`, `working` and `stalled` in the "a word" row. (2) The contract reads "`true` when `sliceRowVisible` is false, or when `soleRowStatus` is a non-empty string". (3) The several-branch slice is a table row and takes `soleRowStatus: null`, with its own unit-test row in Done-when 1. (4) The rule reads "Within one section". (5) The DONE browser item pins `pr.state: 'unknown'` and asserts the text, and the table's first row names `hasExceptions`.

2. **The contract is correct at the `planHeads` call site (`AgentList.tsx:1911`).** There `SliceRow` receives `soleRow={wg.rows.length > 1 ? undefined : wg.rows[0]}` and `groupedCount`/`groupedWord` (`AgentList.tsx` near :2068), and `tupleFromSlice` prints `soleStatus` first, then `N <verdict>`, then the verdict (`tuple-row.ts:1508-1516`). The contract, coded verbatim in `probe3.mjs`, gives:
   ```
   DONE merged, pr unknown: soleRowStatus="" planRowShows=false
   WAITING ON YOU open pr green: soleRowStatus="green" planRowShows=true
   DONE merged, no pr: soleRowStatus="delivered" planRowShows=true
   several branches (null): planRowShows=false
   hidden: planRowShows=true
   ```
   Each result puts the verdict on exactly one row. The slice-list guard at `AgentList.tsx:1975-1977` (`!planHeads || hasExceptions(group.rows) || … !openPlans.has(\`shut:${group.plan}\`)`) is the `sliceRowVisible` input, and `soleRowStatus(wg.rows[0])` is the second input when there is one group of one row. Neither duplicates `SliceRow`.

3. **At the NOT STARTED call site (`AgentList.tsx:1582`) the design's instructions give the verdict twice.** The design says `AgentList.tsx` computes the second input as "`soleRowStatus` on the slice's one row" and defines it as "the string for a one-branch slice". But the NOT STARTED `SliceRow` (`AgentList.tsx:1651-1680`) receives no `soleRow`, no `groupedCount` and no `groupedWord`, so `soleStatus` is `''` (`rows.tsx:1130`, `soleStatus: soleRow ? soleRowStatus(soleRow) : ''`) and the slice row prints the verdict. `soleRowStatus` of that one row is not empty: `probe2.mjs` output:
   ```
   NOT STARTED unbegun row, startability=start-work -> soleRowStatus "start work"; f(input=soleRowStatus(row))=true; f(input=null)=false
   NOT STARTED unbegun row, startability=needs-brief -> soleRowStatus "needs a brief"; f(input=soleRowStatus(row))=true; f(input=null)=false
   NOT STARTED unbegun row, startability=waiting-on-approval -> soleRowStatus "waiting on approval"; f(input=soleRowStatus(row))=true; f(input=null)=false
   NOT STARTED unbegun row, startability=null -> soleRowStatus "open"; f(input=soleRowStatus(row))=true; f(input=null)=false
   ```
   Following the design, a one-branch one-slice plan in NOT STARTED prints the verdict on the plan row and on the slice row. The correct input there is `null` (or `''`) for every slice, because that section never passes `soleRow`. The table's own heading "A one-branch slice (`soleRow` set)" hints at this, but the call-site sentence contradicts it. Done-when 6 would catch the mistake after the fact; the design should state the input.

4. **At NOT STARTED the section's fold expression is not the slice row's visibility.** The slice rows there are `groupBySlice(group.rows.filter(isUnbegun))` (`AgentList.tsx:1652`), and `isUnbegun` is `row.group === 'not-started' && row.state === 'open'` (`row-identity.ts:74`). `classifyGroup` puts a `deferred` branch of an Approved plan in NOT STARTED (`fleet.ts:4362-4378`: `if (pr) return { group: 'not-started', … }` and the two following returns). For a one-slice Approved plan whose branches are all deferred, the slice list holds no `SliceRow`, only branch rows that print `deferred`, while the fold expression `expanded === null || expanded` is true: `showsSliceFold` counts `groupBySlice(group.rows)` over all rows (`sections.ts:688-698`), which is 1, so `expanded` is `null`. The scan calls such a slice `complete` ("every non-deferred branch of the wave has merged", `plot-fleet-scan.sh:65`). Today the plan row prints `complete`; with `sliceRowVisible` taken from the fold expression the function answers `false` and the verdict appears zero times in the section. `sliceRowVisible` at NOT STARTED must also require that the unbegun slice groups are non-empty.

5. **`rows.tsx:877` is not a `PlanRow` call site.** It is the `soleSlice` prop of `PlanActions` inside `PlanRow` (`rows.tsx:868-882`, `soleSlice={soleSlice?.verdict === 'eligible' && card && dispatch ? … : undefined}`). The design lists it among the places that "compute both inputs". It needs no input; the design's own next paragraph says that gate is untouched. The list should name the two real call sites.

6. **Done-when items are testable, with one scope to name.** Items 1 to 4, 6 and 7 are testable as written. Item 5, "a collapsed one-slice plan head renders its verdict on the plan row", is reachable only at the `planHeads` site: at NOT STARTED a one-slice plan has no fold, because `showsSliceFold` returns false for one slice group and `expanded` is `null`. The item should name a `planHeads` section (WAITING ON YOU, QUIET or DONE) so the test does not try to collapse a head that has no caret.

## What the plan must change

1. State the inputs per call site. At `AgentList.tsx:1911` (`planHeads`): `sliceRowVisible` is the slice-list guard at `:1975-1977`, including `hasExceptions(group.rows)`; `soleRowStatus` is `soleRowStatus(wg.rows[0])` when the one slice group holds one row, else `null`. At `AgentList.tsx:1582` (NOT STARTED): `soleRowStatus` is always `null`, because that `SliceRow` receives no `soleRow` and prints the verdict; `sliceRowVisible` is `(expanded === null || expanded) && groupBySlice(group.rows.filter(isUnbegun)).length > 0`.
2. Add the all-deferred one-slice plan in NOT STARTED to the table's "hidden" row, and add a unit or browser case for it: the plan row keeps the verdict.
3. Remove `rows.tsx:877` from the list of call sites that compute the inputs.
4. Scope Done-when 5 to a `planHeads` section.
