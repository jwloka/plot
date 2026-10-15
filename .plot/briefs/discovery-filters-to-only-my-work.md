## Implementation brief — discovery-and-planning-filter-to-only (wave 3: The control)

- **Plan (canonical):** [docs/plans/2026-10-15-discovery-and-planning-filter-to-only.md](../../docs/plans/2026-10-15-discovery-and-planning-filter-to-only.md) on `main`
- **Approved:** 2026-10-15, Jan Wloka, plan-PR #1755 merged
- **Branch:** `feature/discovery-filters-to-only-my-work` (base: `main`)
- **Ends as:** one PR to `main`
- **Review of the code:** per repo convention (CI-gated PR)

This is the last wave. It waits on `feature/a-plan-card-names-its-owners`
("The data", → #1775), which **has already merged** (`4c363dead`, "The data
(#1775)"). `main` now carries everything both prior waves promised: the
`story` arm and the plan `author`/`approver` arms on `OwnedRow`
(`packages/domain/src/rules/ownership.ts:75-78`), and the plan card's
`author`/`approver` fields reaching the client (`ownedFromCard` already reads
all three — `packages/board/src/app/lib/agent-rows/mine-filter.ts:107-108`).
This branch is unblocked and has no pushed ref yet.

### What to build

Today the Discovery tab (`StoriesTab.tsx`) has no "Only my work" control at
all — the checkbox at `App.tsx:1184` is gated `tab === 'planning'` and does
not render for `tab === 'discovery'`. The rule and the data are both ready;
nothing routes them to this tab's lanes.

Three things, in the order the plan's `## Design` gives:

1. **A story-row reading.** `mine-filter.ts` has `ownedFromRow` (PR),
   `ownedFromAgent`, `ownedFromCard` (plan) and `ownedFromTicket` — no
   `ownedFromStory`. Add it, mirroring the existing four: `({ kind: 'story',
   author: story.author })`. `StoryCard.author` already exists on the wire
   (`contract/schema.ts:953`, `entities/story.ts:42`) — no server or domain
   change needed to read it.
2. **`lanesForReader` in the domain**, next to `lanesForTopic`
   (`packages/domain/src/rules/lanes-for-topic.ts`) — same file or a sibling,
   your call, but match its shape: it takes `storyLaneGroups`, `tickets`,
   the `Reader`, `on`, and a `TicketSourceShape | null` for the ticket arm
   (`ticketOwnership` needs it, same as `ticketsForReader` does), and returns
   the same `LanesForTopic<S, L>` shape `lanesForTopic` returns — kept rows
   per lane plus `hiddenByTopic`-shaped bookkeeping for "the filter emptied
   this lane" (name the field whatever reads best next to `hiddenByTopic`;
   `StoriesTab.tsx` already has the empty-lane sentence pattern at lines
   301-303 and 365-368 to extend). Unit tests in the domain, one per lane
   kind × `mine`/`theirs`/`unknown`, the same matrix `ownership.test.ts`
   already uses for the `story` and `plan` arms.
3. **Wire it into `StoriesTab.tsx`, ahead of `lanesForTopic`.** The plan's
   own words: *"`lanesForReader` ... runs before `lanesForTopic`, so the
   topic cloud counts only the rows on screen."* Concretely: `StoriesTab`
   currently computes `filtered` at line 152-155 by calling `lanesForTopic`
   directly on `storyLaneGroups`/`tickets`. Insert `lanesForReader` before
   that call so `lanesForTopic` receives its output, not the raw props — the
   topic counts at line 160 (`topics.map((t) => topicCountFor(t, groups))`)
   must count post-filter rows, exactly as the plan requires. `StoriesTab`
   needs two new props: `reader: Reader` and `mineOnly: boolean` (or reuse
   whatever name `App.tsx`'s existing `mineOnly`/`onMineOnly` state already
   uses — do not invent a second state).
4. **The checkbox itself, in `App.tsx`.** The existing control at line
   1184-1195 is gated `tab === 'planning'`; widen the condition to include
   `'discovery'` (or add a second rendering of the same control under the
   Discovery branch — match whatever keeps one `mineOnly` state read/write
   path, since the plan is explicit that the checkbox state stays shared
   across tabs, not per-tab). Pass `reader={readerFrom(board.server)}` and
   `mineOnly={mineOnly}` into `StoriesTab` at line 1202.

### The decisions the plan settles — do not re-derive them

**One checkbox state for all three tabs, not a new one.** The Open Questions
section asks "one state or one per tab?" and the plan's `## Design` /
`## Measured state` sections already answer it: *"The checkbox state is one
value for all tabs today... The plan keeps that and does not add a second
state."* `readMineOnly`/`writeMineOnly` (`mine-filter.ts:54-71`) already
persist under one `localStorage` key, `plot-board:agents:mine-only`, shared
across tabs — reuse it. Do not add a `plot-board:discovery:mine-only` key or
similar; that would answer a question the plan already closed.

**`localStorage`, not the URL.** Open Question 2 is pre-answered in the plan
text: *"Recommendation: keep `localStorage`, which survives a reload and is
what the Delivery and Planning checkboxes use."* `collapse.ts`'s own
reasoning (quoted in `mine-filter.ts:7-11`) is why: a shared link that hid a
colleague's own work as a side effect of "have a look at this" is the failure
being avoided. This wave inherits that decision; it does not re-open it.

**A row with an undeterminable owner stays visible — always.** This is not
new to this wave (`isMine` already returns `true` for `unknown`), but it is
the thing a naive `lanesForReader` is most likely to get backwards for the
*empty-lane* bookkeeping specifically: a lane that is empty because nothing
in it has an owner must **never** be reported as hidden-by-filter the way a
topic-emptied lane is. `isMine`/`ownership` already handle the per-row
case correctly; the risk is only in whatever "did the filter hide everything"
summary flag `lanesForReader` adds alongside `hiddenByTopic` — make sure it
answers false when the lane was already empty before filtering, same
discipline `filterLane` in `lanes-for-topic.ts:43-51` already applies
(`hiddenByTopic: rows.length > 0 && kept.length === 0`).

**Tickets keep `ticketOwnership` exactly as it is — no new rule.** The plan
says it directly: *"Tickets keep `ticketOwnership` unchanged: assigned to me
is `mine`, assigned to another declared person is `theirs`, unassigned is
`unknown` and stays."* `ticketsForReader` (`mine-filter.ts:182-187`) already
does this for the Delivery tab's ticket rows; `lanesForReader`'s ticket arm
should produce the same `ownedFromTicket` call per row, not a parallel
implementation.

**This is reuse, not a second predicate.** The plan's own words: *"The issue
says the Delivery owner filter's rule is reused... This plan adds arms to
that one function and writes no second predicate."* Both arms needed here
(`story`, and `plan`'s `author`/`approver`) are **already merged into
`ownership.ts`** by the first two waves. If a test on this branch is failing
against `ownership()` or `isMine()`, the bug is almost certainly in how this
wave calls those functions, not in the rule — re-read `ownership.ts:75-78`
and `135-230` before touching it.

**Every rendered state is a domain property.** The filtered lanes, the
post-filter topic counts, and the hidden-lane sentence all need to be
assertable without a browser — unit tests in the domain on `lanesForReader`
directly. Exactly one browser test proves the Discovery checkbox shows the
result, following `mine-filter.browser.test.ts`'s own convention: **mixed
ownership in the fixture** (a story/ticket/plan that's mine, one that's
somebody else's, one with no determinable owner, one with an empty/unsigned
field) and **both arms asserted** — what the filter hides, and that
unchecking restores every hidden row. A fixture with only "mine" rows would
pass even if the filter did nothing (`mine-filter.browser.test.ts:7-14`
states this explicitly as the reason its own fixture is mixed).

### Done when

The plan's `## Done when` is implicit in its `## Design` and `## Slices`
entries above — there's no separate `## Done when` heading in this plan, so
treat the slice line itself as the spec: *"the Discovery checkbox,
`lanesForReader` ahead of `lanesForTopic`, the topic counts and the
empty-lane sentence, and one browser test with a stubbed payload."* Concretely:

- `lanesForReader` has unit tests in the domain covering `story`, `plan`
  (now 3-field), and `ticket` rows, each through `mine`/`theirs`/`unknown`.
- `StoriesTab`'s topic-pill counts reflect post-ownership-filter rows when
  the checkbox is on (catches an implementation that filters the rendered
  rows but forgot to feed `lanesForTopic` the filtered set).
- The empty-lane sentence distinguishes "this topic hides every row" from
  "the owner filter hides every row" from "there's nothing here regardless"
  — don't collapse three distinct reasons into one generic string if the
  existing `hiddenByTopic` pattern already keeps them apart.
- One browser test, mixed-ownership fixture, both arms (hides theirs,
  restores on uncheck).

Plus the repo's gates: a changeset (`.changeset/*.md`, package `plot`, per
`CLAUDE.md`'s Versioning section — minor, since this adds a capability).
Board impact is real here (new props on `StoriesTab`, new domain export), so
mind the Definition of Done's board-impact note. For tests, run
`node ../plot/scripts/board/plot-local-checks.mjs` (resolved from this
skill's directory) before each push, and run whatever it prints — the
suites named under `CI suites` in `## Plot Config` run in CI on every PR; a
failure there comes back as a correction. Do not run the full `test:e2e`,
`test:board`, or `test:contracts` suites locally as a matter of course —
`local-checks` already picks the subset your diff touches.

No shell file is touched by this wave's scope, so `scripts/check-shell-lines.sh`
should be a non-event — but if the implementation ends up touching anything
under `skills/`, that gate still applies and growth must be paid for in the
same change.

### Bookkeeping

Open the PR through the controller once there's a commit:
`../plot/scripts/plot-open-pr.sh` (or `--draft` while still moving). Do not
run `gh pr create` — see `CLAUDE.md`'s PR-opening rule. When the PR exists,
append `→ #<number>` to this branch's line in the plan's `## Slices` section
(`feature/discovery-filters-to-only-my-work — ...`) and push the first real
commit as soon as it exists, so the branch doesn't sit silently claimed with
nothing to show.

### Scope guard

This branch owns: `packages/domain/src/rules/lanes-for-topic.ts` (or wherever
`lanesForReader` lands — a new sibling file is equally fine), the new unit
test file for it, `packages/board/src/app/lib/agent-rows/mine-filter.ts`
(adding `ownedFromStory`, nothing else), `packages/board/src/app/components/StoriesTab.tsx`,
`packages/board/src/app/App.tsx` (the Discovery-tab checkbox wiring only),
and one new browser test under `packages/board/test/integration/`.

**Two other branches are open right now and touch the same three files —
this is a real, measured collision, not a hypothetical one:**

- **`bug/a-free-desk-block-reproduces`** (PR #1779) touches `App.tsx`,
  `StoriesTab.tsx` and `mine-filter.ts` — a small diff (6 lines net), looks
  unrelated to ownership (its own title is about desk-block reproduction),
  but it edits the same files this wave edits. Check its diff before you
  start so your edits don't silently conflict with lines it already moved.
- **`feature/plan-and-story-cards-show-type-and-owner`** (PR #1782) is the
  one to watch closely. It forked from before wave 1 (`feature/ownership-reads-story-authors`,
  #1771) landed on `main`, so its current diff against `main` **reverts**
  the `story` arm and the plan's `author`/`approver` fields on `OwnedRow` —
  purely because it's stale, not an intentional rollback. That branch needs
  a rebase onto current `main` before it can merge cleanly regardless of
  this wave; it is not this brief's job to fix it, but **do not assume
  `ownership.ts`'s current shape is settled** if you see that PR land first
  with its stale diff — check `main` fresh if anything here looks like it's
  disappeared.

If anything surfaces that the plan did not anticipate — a third collision, a
`lanesForReader` shape that doesn't fit cleanly next to `lanesForTopic`,
or an Open Question the plan left unresolved that turns out to matter for
this wave specifically — report it in the PR rather than improvising past
scope.
