# Round 2 — operator

Subject: `docs/plans/2026-10-01-waiting-on-you-counts-tickets-as-tickets.md` at `dbd9f97a`. Lens: the operator reading every section header. Round 1 asked that a plan-less branch not read as a plan, and that equal plan and slice figures not print side by side.

Position: proceed

## What I looked at

The amended Design and the skeptic's label table, against the headers I read on the board on 2026-10-01, and the «Sprint only» bar in `SprintFilter.tsx:205-218`. Read, not executed.

## Round 1, answered

- A PR row for a branch no plan names, which sits in WAITING ON YOU most days, now reads `1 branch`. That is the right noun.
- The slice figure prints only where it differs. `(2 plans · 1 ticket)` reads cleanly.
- The order still follows the rows top to bottom: plans, slices, branches, tickets, stopped agents.
- The `not sprint-filtered` note no longer repeats a number I already read in the header.

## One wording note, not blocking

With the filter on, the same plan-less rows appear twice under two words: the header says `2 branches`, and the «Sprint only» bar says `2 shown without a plan` (`SprintFilter.tsx:218`). Both are true. The plan could make the bar say `branches` too, or leave it; it is the bar's wording, outside this bug. A worker should not change the bar inside this slice.
