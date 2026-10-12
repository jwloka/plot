# Round 2 — domain and testability

Subject: `docs/plans/2026-10-01-an-open-board-follows-a-sprint-change.md` at `6e1ba683`.

Position: proceed

## What I read

The amended slice, `sanitizeSelection` and its tests (`filters.ts:155-168`, `test/unit/filters.test.ts:102-130`), every `sprintFilter` read in `AgentList.tsx` (`:524`, `:569`, `:570`, `:579`, `:624`, `:631`, `:840`, `:984`, `:1178`, `:2225`), `App.tsx:937`, `:1241`, `:1253`, `Board.tsx:197`, `Swimlanes.tsx:137`.

## Round 1 answered

- The existing rule is called; no second implementation is added.
- The views search is correct: `Board` and `Swimlanes` receive `validSprintSel` from `App.tsx:937`, which `sanitizeSelection` already derives, and `StoriesTab` filters nothing.
- The site list is complete, the `:631` dependency array is named.

## Notes that do not block

- `selectedSprints` (`:569`) is the memo every filter call reads; it must become the derived list, not `[...sprintFilter]`. The site list names its readers but not the memo itself; an implementer reading "every consumer" reaches it.
- The four unit cases repeat shapes `sanitizeSelection` already tests at `:110`, `:114` and `:118` with generic options. One sprint-shaped case is enough; the rest add count and no coverage.
- The prune is a write in an effect, not a decision: which slugs survive is `sanitizeSelection`'s answer. It is reached only by the browser test, which is acceptable for an effect that has no branch of its own.

## Commitment

Proceed: the design is a call to a tested rule, and the notes are implementer guidance.
