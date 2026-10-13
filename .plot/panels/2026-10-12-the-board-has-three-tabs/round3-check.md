# Round 3 check — the-board-has-three-tabs

Position: amend

Read at `64a699821` (plan), with `the-fleet-writes-the-design.md` and the story at the same commit. Local `main` is at `c9dba748e` and does not hold the revision; every line number below is from `git show 64a699821:<path>`.

## Round-3 amendments

| Amendment | Status | Plan line |
|---|---|---|
| M1 / cost A1: union of `inbox` rows and owned open rows, no duplicates | applied | :77; Acceptance :111 (1001 rows, `complete: false`, ticket only in `inbox`) |
| M1 / cost A2: count sentence from `hidden`, text tested for both `complete` values | applied | :78 `hiddenSentence`; Acceptance :111 |
| M1 / deliverable A1: *show every ticket* says N of M and keeps the reader's older ticket; Changelog words corrected | applied | :20, :78, :79, :82 `shown`; Acceptance :111, :112 (unmatched 127 rows answers 50 tickets, `shown` 127) |
| M2 / deliverable A2: both issue reads named, `waiting` set before the cut on each | applied | :62-66, :75; slice :141; Acceptance :111 |
| M2 / estate A1: fold's `rowOf` in the assignee slice, fleet unit test with two assignees | applied | :64; slice :137; Acceptance :113 `issue-refresh.test.ts` |
| M3 / contradiction A3: plan-level row in *Working* and *Waiting on you* with the shared shape and a halted flag | applied | :53-57; slice :129; Acceptance :110. First form (edit the sibling's `:25`, `:133`) declined at :154 with a reason |
| M4 / estate A2: `.optional()` `assignees`, each reader maps absent to `[]`, restart note | applied | :22, :64-67, :92; Acceptance :113, :114 |
| M4 / estate A3: `ticketSourceOf` takes the resolved backend; unresolved answers unmatched | applied | :69, :79; Acceptance :112 |
| M5 / deliverable A3: Jira notice tested without `inbox` rows | applied | :81; Acceptance :112 |
| M6 / contradiction A1: decision recorded, lanes `:23`, `:119`, `:242`, `:260` listed | applied | D35 at :20, :81; Open Point removed (:100-103); slice :141 (`:23`, `:119`, `:242`), slice :137 (`:260`) |
| M6 / contradiction A2: one owner for the empty-Stories send at `App.tsx:985-996` | applied | :47; slice :121 hands removal to `tickets-and-stories-have-lanes.md:273`; old claim at round-3 :43 removed (:45) |
| M7: `issueOf`/`trackerReads` references, Cost section | applied | :64 (`:46`, `:120`); :94 six fleet agents; :91 lanes payload growth |

## Decisions D31–D35

| Decision | Status | Plan line |
|---|---|---|
| D31 *Only my work* over PRs, plans, tickets; branches without a PR and builds stay | applied | :21, :83; Acceptance :115; slice :141 |
| D32 *Active sprint* is a button | applied | :18, :51; Acceptance :109 |
| D33 GitHub reader matched by login | applied | :20, :71; Acceptance :112 |
| D34 | not this plan | the sibling's spec-run reach |
| D35 declared `jira:` spelling that matches nothing sees `inbox` and a notice | applied | :20, :81; Acceptance :112; slice :141 |

## Other checks

- Check 3, the shared row: the shape `{ kind, plan, reason, log, restart, stopped, halted }` agrees (plan :53, :129; sibling :25, :54, :142). Both plans place the row in *Working* and *Waiting on you*. The sibling's `feature/the-board-shows-the-spec-run` waits on `feature/waiting-on-you-shows-a-failed-verification` (sibling :142), and that branch exists in this plan at :129 and builds the row.
- Check 4: `plot-plan-meta.sh` (with `env -u PLOT_REPO_ROOT`) reads format `canonical`, phase `draft`, six slices with one branch each, `waits_on` `feature/the-index-holds-closed-issues` on the assignee slice and on *Waiting on you*, and empty `unread_waits`, `unread_branch_headings` and `long_wave_names`.
- Check 5: each of the 7 Changelog lines has an Acceptance line: tabs :107, Planning :108, *Active sprint* :109, plan-level row :110, *Waiting on you* :111-:112, *Only my work* :115, upgrade :114.

## Failure

- Plan :57 says that the sibling's `specRow` "carries `fleetHalted` per row (`the-fleet-writes-the-design.md:53`), which maps to `halted`". The sibling at `64a699821` says the opposite at :54: "`halted` is the store's halt, the field the shared shape names; no per-row `fleetHalted` exists", and its :53 is `specDeclined`. Fix: change plan :57 to say that `specRow` (`the-fleet-writes-the-design.md:54`) writes `halted` from the store's halt. The shape and the slices do not change.
