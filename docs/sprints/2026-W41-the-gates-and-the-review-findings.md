# Sprint: The gates and the review findings

> The five gates are launchers, and the fleet, the controllers, the channel and the tests close their review findings.

## Status

- **State:** Closed
- **Actual End:** 2026-10-12
- **Start:** 2026-10-10
- **End:** 2026-10-23
- **Release:** 2.26.0

## Sprint Goal

The shell migration converts the five PreToolUse gates to launchers over domain rules, and four plans close the review findings that the 2.25.0 release train left open.

On `main` at `eb4bda159`, 2026-10-10, `skills/plot/scripts/README.md` lists 15 *decision* rows, and the five gates are 554 code lines of them. About 60 `ai-generated` review-finding issues are open; the four Should Have plans answer 30 of them.

### Must Have

<!-- An item is `- [ ] <description>`. A leading `[<plan-slug>]` names the plan
     it commits to, and only a plan slug is read as one: `- [ ] [#123](url) …`
     names an issue, so it is an item with no plan and is scored on its
     checkbox. Strike a reference — `~~[<plan-slug>]~~` — to mark an item that
     left the sprint; the plan's own state then says whether it was withdrawn. -->

- [x] [the-gates-are-launchers](../plans/2026-10-10-the-gates-are-launchers.md) — one hook entry runs the five gates through `plot-gate.mjs`, and each `plot-*-gate.sh` is a launcher (#1341, #1449). <!-- pr: #1494, branch: feature/one-entry-reads-the-hook -->

### Should Have

- [x] [the-fleet-closes-its-review-findings](../plans/2026-10-10-the-fleet-closes-its-review-findings.md) — fleet and supervisor findings (#1436–#1454, #1487, #1503). <!-- pr: #1499, branch: bug/a-dead-agent-gets-a-fresh-agent -->
- [x] [the-controllers-close-their-review-findings](../plans/2026-10-10-the-controllers-close-their-review-findings.md) — approval, implement lock and merge controller findings (#1447, #1458, #1483). <!-- pr: #1498, branch: bug/the-approval-asks-the-domain -->
- [x] [the-channel-closes-its-review-findings](../plans/2026-10-10-the-channel-closes-its-review-findings.md) — default-branch reading, channel, board page and mod findings (#1437, #1463–#1481). <!-- pr: #1497, branch: bug/a-stale-default-branch-reading-holds-nothing -->
- [x] [the-tests-and-gates-close-their-review-findings](../plans/2026-10-10-the-tests-and-gates-close-their-review-findings.md) — decision gate, reaper and test hygiene findings (#1412, #1415, #1433, #1434, #1461, #1473, #1485, #1489). <!-- pr: #1495, branch: bug/a-bundle-declaration-is-one-build-call -->

### Could Have

<!-- add items here -->

### Deferred

<!-- Items moved here during sprint when they won't make the timebox -->

## Retrospective

### What went well

- All five items shipped in v2.26.0 on 2026-10-11, three days into a fourteen-day timebox.
- The fleet delivered with auto-dispatch on: 76 pull requests merged into `main` from 2026-10-10 to 2026-10-12.
- Each fleet pull request got one review, and MEDIUM and LOW findings went to follow-up issues without holding a merge.
- Four recurring CI failures were fixed at their cause: the KILL-after-TERM test (#1591, fixes #1571), the leak grace period (#1587), the `mktemp` name window that leaked `plot-host-*-err` files (#1595), and the corpus guards on an estate with no plan in flight (#1602).

### What could improve

- `main` went red at least five times from test flakes and leaks, and each red reading held every slice until a re-run or a fix landed.
- Five release records written in parallel raced on `main`: three pushes were rejected and three redundant micro-PRs (#1598, #1599, #1601) had to be closed.
- The release gate read a checkout four commits behind `origin/main` and reported a delivered Should Have as open (#1597).
- The board ran a bundle one day older than `main`; `plot-boardctl.sh --stop` hung on `lsof`, and the restart left no pidfile.
- The release pull request gets no checks of its own until a person approves the bot's CI run.
- 24 of the 33 issues the sprint's plans name stayed open after the release, because the release record wrote no tracker status.

### Action items

- [ ] Make the release gate judge `origin/<default>`, or refuse when the checkout is behind (#1597).
- [ ] Record a release one plan at a time, or make `plot-deliver.sh --release` serialise its pushes.
- [ ] Close or carry forward the 24 open issues the released plans name.

### Metrics

- **Must-haves completed:** 1/1
- **Should-haves completed:** 4/4
- **Could-haves completed:** 0/0
- **Deferred items:** 0
- **Scope changes during sprint:** 0
- **Duration:** planned 14 days, actual 3 days

## Notes

### Scope Changes

<!-- Log scope changes here: added/removed items, tier changes, with date and reason -->
<!-- Format: - YYYY-MM-DD: Added/Moved/Removed [slug] reason -->

- 2026-10-10: Created with five plans in the tiers that jwloka chose: the gates as Must Have, the four review-finding plans as Should Have.

<!-- Session log, decisions, links -->
