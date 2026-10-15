## Implementation brief — a-desk-started-by-plot-dispatch (wave 1: Reproduce)

- **Plan (canonical):** [docs/plans/2026-10-15-a-desk-started-by-plot-dispatch.md](../../docs/plans/2026-10-15-a-desk-started-by-plot-dispatch.md) on `main`
- **Approved:** 2026-10-15, Jan Wloka, plan-PR #1776 merged
- **Branch:** `bug/a-free-desk-block-reproduces` (base: `main`)
- **Ends as:** one PR to `main`
- **Review of the code:** pr (per plan `Review:` field)

This slice is marked `<!-- spike -->` — a probe, not the fix. Its one job is a
failing test that names which of the plan's four open questions is the real
cause. The Repair slice, `bug/a-free-agent-desk-is-continuable`, waits on this
branch (`<!-- waits: bug/a-free-desk-block-reproduces -->`) and cannot start
until this one lands, because the repair this plan picks depends on what this
test finds.

### What to build

A failing `node --test` case that reproduces: a free agent handed a slice by
fleetd, which then blocks, gets refused by the continue path with
`no-manifest` — even though `continueTarget`'s fallback in
`packages/domain/src/rules/continue-target.ts` exists specifically to catch an
`unnamed` manifest with a `blocked`/`holding-work` ending for the right
branch.

The measured incident (plan Motivation, issue #1773): `plot-dispatch.sh
--start 2` started `free-03614ddf` and `free-1cb1a58d`; `free-7f744c29`
followed. fleetd handed each a slice. `free-7f744c29` failed to start its
prompt three times between 15:47Z and 15:53Z on
`feature/plan-and-story-cards-show-type-and-owner` (`claude -p` exited 1
during an account change), wrote `PLOT-BLOCKED.md`, and ended.
`plot-continue-command.mjs feature/plan-and-story-cards-show-type-and-owner
<answer>` then refused `no-manifest`, and `POST /api/continue` refused with
the same reason — with a real unanswered question sitting on the desk and no
controller able to resume it.

Your test should drive the actual reading the fallback consumes
(`ContinueTargetReading` — `manifest`, `ending`, `question`, `loop`,
`loopWaitsFree`) rather than mocking `continueTarget` itself, because the bug
is in what gets fed to the rule, not in the rule's own logic (the rule's own
branch coverage is already 100% per the 2026-10-01 plan below). Point the
test at whichever layer actually produced the wrong reading for
`free-7f744c29` — that is the open question this slice exists to close.

### The decisions the plan settles — do not re-derive them

**The fallback already exists and is covered.** `continueTarget` added a
fallback for exactly this shape on 2026-10-01
([a-desk-and-its-manifest-name-each-other](../../docs/plans/2026-10-01-a-desk-and-its-manifest-name-each-other.md),
slice `bug/a-continued-loop-carries-its-manifest`, PR #1256): an `unnamed`
manifest plus an `ended`/`blocked`-or-`holding-work` reading for the asked
branch continues by *writing* a manifest instead of refusing. Do not
re-implement this fallback or propose a fifth repair — the plan's Design
section already narrows the fix to two candidates (record the join at
hand-off, or resolve by checked-out branch), and this slice's job is to
determine *why the existing fallback didn't fire*, not to design a new one.

**"Absent is not false" — carried over from the same rule's own doc
comment.** `continueTarget`'s JSDoc is explicit: an ending the caller could
not read (`unreadable`) or never wrote (`absent`) answers `no-manifest`,
never `write`. If your reproduction finds the ending record was
absent/unreadable rather than wrong-branch or wrong-reason, that is still a
valid answer to open question 2 — it is not a bug in the rule, it is
evidence about what `free-7f744c29` actually wrote (or failed to write).
Don't read an absent ending as proof the rule is broken.

**Four open questions gate the Repair slice — answer at least one with
evidence, not speculation:**
1. What did `free-7f744c29` hold when refused: `unnamed`, `several`, or a
   manifest naming the wrong worktree?
2. What did its ending record actually read — branch and reason — given a
   start failure (exit 1, three times) may not write `blocked` or
   `holding-work` at all?
3. Does fleetd's hand-off to a free agent write the branch into the
   manifest at all, and if so, where is it lost before the continue asks?
4. Does #1743 (an ended desk reads as blocked) change which ending reasons
   the fallback should accept?

A test that merely re-confirms `continueTarget`'s existing unit coverage
(e.g. feeding it a synthetic `unnamed` + `blocked` reading and asserting
`write`) does **not** satisfy this slice — that path already passes today.
The failing test must exercise the real hand-off-to-continue path (fleetd →
manifest write/non-write → ending write → continue read) so it fails for the
same reason `free-7f744c29` did.

**Layering:** the rule itself (`continueTarget`) stays in
`packages/domain/src/rules/continue-target.ts`; if your reproduction finds
the bug is in what an adapter reads and hands to the rule (not in the rule),
say so explicitly and point at the adapter file and line — per `CLAUDE.md`'s
layering rule, the fix (next slice) goes wherever the wrong reading
originates, not necessarily in the domain.

### Done when

Plan's `## Done when` is not yet written (plan has none under that heading
beyond the slices themselves — treat "Done when" for *this slice* as: a
failing test exists that reproduces the `no-manifest` refusal for a free
desk's blocked slice, and it names which open question (1–4 above) it
answers, in a comment or the test's own description.

Plus the repo's gates:
- Run `node skills/plot/scripts/board/plot-local-checks.mjs` before each push
  and run what it prints — the tests that name your changed files, the
  related package's tests/typecheck, and the gate scripts. Do not run the
  full `CI suites` list (`pnpm run test:e2e`, `test:contracts`, `test:board`,
  domain coverage, `test/reconcile/*.test.mjs`) — that runs in CI on the PR.
- `scripts/check-shell-lines.sh` refuses a PR whose shell under `skills/`
  grew past its merge base. This slice is likely pure TypeScript/test, but if
  you touch any `.sh` file (e.g. to add a shell-side reproduction), that
  growth must be paid for in the same change — remove shell elsewhere, or
  move the logic into the domain and reach it through a bundle.

### Bookkeeping

- Open the PR through the controller once the first real commit exists:
  `../plot/scripts/plot-open-pr.sh` (or `--draft` while still moving). Do not
  run `gh pr create`.
- When the PR is created, append `→ #<number>` to this branch's line under
  `## Slices` → `### Reproduce` in the plan file.
- Push the first real commit as soon as it exists — don't hold it locally.

### Scope guard

This branch owns: the new reproduction test (location is your call — likely
`packages/fleet/test/` near the hand-off/continue machinery, or
`packages/domain/test/rules/continue-target.test.ts` if the gap is in the
reading it's given) and any narrow instrumentation needed to observe the real
manifest/ending state during a hand-off.

This branch does **not** own: `continue-target.ts`'s rule logic (already
correct per its own coverage), the repair itself (that's
`bug/a-free-agent-desk-is-continuable`, which is blocked on this branch and
must not start work until this one's findings land), or anything in
`packages/board/src/server/continue.ts` beyond what's needed to observe —
not fix — the bug.

No other branch is in flight against this plan's territory right now (the
Repair slice is waiting, not started). If you find something the plan did
not anticipate — e.g., a fifth candidate cause outside the two repairs the
Design section names — report it rather than improvising a fix outside this
slice's scope.
