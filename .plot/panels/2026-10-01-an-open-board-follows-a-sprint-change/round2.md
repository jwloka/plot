# Round 2 — moderation

Subject: `docs/plans/2026-10-01-an-open-board-follows-a-sprint-change.md` at `6e1ba683`, amended after round 1. Jurors: `round2-skeptic.md`, `round2-operator.md`, `round2-domain.md`. Gate: all three committed (`plot-panel.mjs check`). Reconcile: `divided amend=skeptic,operator proceed=domain`.

## How the panel ran

One agent applied the three lenses in sequence again. It ran as a fork that may not start agents, so the request for three separate jurors could not be met. The lenses share one reader, and their agreement is weaker evidence than independent jurors.

## Evidence each lens used

- **Skeptic: executed.** A scratch browser test on `origin/main` with the catalogue's `route` flag: after the switch, `toggleB=false hidden=2 shown=[]`; after switching back, `toggleA=true hidden=0 shown=[bug/a]`. The re-engagement round 1 predicted is real.
- **Operator: read.** `activeSprints`, `workingTreeSprints` and its failure answers.
- **Domain: read.** `sanitizeSelection` and its tests, every `sprintFilter` site, the Plans-tab path into `Board` and `Swimlanes`.

## Round 1 answered

All four round-1 changes and the blind spot are in the plan: `sanitizeSelection` replaces the new rule, the test names the `route` mechanism and asserts `data-sprint-hidden` absent, Motivation says every plan row was hidden, the retained slug is pruned, and the views search finds no other view with the defect.

## Disagreement, named

**Whether the prune is ready to build.** The domain lens proceeds: the prune is a write whose decision is `sanitizeSelection`'s. The operator amends: `workingTreeSprints` answers `[]` when the active directory is missing or unreadable, which a checkout or fast-forward of the main checkout can cause for one poll, and the prune then deletes a live selection that the next poll cannot restore. Without the prune the same poll costs nothing. The domain lens did not weigh this case; it is a behaviour the plan does not state, so the amendment carries it.

## Single-lens finding

- **Skeptic:** the switch-back assertion does not fail on `origin/main` if the flag returns to the first payload, which holds `bug/a` only. The switch-back payload must carry A active with `bug/a` and `bug/b`.

## Notes, not blocking (domain)

`selectedSprints` (`:569`) must become the derived list; one sprint-shaped unit case is enough beside the existing generic ones.

## Blind spot

All three lenses read the Agents tab with one selected sprint. None asked what happens with two Active sprints where one closes while the reader has both checked: `sanitizeSelection` keeps the other, and the prune shrinks the `Set` to it, which no test drives in a browser.

## What an amendment changes

1. A stated prune rule for an empty sprint list (prune only when the payload carries at least one active sprint, or after two consecutive polls, or no prune), with a browser step that serves `sprints: []` between two payloads carrying the selected sprint and asserts the chosen outcome.
2. The switch-back payload named: A active with `bug/a` and `bug/b`, asserting `bug/b` stays visible and A's box unchecked.
3. `selectedSprints` named as a site; the unit cases cut to one sprint-shaped case.
