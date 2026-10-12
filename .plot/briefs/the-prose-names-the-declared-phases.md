## Implementation brief — the-phases-are-declared (wave: The prose)

- **Plan (canonical):** [docs/plans/2026-10-12-the-phases-are-declared.md](../../docs/plans/2026-10-12-the-phases-are-declared.md) on `main`
- **Approved:** 2026-10-12, Jan Wloka, plan-PR #1608 merged
- **Branch:** `docs/the-prose-names-the-declared-phases` (base: `main`)
- **Ends as:** one PR to `main`
- **Review of the code:** standard PR review

This is the plan's last slice. The other four are merged: `the-phases-are-a-declaration`
(#1614), `the-card-carries-its-controls` (#1617), `the-board-draws-the-declared-phases`
(#1623), `the-idea-asks-about-design` (#1628), `a-draft-can-need-design` (#1633,
including its approval-record follow-up #1634 and #1635). All the machinery this
slice narrates — `parsePhaseMap`, `cardControls`, `phaseColumns`, the idea-time design
question, `needsDesign` — is already live on `main`. This slice touches **prose only**:
no production code changes, no new tests beyond the grep acceptance the plan names.

### What to build

Two renames run through nine files, and they are opposite directions on the same word:

1. **Where the prose used "phase" to mean a plan's `State:` value, say "state."** The
   machinery landed under the old vocabulary — `CLAUDE.md`'s *Phase Guardrails* heading,
   its "Four workflow phases" sentence, `MANIFESTO.md`'s Principle 7 ("Phase guardrails"),
   `skills/plot/SKILL.md`'s *Plan Phases* heading and table. All of these describe the
   `State:` field (`Draft → Approved → Delivered → Released`, now with `Design` optional
   between Draft and Approved) — call it "state" everywhere this slice touches it.
2. **Where the prose used "phase" to mean a board column / workflow activity, keep
   "phase" but update the *set*.** `MANIFESTO.md`'s *Four phases, four artifacts* table
   currently lists Discovery → Design → Development → **Endgame**; the fourth activity
   is now **Testing**, and there's a fifth, **Released**, after it. Same for
   `skills/plot/intro-to-using-plot.md`'s activity table and `docs/board-entity-properties.md`
   / `docs/board-domain-model.md`'s `phase` value lists (`Discovery · Development ·
   Endgame · Released` → `Discovery · Design · Development · Testing · Released`).

File by file (lines are approximate — re-find each by the quoted text, not by line number;
a few have already drifted 1-3 lines from the plan's citations during prior slices):

- **`CLAUDE.md`** — *Phase Guardrails* (`## Phase Guardrails`, ~:206) becomes
  *State Guardrails*; its body ("Four workflow phases: Draft → Approved → Delivered →
  Released") becomes "Five plan states: Draft → Design → Approved → Delivered →
  Released, with Design optional" (grep for "Four workflow phases" — exactly one hit).
  Two more mentions near `:530` and `:537` (search "phase guardrails" case-insensitive)
  become "state guardrails."
- **`skills/plot/SKILL.md`** — `### Plan Phases` (~:171) becomes `### Plan States`; its
  table gets a `Design` row between Draft and Approved (optional step, written by
  `/plot-idea`'s design question or later by *Needs design*); the column header "Phase"
  becomes "State." The sentence "Individual plans don't track a 'Testing' phase" (~:182)
  is now false — remove it; plans still don't have a phase field, but the board's fourth
  column is now named Testing, which is what that sentence was hedging against. The board
  paragraph at ~:266 ("renders 4 columns (Draft / Approved / Delivered / Released)")
  becomes "renders the declared phases" or similar — it no longer hardcodes a column list,
  since `the-board-draws-the-declared-phases` made columns come from `phaseColumns(map)`.
- **`skills/plot/MANIFESTO.md`** — Principle 7 heading "Phase guardrails" (~:55) becomes
  "State guardrails," with the body's "workflow phase" → "state." *Four phases, four
  artifacts* (~:99-111): the table's "Plot phase" column keeps "phase" (these rows are
  board activities, not states), but its fourth row changes from Endgame to Testing, and
  a fifth row for Released is added (currently the table stops at Endgame/Released
  conflated — check the actual row count). *Lifecycle* (~:148) "four plan-level phases"
  becomes "five plan states... with Design optional between Draft and Approved." `:156`
  ("Bugs found during this endgame phase") — "endgame" becomes "Testing."
- **`README.md`** — `## Lifecycle` (~:63) "Four phases, four artefacts" becomes "Five
  states" (or similar — Design is optional, so decide whether the intro sentence counts
  4 or 5; the plan says "an optional fifth," so phrase it that way). The ASCII diagram
  (~:67-85) gains a `Design` node between `Draft` and `Approved`, reachable from Draft
  (optional — no incoming arrow forcing it) and feeding into the same `/plot-approve`
  step Draft does.
- **`skills/plot/intro-to-using-plot.md:17`** — the activity table's Endgame row becomes
  Testing, with a Released row after it (mirrors the MANIFESTO table fix).
- **`skills/plot-board-setup/SKILL.md:514`** (inside the "Do not assert specific column
  names" note) — currently says an older build served `Draft / Approved / Delivered /
  Released` while "the build in this checkout serves `Discovery / Design / Development /
  Endgame / Released`." Fix "Endgame" → "Testing" — this is dated prose describing a
  historical build string, so only the factual column name is wrong, not the whole note.
- **`docs/board-entity-properties.md:38, :154`** — the `phase` value lists
  (`Discovery` · `Development` · `Endgame` · `Released`) become `Discovery` · `Design` ·
  `Development` · `Testing` · `Released`.
- **`docs/board-domain-model.md:22, :201`** — same value-list fix as above. Leave
  `:455-462` (dated measurement rows) and anything else dated untouched — the plan's own
  Notes section says dated measurements that name Endgame stay as recorded; only the two
  rows stating current vocabulary change.
- **`DESIGN-plan.md:748-755`** (`docs/stories/the-master-agent-holds-the-fleet/DESIGN-plan.md`
  — note this is a *different* story than `plot-works-in-five-phases`; the plan cites it
  deliberately as a shared design doc that already separates phase from state) — confirm
  it already names the five phases as the default (Discovery · Design · Development ·
  Testing · Released per its own `#### Phases belong to the workflow; states belong to
  the plan` table). As of 2026-10-13 it already does — this citation is **verification,
  not an edit**. Don't touch this file unless you find it actually says Endgame
  somewhere in that range.

### Decisions already made — do not re-derive them

**Two words, two different renames, and conflating them is the one way to get this
wrong.** "Phase" meaning a `State:` value is being renamed away entirely (→ "state").
"Phase" meaning a board column/activity keeps its name but gets a corrected member list
(Endgame → Testing, Released added). A file that uses both senses — `MANIFESTO.md`
especially — needs both treatments in different places. Do not do a blind
find-and-replace of "phase" → "state"; `MANIFESTO.md`'s *Four phases, four artifacts*
table heading stays "phases" because it's naming the workflow activities, not the
`State:` field.

**Why `DESIGN-plan.md` is cited from a different story.** The plan's Motivation
(`:40`) and a resolved panel item (`:120`) both address this: an earlier panel round
flagged the cross-story citation as looking like a bug. It isn't — `DESIGN-plan.md`
lives under `the-master-agent-holds-the-fleet` story because that's where the
phase/state distinction was first formally drawn (`#### Phases belong to the workflow;
states belong to the plan`), and this plan's prose slice reuses that doc as supporting
evidence rather than duplicating the argument. Resolve the citation, don't "fix" it by
looking for a same-named file under `plot-works-in-five-phases/`.

**Why no production code changes here.** Every mechanism this slice's prose describes —
the phase map, `cardControls`, `phaseColumns`, the idea-time question, `needsDesign` —
already shipped in the prior four slices. If you find yourself wanting to touch
anything under `packages/` or `skills/*/scripts/`, stop: that's scope from an earlier
slice, already merged, and not this one's job. The one exception the plan explicitly
allows is regenerating `AGENTS.md` via the mirror script (next point) — that's a build
step on the prose, not new production logic.

**`AGENTS.md` is generated, not hand-edited.** After editing `CLAUDE.md`, run
`./scripts/check-agents-md.sh --write` to regenerate `AGENTS.md` from it. CI refuses a
PR where the two differ. This is the only "build" step in an otherwise docs-only slice.

**The grep acceptance is the whole test suite for this slice.** Per *Tests per slice* in
the plan: `pnpm test` (parses skills — catches a broken frontmatter or heading) and a
grep over the listed files/lines finding no "Endgame," no "four plan-level phases" and
no "Four workflow phases." There is no unit test to write — this slice has no code.

### Done when

The plan's `## Done when` is its *Tests per slice* → *The prose* bullet:

- `./scripts/check-agents-md.sh` passes (run with `--write` first if `CLAUDE.md` changed,
  then bare to confirm no diff remains).
- `pnpm test` passes (validates every skill's frontmatter/structure still parses after
  the heading renames — a renamed `##` heading with a stray typo would fail this).
- A grep over every listed file finds **zero** instances of "Endgame" (case-sensitive,
  since "endgame" as a lowercase common word may legitimately survive in some prose —
  check each hit), zero of "four plan-level phases," and zero of "Four workflow phases."
  Run this as your own final check before opening the PR — it's cheap and it's the
  plan's actual acceptance criterion, not just a suggestion.

Plus: a changeset — description first, `bumps:` block last (`CLAUDE.md` *Versioning*:
11% of past changesets got the order backwards and shipped a blank changelog line).
Bump `plot` minor (new prose coverage of already-shipped behavior, not a fix) — no
`@plot-pm/board` bump needed since no board code changes. The description is the
Changelog bullet this slice is closing out: the plan's own `## Changelog` already lists
every behavior change from the prior four slices; this slice's changeset describes the
**documentation catch-up**, e.g. "Plot's docs now describe the five plan states and the
five-phase board using the same words the code already uses." Run
`node skills/plot/scripts/board/plot-local-checks.mjs` before each push and run what it
prints. The suites named in the `CI suites` config key run in CI on this PR — don't run
them locally.

Name the shell gate too, even though this slice is very unlikely to touch a `.sh` file:
`scripts/check-shell-lines.sh` refuses a PR whose shell under `skills/` grew past its
merge base. Nothing in this slice's scope should touch shell at all.

### Bookkeeping

Open the PR through the controller once there's a real commit:

```bash
../plot/scripts/plot-open-pr.sh          # or --draft while still moving
```

Push the first real commit as soon as it exists — don't batch nine file edits into one
local commit and push once at the end; an early, small, draft-PR-worthy commit lets
`plot-open-pr.sh` run as soon as there's something to review.

When the PR exists, append `→ #<number>` to this branch's line in the plan's `## Slices`
section (the `docs/the-prose-names-the-declared-phases` bullet under `### The prose`).

### Scope guard

**This branch owns:** `CLAUDE.md`, `skills/plot/SKILL.md`, `skills/plot/MANIFESTO.md`,
`README.md`, `skills/plot/intro-to-using-plot.md`, `skills/plot-board-setup/SKILL.md`
(one note only, `:514`-ish), `docs/board-entity-properties.md`,
`docs/board-domain-model.md` (two spots only, not the dated-measurement rows past
`:455`), and the generated `AGENTS.md` mirror. It does **not** own
`docs/stories/the-master-agent-holds-the-fleet/DESIGN-plan.md` — that file is read,
not written.

**Other branches of this plan are all merged** — there is no sibling in flight to
collide with. The plan has no further slices after this one; once this PR merges and
`## Status` shows no remaining unmerged branch, the plan is ready for `/plot-deliver`.

If you find something the plan did not anticipate — a file the plan names that no
longer says what it claims, or a heading that moved further than a line or two — report
it rather than improvising a different fix than the one described above.
