# Round 1 — domain and testability

Subject: `docs/plans/2026-10-01-an-open-board-follows-a-sprint-change.md` at `63893100`.

Position: amend

## What I read

`packages/board/src/app/lib/filters.ts` (`sanitizeSelection` at `:155-168`, `slugPassesSprintFilter` at `:283`), `test/unit/filters.test.ts:102-110`, every `sprintFilter` read in `AgentList.tsx` (`:524`, `:569-579`, `:624-631`, `:840`, `:984`, `:1178`, `:2225`), and the plan's `builds:` annotation.

## Findings

1. **The rule exists.** `sanitizeSelection(selected, options)` keeps only selections matching a current option, collapses an all-invalid selection to "no filter", and is unit-tested. The Plans tab uses it for this exact shape (`App.tsx:937`). `activeSprintSelection` would be a second implementation of it; call `sanitizeSelection([...sprintFilter], activeSprints.map((s) => ({ value: s.slug, label: s.title })))` instead, and drop the `builds:` annotation for a new deliverable. The order clause ("in the order of `activeSprints`") has no reader.
2. **"Every rendered state is a domain property" is met** once every site reads the derived list: the hidden count, the report and the checkbox all follow from one pure call, and the unit test reaches them without a browser. The four unit cases move to `sanitizeSelection`'s existing describe block.
3. **The site list is complete** against `origin/main`. The Done-when grep ("no read of `sprintFilter.size` outside the derivation") is a good check; also name `:631`'s dependency array, which must depend on the derived list.
4. Placement in `packages/board/src/app/lib` rather than `packages/domain` is consistent with `slugPassesSprintFilter` and `sanitizeSelection`; a view filter is client state.

## Commitment

Amend: finding 1 replaces the slice's new function with an existing one.
