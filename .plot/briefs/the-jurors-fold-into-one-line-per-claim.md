## Implementation brief — the-fleet-verifies-what-it-delivered (wave: the record and the panel's labels)

- **Plan (canonical):** [docs/plans/2026-10-12-the-fleet-verifies-what-it-delivered.md](../../docs/plans/2026-10-12-the-fleet-verifies-what-it-delivered.md) on `main`
- **Approved:** 2026-10-12
- **Branch:** `feature/the-jurors-fold-into-one-line-per-claim` (base: `main`)
- **Ends as:** one PR to `main`
- **Review of the code:** standard PR review (`Review: pr`)

This branch's wave carries no `waits:` annotation — it can start immediately.
A sibling in the same wave, `feature/a-delivered-plan-carries-its-verification`,
waits on two other plans' slices; this one does not, and nothing in this
branch's scope depends on that sibling landing first.

### What to build

`/plot-panel`'s `Commitment` parameter becomes a **list** of labels instead of
one. Today a caller hands the mechanism exactly one `{ label, positions }` pair
(`/plot-deliver` step 5 calls it twice, separately, for `Position` and
`Evidence` — two independent `check` calls, two independent gates). This slice
lets one panel run gate **several** labels on the **same** juror file in one
pass — the shape the verification feature needs, where a juror commits to
`Position: supported|refuted` *and* one `Claim-N: supported|refuted` per
Changelog/Acceptance claim the plan names, all in a single file.

The domain change is in `packages/domain/src/rules/panel.ts`
(`Commitment`, `commitmentLine`, `readJuror`, `readPanel`) — currently all four
operate over exactly one label. The skill change is in
`skills/plot-panel/SKILL.md` — the parameters table, the juror brief template,
the per-label check loop, the multi-refusal send-back, and the
first-label-only reconciliation. The built bundle
`skills/plot/scripts/board/plot-panel.mjs` is regenerated from the domain
source once it changes — never hand-edited.

**The `Prefix` parameter this slice also documents is already shipped.**
The spike (`feature/a-pinned-run-verifies-one-plan`, merged as PR #1618,
commit `112b0276f`) already added `prefix` to `jurorPath`/`moderationPath` in
`panel.ts:47-62`, so a verify-mode run can write `verify-<lens>.md` beside a
Draft round's `<lens>.md` without collision. This slice's job regarding
`Prefix` is to surface it as a named parameter in `skills/plot-panel/SKILL.md`'s
parameters table and brief template — not to build the mechanism, which
already exists. Read `panel.ts` before touching it: confirm current behaviour
by running the file, not by assuming the plan's description of "builds" work
still needs doing.

### The decisions the plan settles — do not re-derive them

**Only the FIRST label in the list is reconciled.** A list `Position, Evidence,
Claim-1, Claim-2` still produces one `unanimous`/`divided`/`refused` reading —
over `Position` alone. The other labels are gated (every juror must commit to
each) but never reconciled into a panel-level verdict. This is deliberate:
reconciliation is "what does the panel conclude," and a panel of per-claim
positions has no single conclusion to average into — that is exactly the
averaging `readPanel`'s own doc comment refuses ("Name the disagreements.
Never average them"). The caller that needs each claim's own verdict (the
verification feature, a later slice) reads the per-label `JurorReading`s
directly rather than asking `readPanel` to fold them.

**One send-back carries every refusal, not one send-back per missing label.**
A juror re-run happens once per round regardless of how many labels it
hedged on — the refusal text appended to its brief lists all of them together
("no `Claim-2:` line", "no `Position:` line", etc. in one message). This
mirrors the existing rule that a juror gets exactly one re-run ever
(`SKILL.md` step 4: "Once. A juror that hedges twice is reported as refused");
splitting refusals across separate send-backs would spend that one allowance
on the first missing label and refuse the juror on the second, which is
strictly worse than naming both at once.

**`/plot-deliver` step 5 is UNCHANGED by this slice.** It keeps issuing two
separate single-label `check` calls — `Position` then `Evidence` — exactly as
`skills/plot-deliver/SKILL.md:264-320` already documents. That file's own
comment states the reason this slice must not disturb it: *"`Commitment {
label, positions }` is a parameter, so two labels are two calls — no domain
change, and `readJuror` learns no delivery vocabulary."* Two separate calls
and one combined list are different callers making different choices with the
same mechanism; this slice adds the second shape, it does not migrate the
first caller onto it.

**The mechanism stays vocabulary-agnostic.** `readJuror`/`readPanel` must not
learn what `Claim-1` or `Position` mean — `panel.ts`'s own header comment is
explicit that the second caller (now a third, this one) is the reason the
abstraction is extracted at all, and hardcoding any label is what makes the
next caller impossible.

**Carried-over invariants, unchanged by this slice — re-read before touching
`readJuror`:**
- The label is matched **at the start of a line**, case-insensitively — a
  juror discussing the rubric mid-sentence must not satisfy the gate by
  quoting it.
- A position is matched **whole**, case-insensitively — `reject` is not
  satisfied by `rejected-this-reading`.
- Two **distinct** positions claimed for the same label in one file is a
  refusal (`claims both X and Y`), not a pick-one.
- Absence is not false: exit `0` is a commitment, `3` a refusal, `2` unusable
  arguments — a missing bundle means the panel ran **ungated**, never "clean."

### Done when

The plan's Acceptance line for this wave is the specification:

> A `/plot-panel` run with the list `Position, Evidence, Claim-1, Claim-2`
> sends back a juror that omits `Claim-2:` once with that refusal, and
> reconciles `Position`. A run with one label behaves as before.

Both halves matter and the second is the regression guard: an existing caller
passing a single label (current `/plot-deliver` behaviour, and
`/challenge-the-plan`'s single-label use) must see byte-identical behaviour —
same exit codes, same refusal text shape, same reconciliation. Write or extend
tests that exercise both the plural path and the singular path side by side, so
a future change can't silently special-case one.

Plus the repo's standing gates:
- `scripts/check-shell-lines.sh` — this slice is expected to touch no `.sh`
  file (the skill is Markdown, the mechanism is TypeScript), so it should not
  need to pay the ratchet. If a shell file does end up touched, growth must be
  paid for in the same change.
- A changeset: `bumps: plot-panel: minor` — description first, `bumps:` block
  last (CLAUDE.md's changeset ordering rule; a `bumps:`-first changeset
  publishes a blank release note).
- Update `skills/plot-panel/SKILL.md`'s `## Model Guidance` table to reflect
  any step whose judgment load changed (e.g. step 3's "one script call per
  file" becomes "one script call per label per file," still Small tier —
  mechanical, exit-code-driven).
- Run `node skills/plot/scripts/board/plot-local-checks.mjs` before each push
  and run what it prints — the suites under `CI suites` in this repo's
  `## Plot Config` run in CI, not locally; a failure there comes back as a
  correction. Do not run `pnpm run test:e2e` locally (CI's gate only).

### Bookkeeping

Open the PR through the controller, not `gh pr create`:

```bash
skills/plot/scripts/plot-open-pr.sh          # current branch
skills/plot/scripts/plot-open-pr.sh --draft  # while still moving
```

When the PR exists, append `→ #<number>` to this branch's line in the plan's
`## Slices` section. Push the first real commit as soon as it exists.

### Scope guard

This branch owns:
- `packages/domain/src/rules/panel.ts` (and its tests)
- `skills/plot-panel/SKILL.md`
- the rebuilt `skills/plot/scripts/board/plot-panel.mjs` bundle (regenerate,
  never hand-edit)
- a new changeset file for `plot-panel: minor`

**Do not touch** `skills/plot-deliver/SKILL.md` — its step 5 is explicitly
preserved as two separate single-label calls (see above). Siblings in flight,
verified against the plan's `## Slices` section at hand-off time:
- `feature/a-delivered-plan-carries-its-verification` — same wave, no
  dependency on this branch; it is expected to build the verification record
  mechanics (`foldVerification` et al., already shipped by the merged spike)
  and the `Verified:` booking — a different area of the domain and skills.
- `feature/the-fleet-verifies-a-delivered-plan` and
  `feature/a-tracker-opens-an-issue` — next wave, blocked until this wave's
  branches merge. Nothing to coordinate with yet.

If the plan's Open Points section reads as attributing `foldVerification` to
*this* branch, treat the `## Slices` section and the spike's already-merged
content as authoritative — that Open Point reflects pre-round-3 scope before
the spike-first rewrite moved `foldVerification` to the spike, and its
resolution text was not updated when the scope moved. This branch's scope is
the Commitment-as-list mechanism and the `Prefix` wiring only.

If you find something the plan did not anticipate, report it rather than
improvising outside scope.
