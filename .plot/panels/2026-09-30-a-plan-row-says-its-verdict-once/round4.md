Position: proceed
Evidence: executed
Lens: refutation juror, round 4; macOS, Node from PATH; plan and code read at origin/main 920cf281; scratch dir /private/tmp/claude-501/-Users-jwloka-Quatico-Agentic-Tools-plot/1520fd86-1f27-4630-a596-1cdb41c71fbf/scratchpad/juror-1103-r4.6ZTPrr (round 3's dir was not touched).

## Findings

1. Round 3's four required changes are answered. The plan now carries a per-call-site input table; the all-deferred NOT STARTED case is the table's fifth row and Done-when 6; `rows.tsx:877` is named as the *Start work* gate and "not a call site"; Done-when 5 is scoped to the `planHeads` sections. Command: `git show origin/main:docs/plans/2026-09-30-a-plan-row-says-its-verdict-once.md` (sections "One function decides" and "Done when").

2. The NOT STARTED `sliceRowVisible` omits the `(expanded === null || expanded)` guard that round 3 asked for, and the omission is harmless. `expanded` at `AgentList.tsx:1497` is `foldable ? … : null`, and `foldable = showsSliceFold(group)` (`:1489`), which is `groupBySlice(group.rows).length > 1` (`sections.ts:688-698`). A one-slice plan has `planSliceCount === plan.slices.length === 1` (`domain/src/rules/pulse.ts:68`, `schema.ts:1491`), so every row carries the same `wave`, `groupBySlice` yields one group, and `expanded` is always `null`: the slice list at `:1611` always renders. The plan's own sentence "a one-slice plan in NOT STARTED has no fold" is therefore correct.

3. `groupBySlice(group.rows.filter(isUnbegun))` can be lifted to the `:1582` PlanRow call without a behaviour change. It is a pure function of `group.rows` (`slices.ts:127-141`, a `Map` fold with no side effects), `group` is in scope at `:1582`, and the list at `:1652` computes the same expression from the same value.

4. The `:1911` visibility expression in the plan is the one that gates the SliceRows. The PlanRow there renders only under `{planHeads && (` (`AgentList.tsx:1831`), and the slice list is gated at `:1975-1977` by `!planHeads || hasExceptions(group.rows) || (sliceGroupsFor(...).length > 1 ? openPlans.has('open:…') : !openPlans.has('shut:…'))`. Under `planHeads` this reduces to "`hasExceptions`, or the head open", which is the plan's wording. The SliceRow there receives `soleRow={wg.rows.length > 1 ? undefined : wg.rows[0]}` (`:2066`) and `groupedCount` only for several rows (`:2059`), which matches the `soleRowStatus` column. The NOT STARTED SliceRow (`:1658-1685`) receives no `soleRow` and no `groupedCount`, which matches the `null` in that row.

5. The contract prints the verdict exactly once in every case the table names. Probe: the plan's function as specified, combined with the slice-row status from `tuple-row.ts:1508-1516`. Command: `node probe.mjs`. Output:
```
OK  planHeads collapsed (shut:): plan="complete" slice="(no slice row)" count=1
OK  planHeads open, 2 branches: plan="" slice="2 complete" count=1
OK  planHeads open, 1 branch pr unknown: plan="" slice="complete" count=1
OK  planHeads open, 1 branch pr green: plan="complete" slice="green" count=1
OK  planHeads hasExceptions forces open, green: plan="complete" slice="green" count=1
OK  NOT STARTED, 1 unbegun: plan="" slice="eligible" count=1
OK  NOT STARTED, 3 unbegun: plan="" slice="eligible · 3 left" count=1
OK  NOT STARTED, all deferred: plan="eligible" slice="(no slice row)" count=1
```
The deferred branch rows that NOT STARTED renders beside the slice list (`:1735`) do not print the verdict: `git grep -n "\.verdict"` over `tuple-row.ts` and `rows.tsx` finds the verdict only in the plan row's `soleSlice` span, the SliceRow and `tupleFromSlice`, never in a branch `Row`.

6. Every Done-when item is testable as written. Item 1 maps each of the five table rows to one input pair of a pure function. Items 2-7 each name a section, a fixture shape (`pr.state: 'unknown'`, open PR, two branches, collapsed head, all deferred, unbegun and `eligible`) and a DOM observation (`data-sole-wave-verdict`, the fold attribute `data-plan-pr-fold`, the slice row's text, *Start work*). Item 8 names comment locations that all exist at origin/main: `rows.tsx:539`, `:746-750`, `:753`, `AgentList.tsx:1580`, `:1645`, `:1908`, `:2019`, and `packages/board/test/integration/plan-rounds-badge.browser.test.ts`.

7. Two wording gaps remain, and neither blocks the build. The `:1911` row says `soleRowStatus(row)` without naming the row. At that site it is `wg.rows[0]` of the one slice group, and the `soleRow` prop at `:2066` already names it. Done-when 4 names no section. The multi-branch case holds in both NOT STARTED (`eligible · 2 left`) and a `planHeads` section (`2 complete`), so either fixture proves it.

## What the plan must change
