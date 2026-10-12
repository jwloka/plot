# Round 1 — operator reading the board

Subject: `docs/plans/2026-10-01-an-open-board-follows-a-sprint-change.md` at `63893100`.

Position: amend

## What I read

The plan, `AgentList.tsx:505-540`, `activeSprints` in `fleet.ts:7597-7606`, and the skeptic's reproduction output. I ran nothing of my own.

## Findings

1. **The stored `Set` keeps the closed slug, and the plan says so on purpose ("left as the reader's input").** `activeSprints` reads sprint files from the working tree (`workingTreeSprints(opts.repoRoot, …)`). This board renders whatever is checked out: a branch switch to a tree where `sprint-a` is still Active (any branch cut before `bd14adec`) brings `sprint-a` back into `fleet.sprints`, and the forgotten selection silently re-engages — the reader sees a checked box they did not check this hour. Prune the stored `Set` to the derived selection when a slug drops out, or state the re-engagement as intended behaviour with a test.
2. **The off state is truthful.** An unchecked box with no `hidden by Sprint only` text is what an operator needs; not auto-selecting the new sprint is right.
3. **No signal says a selection was dropped.** Acceptable — the control and the rows agree, which is the defect's whole point.

## Commitment

Amend: finding 1 needs a decision written into the design, either way.
