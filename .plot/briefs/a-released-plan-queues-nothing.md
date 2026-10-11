## Implementation brief — the-fleet-closes-its-review-findings (wave: A released plan queues nothing)

- **Plan (canonical):** `docs/plans/2026-10-10-the-fleet-closes-its-review-findings.md` on `main`
- **Approved:** 2026-10-10, Jan Wloka, plan-PR #1499 merged
- **Branch:** `bug/a-released-plan-queues-nothing` (base: `main`)
- **Ends as:** one PR to `main`
- **Review of the code:** pr

Every earlier wave of this plan has merged: `bug/an-unknown-supervisor-keeps-the-scan`
(#1514), `bug/a-free-agent-reads-running` (#1527), `bug/the-gate-prints-its-tick`,
and `bug/a-dead-agent-gets-a-fresh-agent` (#1541, `be2033d1e`). None of them
touches the files this wave owns, so there is no collision to check.

### What to build

#1454: on 2026-10-10 the tick still printed three slices of **Released** or
**Delivered** plans held on `waits` — finished plans whose queue had nothing
left to offer, yet the supervisor kept reasoning about them every pass. The
plan's evidence cites `queue-reading.ts:263`, `:313`, `:328-333` (now
`packages/fleet/src/shared/queue-reading.ts`, same line numbers): `readQueue`'s
main loop (`:313 for (const plan of plans)`) walks **every** plan through
`queueOfPlan`/`planQueue` with no phase filter, and `planQueue` pushes one
`QueuedBranch` entry for every non-deferred, non-claimed, non-merged branch —
finished-plan branches included. That entry reaches `whyNotReady` and reads
`not-claimable` (or `waits`, if the branch also carries a `waits:` annotation),
never dropped before it reaches the queue at all.

Two things to build:

1. **A plan-phase filter ahead of `queueOfPlan`**, so a Released or Delivered
   plan contributes nothing to `slices` — no `briefPresent` git call, no
   `queuedHasLanded` host call, no entry for `whyNotReady` to hold on `waits`
   or `not-claimable`. The filter belongs beside the loop at
   `queue-reading.ts:313`, not inside `planQueue` — see **Decisions** below for
   why.
2. **`already-merged` reachable without a live ref.** Today `queue-reading.ts:332`
   only asks `queuedHasLanded` when `entry.claimable` — a slice of a
   *not-yet-finished* plan. A branch whose OWN PR merged after its plan was
   released is read from the PR index or `mergedAt` (never a ref: merging
   deletes it), per `landedSource`/`knownPrFor` in `known-pr.ts`. Confirm
   whether a finished-plan branch can still reach this path at all once the
   phase filter above drops the plan's slices from the loop before `landed` is
   computed — if the filter removes the plan entirely, this case may already be
   moot for *queue* purposes and the real question is whether some other
   reader (reconcile, board) still needs the PR-index-or-mergedAt answer for a
   finished plan's branch. Read the plan's own wording again before deciding:
   *"the queue drops slices of Released and Delivered plans before any landing
   is read, **and** a slice whose own PR merged reads `already-merged`"* — two
   clauses, possibly two call sites. Trace where #1454's original report
   found a Released-plan branch reading `waits` rather than `already-merged`,
   and fix the one that actually produces that symptom first.

### Decisions already settled — do not re-derive them

**`sliceVerdict` already answers `complete` for a Released/Delivered plan's
slice** (`eligible.ts:61` `FINISHED_PHASES = ['delivered', 'released']`,
tested at `:101` above the approval test). So `claimable` is already `false`
for every branch of a finished plan — the defect is not that `claimable` is
wrong, it is that the branch is still **read and carried into the queue at
all** to be held on a word (`not-claimable`, `waits`) that then prints on
every tick for a plan nobody can act on. **Do not touch `sliceVerdict` or
`FINISHED_PHASES`** — they already do their job; the filter this wave adds is
upstream of them, at the point that decides which plans even get asked.

**`blockingBranches` (`known-pr.ts:94-106`) already returns `[]` for a
finished plan**, because it requires `verdicts[first] === 'eligible'`, and a
finished plan's first incomplete slice verdict is never `eligible`. So the
PR-index/`mergedAt` fallback path (`landedWithoutListing`) already asks
nothing extra for a finished plan today — the cost this wave removes is in
the **main loop** (`queueOfPlan` + the per-branch `briefPresent`/
`queuedHasLanded`/`refused` reads at `:327-343`), not in the fallback. Don't
duplicate a phase check there; it is already correct.

**The filter is a plan-level skip, not a per-branch one.** A plan's phase is
one fact about the whole plan (`plan.phase`), read once before its slices are
walked — filter at the `for (const plan of plans)` loop (`:313`), the same
granularity `sliceVerdicts`/`FINISHED_PHASES` already use. Filtering per-branch
inside `planQueue` would mean threading the phase check through
`QueuedBranch` construction for no reason: every branch of a finished plan is
dropped, or none are.

**`readQueue` is explicitly a pure-reading, nothing-kept function** (see its
own doc comment, `:228-257`): "every reading is re-taken… there is nothing to
lose". The filter you add must stay a plain phase comparison against
`plan.phase`, read with no new host call and no new git call — this wave adds
no new `QueueWorld` member.

**Absence is not falsehood, still.** A plan whose phase is unreadable or
unexpected (neither in `FINISHED_PHASES` nor `'approved'`) must not be read as
finished by accident — a filter that treats "anything not literally `approved`"
as "skip" would silently drop a `design`-phase plan's slices from the queue's
accounting rather than letting `sliceVerdicts` answer `blocked`/`not-claimable`
for them as it already does. Filter on `FINISHED_PHASES.includes(plan.phase)`
(or reuse/export that allowlist from `eligible.ts` — check whether it is
already exported before adding a parallel list), not on a negation of
`'approved'`.

### Done when

The plan's `## Done when` list for this wave:

- The queue holds no slice of a Released plan on `waits` (or any other hold —
  the plan's one-line summary names `waits` because that is what the
  2026-10-10 tick showed, but the fix is "no slice of a finished plan enters
  the queue at all", not "only suppress the `waits` hold specifically").

Lift the assertions a naive fix would pass without:
- A **Delivered** plan's branch must be dropped the same way a Released one
  is — the plan's own wording and `FINISHED_PHASES` both name two phases; a
  fix that only checks `=== 'released'` passes the one case in the plan's
  motivation and fails the other silently.
- A plan with a mix of finished and unfinished slices does not exist in this
  estate's model (phase is plan-level), but confirm no fixture or code path
  assumes per-slice phase — if one is found, report it rather than
  improvising a per-slice phase filter.
- An **approved** plan's otherwise-identical branch (same `waits:` shape,
  same no-ref state) must still reach the queue and hold as it does today —
  the fix must not become a blanket "no `waits` hold ever fires," only a
  phase-scoped skip.
- A plan whose phase is missing, empty, or an unrecognized string must not be
  treated as finished — it keeps reaching `sliceVerdicts`/`whyNotReady` as
  before, same as the "absence is not falsehood" guard above states.
- Run the existing `queue-reading.test.ts` and `queue.test.ts` suites and
  confirm nothing that currently exercises an `approved`-phase plan changes
  answer — this wave must be invisible to every existing case that isn't
  about a finished plan.

Plus: `node skills/plot/scripts/board/plot-local-checks.mjs` and the commands
it prints must pass on this branch — run it before each push. The suites
listed under `CI suites` in `## Plot Config` run in CI only; do not run them
locally. This wave touches `packages/fleet/src/shared/queue-reading.ts` (and
possibly `packages/domain/src/rules/queue.ts` or `eligible.ts` if the allowlist
needs exporting), so also run
`pnpm --filter @plot-pm/fleet exec vitest related --run {changed}` and
`pnpm --filter @plot-pm/fleet exec tsc --noEmit -p .` — `plot-local-checks.mjs`
selects these for you from the changed paths; this just names which gates in
`## Plot Config` apply.

This wave touches no `.sh` file, so `scripts/check-shell-lines.sh`'s ratchet
does not apply unless the fix ends up touching a shell caller of the queue
(it should not — `readQueue` is TypeScript-only, called from
`packages/fleet/src/server/entry/registryd.ts`).

### Bookkeeping

Open the PR through the controller once there is a real commit:

```bash
skills/plot/scripts/plot-open-pr.sh          # current branch
skills/plot/scripts/plot-open-pr.sh --draft  # while still moving
```

Do not run `gh pr create`. Push the first real commit as soon as it exists,
then append `→ #<number>` to this branch's line in the plan's `## Slices`
section (`### A released plan queues nothing` heading) once the PR opens.

### Scope guard

This wave owns `packages/fleet/src/shared/queue-reading.ts` (the plan-phase
filter ahead of the main loop) and, only if the allowlist needs to travel,
a small export change to `packages/domain/src/rules/eligible.ts`
(`FINISHED_PHASES`) — read-only reuse, not a redesign of
`sliceVerdict`/`sliceVerdicts`. It also owns the tests for both files that
this wave's cases touch.

No sibling wave of this plan remains open — all four earlier waves merged
(`be2033d1e` is the most recent). If a later wave of this plan has since been
started by the time you pick this up, re-check its branch for a collision
with `queue-reading.ts` before pushing; none was open at the time this brief
was written.

If you find something this brief or the plan did not anticipate — for
example, a reader outside the queue (reconcile, board) that depends on a
finished plan's branch still appearing in `readQueue`'s output — report it
rather than improvising outside scope.
