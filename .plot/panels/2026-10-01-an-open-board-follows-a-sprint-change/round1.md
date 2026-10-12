# Round 1 — moderation

Subject: `docs/plans/2026-10-01-an-open-board-follows-a-sprint-change.md` at `63893100`. Jurors: `round1-skeptic.md`, `round1-operator.md`, `round1-domain.md`. Gate: `committed skeptic amend`, `committed operator amend`, `committed domain amend`. Reconcile: `unanimous amend skeptic,operator,domain`.

## How the panel ran

One agent applied the three lenses in sequence; it could not start separate juror agents. The three files share one reader, so their agreement is weaker evidence than three independent jurors, and a later round should use separate agents.

## Evidence each lens used

- **Skeptic: executed.** A scratch browser test against the artifact built from `63893100`, using the catalogue's `route` option with a mutable flag. After checking `sprint-a` and switching the payload to `sprint-b`: `toggleB=false hidden=2 shown=[]`. The defect reproduces, and the plan's cause is the cause.
- **Operator: read.** `AgentList.tsx:505-540`, `fleet.ts:7597-7606`, and the skeptic's output.
- **Domain: read.** `filters.ts`, `test/unit/filters.test.ts`, every `sprintFilter` read in `AgentList.tsx`.

## Agreed

- The cause and the off-state design are right: the in-memory `Set` keeps a slug that `fleet.sprints` no longer carries, and the filter must collapse to "no filter" with an unchecked box. Not auto-selecting the new sprint is right.

## Changes, each from one lens and contested by none

1. **The symptom is wider than the plan says (skeptic).** Every plan row is hidden, including the closed sprint's own members, because the closed slug matches no membership entry. The browser test carries a closed-sprint member row and asserts it is shown, and asserts `data-sprint-hidden` is absent.
2. **Name the test mechanism (skeptic):** the catalogue's `route` option with a mutable flag.
3. **The rule already exists (domain).** `sanitizeSelection` (`filters.ts:165`) is the same rule, used by the Plans tab for the same shape and unit-tested. Call it; do not add `activeSprintSelection`. Move the four unit cases into its describe block; drop the order clause and the `builds:` annotation.
4. **A retained slug re-engages (operator).** `activeSprints` reads the working tree, so a branch switch to a tree where the closed sprint is still Active brings it back, and the forgotten selection filters again with its box checked. Prune the stored `Set`, or state re-engagement as intended and test it.

## Disagreements

None on position. Finding 4 is a design choice the plan must make, and the lenses did not weigh its two options against each other.

## Blind spot

All three lenses read the Agents tab. None checked whether another view holds an in-memory sprint selection with the same shape, for example the Swimlanes or Board components that also join on `fleet.sprints` membership (`AgentList.tsx:539` names them). The amendment should state that it searched.

## What an amendment changes

- Slice: call `sanitizeSelection` instead of a new rule; unit cases in its existing block.
- Slice test: a closed-sprint member row shown, `data-sprint-hidden` absent, built on the catalogue `route` flag.
- Design: a decided rule for a retained slug (prune, or re-engage by intent, with a test).
- Motivation: every plan row was hidden, not only the new sprint's.
