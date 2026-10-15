## Implementation brief — discovery-story-cards-read-invalid-date (wave: Story card text and dates)

- **Plan (canonical):** docs/plans/2026-10-15-discovery-story-cards-read-invalid-date.md on `main`
- **Approved:** 2026-10-15, Jan Wloka, plan-PR #1754 merged
- **Branch:** `bug/discovery-story-card-text` (base: `main`)
- **Ends as:** one PR to `main`
- **Review of the code:** pr

The sibling slice, `bug/discovery-tickets-heading-reason`, touches `discoveryGroups` in `packages/domain/src/rules/discovery-groups.ts` and the Tickets heading in the same `StoriesTab.tsx` file. Neither branch depends on the other to land — they are two independent fixes read out of one plan — but both edit `StoriesTab.tsx`, so expect a rebase, not a design conflict, if the other merges first.

### What to build

Two independent rendering bugs on the Discovery tab's story cards, both reproduced on the `ewz-kus-portal` board (Jira project `EWZKUS`), `show=both`:

1. **`Invalid Date`.** `formatDate` in `packages/board/src/app/components/StoriesTab.tsx:534` calls `new Date(iso)` on whatever string `story.created` / `story.updated` holds and renders the result with no validity check. A non-ISO value yields `NaN`, `toLocaleDateString()` on that prints the literal string `Invalid Date`, and the card shows `Created: Invalid Date · Updated: Invalid Date`.
2. **Doubled quote marks.** Story titles and summaries render wrapped in literal quote marks, e.g. `"EWZKUS-3547 — Einladungen im Portal und Backoffice löschen"`. `title` is read at `packages/board/src/server/board.ts:1674` by `frontmatter.match(/^title:\s*(.+)$/m)` — a raw regex capture with no YAML-quote stripping, so a double-quoted YAML scalar keeps its quote characters as part of the string. The `objective` field goes through `extractSection` + `truncateText` (same file, `parseStoryContent`, lines 1696–1697) — confirm at implementation time whether it carries the same stored-quote problem or whether the doubling you see is only the card's own added quotes. `StoriesTab.tsx:495` unconditionally wraps `objective` in `"…"` on render, which is correct for an unquoted value but doubles a value that already carries stored quotes.

### Decisions the plan settles — do not re-derive them

**Where the date fix goes.** The plan requires a pure helper in `@plot-pm/domain` that takes the raw value and a `now` and returns display text or `null` — not a try/catch patch inside `formatDate` in the board package. This follows CLAUDE.md's *Every rendered state is a domain property*: a view state (show the age line, or don't; show which parts) has to be assertable without a browser. Put the helper under `packages/domain/src/rules/` (no existing date-formatting rule — check once more before naming the file, so there's no silent duplicate), export it from `packages/domain/src/index.ts`, and have `StoriesTab.tsx` call it instead of its own `formatDate`. Keep the relative-day logic (`today`, `yesterday`, `N days ago`, `N weeks ago`, locale date) — only the validity gate and the null-propagation are new.

**Null propagation, not string fallback.** Today a bad value falls through to the literal `iso` string in the `catch` block (`StoriesTab.tsx:548`) or to `Invalid Date` when `toLocaleDateString()` doesn't throw. The plan's fix is `null`, not an empty string and not the raw value — so the component's existing `story.created && …` / `story.updated && …` guards (`StoriesTab.tsx:486-488`) keep working unchanged once they're driven by the helper's return value, and the whole age line already disappears when both become null via the surrounding `(story.created || story.updated) &&` guard at line 484. Do not add a new guard condition in the component — reuse the one that's there.

**Where the quote fix goes.** The plan requires stripping one pair of matching surrounding quotes "the way a YAML parser does" at the point the value is read — `parseStoryContent` in `packages/board/src/server/board.ts`, not in `StoriesTab.tsx`. This is so the story modal and any other consumer of the parsed story see the same unquoted text; a component-side fix would only patch the one render site. This is a board-package change, not a domain one — `parseStoryContent` is plain parsing logic with no existing domain port for it, and the plan does not ask for one.

**The two open questions the plan left for you to resolve first, before writing the fix:**
- Reproduce against actual `EWZKUS` story files (or a representative fixture) to confirm the quotes are a stored double-quoted YAML scalar and not something the component adds — the plan's Design section flags this as unconfirmed. The title path (regex capture, no unescaping) is the one proven suspect; objective's path is separate code and untested by this plan.
- Check what `created` / `updated` actually hold in those files to confirm the fix is "hide it" and not "also tell `story-tracking` to write ISO dates." That second half, if needed, is likely out of scope for this slice (it touches a different skill/writer) — note it in the PR rather than silently expanding scope.

### Done when

The plan's `## Done when` is implicit in its Design section (no explicit checklist is given) — treat these as the specification:

- A unit test on the new domain date helper covers: an ISO date, a date-only value, a non-ISO value, and an absent value — the plan names these four cases explicitly. The non-ISO case must assert `null`, not a string.
- `StoriesTab.tsx` renders no date line when both `created` and `updated` resolve to `null`, and renders only the non-null half when one does.
- A test on the quote-stripping fix in `parseStoryContent` (or a new narrow helper it calls) covers: double-quoted, single-quoted, unquoted, and inner-quote values (e.g. a title containing an escaped or literal quote character mid-string) — the plan names these four cases explicitly. "Inner-quote" is the one a naive `.replace(/"/g, '')` would get wrong — only a matching *surrounding* pair should strip.
- The rendered card for a title with stored quotes shows no quote marks; the objective preview still shows exactly one pair of quote marks (the component's own), never two.

Plus: this slice touches no shell script, so `scripts/check-shell-lines.sh` does not apply. It does touch `packages/domain/src/**` and `packages/board/src/**`, so run `node skills/plot/scripts/board/plot-local-checks.mjs` before each push and run what it prints — it resolves the domain vitest-related run, the board vitest-related run, and `tsc --noEmit` for both touched packages. Don't run the full `CI suites` (`test:e2e`, `test:contracts`, `test:board`, full domain coverage) locally; those are CI's gate.

New code in `packages/domain/src/**` is arrow functions (`export const f = (...) => ...`), per CLAUDE.md's domain-package style rule — this applies to the whole new date-helper file. The board-package change in `board.ts` is existing-style code you're editing, not converting; leave its surrounding function declarations as they are and only convert what you write new.

### Bookkeeping

Open the PR through the controller, not `gh pr create`:

```bash
skills/plot/scripts/plot-open-pr.sh          # current branch
skills/plot/scripts/plot-open-pr.sh --draft  # while work is still moving
```

It reads the plan, titles the PR from this slice's wave heading, and links the plan and this brief in the body. Push the first real commit as soon as it exists, so the PR isn't opened against an empty diff.

When the PR is created, append `→ #<number>` to this branch's line under `## Slices` → `### Story card text and dates` in the plan file.

### Scope guard

This branch owns:
- `packages/domain/src/rules/<new-date-helper-file>.ts` (new file) and its export in `packages/domain/src/index.ts`
- `packages/board/src/app/components/StoriesTab.tsx` — the `formatDate` call site and the objective-quote render (lines ~483–497, ~534–550)
- `packages/board/src/server/board.ts` — `parseStoryContent`'s title (and possibly objective) read (lines ~1657–1719)
- New/updated tests for both of the above

The sibling slice `bug/discovery-tickets-heading-reason` owns `packages/domain/src/rules/discovery-groups.ts` and the Tickets-heading render in `StoriesTab.tsx` (a different, non-overlapping region of the same file — the `Tickets`/`Stories` group headings, not the per-card age/title/objective block this slice touches). No file is fully exclusive between the two branches, but the specific lines don't overlap; watch for rebase noise, not a real collision.

If you find something the plan did not anticipate — e.g. `objective` turning out to need the same stored-quote fix as `title`, or the `EWZKUS` dates turning out to need a `story-tracking` writer fix rather than a reader-side hide — report it in the PR rather than silently expanding scope.
