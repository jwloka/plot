## Implementation brief — the-fleet-writes-the-design (wave: The spec rows)

- **Plan (canonical):** [docs/plans/2026-10-12-the-fleet-writes-the-design.md](../../docs/plans/2026-10-12-the-fleet-writes-the-design.md) on `main`
- **Approved:** 2026-10-13, jwloka, plan-PR #1608 merged
- **Branch:** `feature/the-board-shows-the-spec-run` (base: `main`)
- **Ends as:** one PR to `main`
- **Review of the code:** per repo convention (PR review)

This branch `<!-- waits: feature/waiting-on-you-shows-a-failed-verification -->`, and that wait is **already satisfied**: the sibling branch merged and its `PlanLevelRow`/`verificationRows`/`sectionCount` machinery is live on `main` now. This slice is no longer blocked — it is the one remaining consumer the sibling's own design anticipated.

### What to build

`/api/fleet` already carries a `design` field (`DesignStatusSchema`, read via `designPayload(readDesignStatus(...))` at `packages/board/src/server/fleet.ts:7204`) — the halt flag, running plans, per-plan refusals, and `rows` of `{ kind: 'spec', plan, reason, log, restart, stopped, halted }` for a plan whose spec run failed or whose spec branch has no PR. **Nothing reads it.** The schema's own comment next to the `design` field says so: *"The board renders no row from it yet."*

Meanwhile `packages/board/src/app/lib/agent-rows/plan-level-row.tsx` already defines `PlanLevelRow` with `kind: 'verify' | 'spec'`, and its own doc comment names `spec` as *"`the-fleet-writes-the-design`'s design-run rows, a named consumer in an adjacent plan and left unpopulated by this slice"* — that slice is this one. `planLevelStatus` already branches `row.kind === 'spec' ? 'design' : 'verification'`. `sectionCount` already takes `planLevel: { working: number; waiting: number }` as one combined bucket, not one bucket per kind. Everything downstream of "produce `PlanLevelRow[]` for `spec`" is built and waiting; this slice's whole job is the production step `verificationRows` already does for `verify`.

### The decisions the plan settles — do not re-derive them

**Write `specRows(design)` in a new file `packages/board/src/app/lib/agent-rows/spec-row.ts`** (named in the plan's slice line), mirroring `verificationRows`'s signature and shape exactly: `(design: DesignStatus | null) => { working: PlanLevelRow[]; waiting: PlanLevelRow[]; haltedLine: string | null }`. `design: null` (state file unreadable) answers no rows and no line — the same "nothing, not an empty-state message" contract `verificationRows` already follows, for the same reason.

**The mapping is near-identity, not a rename.** `DesignStatusSchema`'s `rows` entries are already shaped `{ kind: 'spec', plan, reason, log, restart, stopped, halted }` — field-for-field the same as `PlanLevelRow`, because the domain's `specRow` (`packages/domain/src/rules/design-work.ts:201`) was written against this shape directly. This is *unlike* `verificationRows`, which had to rename `VerificationStatusSchema`'s `slug → plan` and `fleetHalted → halted`. Do not add a rename step here that the payload doesn't need — `waiting` is `design.rows` passed through with `kind: 'spec'` preserved (it already is `'spec'` in the payload; don't hardcode a second literal that could drift from the schema's).

**`working` comes from `design.running`**, one row per slug, same as verify: `{ kind: 'spec', plan: slug, reason: 'spec run running', log: null, restart: null, stopped: false, halted: false }`. Use `'spec run running'`, not `'verification running'` — the two kinds render the same component but say different things, and copying the verify string verbatim is the naive mistake a reader of `verificationRows` is likely to make.

**`haltedLine` follows the same double-report guard** `verificationRows` uses: only when `design.halted` is true **and** no `waiting` row already carries `halted: true` (a halted row's own `reason` already says so, per `specRow`'s `parts.push('the fleet is halted on spec run failures')` in the domain). The line's text is a design-specific sentence — something like *"The fleet starts no spec run until a person restarts one."* — parallel to `verificationRows`' `HALTED_LINE` constant but naming spec runs, not verify runs.

**Wiring into `AgentList.tsx` extends the existing combination, it does not add a parallel path.** At `AgentList.tsx:485` today:
```ts
const { working: workingPlanRows, waiting: verificationWaitingRows, haltedLine } =
  verificationRows(fleet?.verification ?? null);
```
Add the `design` call beside it and **combine both kinds' rows into the single `planLevel` bucket** `sectionCount` already expects — `sectionCount`'s `planLevel: { working, waiting }` is one number pair for *all* plan-level rows, by design (its own doc comment: *"the two fleets that render through this one shape"*). So the fix is not two new section slots; it's `workingPlanRows` and `verificationWaitingRows` (or renamed variables) becoming the concatenation of both `verificationRows` and `specRows` output, feeding the same `countOf`, the same `workingSection` render block (`:1521`, `:1546`), and the same `waiting-on-you` render block (`:1160`) that already iterate `workingPlanRows` / `verificationWaitingRows`. A naive implementation that adds `designWorkingRows`/`designWaitingRows` as separate variables and separate `.map()` blocks in the JSX will double the render code for no reason — `PlanLevelRowView` is already kind-agnostic (`planLevelStatus` already switches on `kind`), so one combined array renders both kinds through the one existing `.map()`.

**The halted lines are two independent sentences, not one.** A verify halt and a design halt are different facts and can both be true at once; render both lines where both apply (space permitting, e.g. two short lines), rather than merging them into one combined boolean — `haltedLine` from each function stays a per-kind nullable string, and the component shows whichever are non-null.

### Done when

The plan's `## Acceptance` → **Board rows** entry is the specification:

> `packages/board/test/unit/spec-row.test.ts`: `specRows` maps each `design` row to one entry of the shared shape with `kind: 'spec'` in its section, and answers nothing for `design: null`. `packages/board/test/integration/spec-run-rows.browser.test.ts`: one test that a payload with one going and one failed spec run shows the going row in *Working* and the failed row with its restart command in *Waiting on you*.

Concretely, lift these assertions — each exists because a naive implementation passes without it:
- A `design.rows` entry whose own `halted` is `true` must **not** also trigger `specRows`' separate `haltedLine` — same double-report bug `verificationRows` already guards against, and this is the second call site where it's easy to forget.
- `design: null` must produce **zero** rows and **no** `haltedLine`.
- The section counts (`sectionCount`'s `planLevel.working` / `.waiting`) must include the spec rows **summed with** the verify rows, not as a separate slot — a correct-looking render whose count only reflects verify rows is the likely failure mode, since `sectionCount`'s signature doesn't change and a stale call site is easy to miss.
- A plan with both a failed verify run and a failed spec run shows **two** *Waiting on you* rows (one `kind: 'verify'`, one `kind: 'spec'`) — confirms the combined array, not a last-write-wins merge keyed by plan slug.

Plus: the repo's gates — no bundle diff (the board artifact is generated, never hand-committed), a changeset for `@plot-pm/board` (patch or minor per `## Versioning`; this is new rendering, likely minor). This slice touches no `.sh` file, so `scripts/check-shell-lines.sh` is a no-op but still runs in CI. For tests, run `node skills/plot/scripts/board/plot-local-checks.mjs` before each push and run what it prints — it resolves the related `packages/board/src/**` tests and `pnpm run typecheck` for a change in this area. The suites in `CI suites` (`pnpm run test:e2e`, `test:contracts`, `test:board`, domain vitest with coverage, `test/reconcile/*.test.mjs`) run in CI on every PR — do not run `test:e2e` locally (CLAUDE.md Testing: it dispatches real workers into sandbox repos and is CI's gate, not a local one).

### Bookkeeping

Open the PR through the controller once the branch has its first real commit:

```bash
../plot/scripts/plot-open-pr.sh          # current branch
../plot/scripts/plot-open-pr.sh --draft  # while still moving
```

Do not run `gh pr create` — it has no way to find the plan or wave heading and will take its title from the last commit subject. `plot-open-pr.sh` reads which plan names the branch and opens the PR with the wave heading ("The spec rows") as the title, the plan and this brief in the body.

When the PR is created, append `→ #<number>` to this branch's line in the plan's `## Slices` section (`docs/plans/2026-10-12-the-fleet-writes-the-design.md`, under "### The spec rows"). No project board is declared in this repo's `## Plot Config`, so skip the board-status step.

Push the first real commit as soon as it exists.

### Scope guard

This branch owns:
- `packages/board/src/app/lib/agent-rows/spec-row.ts` — new file: `specRows`
- `packages/board/src/app/components/AgentList.tsx` — the combination of `verificationRows` and `specRows` output feeding `workingPlanRows`/`verificationWaitingRows` (near `:485`), the two halted-line slots, and whatever the `sectionCount` call site at `:1122` needs now that the bucket sums two kinds
- `packages/board/test/unit/spec-row.test.ts` — new unit tests
- `packages/board/test/integration/spec-run-rows.browser.test.ts` — new browser test, per the plan's Acceptance entry

Other branches of this plan: `feature/the-fleet-dispatches-an-approved-spike`, `feature/the-fleet-reads-design-work`, `feature/the-fleet-commissions-the-spec` and `feature/commission-design-is-removed` are all `Started:` per the plan's `## Status`, each in its own wave ahead of this one in the file but touching fleet/domain code (`auto-dispatch.ts`, `design-work.ts`, `fleet-run.ts`, `auto-design.ts`) rather than `packages/board/src/app/**` — low collision risk; verify their merge state with `/plot-pulse` before assuming they're still open. No other branch of this plan touches `AgentList.tsx` or `agent-rows/`.

If you find something the plan did not anticipate, report it rather than improvising outside scope.
