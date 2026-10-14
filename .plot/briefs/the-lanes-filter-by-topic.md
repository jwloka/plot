## Implementation brief — the-discovery-tag-cloud-is-built (wave 2: Lanes)

- **Plan (canonical):** docs/plans/2026-10-14-the-discovery-tag-cloud-is-built.md on main
- **Approved:** 2026-10-14, Jan Wloka, plan-PR #1692 merged
- **Branch:** `feature/the-lanes-filter-by-topic` (base: `main`)
- **Ends as:** one PR to `main`, opened with `skills/plot/scripts/plot-open-pr.sh`
- **Review of the code:** per repo convention; the PR is reviewed as code

This is wave 2 of two, and the last wave of this plan. Both branches it waits on are merged: `feature/the-topics-name-their-tickets` → #1699 (widened `extractTopics` to carry `ticketKeys` beside `storySlugs`) and `feature/the-discovery-ticket-card-shows-its` → #1707 (added `TicketRowView`, `ticketCardView`, `ticketCardIssueRow` in `packages/domain/src/rules/ticket-card.ts`). `feature/the-discovery-tab-names-its-ticket` (issue #1693, the group-toggle slice) waits on this one — do not pre-build its groups-visible parameter; it layers on top once this lands.

### What to build

Today `StoriesTab.tsx`'s `topicToSlugs` (`packages/board/src/app/components/StoriesTab.tsx:134-140`) maps each topic to its `storySlugs`, and `filteredLaneGroups` (`:145-152`) uses that map to filter only the story lane groups. The ticket lane groups render unfiltered at `:228-279` — `tickets[lane]` is read straight through with no selection applied. A reader who selects a topic chip sees the story lanes narrow and every ticket lane stay full, even when the topic's `ticketKeys` names some of those tickets and excludes others.

`Topic.ticketKeys` already exists on the wire (`packages/board/src/contract/schema.ts:1036`, landed by wave 1) and already carries the right values — `TicketLaneRow.id` is the tracker's own key (`packages/domain/src/rules/ticket-lanes.ts:8`, `rowOf` sets `id: row.number`), the same string `ticketKeys` stores. No schema change, no new server computation: this wave only has to apply what wave 1 already shipped.

1. **Add a pure lane-filter function to the domain package**, `packages/domain/src/rules/` (new file, e.g. `lanes-for-topic.ts`, exported name `lanesForTopic` per the plan's `## Slices` annotation). It takes the story lane groups, the ticket lane groups, a selected topic (or `null`), and the topic's `storySlugs`/`ticketKeys`, and returns both filtered lane sets plus — per lane — whether the selection hid every row that lane had. Follow `ticket-card.ts`'s shape: small named exports for each sub-decision (e.g. a helper that filters one lane's rows, a helper that says whether a lane was non-empty before filtering and empty after), one composing function the component calls once.
2. **`StoriesTab.tsx` calls this one function** instead of today's inline `topicToSlugs`/`filteredLaneGroups` pair, for both the story lane groups (`:145-152`) and the ticket lane groups (`:228-279`, which currently has no filtering step at all). The component renders the result; it decides nothing about which rows survive a selection (*Every rendered state is a domain property*).
3. **An emptied lane says so.** The plan's Changelog: "A lane with no row under a selection says that the topic hides its rows." Today's empty-lane copy is lane-generic ("No stories in this lane." / "No tickets in this lane.", `:261` and `:317`) and fires whenever a lane is empty for ANY reason, including no selection at all. Render a distinct message when the domain function reports this lane was hidden BY the selection, versus the existing message for a lane that started empty.

The plan is canonical; this is orientation.

### Decisions the plan settles — do not re-derive them

- **The matching key for tickets is `TicketLaneRow.id` against `Topic.ticketKeys`,** the same string both sides already use (`id: row.number` in `ticketLanes.ts`, `ticketKeys: ticketSet` of `ticket.number` in `topics.ts`). Do not introduce a second identifier or re-derive the tracker key from `url` the way `ticketCardReference` does — that parses the url for display, a different concern from matching.
- **Filtering is a pure domain function, not inline `useMemo` logic in `.tsx`.** Wave 1's brief made the same call for `extractTopics`, and the plan's Approach section states it again for this wave specifically: "A pure function takes a topic and the lane groups and returns the rows each lane keeps, plus per lane whether the topic hid rows. The component renders that result." The existing `topicToSlugs`/`filteredLaneGroups` pair at `:134-152` is exactly the shape being replaced — it is inline component logic today, and that is the defect, not a precedent to extend to tickets.
- **No selection (`selectedTag === null`) returns both lane sets unfiltered,** matching today's `filteredLaneGroups` short-circuit (`:146`, `if (!selectedTag) return storyLaneGroups;`). Carry this behavior into the new function rather than changing what "no topic selected" means.
- **The empty-lane message is a flag the domain function returns, not a component-side inference from array lengths.** A lane can be legitimately empty with no selection active (e.g. no Open tickets exist at all) — that case keeps today's message. Only a lane that HAD rows before the topic was applied and has none after gets the new "hidden by this topic" message; inferring this from `rows.length === 0 && selectedTag !== null` in the component would be the same mistake the plan's "every rendered state is a domain property" principle exists to catch, because it recomputes in `.tsx` a fact the domain already knows (whether this lane's pre-filter count was nonzero).
- **This slice does not touch the group-toggle behavior** (plan Decisions: "the cloud counts only the groups on screen" for #1693) — `feature/the-discovery-tab-names-its-ticket` is Approved but not yet started as of 2026-10-14, and it waits on this branch per the plan's Order note. Do not add a groups-visible parameter to `lanesForTopic` pre-emptively.
- **Style:** the new file lives under `packages/domain/src/rules/`, so it follows the domain package's arrow-function rule (`export const f = (…) => …`), unlike `topics.ts` which stays in `packages/board` under its own function-declaration convention. `StoriesTab.tsx` itself is a board file; a function you add or rewrite there is also an arrow per "anywhere else, a function you write or rewrite is an arrow" — but do not rewrite the file's existing function declarations (`StoriesTab`, `TicketRowView`, `StoryCardView`, etc.) while you're in there; only the code you're adding or replacing.
- **Export the new function from `packages/domain/src/index.ts`** (`export * from './rules/lanes-for-topic.js';`), matching the pattern the three sibling exports at lines 61-64 already follow.

### Done when

The plan's `## Design` section is the specification: a pure function narrows story and ticket lanes together by the selected topic; `StoriesTab.tsx` renders it with the empty-lane message; a browser test selects a topic matching a ticket and a story and sees both lanes narrow.

The assertions that exist because a naive implementation would pass without them:

- **Selecting a topic narrows BOTH lane kinds in the same interaction, not just stories.** A naive port might filter stories (today's existing behavior, easy to leave alone) and forget tickets (new behavior, easy to skip since nothing currently exercises it). Assert a fixture with one story matching a topic and one ticket matching the same topic, and confirm both the story lane and the ticket lane shrink to just that row when the topic is selected.
- **A ticket NOT named in `ticketKeys` is excluded even if it would otherwise show in its lane.** Fixture: two tickets in the same lane, only one's `id` is in the selected topic's `ticketKeys` — assert the unlisted one disappears, proving the filter reads `ticketKeys` rather than passing every row through.
- **The "hidden by this topic" message appears only when the pre-filter lane was non-empty and the post-filter lane is empty — not for a lane that was already empty with no selection.** Fixture A: a lane with zero rows and no topic selected shows the ordinary empty message. Fixture B: a lane with rows, a topic selected that matches none of them, shows the new "topic hides its rows" message. Both must be asserted, because a naive `rows.length === 0 ? newMessage : ...` check (ignoring whether a selection is even active) would make Fixture A wrongly show the new message.
- **Clearing the selection restores every row in both lane kinds**, not just stories — assert the full ticket lane count returns after `Clear` is clicked, since `filteredLaneGroups`'s existing short-circuit only proves this for stories today.
- **A topic whose `ticketKeys` is empty (story-only topic) leaves every ticket lane empty under selection, with the new hidden-message showing on each non-empty ticket lane** — this is the inverse of wave 1's "topic matched only by tickets" assertion, and proves the ticket side of the filter is read even when it has nothing to match.

Browser test: extend or sibling `packages/board/test/integration/discovery-ticket-card.browser.test.ts`'s pattern — it already builds a `TICKETS: TicketLaneGroups` fixture with ticket `id: '1690'` titled "The lanes filter by topic" (that file's own foreshadowing of this slice). Add a story and a topic fixture whose `storySlugs`/`ticketKeys` match one story and one ticket, select the chip, and assert both lanes narrow to one row each via `data-ticket-card` and the story card's own locator.

Plus: bump the board package through a changeset in `.changeset/` using `'@plot-pm/board': patch` frontmatter, and bump `@plot-pm/domain` alongside it if `lanesForTopic` is new public surface (judge by whether `pnpm --filter @plot-pm/domain exec tsc --noEmit -p .` and the package's own export list call for it — a new exported rule is typically at least a `patch`). No `bumps:` block. Copy the format from an existing changeset that touches both packages. The board artifact is generated: commit no bundle (`scripts/check-no-bundle-diff.sh`). Run `pnpm build` in `packages/board` before any browser test so it loads a fresh artifact. Under Node 24 (`nvm use`).

Run `node skills/plot/scripts/board/plot-local-checks.mjs` (resolved from `skills/plot/scripts/`) before each push and run what it prints — this will include `pnpm --filter @plot-pm/domain exec vitest related --run {changed}` and its `tsc --noEmit` for the new domain file, and `pnpm --filter @plot-pm/board exec vitest related --run {changed}` plus `pnpm run typecheck` for the `StoriesTab.tsx` change. The suites in the `CI suites` config key run in CI on every PR; a failure there comes back as a correction. Do not run `test:e2e` locally — it is CI's gate.

This slice should touch no `.sh` file. If it does, `scripts/check-shell-lines.sh` refuses a pull request whose shell under `skills/` is longer than at its merge base; pay for growth in the same change by removing shell elsewhere, or write the rule in the domain and ask it through a bundle. The gate stores no number and has no override.

### Bookkeeping

- Push the first real commit as soon as it exists.
- Open the PR with `../plot/scripts/plot-open-pr.sh` (add `--draft` while the work moves). Do not run `gh pr create`.
- When the PR exists, append `→ #<number>` to this branch's line under `## Slices` in the plan.

### Scope guard

This branch owns:

- a new file under `packages/domain/src/rules/` (e.g. `lanes-for-topic.ts`) and its export in `packages/domain/src/index.ts`
- `packages/board/src/app/components/StoriesTab.tsx` — the `topicToSlugs`/`filteredLaneGroups` replacement and the ticket-lane filtering it currently lacks
- new tests under `packages/domain/` for the lane-filter function and under `packages/board/test/` (or extending `discovery-ticket-card.browser.test.ts`) for the rendered result
- one or two changesets (board, and domain if its export list grows)

It does not touch `packages/board/src/server/topics.ts` or the `extractTopics` call site in `board.ts` — that is wave 1, already merged (#1699). It does not touch `packages/domain/src/rules/ticket-card.ts` or `TicketRowView`'s own rendering — that is the ticket-card slice, already merged (#1707); this wave only adds filtering around the lanes those components already render into. It does not touch the group-toggle control, the `?show=` URL parameter, or any heading/count change — that is `feature/the-discovery-tab-names-its-ticket` (#1693), which waits on this branch and has not started. It does not touch the issue index schema, `plot-host.sh`, the plan format, the plan template, or helper scripts (plan Board impact note). Two other branches are in flight elsewhere in the repo (`a-merged-pending-check-is-asked-again`, `a-pr-cannot-merge-until-its-bitbucket`, `a-pr-cannot-merge-until-its-review-command`) — none touch `packages/board` or `packages/domain`, so no collision is expected; if you find something the plan did not anticipate, report it rather than improvising outside scope.
