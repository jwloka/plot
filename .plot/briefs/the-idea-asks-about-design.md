## Implementation brief — the-phases-are-declared (wave 4: The idea asks about design)

- **Plan (canonical):** [docs/plans/2026-10-12-the-phases-are-declared.md](../../docs/plans/2026-10-12-the-phases-are-declared.md) on `main`
- **Approved:** 2026-10-12, Jan Wloka, plan-PR #1608 merged
- **Branch:** `feature/the-idea-asks-about-design` (base: `main`)
- **Ends as:** one PR to `main`, opened with `../plot/scripts/plot-open-pr.sh`
- **Review of the code:** per repo convention; the PR is reviewed as code

Checked 2026-10-12: no remote or local branch named `feature/the-idea-asks-about-design` exists yet, and no open PR touches `skills/plot-idea/SKILL.md`. This branch is independent of the other three in-flight waves (`feature/the-phases-are-a-declaration`, `feature/the-card-carries-its-controls`, `feature/the-board-draws-the-declared-phases`) — it touches only the `/plot-idea` skill, never `packages/domain` or `packages/board`. Nothing in this slice reads `State: Design` back out: `needsDesign`, the `design` arm of `owningCommand`, and the state-gate receipt for a `Draft`→`Design` transition on an *existing* plan all belong to the separate, later slice `feature/a-draft-can-need-design`, which is blocked waiting on `feature/the-design-approvals-are-gated` (a different plan, `design-work-proves-the-path`). **Your slice only ever writes `State: Design` into a brand-new plan file at creation**, and the state gate admits any state on a file creation (`rules/state-transition.ts:137`) — so you need no receipt-writing code and no coordination with that other branch.

### What to build

Today `/plot-idea` (`skills/plot-idea/SKILL.md`) has no concept of a `Design` state. Step 4 ("Answer the Ceremony Questions", `:197-245`) asks `Review:` and `Impl:` only, step 5 ("Create the Plan", `:249-320`) writes the plan file from `.plot/templates/plan.md` / `skills/plot/templates/plan.md`, both of which hardcode `State: Draft` in their `## Status` block, and step 9's closing line (`:415`) always prints `Progress: [x] Draft > [ ] Approved > [ ] Delivered > [ ] Released`.

Add one new step **after** step 4 and **before** step 5 (renumbering step 5 onward by one) that asks: *"Does this plan carry significant design decisions?"* On **yes**, the plan file step 5 writes gets `State: Design` instead of `State: Draft`, plus a `Design:` record (shape: `<date>, <who>, <channel>` — the same shape step 5 already uses for other Status fields) and an empty `## Spec` section with the placeholder `_To be filled in during Design._`. On **no** — the default — nothing changes: `State: Draft`, no `Design:` record, no `## Spec` section.

### Decisions the plan settles — do not re-derive them

- **This is its own step, not a third ceremony question.** MANIFESTO Principle 10, the plot-idea frontmatter, and `CLAUDE.md:166` all say "two ceremony questions" and this plan keeps that count at two. The design question is a separate step placed after step 4, not folded into it — don't add a third row to the Q1/Q2 ceremony tables or touch their wording.
- **Default is no, always.** Under normal (attended) operation, if the user doesn't clearly say the plan carries significant design decisions, write `State: Draft`. This is a recommend-and-ask situation like step 4's ceremony weighing, not a hard gate — use `AskUserQuestion`.
- **Unattended behavior is specific and asymmetric from every other step in this skill.** Under `PLOT_UNATTENDED=1`, this step does **not** stop-and-report the way most unattended gates in this skill do (compare step 3's slug-collision hard gate, or step 5's Type question, both of which halt and write no plan file). Instead: read the answer from the prompt (`$ARGUMENTS`) if one is given there; if none is given, **write `State: Draft` and proceed** — name the skipped question in the output, the way every other unattended path in this skill does, but do not stop plan creation over it. The plan's Design section is explicit: *"An unattended run with no answer in its prompt writes `State: Draft`."* This matters because a stop-and-report here would make every unattended `/plot-idea` batch run (the exact mechanism that drafted this plan itself, per its own Notes) start refusing instead of defaulting — don't copy the stop-pattern from step 3's hard gates.
- **The board's own unattended idea prompt does not change.** `packages/board/src/server/idea.ts:279` building its own prompt text explicitly says "Stop at **Draft**. Do not approve it, and do not start implementing it" — that text and that behavior stay exactly as they are. The board-started flow is a different caller giving no answer to this new step, which is exactly the "no answer in the prompt → Draft" unattended path above; it needs no code change in `idea.ts`.
- **Model tier is Mid, not Small.** The plan: *"The Model Guidance table gives the step the Mid tier: a Mid model recommends an answer, and a Small model asks."* Update the Model Guidance table in `skills/plot-idea/SKILL.md:46-56` to add a row for the new step (and renumber the "5-8" and "9" row labels in that table to match the new step numbering), following the same `recommends vs. asks` pattern step 4's own row already documents for smaller models.
- **No `transitions/plan.ts` or state-gate code is yours to touch.** Writing `State: Design` on a brand-new file needs no transition and no receipt — `rules/state-transition.ts:137` already admits any state on creation. If you find yourself reaching for `needsDesign`, a workflow file, or `recordStateReceipt`, stop — that machinery belongs to `feature/a-draft-can-need-design`, a separate branch blocked on a separate plan's spike. This slice is markdown-instruction and template-default changes only.
- **The `## Spec` placeholder text is exact.** Use precisely `_To be filled in during Design._` — the plan quotes this string verbatim, and `design-work-proves-the-path` (a sibling plan) is what actually fills that section later; don't invent different wording or add more scaffolding to it.

### Done when

The plan's `## Design` paragraph *"The design question in `/plot-idea`"* is the specification:

- A new step exists after step 4 and before step 5 in `skills/plot-idea/SKILL.md`, asking the design question, with recommend-and-ask behavior for attended runs and the asymmetric unattended default described above.
- On "yes", the plan file written in step 5 carries `State: Design`, a `Design:` record, and an empty `## Spec` section with the exact placeholder text.
- On "no" (the default) or no question asked at all, the plan file is unchanged from today: `State: Draft`, no `Design:` record, no `## Spec` section.
- Step 9's Progress line (`:415` today) prints `[x] Draft > [x] Design > [ ] Approved > …` when the created plan is in `State: Design`, and the unchanged `[x] Draft > [ ] Approved > …` otherwise.
- The Model Guidance table gets a row for the new step at Mid tier, and the old "5-8" / "9" row labels renumber to match.
- `skills/plot-idea/README.md` follows if it names step numbers or the ceremony-question count anywhere (check before assuming it needs no change — it currently describes the skill at a level that may or may not need updating).
- **Two hand-run tests, recorded in the slice's PR** (per CLAUDE.md *Testing*: skills have no unit tests, behavioral testing is manual): one attended run answering yes (confirm `State: Design`, the empty `## Spec`, and the Progress line showing Design checked), and one unattended run (`PLOT_UNATTENDED=1`) with no design answer in the prompt (confirm `State: Draft` and the skipped question named in the output, per this skill's existing `PLOT-UNASKED:` convention — e.g. follow the exact phrasing pattern of the other `PLOT-UNASKED:` lines already in this file, such as step 3's and step 5's).

Plus: `pnpm test` parses the skill (this is markdown/YAML frontmatter — the test suite validates skills parse correctly, nothing behavioral). Run `node ../plot/scripts/board/plot-local-checks.mjs` before each push and run what it prints — for a change scoped to `skills/plot-idea/SKILL.md` and its README, expect this to be the `** = ...` repo-wide gates only (no `packages/domain` or `packages/board` paths touched, so no vitest/tsc suites fire). The suites under the `CI suites` config key run in CI on this PR only — do not run `test:e2e` locally (CLAUDE.md *Testing*: it dispatches real workers into sandbox repos and is CI's gate, not a local one).

Name the shell gate only if you end up touching a `.sh` file, which this slice should not: `scripts/check-shell-lines.sh` refuses a PR whose shell under `skills/` grows past its merge base with no stored allowance.

### Bookkeeping

Open the PR through the controller, never `gh pr create`:

```bash
skills/plot/scripts/plot-open-pr.sh          # current branch
skills/plot/scripts/plot-open-pr.sh --draft  # while work is still moving
```

It reads which plan names this branch and opens the PR with the slice heading ("The idea asks about design") as title, the plan and this brief in the body. Push the first real commit as soon as it exists — a branch with no PR and no commits is invisible to the fleet. Once the PR exists, append `→ #<number>` to this branch's line in the plan's `## Slices` section, under *The idea asks about design*.

### Scope guard

This branch owns:

- `skills/plot-idea/SKILL.md` — the new step after step 4, the renumbered steps 5 onward, the template's `State:` write (step 5, now parameterized by the design answer), the `## Spec` section addition, the Progress line (step 9), and the Model Guidance table row
- `skills/plot-idea/README.md` — only if it names step numbers or the two-question ceremony count that this change affects

It does not touch: `packages/domain/**`, `packages/board/**`, `.plot/templates/plan.md` or `skills/plot/templates/plan.md` (the templates stay `State: Draft` by default — this step decides the override at creation time, in the skill's own step 5 logic, not by editing the template files themselves), `transitions/plan.ts`, `rules/state-transition.ts`, `workflows/needs-design.ts`, or anything under `server/entry/` — all of those belong to `feature/a-draft-can-need-design`, which is a different slice on a different branch, currently blocked. No other in-flight branch touches `skills/plot-idea/` as of 2026-10-12.

If you find something the plan did not anticipate — a step-numbering inconsistency this brief missed, a place the README names a count this change breaks, or a test fixture that asserts today's unconditional `State: Draft` — report it rather than improvising outside scope.
