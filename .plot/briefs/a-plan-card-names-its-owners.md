## Implementation brief — discovery-and-planning-filter-to-only (wave 2: The data)

- **Plan (canonical):** [docs/plans/2026-10-15-discovery-and-planning-filter-to-only.md](../../docs/plans/2026-10-15-discovery-and-planning-filter-to-only.md) on `main`
- **Approved:** 2026-10-15, Jan Wloka, plan-PR #1755 merged
- **Branch:** `feature/a-plan-card-names-its-owners` (base: `main`)
- **Ends as:** one PR to `main`
- **Review of the code:** per repo convention (CI-gated PR)

This branch waits on `feature/ownership-reads-story-authors` ("The rule"),
which **has already merged** as PR #1771 (`b177df250`, "The rule"). `main`
already carries the `story` arm and the `plan.author`/`plan.approver` arms on
`OwnedRow` — this wave is unblocked. The next wave, `feature/discovery-filters-to-only-my-work`
("The control"), waits on this one and has no branch pushed yet.

### What to build

`OwnedRow`'s `plan` and `story` arms already exist in the domain
(`packages/domain/src/rules/ownership.ts:75-76`, merged by wave 1) —
`{ kind: 'plan'; assignee?; author?; approver? }` and `{ kind: 'story'; author? }`
— and `planOwnership`/`personFieldOwnership` already know how to resolve all
three fields against the reader. **None of that plumbing reaches a real plan
card today.** Two gaps, both server/client wiring rather than domain rule work:

1. **The plan card never carries `author` or `approver`.** `packages/board/src/server/board.ts:2300`
   sets only `if (meta.assignee) card.assignee = meta.assignee;` — there is no
   sibling line for author or approver, and `CardSchema` (`packages/board/src/contract/schema.ts:73/449`)
   has no `author`/`approver` fields to carry them. The client's
   `ownedFromCard` (`packages/board/src/app/lib/agent-rows/mine-filter.ts:106`)
   still reads only `card.assignee`.
2. **A plan has an `approved_raw` string but no parsed approver.** `plot-plan-meta.sh`
   reports `approved_raw` verbatim, e.g. `"2026-10-15, Jan Wloka, plan-PR #1755 merged"`
   (see this plan's own `## Status` line). Nothing parses the name out of it.
   `PlanRecord.approvedRaw` (`packages/domain/src/ports/plan-store.ts`) is the
   typed field already flowing through the port; no shell or parser change is
   needed to get the raw string into the domain.

### The decisions the plan settles — do not re-derive them

**Reuse the rule; this wave is data plumbing only.** The plan arm's ownership
logic (`planOwnership`, now taking `[assignee, author, approver]`) and the
story arm (`personFieldOwnership`) are done. **Nothing in `ownership.ts` needs
touching on this branch.** If a test here fails against the rule, the rule
is not the bug — recheck the data you are handing it.

**The approver is parsed in the domain, from `approvedRaw`, not re-asked of
the shell.** `plot-plan-meta.sh` already reports `approved_raw` verbatim and
costs nothing extra to call — the format is `<date>, <name>, <channel detail>`
(e.g. `2026-10-15, Jan Wloka, plan-PR #1755 merged`; also seen as
`2026-07-30, alice, in-session`). Write `approverOf(approvedRaw: string): string`
in the domain (alongside `entities/plan.ts` or `rules/ownership.ts` — your
call, but keep it a pure string function with its own unit tests): split on
`,`, take the second comma-separated field, trim it. Return `''` on anything
that doesn't parse — an unparseable record is an absent approver, not a
guess. This mirrors `leadingDate` in `board.ts:1208`, which already extracts
the first field from the same record shape; read that function before writing
a second splitter.

**The plan's author has no existing source, and that is the plan's own open
question, not yet settled — settle it on this branch.** The plan's Open
Questions names two options and recommends Option A: the author is the
`Assignee:` line plus the git author of the commit that first added the plan
file, read with one `git log --follow --diff-filter=A --format=%an -- <path>`
call (or equivalent) in an adapter — `packages/domain/src/adapters/refs/refs-git.ts`
is the existing precedent for a git-log-backed adapter call reached through a
port, and is the pattern to follow rather than a second one-off shell call.
Option B (an explicit `Author:` plan-template field, backfilled by
`/plot-idea`) was rejected in the plan because it needs a backfill across
every existing plan and this wave does not have backfill in scope. If A proves
too slow when measured against a real board refresh, or the git-email-to-login
mapping proves too fragile against the declared `People` directory, say so in
the PR rather than silently falling back to B — that reversal is exactly the
kind of thing `/plot-deliver` and the next reader need named, not absorbed.

**The story row already carries `author` on the wire.** `StorySchema.author`
(`packages/board/src/contract/schema.ts:949`) and `entities/story.ts:42`
both exist today and need no new field. What's missing is the *client-side*
`ownedFromStory` helper mirroring `ownedFromCard`/`ownedFromTicket`
(`mine-filter.ts:87-186`) — but wiring that into a filtered view is "The
control" wave's job (`lanesForReader`), not this one. This branch's job is
only to confirm the story card already reaches the client with `author`
intact (it does — nothing to change here) so the next wave has it to read.

**A plan is `mine` where any of assignee/author/approver resolves to the
reader; `theirs` only where a declared spelling names someone else and none
of the three names the reader.** That's `planOwnership`'s existing contract
post-wave-1 — this wave only needs to make sure all three fields it expects
actually arrive non-empty when the plan file states them.

### Done when

The plan's `## Done when` section doesn't exist as a literal heading in this
plan (its spec lives across Design/Open Questions/Slices instead) — treat
this slice's own `## Slices` line as the spec: *"the plan card carries the
approver and the author; the story row carries `author` into the owned row.
`Approved:` parsing lives in the domain."* Concretely:

- `CardSchema` gains optional `author` and `approver` string fields.
- `board.ts` sets `card.author`/`card.approver` from the plan's meta, mirroring
  the existing `if (meta.assignee) card.assignee = meta.assignee;` line —
  including the same "only set when non-empty" guard, so an older client or a
  plan with no approver never sees a stray `''` override a cast default.
- `ownedFromCard` in `mine-filter.ts` passes `author`/`approver` through to the
  `{ kind: 'plan' }` `OwnedRow` it builds.
- `approverOf` has unit tests for: a well-formed record, a record with extra
  commas in the trailing detail (don't let `split(',')[2..]` leak into the
  name), and an empty/unparseable string.
- Whatever reads the plan file's authorship has a unit test proving it reads
  the *first* commit that added the file, not the latest touch — a plan edited
  by a second person after approval must not change who "authored" it.

Plus the repo's standing gates: a changeset (`packages/domain` and/or
`@plot-pm/board` per whichever package's `src/` you touch), and the shell gate
below if you add any `.sh`. Run `node skills/plot/scripts/board/plot-local-checks.mjs`
before each push and run what it prints — it resolves which domain/board
tests and typechecks apply to your changed paths. The suites named in `##
Plot Config`'s `CI suites` key run in CI on every PR; don't run them locally,
and a failure there comes back as a correction, not a surprise.

`scripts/check-shell-lines.sh` refuses a PR whose shell under `skills/` grows
past its merge base. This slice is domain/board TypeScript — you should not
need to touch any `.sh` file. If you do, the growth must be paid for in the
same change.

### Bookkeeping

Open the PR through the controller once there's a commit:
`../plot/scripts/plot-open-pr.sh` (or `--draft` while still moving). Do not
run `gh pr create`. When the PR exists, append `→ #<number>` to this branch's
line under the plan's `## Slices` → `### The data` heading.

Push the first real commit as soon as it exists — an empty claimed branch
with no commit is indistinguishable from an abandoned one.

### Scope guard

This branch owns: `packages/domain/src/rules/ownership.ts` (test file only —
no behavior change expected), `packages/domain/src/entities/plan.ts` or a new
small domain module for `approverOf`/author resolution, any new adapter under
`packages/domain/src/adapters/` for the plan-file-authorship git-log call,
`packages/board/src/contract/schema.ts` (`CardSchema`), `packages/board/src/server/board.ts`
(the `card.assignee`-adjacent wiring at line ~2300), and `packages/board/src/app/lib/agent-rows/mine-filter.ts`
(`ownedFromCard`).

Other branches in flight, verified at dispatch (2026-10-15): none. Both
sibling branches —`feature/ownership-reads-story-authors` (merged, PR #1771)
and `feature/discovery-filters-to-only-my-work` (not yet pushed) — hold no
live claim right now, so there is no concurrent writer to collide with. The
next wave will read whatever shape you land here (the `Card`/`OwnedRow`
`author`/`approver` fields and `ownedFromCard`'s signature), so avoid
renaming either casually once this PR is open for review.

If you find something the plan did not anticipate, report it rather than
improvising outside scope.
