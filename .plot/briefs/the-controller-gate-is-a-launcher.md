## Implementation brief — the-gates-are-launchers (wave: the controller gate)

- **Plan (canonical):** `docs/plans/2026-10-10-the-gates-are-launchers.md` on `main`
- **Approved:** 2026-10-10, Jan Wloka, plan PR #1494 merged
- **Branch:** `feature/the-controller-gate-is-a-launcher` (base: `main`)
- **Ends as:** one PR to `main`
- **Review of the code:** pr

Three waves of this plan are merged: the scaffold and bundle-commit gate
(PR #1520), the brief-name gate, and the state gate (PR #1540). `GATES` in
`packages/board/src/server/entry/gate.ts` currently holds three rows in this
order: `bundleCommitGate`, `briefNameGate`, `stateGate`. This wave adds the
fourth. `scripts/check-decision-count.sh pr` reads **49 at merge base, 49
now** — confirm against your own branch's merge base before you push; the
plan's target for this wave is **49 → 48**, and your PR's diff carries that
-1. `scripts/check-shell-lines.sh pr` reads **12488 at merge base** — this
conversion should net-reduce that number the way the two merged gates did.
The phase gate (`feature/the-phase-gate-is-a-launcher`, 48 → 47) is the one
remaining sibling, unclaimed as of this writing — not in flight, nothing to
collide with yet.

### What to build

Convert `skills/plot/scripts/plot-controller-gate.sh` (321 lines) into a
launcher that `exec`s `board/plot-gate.mjs` with the gate name `controller`,
mirroring `plot-state-gate.sh`'s shape exactly. Unlike the first three gates,
most of this decision already lives in the domain:
`controllerInvocation` in `packages/domain/src/rules/ci-suite.ts` (lines
117-235) already classifies `dispatch`/`approve`/`deliver`/`release`/`null`
from a command string, already handles the `.mjs` bundle names (`#1449`'s
glob/bundle half is done), already drops `--status`/`--dry-run`/`--help`/
`-h`, and already treats a loop body (`for s in a b; do plot-dispatch.sh $s;
done`) as a run. **This wave is not a rewrite — it is closing four gaps in
that rule, adding the new unpinned-merge rule beside it, and wiring both
through a fourth `gate.ts` row** that reuses the existing action-receipt
check and desk exemption.

### Decisions already settled — do not re-derive them

**What `controllerInvocation` already does is not this slice's job, and
re-deriving it risks breaking passing tests.** `packages/domain/test/ci-suite.test.ts`
covers the glob/read-carve-out/loop-body/`.mjs`-bundle/`--release`/`NO_ENDPOINT`
cases already. Read that file before touching `ci-suite.ts` — it is the
spec for what must keep passing, and the fixes below are additions to it,
not replacements.

**Gap 1 — #1341's `for` word-list is a false positive today, and the fix is
about the loop VARIABLE, not the loop keyword.** `controllerInvocation`
already reads `for s in a b; do plot-dispatch.sh $s; done` as `'dispatch'`
(correct — a real dispatch loop) by finding the script named literally in
the body. The plan's defect is a DIFFERENT shape: `for f in plot-deliver.sh
plot-plan-meta.sh; do cmp -s $A/$f $B/$f; done` — the gated script's name
appears only in the `for … in` WORD LIST, and the loop body never runs the
loop variable in command position (`"$f"`, `bash "$f"`, `./$f`). Today's
per-segment word scan sees `plot-deliver.sh` as a bare word anywhere in the
segment and misreads this as a dispatch of `deliver`. The fix: when a
segment opens with `for <var> in <words>; do <body>; done` (or the
multi-line `for`/`do`/`done` form), a gated-script word that appears only in
the `in`-list is not an invocation UNLESS the body itself runs `$<var>`,
`"$<var>"`, `bash $<var>`/`bash "$<var>"`, or `./$<var>`/`./"$<var>"` in
command position. The existing passing case (`plot-dispatch.sh` named
literally in the body) must still answer `'dispatch'` — this is additive
discrimination between "the body runs the loop variable" and "the body runs
something else while the list happens to name a gated script", not a
narrowing of the literal-in-body case.

**Gap 2 — the `--who` VALUE must be skipped before `NO_ENDPOINT` is
checked, and the plan's example shows why this matters even though `--who`
alone already works.** `ci-suite.test.ts:142` already proves
`plot-approve.sh --who jwloka x` is `'approve'` — a plain name after `--who`
causes no problem because it doesn't collide with a `NO_ENDPOINT` word. The
plan's row 103 is sharper: `node .../plot-approve.mjs --who --dry-run
some-slug` — here `--dry-run` is literally the VALUE of `--who` (an unusual
but valid reviewer name/token in this invented case), and today's flat
`words.some(word => NO_ENDPOINT[script]?.includes(word))` scan finds
`--dry-run` anywhere in `words` and wrongly answers `null`. The fix: before
testing against `NO_ENDPOINT`, drop the word immediately following an
unquoted `--who` (and, by the same logic, `--release`, which can carry an
arbitrary version string that might otherwise collide) from the set of
words `NO_ENDPOINT` is tested against — but keep walking the rest of the
command for `--dry-run` etc. appearing in their OWN position. Don't special
case the literal string `--dry-run`; skip positionally, by index relative to
`--who`/`--release`, so any value is covered.

**Gap 3 — an unquoted `#` starts a comment, and nothing after it is a
word.** None of the existing tests cover a trailing shell comment
(`bash plot-deliver.sh slug # --dry-run` from the plan's row 106 — the
comment text happens to contain a `NO_ENDPOINT` word, which must not matter
because it was never a word the shell ran). Strip everything from an
unquoted `#` to end of segment before splitting into words. `ci-suite.ts`
already has `withoutQuotes` in the same file (used by `ciSuiteRefusal`) —
reuse its quote-stripping to find the unquoted `#`, rather than writing a
second quote scanner. A quoted `#` (`echo "a # b"`) is not a comment marker
and must not truncate the segment.

**Gap 4 — the receipt-bypass refusal text names the wrong thing first, and
this is where #1458 M1 and L1 land.** Today's refusal
(`plot-controller-gate.sh:298-310`) prints the bundle path
(`node .../board/plot-deliver.mjs <slug>`) FIRST and the HTTP endpoint
second, with no `version` in the release case. #1458 M1's fix reverses the
order and gives each action its own named endpoint — `POST /api/approve`,
`POST /api/deliver`, `POST /api/release {"slug":"<slug>","version":"<version>"}`
(carrying `version`, closing L1 in the same edit) — with the bundle path
named only for `dispatch`/`continue`, which this gate does not gate (those
two already route through `plot-dispatch-command.mjs`/
`plot-continue-command.mjs` with no board, per `docs/...`'s existing
comment at `ci-suite.ts:84`). Write a test that runs the gate on the exact
command each refusal prints and asserts it answers exit 0 (or a different,
correctly-named refusal) — a refusal that tells you to run a command the
gate itself then blocks is the shape #1458 was measuring.

**Gap 5 — #1483 L5 is net-new: an unpinned `gh pr merge` / `plot-host.sh
pr-merge` must be refused outside a dispatch worktree, and the merge
pinning mechanism this points at already exists.** `plot-controller-gate.sh`
currently has a comment (lines ~38-41) explaining why `gh pr merge` is
deliberately NOT gated — "on a plan PR it IS the approval under `Review:
pr`, and neither has an endpoint to point at." That reasoning no longer
holds: `plot-approve.mjs` now merges a plan PR through `plot-host.sh
pr-merge --match-head <sha>` (confirmed present:
`skills/plot/scripts/plot-host.sh:3898-3908` parses `--match-head`), and
`packages/board/src/server/entry/merge.ts`'s `mergeAt` already implements
the pinned-merge workflow that `plot-ask.mjs merge <pr> <sha>` runs with no
board. So the gate's own comment is now describing a workflow with a real
endpoint. Add a new rule — in `ci-suite.ts` beside `controllerInvocation`,
or a new small sibling file in `rules/` if that reads cleaner — that refuses
`gh pr merge` and `plot-host.sh pr-merge` when NEITHER `--match-head` NOR
`--match-head-commit` appears in the command, UNLESS the call is from inside
a dispatch worktree (the same desk exemption the rest of this gate already
has — see "the desk exemption" below; a dispatched worker merging its own
slice's PR is not what this rule is for). The refusal names
`plot-ask.mjs merge <pr> <sha>`. This is the one new DECISION this slice
adds rather than a gap-fix in an existing one — write its unit tests
alongside `controllerInvocation`'s, and wire it into the same `controller`
gate row in `gate.ts` so one hook call answers both.

**The desk exemption and the action-receipt check are unchanged — reuse
them, don't reinvent them.** `plot-controller-gate.sh:214-234`'s desk
exemption (a call whose `git rev-parse --show-toplevel` is a linked worktree
is a dispatched worker's own call, not the master agent's) and
`action_receipt_clears` (the controller-receipt spend, parallel to the state
gate's receipt-spend from last wave but for a DIFFERENT file —
`record_action_receipt`/`action_receipt_clears` in `plot-state-receipt.sh`,
not the `receipt_clears` the state gate ported) both stay as behavior to
port into the entry, not to redesign. The state gate's brief warned against
conflating these two receipt mechanisms in the same file — this is where
the second one (`action_receipt_clears`) finally gets its TS port. Check
whether `gate.ts`'s existing `Refs`/adapter wiring from the state gate slice
already exposes a worktree-identity reading you can reuse before adding a
new one.

**`plot-controller-gate.sh`'s CI-suite arm (lines ~135-180, the
`plot-local-checks.mjs --ci-suite-refusal` call for an unattended agent at a
fleet desk) is part of THIS gate's shell file and must be preserved in the
port** — it's a second, unrelated decision bolted onto the same script
(gated on the desk exemption passing, i.e. only for a worker, never the
master agent), not a fifth row to add to `gate.ts`. Keep it reached the same
way it is today (`plot-local-checks.mjs`), just from inside `controllerGate`'s
`ask()` rather than from the shell.

### Done when

The plan's `## Done when` list is the specification (the row at
`docs/plans/2026-10-10-the-gates-are-launchers.md:161`, read together with
the defect table at lines 99-110 and the fix table at lines 118-122). Lift
these assertions because a naive port would pass without them:

- the `for … in` word-list case (#1341) answers `null`, while the existing
  literal-in-body loop case keeps answering `'dispatch'` — both in the same
  test file, so a regression in either direction is caught;
- the two-call receipt-bypass order (`plot-state-receipt.sh
  --unowned-action deliver s "r" && plot-deliver.sh s`) still answers
  `'deliver'` AND the refusal text (when it fires) names the two-call order,
  per the plan's row 102 — this is a refusal-TEXT assertion, not just an
  action-classification one;
- `--who --dry-run <slug>` (and the `--release` equivalent) answers the
  real action, not `null`, while a bare `--dry-run` with no preceding
  `--who`/`--release` still answers `null`;
- an unquoted `#` truncates the segment; a quoted `#` does not;
- `plot-appro?e.mjs` (and the `.sh` equivalent, already covered) resolves
  as a `.mjs` glob the same way a `.sh` glob does;
- the refusal for approve/deliver/release names the HTTP endpoint first,
  the escape second, carries `version` for release, and — proving the fix
  rather than asserting it in prose — running the gate on the exact command
  the refusal prints for each of the three actions answers exit 0;
- `gh pr merge <pr>` and `plot-host.sh pr-merge <pr>` with no
  `--match-head`/`--match-head-commit` are refused outside a dispatch
  worktree and allowed inside one; the same two commands WITH a pin are
  allowed everywhere; the refusal names `plot-ask.mjs merge <pr> <sha>`.

The existing shell test file (`test/reconcile/controller-gate.test.mjs`,
cited by the plan at line 120 as asserting the current refusal shape) stays
as the gate's contract test — update its refusal-text assertions for Gap 4,
and keep it spawning `plot-controller-gate.sh` directly so it still passes
once that script is a short launcher. Write the new TypeScript unit tests
for the `ci-suite.ts` additions and the new merge-pin rule alongside
`ci-suite.test.ts`, not instead of it.

Plus: register `controller` as the fourth `GATES` row in `gate.ts`. Drop
`plot-controller-gate.sh`'s own entry from `hooks/hooks.json` — superseded
by `plot-gates.sh controller` the way the three merged gates already are.
Re-run `plot-install-hooks.sh --verify` to prove the launcher still answers
through the real hook path. Update `skills/plot/scripts/README.md`'s
`plot-controller-gate.sh` row (`Kind` from `decision` to `launcher`,
`Replaced by` to `board/plot-gate.mjs`) using the phrasing the three merged
rows already use. **`board/plot-controller-invocation.mjs` is a separate
README row today, called only from `plot-controller-gate.sh`'s shell
(verified: no other caller in `skills/` or `build.mjs` beyond building it)
— whether it becomes dead weight once the shell gate is a launcher, or
whether `gate.ts`'s `controllerGate.ask()` keeps using it as its own lazy
import (matching how the other three gates import domain rules), is this
slice's call to make, not a given. If you retire it, update its build.mjs
entry and README row too; if you keep it, say in the PR why a fourth gate
importing a standalone bundle differs from the other three importing
`@plot-pm/domain/rules/*` directly.**

Run `node skills/plot/scripts/board/plot-local-checks.mjs` before each push
and run what it prints; the suites in the `CI suites` config key run in CI,
and a failure there comes back as a correction. List no full suite.

Name the shell gate in the same paragraph: `scripts/check-shell-lines.sh`
refuses a pull request whose shell under `skills/` is longer than at its
merge base (12488 lines, measured above). This conversion should
net-reduce it the way the two merged gate conversions did — you have
headroom, not a budget to spend elsewhere.

### Bookkeeping

Open the PR through the controller, never `gh pr create`:

```bash
skills/plot/scripts/plot-open-pr.sh          # the current branch
skills/plot/scripts/plot-open-pr.sh --draft  # while the work is still moving
```

When the PR is created, append `→ #<number>` to this branch's line under the
plan's `## Slices` section, on `main`. Push the first real commit as soon as
it exists.

### Scope guard

**Owned by this branch:** `skills/plot/scripts/plot-controller-gate.sh`
(becomes the launcher); `packages/domain/src/rules/ci-suite.ts`'s
`controllerInvocation` and its gap-fixes (Gaps 1-4 above); a new rule for
the unpinned-merge refusal (Gap 5), in `ci-suite.ts` or a new sibling file;
the action-receipt port/adapter addition (parallel to the state gate's
receipt-spend, but for `action_receipt_clears`) and its tests; the fourth
row in `packages/board/src/server/entry/gate.ts`'s `GATES` array; the one
dropped line in `hooks/hooks.json`; the `plot-controller-gate.sh` row (and,
if retired, the `board/plot-controller-invocation.mjs` row) in
`skills/plot/scripts/README.md`.

**Not owned here, and not touched:** `plot-state-receipt.sh` itself (stays
out of scope, as the state gate's brief already noted); the `state`
receipt-clear mechanism the previous wave ported (`stateTransitionRefusal`,
the `StateReceipts` port) — this wave's receipt work is the OTHER mechanism
in the same shell file, `action_receipt_clears`, and the two must not be
conflated; the already-merged `bundleCommitGate`/`briefNameGate`/`stateGate`
rows; the phase gate (`feature/the-phase-gate-is-a-launcher`), the one
remaining unclaimed sibling — verify at dispatch time, not from this brief,
if that has changed; the rest of `#1458` and `#1483`'s findings, which stay
on their own issues per the plan's note at line 116 (only M1, L1 and L5
moved into this slice).

If you find something the plan did not anticipate, report it rather than
improvising outside scope.
