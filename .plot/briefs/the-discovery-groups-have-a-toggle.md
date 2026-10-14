## Implementation brief — the-discovery-tab-names-its-ticket (wave 1: Groups)

- **Plan (canonical):** `docs/plans/2026-10-14-the-discovery-tab-names-its-ticket.md` on `main`
- **Approved:** 2026-10-14, Jan Wloka, plan-PR #1694 merged
- **Branch:** `feature/the-discovery-groups-have-a-toggle` (base: `main`)
- **Ends as:** one PR to `main`
- **Review of the code:** PR review per repo convention; CI must pass

The plan has one wave and one branch. Its `waits:` branch, `feature/the-lanes-filter-by-topic`, merged as #1712 ("Lanes"), so `StoriesTab.tsx` already calls `lanesForTopic`. Nothing else is in flight on that file.

### What to build

The Discovery tab renders the ticket lane group above the story lane groups with no heading over either, and a reader cannot hide one group. Add a counted heading over each group (*Tickets (n)*, *Stories (n)*) and a segmented control above the lanes with three options: *Tickets*, *Stories*, *Both*. The choice lives in `?show=tickets` or `?show=stories`; *Both* is the default and writes no parameter.

One pure helper in `@plot-pm/domain` (`discoveryGroups`, under `packages/domain/src/rules/`, exported from `index.ts` beside `lanesForTopic`) decides what shows. Input: the `show` value, the story lanes and ticket lanes as `lanesForTopic` returns them. Output: whether each group shows, each heading text, each count. `StoriesTab.tsx` renders the result and decides nothing.

The plan is canonical; this is orientation.

### Decisions the plan settles — do not re-derive them

**A heading counts every row of its group, the Done rows behind *Show all done* included.** The count is taken over the rows after the tag cloud's selection and the *Show archived* scope. Do not count `rows.slice(0, 5)`. The person decided this on 2026-10-14. A count of visible rows would change when *Show all done* is clicked, and a heading that changes on expand reads as a different filter.

**The tag cloud counts only the groups on screen.** The helper's result says which groups show, and the cloud's topic counts follow it. `#1690`'s plan records the same decision. Pass the helper's visibility to the cloud code; do not recompute it in `.tsx`.

**The URL parameter is independent of `?archived=1`.** `archived-toggle.ts` writes `?archived=1` with `URLSearchParams` and keeps every other parameter. Copy that shape for `?show=` in its own small module under `packages/board/src/app/lib/` and do not merge the two. Two traps:
- `boardPath` sends only `?archived=1` to `/api/board`. `?show=` must not ride the fetch: the payload and the server do not change.
- `withArchived` must keep `show` and the new writer must keep `archived`, so each survives the other's toggle and the re-fetch *Show archived* makes. Test both orders.

**An unknown value reads as *Both*.** `?show=` (empty), `?show=all` and `?show=Tickets` all read as *Both*. Absent is not an error.

**Rules carried over unchanged.** An empty group is not a hidden group: *Tickets* with `tickets: null` (issue source `nobody`, or before the first read) shows its existing absence text, not a zero count. Read the existing null branch in `StoriesTab.tsx` before deciding what the heading says there.

### Done when

The plan's slice sentence is the specification: the helper, the rendered headings and control, `?show=` in the URL, and a browser test that switches through all three options and reloads with the parameter set. Add the assertions a naive implementation would pass without:
- a count test with more than 5 Done rows, with *Show all done* collapsed and expanded, that catches counting the visible slice;
- a test with a topic selected, that catches counting before `lanesForTopic`;
- a test that `?show=stories&archived=1` survives toggling *Show archived* off, that catches one writer clobbering the other;
- a test that *Both* removes `show` and leaves `archived`.

Write the helper's tests as plain domain unit tests, with no render. Put the browser test beside `packages/board/test/discovery.test.mjs`, which needs `pnpm build:board` first. Under *Never run board tests while the board is open*, do not run it against the operator's board.

Plus: a changeset for `@plot-pm/board` (description first, `bumps:` block last). Run `node skills/plot/scripts/board/plot-local-checks.mjs` before each push and run what it prints. The suites in the `CI suites` config key run in CI, and a failure there comes back as a correction. `scripts/check-shell-lines.sh` refuses a PR whose shell under `skills/` grows. This slice touches no `.sh` file. Write every new function as an arrow. Do not commit the generated board bundle.

### Bookkeeping

Open the PR with `skills/plot/scripts/plot-open-pr.sh` (add `--draft` while the work moves). Never `gh pr create`. When the PR exists, append `→ #<number>` to this branch's line in the plan's `## Slices` section. Push the first real commit as soon as it exists.

### Scope guard

This branch owns `packages/domain/src/rules/` (the new helper and its test), `packages/domain/src/index.ts` (one export), `packages/board/src/app/components/StoriesTab.tsx`, `packages/board/src/app/App.tsx` (state and URL write only), the new `lib/` module, and the browser test. It changes no payload, no issue index, no host read and no helper script. The `a-pr-cannot-merge-until-its-*` branches are in flight in `packages/domain` and the host adapter: they do not touch `StoriesTab.tsx`.

If you find something the plan did not anticipate, report it rather than improvising outside scope.
