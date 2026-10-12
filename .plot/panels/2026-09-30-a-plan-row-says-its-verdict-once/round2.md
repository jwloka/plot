Position: amend
Evidence: executed
Lens: refutation juror, round 2; macOS darwin 24.6.0, Node v24.21.0; judged origin/main at 04f18780 (`git fetch -q origin main; git rev-parse --short origin/main` → `04f18780`). Local HEAD is 459e5bc4 (one plan-only commit ahead); `git diff --stat origin/main HEAD -- packages/board/src/app/lib packages/board/src/app/components/AgentList.tsx` is empty, so the probe below ran against origin/main's code. No test suite and no browser suite was run.

## Findings

1. **Round 1's five points are answered.** (1) The false premise is replaced by the per-section table. (2) The collapsed head (`shut:` override) is the table's fourth row and keeps the verdict. (3) Done-when is rewritten per section and per state. (4) The duplicated PR word is resolved: in the PR-word case the plan row keeps the verdict and prints no fold, which matches `rows.tsx:776-795` (`soleSlice?.verdict ? … : prFold ? …`, so the fold is already suppressed whenever the verdict prints). (5) Every comment from round 1's finding 8 is listed, and the Slices line now says no existing test asserts the plan-row verdict.

2. **The table's second row names the wrong cases, and its third row names the wrong kind of word.** `soleRowStatus` (`stuck.ts:104-113`) returns a worker word for a live worker, `prStatus(row.pr)` when a PR exists, and `stateStatus(row)` otherwise; `stateStatus` (`tuple-row.ts:1123-1173`) returns `delivered`, `deferred`, `open`, a startability word or a quiet-kind word. It is empty only for a PR whose state is `unknown`. Executed against origin/main's source (esbuild bundle of `stuck.ts` in the scratch dir, `node probe.mjs`):
   ```
   "merged, pr unknown" -> ""
   "merged, pr green" -> "green"
   "merged, no pr" -> "delivered"
   "deferred, no pr" -> "deferred"
   "open, no pr" -> "open"
   "wip, running worker, pr green" -> "working"
   "wip, stalled worker, no pr" -> "stalled"
   "open pr failing" -> "checks failing"
   ```
   So "`soleRowStatus` empty (merged, deferred, no PR)" is false for deferred and for no PR: those slice rows print `deferred`/`delivered`/`open`, not the verdict. A merged PR is empty only while the host reports mergeability unknown (`prStates`, `fleet.ts:5582-5590`); a merged PR reported mergeable with green checks prints `green`. And the third row's "a PR word" misses `working`, `waiting`, `stalled` and the state words. The function's stated contract, "`true` when the slice row is hidden or prints a PR word", taken literally (for example gated on `soleRow.pr`, the way `statusAttr` is at `rows.tsx:1321`) drops the verdict from both rows for a one-slice plan whose sole branch has no PR or a live worker in WAITING ON YOU, QUIET or DONE. The rule that gives "exactly once" is: the plan row prints the verdict when the slice row is hidden or its status is any non-empty word other than the verdict, i.e. `sliceRowStatus !== ''`.

3. **The table misses a one-slice plan whose one slice holds several branches.** At the `planHeads` site `soleRow={wg.rows.length > 1 ? undefined : wg.rows[0]}` and `groupedCount`/`groupedWord={wg.verdict}` are passed (`AgentList.tsx:2068-2070`), so `tupleFromSlice` prints `${groupedCount} ${groupedWord}`, e.g. `2 complete` (`tuple-row.ts:1508-1516`). In NOT STARTED no `soleRow` is passed and it prints `verdict · N left` (same lines). Both already carry the verdict, so the plan row should drop it; the plan does not say what `AgentList` passes as `sliceRowStatus` there (`soleRowStatus` is not defined without a `soleRow`). Computing it as `wg.rows.length > 1 ? '' : soleRowStatus(wg.rows[0])` gives the right answer, but the plan should state it, and the unit test should have a row for it.

4. **"Exactly once among the rows a reader can see" is not true across sections.** `soleSliceFor` (`AgentList.tsx:101-107`) finds the slice by plan name, independent of section, and both PlanRow call sites (`:1582`, `:1911`) pass it. A one-slice plan with one branch unbegun (NOT STARTED) and one branch carrying an open PR (WAITING ON YOU) renders a plan row and a slice row in both sections. After this plan: NOT STARTED's slice row prints the verdict, and WAITING ON YOU's plan row prints it too (its slice row, if one branch, prints the PR word). Two visible occurrences. This is an improvement on today's three, not a regression, but the rule as written is false; it should read "once per section".

5. **Q3, computability at the call sites: yes, without duplicating `SliceRow`.** At the `planHeads` site the slice list's visibility is the expression already written twice (`AgentList.tsx:1881-1886` for `expanded` and `:1975-1977` for the list guard); the slice status is `soleRowStatus(wg.rows[0])` for the single group from `sliceGroupsFor(group.rows, key, slices)`. At NOT STARTED the slice row is visible whenever `groupBySlice(group.rows.filter(isUnbegun))` is non-empty (`:1651-1653`) and has no `soleRow`, so its status is always the verdict. `rows.tsx:877` is `PlanActions`' Start-work gate, not a PlanRow call site, and needs no input. The one caution is that "`AgentList.tsx` passes whether the head is open" is not enough on its own: at the `planHeads` site the visibility also includes `hasExceptions(group.rows)`, which forces the list open.

6. **Q2, sections not in the table: none missing.** WORKING renders `RegistryRow` only (`AgentList.tsx:1377-1389`), and `sliceGroupsFor` returns `[]` for `working` and `waiting-on-machine` (`sections.ts:266`), so `planHeads` is false there and no PlanRow renders. Draft plans' branches sit in NOT STARTED with a startability word and are covered by the first row.

7. **Q4, `stuck.ts` as the home: acceptable.** `soleRowStatus` already lives there and is unit-tested (`test/unit/stuck.test.ts`). The repo's measurable form, "a view state that cannot be asserted without a browser is a domain property that has not been extracted yet", is met by a pure, unit-tested function. Moving it to `packages/domain` would be a preference, not a defect.

8. **Q5, testability: the harness has what the Done-when items need** (`planSliceCount` fixtures in `plan-row-slice-actions.browser.test.ts` and `agents-tab.browser.test.ts`, `data-slice-toggle` in `folded-plan-pr-fold.browser.test.ts`). One Done-when item is true only for a specific fixture: "a one-slice plan with a merged PR in DONE, head open, renders `complete` once, on the slice row" holds only when the fixture's `pr.state` is `unknown` (finding 2). With `pr.state: 'green'` the slice row prints `green` and the plan row keeps `complete`, which is also correct behaviour but fails the item as written. Also the slice row then carries `data-pr-state="unknown"`, not `data-verdict` (`rows.tsx:1321-1324`), so the test must assert the text, not `[data-verdict]`.

## What the plan must change

1. Correct the table: the second row is "`soleRowStatus` empty, which happens only for a PR whose state is `unknown` (the measured merged case)"; move deferred, no-PR and live-worker slices to the third row, and rename that row "any non-empty status word (a PR word, a worker word such as `working`/`stalled`, or a state word such as `delivered`/`deferred`/`open`)".
2. State the function's contract as "`true` when the slice row is hidden or `sliceRowStatus` is non-empty", not "prints a PR word", and give the unit test a row for each word kind in the probe above.
3. Name the one-slice plan whose slice holds several branches and state what `AgentList` passes (`''`, since the slice row prints `N <verdict>` or `<verdict> · N left`), with its own unit-test row.
4. Scope the rule to "once per section", or state that a one-slice plan split across NOT STARTED and another section still shows the verdict in both.
5. Pin the DONE browser fixture to `pr.state: 'unknown'` and have it assert the slice row's text rather than `data-verdict`; and say that `sliceRowVisible` at the `planHeads` site includes `hasExceptions(group.rows)`, not only the head's open state.
