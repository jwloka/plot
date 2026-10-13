## Implementation brief — design-work-proves-the-path (wave: The tracer status)

- **Plan (canonical):** [docs/plans/2026-10-12-design-work-proves-the-path.md](../../docs/plans/2026-10-12-design-work-proves-the-path.md) on `main`
- **Approved:** 2026-10-12, Jan Wloka, plan-PR #1608 merged
- **Branch:** `feature/a-tracer-plan-stays-in-design` (base: `main`)
- **Ends as:** one PR to `main`
- **Review of the code:** per plan Notes (standard PR review)

This slice's own `waits:` names `feature/the-phases-are-a-declaration` and
`feature/the-board-draws-the-declared-phases`. Both are merged — PR #1614
(2026-10-12) and PR #1623 (2026-10-12) — so this branch is eligible for
dispatch now. The next slice in the plan, `feature/a-tracer-plan-ships-with-its-dependent`,
waits on this one: it reads the `proven` status this slice introduces, so it
cannot start until this branch merges.

### What to build

A plan file can carry `Tracer: yes` in its `## Status` block. Today nothing
downstream reads that fact as a *status* — the raw `tracer` boolean already
reaches the board (see *Already landed* below), but no code answers the
question a tracer plan's reader actually has: *does this plan sit in Testing
like any other delivered plan, or does it stay in Design until a dependent
ships it?*

Build that answer in three places:

1. **The phase.** `phaseOfPlan` (`packages/domain/src/rules/workflow-phases.ts:143`)
   must hold a tracer plan in the phase that contains `plan:design`, in every
   state but `released` — not in whatever phase its raw `State:` line would
   otherwise place it. Read the plan's `tracer` reading as an input alongside
   its phase/state readings.
2. **The status.** `planStatus` (`packages/domain/src/rules/phase.ts:68`) gains
   a new return value, `proven`, for an approved tracer plan whose every
   non-deferred slice has merged (`readings.landed === 'merged'`). `proven`
   takes the place `deliverable` would otherwise report for that plan — a
   tracer plan is never `deliverable`, because the auto-bump must not move it
   to Testing (D5/D14 in the plan's Design section).
3. **Everywhere `deliverable` is a case label for a tracer plan, add `proven`
   beside it:**
   - Both `PlanStatusSchema` copies — `packages/domain/src/rules/phase.ts:22-24`
     and `packages/board/src/contract/schema.ts:408-410` — gain `'proven'` in
     the enum.
   - Both sprint WIP counters in `packages/board/src/server/fleet.ts`
     (`:6355` and `:6431`, each a `switch` with a `case 'deliverable':` arm
     feeding `counts.wip += 1`) gain a `case 'proven':` falling into the same
     arm — a tracer plan counts as WIP, exactly as `deliverable` does.
   - The `proven` badge and the card's Deliver control: the Deliver
     affordance reads `status === 'deliverable'` today (`board.ts:2140`,
     `schema.ts:613-615`) — the card must also offer Deliver where
     `status === 'proven'`, per D14 (*a person may deliver a proven tracer
     plan with no dependent alone*).

### Already landed — do not re-derive these

The markers slice (`feature/a-slice-is-marked-spike`, PR #1621) already
shipped the **readings this slice decides on**, so do not re-add them:

- `PlanMetaSchema.tracer` (`packages/board/src/contract/schema.ts:161`,
  `z.boolean().default(false)`) — read from `Tracer: yes` by
  `plot-plan-meta.sh`.
- The pulse `PlanSchema.tracer` (`packages/domain/src/entities/fleet.ts:720`,
  same default/shape), already consumed by `verificationOf` in the sibling
  plan `the-fleet-verifies-what-it-delivered` (`unverified` for any tracer
  plan, whatever it carries — `packages/domain/src/rules/verification-record.ts:122`)
  and by `auto-verify.ts:167` (`refuse('tracer')`).

What is still missing, and is this slice's actual scope, is **`PlanReadings.tracer`**
(`packages/domain/src/rules/phase.ts:34-45` — the interface `planStatus` reads
has no `tracer` field today) and the status/phase decision built from it. The
raw boolean existing on two other schemas is not the same as the rule that
acts on it — that's the gap this slice closes.

**Do not confuse `proven` the plan status with "proven" the branch reading.**
`plot-merge-subject.mjs proven` (`packages/domain/src/entities/..`, entry at
`packages/board/src/server/entry/merge-subject.ts:16`) and
`packages/fleet/src/server/entry/registryd-main.ts:600` already use the word
to mean *a branch's merge subject shows it landed* — a scan-level reading
about one branch. The `PlanStatus` value this slice adds is a different
thing: a value of `planStatus`'s return type, true only when **every**
non-deferred slice of a **tracer** plan has merged. They are never read by
the same function and never need to agree; keep both names, and say in the
PR body which one each changed line is.

### `board.ts`'s `planStatus` wrapper needs the new reading too

`packages/board/src/server/board.ts:1089-1101` is the thin wrapper that runs
the pulse queries and calls the domain rule. It builds the `PlanReadings`
object from `meta` and the pulse today with no `tracer` field — add
`tracer: meta.tracer` (the field the markers slice already put on
`PlanMetaSchema`) to the object it hands to `decidePlanStatus`. This is the
one call site; `planStatusBySlug` (`board.ts:2424`) and the render-time
`planStatus(meta, judging, judging !== null)` call at `:2139` go through the
same wrapper, so neither needs a separate change.

### Done when

The plan's `## Slices` entry for this branch is the specification:
`phaseOfPlan` holds a tracer plan in Design's phase; `PlanReadings.tracer`
and its builders; `planStatus` answers `proven`; both `PlanStatusSchema`
copies; both sprint counters; the `proven` badge and the card's Deliver
control.

Tests that exist because a naive implementation would pass without them:

- A tracer plan that is `approved` with every slice merged must answer
  `proven`, **not** `deliverable` — a naive patch that only adds the enum
  value without gating `deliverable`'s branch on `!readings.tracer` would
  leave the old value reachable and the auto-bump would still move the card
  to Testing.
- A tracer plan that is `approved` but **not** every slice merged must still
  answer `approved` or `in-progress` as today — `proven` is reached only
  through the fully-merged path, not merely by carrying `Tracer: yes`.
- A non-tracer plan's `planStatus` output must be byte-for-byte unchanged —
  this is a pure addition to one `switch` arm, not a restructuring.
- A sprint whose member reads `proven` must count as `wip`, not fall through
  to "unknown slug, not counted" — the existing `switch` statements have a
  default/fallthrough comment for unrecognized values; a forgotten `case`
  silently drops the plan from the sprint tally rather than erroring.
- The Deliver control must appear on a `proven` card — a test that only
  checks `schema.ts`'s enum parses `proven` without checking the control
  condition would miss the half of this slice a user actually sees.

Plus: the repo's gates — build artifacts (`pnpm build:board` if you touch
anything the generated bundle reads, but restore the generated paths before
pushing per `CLAUDE.md` *On a conflict in board-server.mjs*), and a changeset.
This slice's `bumps:` is not stated in the plan text at the slice heading —
check the Changelog/Status section conventions in CLAUDE.md *Versioning* and
choose Minor (`plot: minor`) given it is new schema/domain surface, unless a
later cross-plan note in this plan's Notes section says otherwise.

Run `node skills/plot-implement/../plot/scripts/board/plot-local-checks.mjs`
(resolved from this skill's directory: `../plot/scripts/board/plot-local-checks.mjs`)
before each push, and run what it prints — the related domain/board tests,
`tsc --noEmit`, and the repo's `check-*.sh` gates. The suites under this
repo's `CI suites` config key run in CI on the PR; do not run them locally.

**The shell gate applies even though this slice is pure TypeScript.**
`scripts/check-shell-lines.sh` refuses a PR whose shell under `skills/` grew
against its merge base. This slice adds no `.sh` file and should show 0 net
shell lines — if any shell creeps in, remove an equal number elsewhere in
the same change; the gate stores no allowance.

### Bookkeeping

Open the PR through the controller once the first commit exists:

```bash
skills/plot/scripts/plot-open-pr.sh          # on this branch
skills/plot/scripts/plot-open-pr.sh --draft  # while work is still moving
```

Never run `gh pr create` by hand. When the PR is created, append `→ #<number>`
to this branch's line in the plan's `## Slices` section
(`docs/plans/2026-10-12-design-work-proves-the-path.md:188`), under
`### The tracer status`.

### Scope guard

This branch owns:

- `packages/domain/src/rules/phase.ts` (`PlanStatusSchema`, `PlanReadings`, `planStatus`)
- `packages/domain/src/rules/workflow-phases.ts` (`phaseOfPlan`'s tracer handling)
- `packages/board/src/contract/schema.ts` (`PlanStatusSchema` copy only — not `PlanMetaSchema.tracer`, which already exists)
- `packages/board/src/server/board.ts` (the `planStatus` wrapper at `:1089`, and whichever render site shows the Deliver control / badge)
- `packages/board/src/server/fleet.ts` (both sprint-counter `switch` blocks, `:6355` and `:6431`)
- Associated unit/contract tests and one changeset

**No other branch of this plan is currently open** — `feature/a-tracer-plan-ships-with-its-dependent`
(the next slice, which waits on this one) has no PR yet, and no other sibling
branch has an open PR. There is no concurrent-edit collision to track today;
re-check with `/plot-pulse` if that changes before this merges.

If you find something the plan did not anticipate, report it rather than
improvising outside scope.
