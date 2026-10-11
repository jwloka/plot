## Implementation brief — the-fleet-closes-its-review-findings (wave: A failed delivery retries)

- **Plan (canonical):** `docs/plans/2026-10-10-the-fleet-closes-its-review-findings.md` on main
- **Approved:** 2026-10-10, Jan Wloka, plan-PR #1499 merged
- **Branch:** `bug/a-failed-delivery-retries` (base: `main`)
- **Ends as:** one PR to main
- **Review of the code:** PR

This is slice 8 of 13. No sibling branch has touched `auto-deliver.ts`,
`in-flight-store.ts` or the board's `machine-reading.ts` yet, so there is
no live collision to check for on these files.

### What to build

Issue #1453, five findings against the fleet's unattended delivery path
(`packages/fleet/src/shared/auto-deliver.ts`):

1. **M1 — delivery marks never expire on failure.** `pruneDelivering`
   (`auto-deliver.ts:321-343`) only retires a slug from the in-flight set
   when the plan's phase has moved past `approved`, or when
   `allSlicesMerged` no longer reads `merged`. A delivery that starts,
   then fails for a reason neither of those catches — `plot-deliver.sh`
   exits non-zero while the plan still reads `approved` with every
   branch merged — leaves the slug `approved` and `merged` forever, so
   `pruneDelivering` never retires it and `planAutoDeliver` never tries
   it again (`inFlight.has(slug)` keeps excluding it at `:270`). The mark
   is renewed every pass at `:598-610` (`runAutoDeliverPass`), so it does
   not even expire on the 90 s TTL — a live daemon keeps re-stamping a
   mark for a delivery that already died. Give a failed delivery a way
   to fall out of `inFlight` so the next pulse retries it.
2. **M2 — no test proves the `fleetAutoWrites` wiring.**
   `auto-writes.test.ts` mocks `auto-dispatch.js`, `auto-deliver.js`,
   `machine-reading.js`, `fleet-settings-store.js` and `registry.js` —
   every module `fleetAutoWrites` imports — so it proves the pass calls
   dispatch then deliver on the mocks, never that the real
   `runAutoDeliverPass` export is the thing wired at
   `registryd-main.ts:2093`. A rename or a signature change on either
   side would not fail this test. Add a test that imports the real
   `auto-deliver.js` (no mock on it) and asserts `fleetAutoWrites` calls
   the actual `runAutoDeliverPass`, not a stand-in.
3. **L1 — `planAutoDeliver` is a pure rule living outside the domain.**
   It takes values in, returns values out, touches no disk and no clock
   (`auto-deliver.ts:258-283` and its docstring say so explicitly) — the
   same shape `planAutoDispatch` already has in
   `packages/domain/src/rules/auto-dispatch.ts`. Move `planAutoDeliver`,
   `pruneDelivering`, `planSlug`, `joinKey` and `landedBranches` into a
   new `packages/domain/src/rules/auto-deliver.ts`, and have
   `packages/fleet/src/shared/auto-deliver.ts` import them rather than
   define them. The impure half — `runAutoDeliver`, `releaseRefs`,
   `maybeAutoDeliver`, `runAutoDeliverPass`, and the `fs`/`scriptsOf`
   imports — stays in the fleet package exactly where it is.
4. **L2 — the board's `machine-reading.ts` has no caller.**
   `packages/board/src/server/machine-reading.ts` exports `readMachine`;
   grep the board package for any import of this file's path and find
   none — `supervisor-reading.ts` only *mentions* `machine-reading.ts` in
   a comment, it does not import it. The fleet package has its own,
   separate `packages/fleet/src/shared/machine-reading.ts`, which
   `auto-writes.ts` does import and which stays. Delete the board's dead
   copy and nothing that references it.
5. **L3 — the in-flight file is written every scan, not only on
   change.** `writeInFlight` (`in-flight-store.ts:210-246`) runs once per
   `runAutoDeliverPass` call regardless of whether the pruned-plus-newly-
   started set differs from what was already on disk — a write, a
   temp-file create and a `rename` every ~5 s pulse even when delivery
   has nothing to do. Skip the write when the set to persist is
   unchanged from what `readInFlight` just reported for this pass.

### The decisions the plan settles — do not re-derive them

**M1's fix is "give failed deliveries a way out of `inFlight`," not "make
`pruneDelivering` smarter about merge state."** The naive read of M1 is
that `pruneDelivering` is missing a case in its merge-state check — it
is not. The real gap is that nothing EVER TELLS `pruneDelivering` that a
started delivery failed; the function only sees the pulse (phase +
merge state), and a failed `plot-deliver.sh` run changes neither. Do not
try to infer failure from merge state — there is no merge-state signal
for "the script exited non-zero." The fix has to come from
`runAutoDeliver`/`runAutoDeliverPass` observing the spawn's own exit and
feeding that back into what gets persisted as still-in-flight, or from
bounding how many consecutive passes a mark may be renewed before it is
allowed to lapse regardless of merge state. Either shape is open — the
plan does not commit to one — but it must act on the DELIVERY's outcome,
not on a reinterpretation of the merge-state rule, which is correct as
it stands (`allSlicesConfirmed`, not `allSlicesMerged`, is what keeps
this path from sticking on a subject-proven-but-unconfirmed merge — see
the long comment at `auto-deliver.ts:255-266` — and that mechanism is
untouched by this finding).

**`planAutoDeliver` moves to the domain; it does not get folded into the
four-reader corpus comparison.**
`packages/domain/corpus/deliverable.corpus.test.ts` already names
`planAutoDeliver` as "the fourth" reader of "is this plan deliverable,"
and says explicitly: *"THE FOURTH IS DELIBERATELY EXCLUDED FROM THE
EQUALITY... Folding it into this comparison would force one of the two
to move and destroy the protection — the disagreement is the feature."*
`planAutoDeliver` is stricter on purpose (it additionally requires
`landedBranches(plan) > 0`, see `auto-deliver.ts:155-176`) because it
runs unattended and chains to an unreversible ref deletion, where
`allSlicesMerged`/`allSlicesConfirmed` correctly answer yes for an
all-deferred plan a person is choosing to deliver by hand. Moving the
*file* `planAutoDeliver` lives in does not touch this exclusion — the
corpus test imports `planAutoDeliver` by whatever path it resolves to
after the move (update the import, change nothing about what the test
asserts or skips).

**The move follows `auto-dispatch.ts`'s precedent exactly, including
what stays behind.** `packages/domain/src/rules/auto-dispatch.ts` is the
existing sibling: pure planners (`planAutoDispatch`, `freeAgentCount`,
`mergedBranches`, …) in the domain, while `maybeAutoDispatch` — the
function that actually spawns — stays in
`packages/fleet/src/shared/auto-dispatch.ts`. `auto-deliver.ts`'s own
docstring already calls `maybeAutoDeliver` "the mirror of
`maybeAutoDispatch`" — so the split line for delivery is the same split
line dispatch already drew: `planAutoDeliver`, `pruneDelivering`,
`planSlug`, `joinKey`, `landedBranches` and the `AutoDeliverPlan` /
`PlanAutoDeliverInput` types go to the domain; `runAutoDeliver`,
`releaseRefs`, `maybeAutoDeliver`, `runAutoDeliverPass` and every `fs`,
`scriptsOf`, `recordActionReceipt`, `startBoardRun` import stay in
`packages/fleet`. `packages/domain/src/adapters/` is the only place the
domain may import outside `zod` — none of this moving code needs an
adapter import, so none of it moves there.

**L2's board `machine-reading.ts` and the fleet's
`machine-reading.ts` are two different files with the same name — do
not delete the one `auto-writes.ts` actually uses.** `grep -rn
"machine-reading" packages/` turns up both; only
`packages/fleet/src/shared/machine-reading.ts` has a real import
(`auto-writes.ts:6`). The board's copy at
`packages/board/src/server/machine-reading.ts` is mentioned only in a
comment in `supervisor-reading.ts`, never imported. Deleting the wrong
one breaks the fleet's auto-writes pass; deleting the right one removes
genuinely dead code with no behaviour change.

**Carried over from the sibling slices, unchanged: a missing or
unreadable file answers "ask the host"/"start nothing," never an empty
success.** `readInFlight`'s own docstring states the rule this finding
must not weaken: *"an unreadable file answers `null`... and `null` must
start NOTHING."* L3's "skip the write when unchanged" must compare
against what `readInFlight` returned for THIS pass, not assume "no file
yet" means "nothing to write" — a first-ever delivery mark still needs
to land on disk even though there was nothing there before.

### Done when

The plan's `## Done when` list does not name this slice directly — its
own checklist items belong to slices 1-5. For this slice, lift the
assertions from the findings above, because a change that merely "looks
right" would pass without them:

- A test where a delivery mark is in flight, the pulse still reads the
  plan `approved` with every branch `merged`, and the delivery is known
  to have failed — asserts the slug is retired (available to
  `planAutoDeliver` again on the next pulse) rather than renewed
  forever.
- A test on `fleetAutoWrites` that does NOT mock `auto-deliver.js` —
  asserts the real `runAutoDeliverPass` is what gets called, not a
  stand-in function with the same name.
- `planAutoDeliver`, `pruneDelivering`, `planSlug` and `landedBranches`
  importable from `packages/domain/src/rules/auto-deliver.ts`, with
  their existing unit tests in `packages/fleet/test/unit/auto-deliver.test.ts`
  still green against the new import path, and
  `deliverable.corpus.test.ts` still passing with its exclusion comment
  intact and accurate.
- `grep -rn "server/machine-reading" packages/board` returns nothing
  after the delete, and `packages/fleet/src/shared/machine-reading.ts`
  is untouched and still imported by `auto-writes.ts`.
- A test where two consecutive `runAutoDeliverPass` calls produce the
  same in-flight set — asserts `writeInFlight` (or its caller) performs
  only one actual file write across both calls, and a test where the set
  does change still writes.

Plus: a `plot` patch changeset (description first, `bumps:` block last —
see root `CLAUDE.md` § Versioning) since this changes shipped TypeScript
behind the board/fleet bundles. Run
`node skills/plot/scripts/board/plot-local-checks.mjs` from the repo root
before each push and run what it prints — it resolves the related tests
(`packages/domain`, `packages/fleet`, `packages/board`), typecheck, and
the gate scripts for whatever this branch actually touches. The suites
under the `CI suites` config key run in CI on every PR; don't run them
locally, and don't list them as a gate here.

This slice touches no file under `skills/`, so
`scripts/check-shell-lines.sh`'s shell-line ratchet does not apply to it
— nothing here needs to be paid for elsewhere. If an edit does end up
touching a `.sh` file under `skills/plot/scripts/`, growth there must be
paid for in the same change.

### Bookkeeping

Open the PR through the controller once the branch has its first real
commit:

```bash
skills/plot/scripts/plot-open-pr.sh          # current branch, or
skills/plot/scripts/plot-open-pr.sh --draft  # while work is still moving
```

It reads this plan, titles the PR from this wave's heading ("A failed
delivery retries"), and puts the plan + this brief in the body. Do not
run `gh pr create` directly. Once the PR number is known, append
`→ #<number>` to this branch's line under the plan's `## Slices` →
"A failed delivery retries" heading (currently no `→ #N` yet) in the
same commit or a follow-up to the plan file.

### Scope guard

This branch owns `packages/fleet/src/shared/auto-deliver.ts`,
`packages/fleet/src/shared/in-flight-store.ts`,
`packages/fleet/test/unit/auto-deliver.test.ts`,
`packages/fleet/test/unit/auto-writes.test.ts`, a new
`packages/domain/src/rules/auto-deliver.ts` and its test, and the delete
of `packages/board/src/server/machine-reading.ts`. It does not touch
`packages/fleet/src/shared/auto-dispatch.ts`,
`packages/fleet/src/shared/machine-reading.ts` (the one that stays), or
`packages/domain/src/rules/auto-dispatch.ts` — those are read-only
precedent and reference here, not edit targets.

No other branch in this plan has started work on these files as of this
brief. If you find a change this plan did not anticipate — for example,
a fourth `inFlight`-reading caller that assumes the current never-expire
behaviour — report it rather than expanding this slice's scope to cover
it.
