## Implementation brief — design-work-proves-the-path (wave: The tracer delivery)

- **Plan (canonical):** [docs/plans/2026-10-12-design-work-proves-the-path.md](../../docs/plans/2026-10-12-design-work-proves-the-path.md) on `main`
- **Approved:** 2026-10-12, Jan Wloka, plan-PR #1608 merged
- **Branch:** `feature/a-tracer-plan-ships-with-its-dependent` (base: `main`)
- **Ends as:** one PR to `main`
- **Review of the code:** per plan Notes (standard PR review)

This is the plan's last slice. It **waits on** `feature/a-tracer-plan-stays-in-design`
(not yet merged at the time this brief was written): that branch adds
`PlanReadings.tracer` and the `proven` status this slice's logic reads. Do not
start coding against `planStatus`/`phaseOfPlan` until that branch has landed —
check `/plot-pulse` first.

### What to build

Today `planAutoDeliver` (`packages/domain/src/rules/auto-deliver.ts:274`)
already excludes a tracer plan from automatic delivery, but only as a side
effect of its existing `phase.toLowerCase() !== 'approved'` guard — the prior
slice keeps a tracer plan's phase in Design through every state but
`released`, so it never reaches line 279's check. **That half of this slice's
requirement is already true and needs no new code.** Confirm it with a test
rather than re-deriving the guard.

The actual new work is the other half: when a tracer plan's **dependent**
becomes deliverable, the dependent's delivery must also carry the tracer
plan(s) it `waits:` on, once each of those is `proven`. Nothing today connects
a delivered plan to the tracer plan(s) its branches declared a wait on —
`waits_on` (`packages/domain/src/entities/fleet.ts:217`) is read today only by
`eligible.ts`'s dispatch-time gate (`isClaimable`, `waitVerdict`), which
resolves prerequisite **branch names** against host PR answers. Nothing
resolves a waited-on branch name back to **which plan owns it** — you are
building that lookup, scoped to this function, not extracting a shared helper
nobody else needs yet.

Three behavior changes to `planAutoDeliver`:

1. **Skip a tracer plan alone** — already true via the phase guard (see
   above). Write the test; do not add a second, redundant check.
2. **When a dependent plan passes every existing gate** (approved,
   `allSlicesConfirmed === 'merged'`, `landedBranches > 0`, `retryVerdict ===
   'ready'`, not already in flight), **also return every `proven` tracer plan
   that any of the dependent's branches names in `waits_on`.** The dependent
   goes first in the returned array, its tracer plan(s) after — order matters
   because `runAutoDeliver`/`maybeAutoDeliver`
   (`packages/fleet/src/shared/auto-deliver.ts`, unchanged by this slice — see
   below) iterate the array in order and chain reap → release-refs per plan,
   so the dependent must be confirmed delivered before its tracer plan's own
   delivery is attempted. A tracer plan is identified by `plan.tracer === true`
   on the pulse (`entities/fleet.ts:720`); `proven` is the status the prior
   slice's `planStatus` computes — **read it from the pulse's plan phase/state
   the same way `allSlicesConfirmed` does, not by re-deriving `proven`'s
   definition here.** If the prior slice's branch did not also expose a cheap
   "is this tracer plan proven" pulse-level check, you may need to call
   `planStatus` (or the rule it was extracted from) directly against the
   tracer plan's `PlanReadings` built from the pulse — check what the prior
   branch actually shipped before inventing a parallel readings-builder.
3. **Retry a tracer plan whose dependent has already been delivered.** A
   tracer plan's own delivery can fail independently of its dependent's (e.g.
   the dependent's delivery succeeded and moved the dependent's phase past
   `approved` on a later tick, but the tracer plan's delivery attempt that same
   pass failed or never ran). On a later pass, the dependent plan's phase is no
   longer `approved` — it already delivered — so rule 2 above, which is keyed
   off the dependent still being gate-eligible, will not find it again. Add a
   second path: a tracer plan that is `proven`, not in flight, and whose
   `retryVerdict` is `ready`, is returned on its own **if its dependent has
   already delivered** (dependent's phase is `delivered` or `released`).
   Finding "its dependent" requires the same waits_on → plan lookup as rule 2,
   run in reverse (tracer plan → does any OTHER plan's branch `waits_on` name
   one of my branches, and has that plan delivered).

### Already landed — do not re-derive these

- **`runAutoDeliver`, `maybeAutoDeliver`, `runAutoDeliverPass`**
  (`packages/fleet/src/shared/auto-deliver.ts`, read in full — 568 lines) are
  already generic over the array size `planAutoDeliver` returns: each entry
  gets its own `plot-deliver.sh` (or configured `Deliver command` agent) call,
  its own in-flight mark, its own failure tracking, and its own
  reap-then-release-refs chain on success. **This slice does not touch this
  file.** The plan's Design-section paragraph "Delivering a tracer plan" cites
  `workflows/deliver.ts:139` and `entry/deliver.ts:368` as the existing
  single-plan deliver wiring — **those paths do not exist in this repo; the
  actual wiring is the file above.** Treat the plan's citation as a stale
  pointer, not a file to go find.
- `PlanSchema.tracer` (`entities/fleet.ts:720`) and `BranchSchema.waits_on`
  (`entities/fleet.ts:217`) already exist and are already parsed onto every
  pulse plan/branch. Nothing about their schema needs to change.
- `allSlicesConfirmed`, `landedBranches`, `retryVerdict`, `deliveryReading`,
  `pruneDelivering` — all unchanged. This slice edits `planAutoDeliver`'s body
  and adds the cross-plan lookup inside it (or as a small private helper in
  the same file); it does not touch the gates these functions already encode.
- `plot-deliver.sh` itself is unchanged for the dependent-then-tracer-plan
  automatic path — `runAutoDeliver` already calls it once per returned
  `AutoDeliverPlan`, tracer plan included, exactly as it would for any other
  plan. A tracer plan delivered this way is an **approved-looking** call from
  the script's point of view only in the sense that the phase-admission logic
  in `plot-deliver.sh`/its underlying controller must accept a `proven`
  (Design-phase) tracer plan as deliverable — confirm this is already true
  (the prior slice's brief says the card's Deliver control already appears for
  `proven`, implying the controller path admits it) before assuming new
  admission logic is needed here; if it refuses a `proven` plan, that refusal
  is this slice's to fix, not the prior slice's.

### The D14 standalone path is this slice's documentation gap, not a code gap

Decision D14 — *a person may deliver a `proven` tracer plan that has no
dependent, alone* — has no written procedure in `skills/plot-deliver/SKILL.md`
today. The file's only tracer-related section (`### V2. Refuse a tracer plan`,
lines 569–574) is a **different, already-shipped mechanism**: it refuses
*verification* of a tracer plan (`unverified`, always), which belongs to the
sibling plan `the-fleet-verifies-what-it-delivered` — it says nothing about
delivery. Add a short section (or extend the Model Guidance table row per the
plan's `bumps:` note) describing: a `proven` tracer plan with no dependent plan
pointing a `waits:` at it is deliverable by a person running `/plot-deliver
<slug>` directly, exactly like any other approved-and-merged plan, because
`planStatus` already reports it `proven` rather than `deliverable` only to
keep the **automatic** path from moving it — the manual command is unaffected
and should say so explicitly, so an operator reading the skill is not left
guessing why the board calls it `proven` instead of `deliverable`.

### Done when

The plan's `## Slices` entry for this branch is the specification:
`planAutoDeliver` skips a tracer plan alone, returns a dependent then its
`proven` tracer plan(s), and retries a tracer plan whose dependent already
delivered; each tracer plan still goes through the unmodified single-plan
`plot-deliver.sh` call with its own receipt; `/plot-deliver` documents D14 for
a person delivering a proven, dependent-less tracer plan.

Tests that exist because a naive implementation would pass without them:

- A tracer plan with `tracer: true` and every slice merged, but still
  `approved`-phased with **no other plan** waiting on it, must **not** appear
  in `planAutoDeliver`'s output — this is the existing phase guard; write the
  test that proves it rather than assuming the guard covers this case by
  reading the code.
- A dependent plan that passes every existing gate, with one branch's
  `waits_on` naming a branch belonging to a **`proven`** tracer plan, must
  return `[dependent, tracerPlan]` **in that order** — a naive implementation
  that returns them in pulse-iteration order (which may put the tracer plan
  first, since its plan file can sort before the dependent's) would break the
  ordering `runAutoDeliver`'s sequential chaining depends on.
- The same dependent, but the waited-on tracer plan is **not yet `proven`**
  (still has unmerged slices) must return `[dependent]` only — delivering a
  tracer plan before every one of its own slices merged is the exact defect
  `allSlicesConfirmed`'s gate exists to prevent elsewhere; this path must not
  reopen it by skipping the check for the tracer-plan half of the pair.
- A tracer plan already `delivered` (its dependent shipped on a prior pass,
  but the tracer plan's own delivery failed that same pass and is not yet in
  flight) must be returned **alone** on a later pass where `retryVerdict` is
  `ready` — a naive implementation that only ever returns a tracer plan
  alongside its dependent (rule 2) would never retry it once the dependent's
  phase has already moved past `approved`.
- A tracer plan held back by `retryVerdict !== 'ready'` (waiting out its
  backoff, or stopped after `AUTO_DELIVER_MAX_FAILURES`) must **not** be
  returned by either rule 2 or rule 3 — the existing retry bound applies to a
  tracer plan exactly as it does to any other plan, and a naive
  dependent-pulls-in-tracer-plan implementation could easily bypass it by
  skipping the `retryVerdict` check for the tracer-plan half specifically.
- A non-tracer plan's existing behavior (returned alone, no waits_on lookup
  attempted) must be byte-for-byte unchanged — this is additive to one
  function, not a restructuring; `pruneDelivering` is untouched and must still
  prune both the dependent and any tracer plan the same way.

Plus: the repo's gates — a changeset
(`bumps: plot-deliver: minor`, per the plan's slice heading — note the bump
targets the `plot-deliver` **skill**, for the SKILL.md D14 addition, even
though the code change is in `@plot-pm/domain`; check CLAUDE.md *Versioning*
for whether a domain-only behavior change under this bump also needs its own
`bumps:` entry for `plot` itself, since `packages/domain` has no skill of its
own to bump), and the Model Guidance row update in
`skills/plot-deliver/SKILL.md` the plan's slice text calls for
(`<!-- builds: tracer delivery with its first dependent -->`).

Run `node ../plot/scripts/board/plot-local-checks.mjs` (resolved from this
skill's directory) before each push, and run what it prints — the related
domain tests and `tsc --noEmit -p .` for `packages/domain`, plus the repo's
`check-*.sh` gates. The suites under this repo's `CI suites` config key run in
CI on the PR; do not run them locally.

**The shell gate applies even though this slice is mostly TypeScript.**
`scripts/check-shell-lines.sh` refuses a PR whose shell under `skills/` grew
against its merge base. The SKILL.md addition for D14 is markdown, not shell,
so it does not count against this gate — but if you touch `plot-deliver.sh`
itself (only if you find the phase-admission check above actually needs a
fix), any growth must be paid for by removing an equal number of shell lines
elsewhere in the same change.

### Bookkeeping

Open the PR through the controller once the first commit exists:

```bash
skills/plot/scripts/plot-open-pr.sh          # on this branch
skills/plot/scripts/plot-open-pr.sh --draft  # while work is still moving
```

Never run `gh pr create` by hand. When the PR is created, append `→ #<number>`
to this branch's line in the plan's `## Slices` section
(`docs/plans/2026-10-12-design-work-proves-the-path.md`), under
`### The tracer delivery`.

### Scope guard

This branch owns:

- `packages/domain/src/rules/auto-deliver.ts` (`planAutoDeliver`, plus any
  small private helper the waits_on → plan lookup needs — keep it unexported
  unless a second caller appears)
- `packages/domain/test/auto-deliver.test.ts`
- `skills/plot-deliver/SKILL.md` (the Model Guidance row the plan's slice text
  names, and the new D14 standalone-delivery section)
- One changeset

**Do not touch** `packages/fleet/src/shared/auto-deliver.ts` or
`packages/fleet/test/unit/auto-deliver.test.ts` — the production wiring these
files hold is already correct for a multi-plan-per-pass return value and needs
no change; if you find a reason it does, report it rather than expanding scope
here.

**No other branch of this plan is open as of this brief.** This branch's own
prerequisite, `feature/a-tracer-plan-stays-in-design`, has no PR yet either
(check `/plot-pulse` before starting — it may have landed since this brief was
written). Re-check for a concurrent sibling before you start, since nothing
here is the live state at the moment you pick this up.

If you find something the plan did not anticipate, report it rather than
improvising outside scope.
