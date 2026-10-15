## Implementation brief — discovery-story-cards-read-invalid-date (wave: Tickets group)

- **Plan (canonical):** docs/plans/2026-10-15-discovery-story-cards-read-invalid-date.md on `main`
- **Approved:** 2026-10-15, Jan Wloka, plan-PR #1754 merged
- **Branch:** `bug/discovery-tickets-heading-reason` (base: `main`)
- **Ends as:** one PR to `main`
- **Review of the code:** pr

The sibling slice, `bug/discovery-story-card-text`, is already merged (PR, commit `a97530c62`). It touched `StoriesTab.tsx` too, but a different region (`formatDate` and the objective-quote render) — expect no conflict, but rebase onto current `main` before starting rather than the plan's approval point.

### What to build

Today, when the Discovery tab's ticket read has not happened yet — before the first issue read, or where the issue source is `nobody` (declared tracker with no connector, or a tracker that only lists on a different git host) — `discoveryGroups` in `packages/domain/src/rules/discovery-groups.ts:59` still answers `shows: true` for the tickets group. The heading renders (`Tickets`, no count) with no lanes under it and no explanation. This is the MEDIUM left open by #1720.

Fix: `discoveryGroups` answers `shows: false` for an unread tickets group, and returns a reason string the tab renders in its place.

### Decisions the plan settles and one it leaves open — read both before coding

**The null-vs-not-configured distinction already exists; don't re-derive it.** Open Question #3 in the plan asks whether the board can tell "not configured" from "read failed." It can — the board already computes this, just not for `discoveryGroups`. Trace: `packages/board/src/server/discovery-lanes.ts` calls `ticketLaneData(opts)` (`packages/board/src/server/fleet.ts:1537`), which returns `null` when `entry.issueSets === null` — "before the first read, or where the read source is `nobody`" (its own doc comment). Separately, `entry.issueAbsence` (`fleet.ts:482`, schema field at `schema.ts:4407`) is already populated by `issueAbsence(source.reason)` (`packages/domain/src/rules/issue-source.ts:89`) at every call site that sets `entry.issueSets = null` for the `nobody` case (`fleet.ts:1827`, `1857`, `1991`, `2020`) or for a fleet-left-no-index case (`fleet.ts:2001`, hardcoded sentence). So the sentence this slice needs already exists on the board payload as `issueAbsence: string | null` — it is not derived from `tickets: null` alone, because `tickets: null` alone cannot distinguish "not configured" from "cold cache before first read" (both read as `entry.issueSets === null`). `issueAbsence` is non-null only for the `nobody`/no-index cases; it is `null` while a read is merely pending.

**This means the reason has two states, not three, and `discoveryGroups` needs a new parameter to carry one of them.** `discoveryGroups`'s signature changes to accept the absence sentence (or a null) as a fourth argument, alongside `tickets: FilteredTicketLanes | null`. Where `tickets` is null and the sentence is non-null, that sentence IS the reason to render. Where `tickets` is null and the sentence is also null (an issue read is in flight or about to happen, there is no row yet, but nothing is wrong), the group should still not show lanes, but the reason differs — name it generically ("tickets have not been read yet" or similar; the plan does not specify exact wording, and this is the one open call left to make. Keep it short and factual, matching the tone of `issueAbsence`'s own sentences: `"Open issues are not listed: …"`.) Do not invent a third field on the board schema for this — `issueAbsence` is the carrier, pass it through.

**Where the new field is read from.** `StoriesTab.tsx:154` calls `discoveryGroups(show, filtered.storyLanes, filtered.tickets)`. The component already receives `issueAbsence` in its props or can — check `StoriesTab.tsx`'s prop list and the parent that renders it (search for where `StoriesTab` is invoked and what board fields it is given; `issueAbsence` is a top-level board payload field per `schema.ts:4407`, not nested under `tickets`). Thread it through as a new prop if not already present, and pass it into `discoveryGroups`.

**The render site.** `StoriesTab.tsx` around line 254 (`groups.tickets.shows ? <h2>...` ) currently renders nothing at all when `shows` is false — no heading, no lanes, no text. Per CLAUDE.md's *Every rendered state is a domain property*, the reason text itself must come from the domain (`DiscoveryGroup`'s new field), and the component only renders what it is given — it must not compute or word the sentence itself. Extend `DiscoveryGroup` (`discovery-groups.ts:7`) with a `reason: string | null` field (non-null exactly when `shows` is false and the group is `tickets` — `stories` never has a reason, since stories are always read locally and are never unavailable the same way). Render it where the heading currently doesn't appear: a short line in place of the `<h2>`, not instead of the whole block, so an unread ticket group still visibly explains itself rather than looking like empty space.

**Scope boundary: this slice does not fix the `nobody` cold-start general case for every board, it fixes the Discovery tab's silence about it.** `issueAbsence` already exists and is already correct for every call site that sets it — this slice is purely about reading it and rendering it from `discoveryGroups`/`StoriesTab.tsx`, not about touching `fleet.ts`'s absence-setting logic.

### Done when

The plan's `## Done when` is implicit in its Design section — treat this as the specification: *"A test pins `tickets: null` for each `show` value."*

- A domain unit test in `packages/domain/test/discovery-groups.test.ts` replaces or extends the existing test at line 69 (**`gives an unread ticket group a heading with no count, not a zero`**) — that test currently asserts `shows: true` for a null-tickets group; this is the exact behavior the plan calls a bug, so the assertion inverts to `shows: false` with a non-null `reason`. Cover: `tickets: null` with an `issueAbsence` sentence passed through unchanged as the reason, and `tickets: null` with no sentence (the pending-read case) getting the generic fallback reason — both for every `show` value (`tickets`, `stories`, `both`), since the plan calls out pinning across all three.
- `stories.reason` stays `null` always — add an assertion so a future edit cannot accidentally wire the same field onto the wrong group.
- A `StoriesTab.tsx` or component-level test (check `packages/board/test/` for the existing StoriesTab test file name) asserts: with no tickets read, the Tickets heading itself does not render, but a reason line does, and its text matches what `discoveryGroups` returned — not a string invented in the component.
- The existing "shows one group alone" test (line 52) and the "shows both groups" test (line 45) must still pass unchanged — they pass `TICKETS` (a real object, not null) through `lanesForTopic`, so they are unaffected by this change; re-run them to confirm rather than assuming.

Plus: this slice touches no `.sh` file, so `scripts/check-shell-lines.sh` does not apply. It touches `packages/domain/src/**` and `packages/board/src/**`, so run `node skills/plot/scripts/board/plot-local-checks.mjs` before each push and run what it prints — it resolves the domain vitest-related run, the board vitest-related run, and `tsc --noEmit` for both touched packages. Don't run the full `CI suites` (`test:e2e`, `test:contracts`, `test:board`, full domain coverage) locally; those are CI's gate.

New code in `packages/domain/src/**` is arrow functions (`export const f = (...) => ...`), per CLAUDE.md's domain-package style rule. The existing `group` helper and `discoveryGroups` in `discovery-groups.ts` are already arrows — keep that shape for whatever you add.

### Bookkeeping

Open the PR through the controller, not `gh pr create`:

```bash
skills/plot/scripts/plot-open-pr.sh          # current branch
skills/plot/scripts/plot-open-pr.sh --draft  # while work is still moving
```

It reads the plan, titles the PR from this slice's wave heading, and links the plan and this brief in the body. Push the first real commit as soon as it exists, so the PR isn't opened against an empty diff.

When the PR is created, append `→ #<number>` to this branch's line under `## Slices` → `### Tickets group` in the plan file.

### Scope guard

This branch owns:
- `packages/domain/src/rules/discovery-groups.ts` — the `DiscoveryGroup` interface and `discoveryGroups` function
- `packages/domain/test/discovery-groups.test.ts`
- `packages/board/src/app/components/StoriesTab.tsx` — the tickets-heading render block (~line 254) and whatever prop threading carries `issueAbsence` into it
- Whichever file renders `<StoriesTab>` and currently withholds `issueAbsence` from its props, if it does

The merged sibling slice (`bug/discovery-story-card-text`) touched `StoriesTab.tsx`'s date-formatting and objective-quote render (lines ~483–550 at the time of that brief) — a different region of the same file. If you find something the plan did not anticipate — for example, `issueAbsence` not reaching `StoriesTab` at all today — report it in the PR rather than improvising a new data path outside what's described above.
