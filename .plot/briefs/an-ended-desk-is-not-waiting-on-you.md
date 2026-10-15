## Implementation brief — a-desk-that-ended-cleanly-at (wave 2: Waiting on you)

- **Plan (canonical):** [docs/plans/2026-10-15-a-desk-that-ended-cleanly-at.md](../../docs/plans/2026-10-15-a-desk-that-ended-cleanly-at.md) on `main`
- **Approved:** 2026-10-15, Jan Wloka, plan-PR #1744 merged
- **Branch:** `bug/an-ended-desk-is-not-waiting-on-you` (base: `main`)
- **Ends as:** one PR to `main`
- **Review of the code:** per repo convention (plot-review gate on `main`)

Wave 1 (`bug/a-clean-wait-end-writes-no-marker`, PR #1748) merged 2026-10-15. This branch waits on nothing and nothing waits on it.

### What to build

On 2026-10-15 two desks (`free-04e1f562`, `free-eb358032`) showed in *Waiting on you* as "2 stopped agents" with the row text "no manifest names this desk, idle, checked…". Both loops had ended at the free-wait bound with no slice offered, both slices' PRs had merged (#1717, #1718), and both trees were clean. Neither desk owed a person anything.

This wave decides, in the domain, which desks belong in *Waiting on you*, and words the row from the ending record. A desk that ended cleanly (the loop reached the wait bound, no slice offered) with no unlanded work, no dirty tree and no real `PLOT-BLOCKED` question owes nothing: it is reapable and leaves the section. While the desk exists, its row reads "ended after <h> h with no slice offered" and names the next action ("reaped on the next pass"). The plan is canonical; this brief is orientation.

### Settled by wave 1 — do not re-derive

**Wave 1 fixed the marker, not the row.** The marker came from a stale `.plot-worker.ending.json` that an earlier cycle left on the desk: the fresh-agent step read it as the current ending, and `needsPersonMarker('blocked', …)` (`packages/domain/src/rules/ending-action.ts`) composed the generic "the agent declared itself blocked" text. #1748 removes that file in `resetOnto` (`adapters/trees/trees-git.ts`) and on an `ok` declaration (`adapters/desk/desk-fs.ts`). Do not touch those two writers, `ending-action.ts`'s table, or `agent-loop.ts` ROW 2; the wave-1 brief closed each with a trace.

**`agentLoop` ROW 2 writes nothing by design** (`workflows-agent-loop.test.ts` asserts `writes` is `[]`). Do not add a `reason: 'bound'` write there to feed this wave.

### Measure first — three discrepancies the plan does not settle

1. **What the motivating desks read, as a state.** *Waiting on you* lists a registry entry only where `isBrokenState` holds (`packages/board/src/contract/schema.ts:3673`): `stalled`, `failed` or `unknown`. `finished`, `ended`, `none` and `elsewhere` appear in no section. "2 stopped agents" therefore means those desks read one of the three. Find which (a pulse reading, `.plot/state/last-pulse.json`, or a fixture built from the plan's description) before choosing where the fix goes. A fix at the wrong layer passes its unit test and never moves the row.
2. **Where the ending record is read.** The plan says `.plot-worker.ending.json` records reason `bound` for these desks, while ROW 2 writes no ending. Some other path writes it (the log line is in `packages/fleet/src/server/entry/worker-loop.ts`). Name the writer, and read how `entities/ending.ts` and `rules/desk-lifecycle.ts` see a `bound` record, before writing a rule that depends on it.
3. **`unplaced` is a person exit today.** `deskState` returns `unplaced` for any desk no manifest names (`rules/desk-lifecycle.ts`, `if (!readings.manifestKnown) return 'unplaced'`), and `unplaced`'s exit is `person`, "no manifest names this desk and no recognised name places it". That check runs before any marker or merge reading. A clean ended desk may stay a person exit after wave 1 for this reason alone. The row text the motivating desks showed comes from `unnamedDeskLabel` (`rules/desk-manifest.ts:260`, rendered at `rows.tsx:2499`).

Carried-over rules: **absent is not false** (a missing ending record says nothing and must not read as a clean end), and **`mergedAt` is the only "did it land" answer** (`rules/reapable.ts` already reads it; add no ancestry check).

### Done when

The plan's two slice lines are the specification: the domain rule and the row text read the ending record; a clean ended desk with no unlanded work leaves *Waiting on you*. Assertions that a naive implementation would pass without:

- **A desk that ended at the bound but holds unlanded work, a dirty tree, or a real `PLOT-BLOCKED` question stays in the section.** Without this, hiding every `bound` ending passes the happy-path test and buries work.
- **A desk with no ending record at all keeps its current placement.** Catches absent being read as clean.
- **The decision is a domain property asserted in a unit test** (`CLAUDE.md`, *Every rendered state is a domain property*), with the row text produced by the domain and printed by the component. One browser test proves the row is absent from *Waiting on you*; the decision itself is not made in `.tsx`.
- Arrow functions for every function you write, TSDoc that states behaviour only, no `Wave` vocabulary added for what is a `Slice`.

Run `node skills/plot/scripts/board/plot-local-checks.mjs` before each push and run what it prints. The suites in the `CI suites` key run in CI. No full suite locally, and no `test:board` while the operator's board is open.

Gates: add a changeset (description first, `bumps:` block last, package `plot`). Commit no rebuilt `board-server.mjs`. If a `.sh` file is touched, `scripts/check-shell-lines.sh` requires an equal removal of shell elsewhere in the same change.

### Bookkeeping

Open the PR with `skills/plot/scripts/plot-open-pr.sh` (add `--draft` while the work moves); never `gh pr create`. Append `→ #<number>` to this branch's line under `### Waiting on you` in the plan's `## Slices`. Push the first real commit as soon as it exists.

### Scope guard

This branch owns the board's *Waiting on you* classification and row text: `packages/domain/src/rules/desk-lifecycle.ts` and `desk-manifest.ts`, their tests, `packages/board/src/app/lib/agent-rows/` (`working-agents.ts`, `rows.tsx`, `sections.ts`), and the server fields in `packages/board/src/server/fleet.ts` that feed them.

Out of scope: the marker writers wave 1 settled (above), and the plan's Open Questions on fleetd at `agents=0` and on `unregistered` / `nothing-done` endings. Record the answer to the fleetd question in the plan as the Approach asks (supervisor starts an agent, or it does not and a follow-up is filed). Measure the other clean endings before widening scope.

No other branch is in flight on this plan. If the measurements above contradict the plan, report it rather than improvising.
