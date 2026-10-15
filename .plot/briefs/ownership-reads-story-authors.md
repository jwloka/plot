## Implementation brief — discovery-and-planning-filter-to-only (wave: The rule)

- **Plan (canonical):** [docs/plans/2026-10-15-discovery-and-planning-filter-to-only.md](../../docs/plans/2026-10-15-discovery-and-planning-filter-to-only.md) on `main`
- **Approved:** 2026-10-15, Jan Wloka, plan-PR #1755 merged
- **Branch:** `feature/ownership-reads-story-authors` (base: `main`)
- **Ends as:** one PR to `main`
- **Review of the code:** per repo convention (PR review)

This is wave 1 of 3 ("The rule"). Two later branches wait on this one: `feature/a-plan-card-names-its-owners` adds the `author`/`approver` fields to the plan's payload using the arm this branch builds, and `feature/discovery-filters-to-only-my-work` builds the Discovery checkbox on top of both. Land the `story` arm and the plan arm's new fields with a shape the next two branches can consume without renegotiating it.

### What to build

`packages/domain/src/rules/ownership.ts` today answers `mine`/`theirs`/`unknown` for four row kinds — `pr`, `agent`, `plan`, `ticket` — through one function, `ownership(row, reader)` (ownership.ts:223), reused by `isMine` (ownership.ts:248). There is no `story` arm, and the `plan` arm only reads `assignee` (ownership.ts:72). The Discovery tab has no owner filter at all today; the Planning tab's filter only matches a plan's `Assignee:` line.

Build two things in this branch, in the domain only — no payload, no UI, no board changes (those are later waves):

1. **A `story` arm on `OwnedRow`:** `{ kind: 'story'; author?: string }`. A story is `mine` where its `author` resolves to the reader through `resolvePerson`; it is `theirs` only where the directory declares the author's spelling for another person; everything else (absent author, undeclared spelling that isn't the reader) is `unknown`. This is the same three-way shape as `planOwnership` (ownership.ts:111) — write `storyOwnership` as its sibling, not a copy with different rules. A story has no assignee/approver concept, so it is simpler than the plan arm: one field, one comparison.

2. **`author` and `approver` on the `plan` arm:** `{ kind: 'plan'; assignee?: string; author?: string; approver?: string }`. Per the plan's Design section (not this branch's job to parse `approved_raw` or git history — that's wave 2, `feature/a-plan-card-names-its-owners`): this branch only widens the *rule*, so that wave 2 has a field to populate. A plan is `mine` where *any* of `assignee`, `author`, or `approver` resolves to the reader. A plan is `theirs` only where a declared spelling names another person on at least one of the three fields *and none* of the three names the reader. Everything else is `unknown`. Reuse `planOwnership`'s per-field comparison (login vs. resolved spelling) rather than writing three independent copies — the three fields share the same matching rule, only the "any of three" combination is new.

### Decisions the plan settles — do not re-derive them

**Reuse the one rule; do not write a second predicate.** The plan's Design section is explicit: "The issue says the Delivery owner filter's rule is reused... This plan adds arms to that one function and writes no second predicate." `ownership()` and `isMine()` are the only entry points. Do not add a parallel `storyIsMine` or similar — extend the existing `switch` in `ownership()` (ownership.ts:223-236) with a `case 'story':` arm, the same way `case 'plan':` already exists.

**An unresolved owner stays visible — this is load-bearing, not a default.** `isMine` returns `true` for `unknown`, never just `mine` (ownership.ts:248: "True for `mine` and for `unknown`"). The plan restates this explicitly: "A row with no determinable owner stays... A filter that hides on an absent reading loses work silently." For the story arm, an author that doesn't resolve to anyone declared is `unknown`, not `theirs` — same as `planOwnership`'s existing behavior where "an assignee is free text, so an undeclared spelling that differs from the login may still be the reader" (ownership.ts:108-109). Do not treat "author doesn't match my login" as proof it's someone else's; only a *declared* spelling for another person proves that (`declaresSpelling`, ownership.ts:117).

**The "any of three" plan rule, not three independent checks.** The plan says a plan is `mine` if *any* of assignee/author/approver names the reader, and `theirs` only if a declared spelling names someone else *and none* of the three names the reader. This is not "OR together three independent ownership verdicts" — a naive `[assignee, author, approver].some(f => planOwnership(f, reader) === 'mine')` combined with `.some(f => planOwnership(f, reader) === 'theirs')` would misclassify a plan where one field names the reader and another field names someone else as ambiguous or wrongly `theirs`; the plan's own rule gives `mine` priority. Check "any resolves to reader" first; only check "any declares someone else" if that first check is false.

**`comparableLogin`'s email guard applies here too.** `comparableLogin` (ownership.ts:84) returns `''` when `hostUser` looks like an email, because "an email and a login are two spellings of one person, and nothing here bridges them." Every new comparison in this arm goes through the same `comparableLogin`/`resolvePerson`/`declaresSpelling` primitives already imported — do not add a second identity-resolution path.

### Done when

The plan's `## Done when` is implicit in its "Done when" expectations for this slice (per the Slices section): `OwnedRow` gains the `story` arm; the `plan` arm gains `author` and `approver`; unit tests in `packages/domain/test/ownership.test.ts` cover each `mine`, `theirs`, and `unknown` case for both arms.

Lift these specific cases into tests because a naive implementation passes without them:
- A story whose author is empty/absent → `unknown`, not `theirs` (mirrors the existing PR/plan empty-field tests at ownership.test.ts:52-58).
- A story whose author is an undeclared spelling that happens to differ from the reader's login → `unknown`, not `theirs` (the free-text trap `planOwnership` already guards against).
- A plan where `assignee` names someone else (declared) but `author` names the reader → `mine` (proves "any resolves to reader" is checked before "any declares someone else").
- A plan where all three fields are empty/absent → `unknown`.
- A plan where only `approver` resolves to the reader, with `assignee` and `author` absent → `mine`.
- Existing PR/agent/ticket/`other` tests in the file must keep passing unmodified — this branch touches only the `story` and `plan` arms.

Plus: a changeset is required (`bumps: domain: patch` or `minor` depending on judgment — this is a backward-compatible type/behavior addition, likely `minor` since `OwnedRow`'s plan variant gains new optional fields and a new arm is added to a public union). Run `node skills/plot/scripts/board/plot-local-checks.mjs` before each push and run what it prints — it resolves which tests and typechecks apply to `packages/domain/**`. The suites in the `CI suites` config key run in CI on every pull request; do not run `test:e2e` locally.

No `.sh` files are touched by this branch, so `scripts/check-shell-lines.sh` does not apply.

### Bookkeeping

Open the PR through the controller once the branch has commits:

```bash
skills/plot/scripts/plot-open-pr.sh
```

Do not use `gh pr create` directly — it is refused by convention here. As soon as the PR exists, append `→ #<number>` to this branch's line in the plan's `## Slices` section (`feature/ownership-reads-story-authors — ...`) and push that update. Push the first real commit as soon as it exists — don't hold a working tree uncommitted.

### Scope guard

This branch owns:
- `packages/domain/src/rules/ownership.ts`
- `packages/domain/test/ownership.test.ts`
- The new changeset file under `.changeset/`

It must not touch:
- `packages/board/src/**` (payload, UI, Discovery/Planning tabs) — those belong to waves 2 and 3
- `packages/domain/src/entities/story.ts` or any `plot-plan-meta.sh` parsing — wave 2 (`feature/a-plan-card-names-its-owners`) owns sourcing the actual `author`/`approver` values; this branch only widens the rule's *shape*, it does not wire up where those values come from.

If you find the rule's three-field "any resolves to reader" logic doesn't cleanly compose with the existing `planOwnership` helper, report that in the PR rather than restructuring the whole file — the next two branches build on whatever shape this one lands.
