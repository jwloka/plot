## Implementation brief — the-fleet-closes-its-review-findings (wave: A dead agent gets a fresh agent)

- **Plan (canonical):** `docs/plans/2026-10-10-the-fleet-closes-its-review-findings.md` on `main`
- **Approved:** 2026-10-10, Jan Wloka, plan-PR #1499 merged
- **Branch:** `bug/a-dead-agent-gets-a-fresh-agent` (base: `main`)
- **Ends as:** one PR to `main`
- **Review of the code:** pr

No wave of this plan has merged yet. `bug/an-unknown-supervisor-keeps-the-scan`
(→ #1514), `bug/a-free-agent-reads-running` (→ #1527) and
`bug/the-gate-prints-its-tick` precede this wave on the plan's slice list but
none touches `ending-action.ts`, so this wave has no file collision with
them. `bug/a-released-plan-queues-nothing`, which comes after, reads
`endingAction`'s answers through the queue but does not change the function
— check its branch before you push if it is already in flight, to confirm it
has not grown a dependency on the table shape you are about to change.

### What to build

`endingAction` (`packages/domain/src/rules/ending-action.ts`) decides what
the supervisor's tick does about a desk whose worker ended. Two real cases
fall through its table to the default `leave` row today, and `leave` means
the slice sits there with nobody coming back to it:

1. **#1436 — a `quiet` ending with work beyond the claim.** `quiet` is the
   WorkerMonitor's verdict that the agent went idle: alive, no CPU across two
   passes, transcript silent. `endingTableAnswer` checks `holding-work`, then
   `FRESH_SESSION_ENDINGS` (`corrections-spent`, `turn-limit`), then
   `BOUND_ENDINGS` (`bound`, `unreadable`), then the five outright
   `NEEDS_PERSON_ENDINGS`, then `nothing-done`. `quiet` matches none of them,
   so it falls to the final `return 'leave'`. An agent that went idle with a
   commit beyond its claim, an open PR, or a dirty tree is holding real work
   on the desk, and `leave` abandons it exactly the way the `bound`/
   `unreadable` row was built not to.

2. **#1440 — a killed worker with no ending file.** A worker SIGKILLed (or
   one that predates this record) writes nothing to
   `.plot-worker.ending.json`. `readEnding(null)` answers `{ read: 'absent' }`,
   and every caller — `readNothingDoneCandidates` in
   `registryd.ts:1215-1228`, `readFreshAgentCandidates` — turns that into
   `ending: null`. The desk still reaches `endingAction`:
   `nothingDoneCandidateTrees` (`registryd.ts:1184-1187`) filters only on
   `!tree.isMain && !tree.registered && tree.planNamed` — no manifest, a plan
   names the branch, not the main checkout — which is precisely the shape a
   killed worker leaves (its manifest is gone, its ending file never
   written). Inside `endingTableAnswer`, `ending === null` fails every
   `readings.ending !== null && …` guard and fails the final
   `readings.ending !== 'nothing-done'` check (null !== 'nothing-done' is
   true), so it falls to `leave` too. There is currently no controller path
   that restarts a slice whose worker simply died.

### Decisions already settled — do not re-derive them

**Both cases take the `bound` row, per the plan's Design section — this is
not a new row, it is widening `BOUND_ENDINGS`' reach or its guard.** The plan
says: *"A worker that the fleet reads `failed` with no ending file (SIGTERM,
exit 143) gets an ending the tick can read, so the same row answers."* Read
literally this means: the killed-worker case should be turned into a `bound`-
shaped reading rather than threaded through `endingTableAnswer` as a third
`null`-handling branch. `boundBranchHoldsWork` already asks exactly the
question both cases need — commit beyond claim, open PR, or dirty tree — and
`BOUND_ENDINGS`' existing row already answers `release-claim` when none of
those hold and `start-fresh`/`needs-a-person` (by `priorFreshSessions`) when
one does. Two ways to reach that from here, and the plan does not pick
between them for you:

  - Add `'quiet'` to a set alongside `BOUND_ENDINGS` (or fold it into
    `BOUND_ENDINGS` itself) so `quiet` runs through the same
    `boundBranchHoldsWork` branch — `quiet` with nothing beyond the claim
    still has no work to protect, so `release-claim` is the right answer for
    it too, not just `start-fresh`/`needs-a-person`.
  - For the killed-worker case, decide upstream of `endingAction` (in
    `registryd.ts`, where `ending: EndingReason | null` is assembled from
    `FailedWatcher`/process readings) whether a `failed`-with-no-ending-file
    desk should be read as `ending: 'bound'` before it ever reaches the pure
    rule, since the rule itself is documented pure and reads no process
    state — it only ever sees what the caller already decided the ending
    was. Grep `registryd.ts` for where process liveness is read alongside
    `readNothingDoneCandidates`/`readFreshAgentCandidates` to find the join
    point; the plan's phrase *"gets an ending the tick can read"* points at
    writing or synthesizing that reading before the table, not at adding a
    fourth branch inside it.

Either way, **do not introduce a new `EndingActionVerdict` or a new top-level
`if` disconnected from `BOUND_ENDINGS`/`boundBranchHoldsWork`** — the whole
point of "the same row answers" is that `release-claim` vs `start-fresh` vs
`needs-a-person` for both new cases is decided by the existing
`boundBranchHoldsWork` + `priorFreshSessions` + `prMerged === 'merged'`
logic, not by new logic that happens to produce the same three outcomes by
coincidence.

**`priorFreshSessions` is shared per slice, not per ending reason — this
already holds and must not be re-scoped.** The rule's own doc comment is
explicit: one fresh session per slice, shared across every ending reason
that can trigger one. If `quiet` and the killed-worker case join
`BOUND_ENDINGS`'s row, they draw on the same counter `bound`/`unreadable`
already draw on. Do not give either case its own allowance.

**`prMerged === 'merged'` must still answer `leave` for both new cases.** The
existing `BOUND_ENDINGS` branch checks this first (`if (readings.prMerged ===
'merged') return 'leave';`) before even asking `boundBranchHoldsWork`. A
slice whose branch already merged has nothing to restart regardless of why
its worker ended — do not special-case either new ending reason around this
guard.

**Absent-is-not-false still applies to every reading you touch.**
`commitBeyondClaim`, `prOpen`, `dirtyTree`, and `prMerged`'s
`'unanswerable'` arms all point toward the non-destructive answer today
(the same arm as "yes"/"true"/"merged" is wrong — re-check: `'unanswerable'`
takes the same arm as `'yes'`/`true`/not-merged, i.e. toward NOT releasing
the claim). Whatever new wiring reads a killed worker's ending must not
introduce a path where a failed read of commit/PR/dirty-tree state defaults
toward `release-claim` — that would silently drop work a failed read simply
could not see.

### Done when

The plan's `## Done when` list for this wave:

- `endingAction` answers `start-fresh` for a first `quiet` ending with a
  commit beyond the claim.
- `endingAction` answers `start-fresh` for a killed worker with no ending
  file and a clean pushed branch (read: no ending file, but a commit beyond
  claim or similar signal of real work — "clean pushed branch" in the plan's
  phrasing means the branch has something on it worth not abandoning).

Lift the assertions a naive fix would pass without:
- `quiet` with **nothing** beyond the claim (no commit, no PR, no dirty
  tree) must still answer `release-claim` — a naive "quiet always gets a
  fresh session" fix fails this, because it is not what `bound`/`unreadable`
  do today and the plan asks for the same row, not a more generous one.
- A **second** `quiet` or killed-worker ending on the same slice (after a
  fresh session was already spent, by any of the five endings that share
  the counter) must answer `needs-a-person`, not a second `start-fresh`.
- A `quiet` or killed-worker ending whose branch's PR already merged must
  answer `leave`.
- A manifest-named desk (`hasManifest: true`) must still answer `leave`
  regardless of ending reason — this guard runs first in
  `endingTableAnswer` and nothing about this wave should move it.

Plus: `node skills/plot/scripts/board/plot-local-checks.mjs` and the commands
it prints must pass on this branch — run it before each push. The suites
listed under `CI suites` in `## Plot Config` run in CI only; do not run them
locally. `packages/domain/**` changes also need
`pnpm --filter @plot-pm/domain exec tsc --noEmit -p .` (one of the checks the
local-checks script already selects for a changed domain file — you do not
need to run it separately, just confirm the script picked it up).

This wave touches no `.sh` file, so `scripts/check-shell-lines.sh`'s ratchet
does not apply here.

### Bookkeeping

Open the PR through the controller once there is a real commit:

```bash
skills/plot/scripts/plot-open-pr.sh          # current branch
skills/plot/scripts/plot-open-pr.sh --draft  # while still moving
```

Do not run `gh pr create`. Push the first real commit as soon as it exists,
then append `→ #<number>` to this branch's line in the plan's `## Slices`
section (`### A dead agent gets a fresh agent` heading) once the PR opens.

### Scope guard

This wave owns `packages/domain/src/rules/ending-action.ts` and whatever
join point in `packages/fleet/src/server/entry/registryd.ts` synthesizes an
`EndingReason` for a killed worker with no ending file (if that is the path
you take — see Decisions above). It also owns that file's tests.

Siblings in flight on this plan, verified against the plan's `## Slices`
section at the time this brief was written: `bug/an-unknown-supervisor-keeps-the-scan`
(`scan-owner.ts`, `plot-fleetctl.sh`), `bug/a-free-agent-reads-running`
(`deskLoopAlive`-based reading in `plot-fleetctl.sh`/dispatch), and
`bug/the-gate-prints-its-tick` (`registryd-main.ts` writer selection). None
of the three touches `ending-action.ts`. `bug/a-released-plan-queues-nothing`,
later in the slice list, reads the queue's view of landed/not-landed slices
and may read `endingAction`'s callers but is not expected to change this
file — re-check its diff if it is already pushed by the time you start, since
two branches touching the same function in the same file cannot run in
parallel per the plan's Design note ("No two slices that share a file run in
parallel").

If you find something this brief or the plan did not anticipate — for
example, no clean join point in `registryd.ts` for synthesizing a `bound`-
shaped reading from a killed worker — report it rather than improvising
outside scope.
