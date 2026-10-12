## Implementation brief — the-phases-are-declared (wave 1: The declared map)

- **Plan (canonical):** docs/plans/2026-10-12-the-phases-are-declared.md on main
- **Approved:** 2026-10-12, Jan Wloka, plan-PR #1608 merged
- **Branch:** `feature/the-phases-are-a-declaration` (base: `main`)
- **Ends as:** one PR to `main`, opened with `../plot/scripts/plot-open-pr.sh`
- **Review of the code:** per repo convention; the PR is reviewed as code

This is the plan's first slice. Three branches wait on it: `feature/the-card-carries-its-controls`, `feature/the-board-draws-the-declared-phases` and `docs/the-prose-names-the-declared-phases` all read `rules/workflow-phases.ts`, so land this one first. `feature/a-draft-can-need-design` waits on a different branch (`feature/the-design-approvals-are-gated`, a sibling plan's spike) and not on this one. Checked 2026-10-12: no other branch in flight touches `packages/domain` — the one unrelated branch on origin, `feature/a-merged-pending-check-is-asked-again`, does not.

### What to build

Today `BOARD_PHASES` (`packages/domain/src/entities/workflow.ts:35`) is five hardcoded names, and `toBoardPhase`/`storyPhase` (`rules/phase.ts:41`, `:72`) are switch statements over them. The phases are Plot's own workflow opinion baked into the domain, not something an adopting repository can shape (D12 in the story). This slice makes the mapping a declared, parsed value instead of code — a new `## Plot Config` key, `Workflow phases`, that a repository can override and that defaults to today's five names and today's placements when absent.

Build in `packages/domain/src/rules/workflow-phases.ts`:

1. **`parsePhaseMap(value)`** — parses the key's text per D25's grammar: `;` between phase entries, `,` between members within an entry, each entry `<name> = plan:<state>, story:<status>, …`, every member carrying its `plan:` or `story:` prefix, `story:*` meaning every status. Returns an ordered phase map or a refusal naming the offending entry and the reason. `plan:rejected` and `plan:superseded` can never be declared (they're the `withdrawn` terminal status, which no phase holds — `toBoardPhase` already returns `null` for them). A state or status appearing in two phases is a refusal. A phase name outside the five defaults is valid and refuses nothing (D26 — that's for the board slice to act on; this slice just doesn't reject it).
2. **`DEFAULT_PHASE_MAP`** — `Discovery = story:*; Design = plan:draft, plan:design; Development = plan:approved; Testing = plan:delivered; Released = plan:released`. A test asserts its names equal `BOARD_PHASES` in order.
3. **`phaseOfPlan(map, readings)`** replacing `toBoardPhase`, and **`phaseOfStory(map, status)`** replacing `storyPhase`. `readings` is `{ state, deliverable? }`: a deliverable plan reads in whichever phase holds `plan:delivered`, falling back to the state's own phase when no phase holds it. A state no phase holds answers `null` (as `toBoardPhase` does for `rejected`/`superseded` today).
4. **`planPhases(map)`** — names of declared phases holding at least one `plan:` member, in declared order.
5. **`phaseWorkflows(map)`** — a workflow belongs to the first declared phase holding a state it acts on (`approve`→`draft`/`design`; `dispatch`/`implement`/`deliver`→`approved`; `release`→`delivered`). With `DEFAULT_PHASE_MAP` this must equal today's `PHASE_WORKFLOWS` exactly — assert that equality in a test.

Wire `PHASE_WORKFLOWS` (`entities/workflow.ts:143`) to be derived as `phaseWorkflows(DEFAULT_PHASE_MAP)`, and rewrite its doc block (`:126-137`) to state the new derivation rule instead of the hand-maintained placement. `BOARD_PHASES`, `Phase`, `phaseOrder` (`:80`) and `DevelopmentWorkflow` (`:176-186`) all stay exactly as they are — this slice does not touch their callers, so the board renders exactly as today. Delete `storyPhase` and its doc block from `rules/phase.ts:72`; `toBoardPhase` stays (the board and fleet still call it until the board slice moves them).

Declare the key in this repo's own `CLAUDE.md` `## Plot Config` section (Plot dog-foods its config), as a new bullet alongside the others, naming the default map's grammar. Then run `./scripts/check-agents-md.sh --write` so `AGENTS.md` regenerates from it.

### Decisions the plan settles — do not re-derive them

- **Two words, and this slice doesn't rename either.** A *state* is the `State:` word in a plan file; a *phase* is a declared column. `PlanReadings.phase` (`rules/phase.ts:115`), the script `plot-phase-gate.sh`, and the transition write's wire key `phase` (`transitions/plan.ts:133`) all keep calling a plan's state `phase` by field/variable name — that renaming is explicitly out of scope everywhere except prose (the `docs/the-prose-names-the-declared-phases` slice). Don't rename these fields.
- **Grammar split follows `parseLocalChecks`, but the error handling differs.** `parseLocalChecks` (`rules/local-checks.ts:73-82`) silently skips a malformed `;`-separated entry. `parsePhaseMap` must not — a malformed entry is a refusal naming the entry and the reason, not a silent drop. This was an explicit panel finding (`parseLocalChecks` skips bad entries silently) and the Design section resolves it this way; don't copy the silent-skip behavior even though you're copying the split mechanics.
- **This slice moves no board caller.** `toBoardPhase` and `storyPhase`'s board/fleet callers (`board.ts`, `server/fleet.ts`, `mock-fleet.ts`) are the next slice's (`feature/the-board-draws-the-declared-phases`) job. Leave them calling `toBoardPhase` directly; don't touch `packages/board` or `packages/fleet` in this branch. The acceptance for this slice is domain-only: a new `workflow-phases.test.ts`, plus `phase.test.ts` and `test/workflow.test.ts` losing their `storyPhase` tests.
- **`phaseOfStory` has no caller yet, same as `storyPhase` today.** A grep for `storyPhase` returns zero production callers (only test files) — this slice isn't introducing an orphan; it's carrying one forward under a new name/signature. Its first real caller arrives in a sibling plan's Discovery-tab slice. Don't invent a caller here.
- **The five default names stay `BOARD_PHASES`-shaped.** No production code outside `entities/workflow.ts` is to read `phaseOrder` or `DevelopmentWorkflow` after this slice (that's already true — verify it stays true, don't go hunting for new readers to add).

### Done when

The plan's `## Design` and `## Changelog` are the specification. Pulled out because a naive implementation passes without them:

- `DEFAULT_PHASE_MAP`'s names equal `BOARD_PHASES`, in the same order — not just the same set.
- `phaseWorkflows(DEFAULT_PHASE_MAP)` deep-equals today's hand-written `PHASE_WORKFLOWS` object — this is what proves the derivation is lossless, not just plausible.
- A phase map with a state/status declared in two different entries is refused, not silently resolved to "first match wins" or "last match wins."
- A malformed entry (missing `=`, missing `plan:`/`story:` prefix, empty side) is refused by `parsePhaseMap`, unlike `parseLocalChecks`'s skip-and-continue.
- `plan:rejected` / `plan:superseded` cannot be declared in any entry — assert the refusal, not just the absence of a test exercising them.
- `phaseOfPlan` with a `deliverable: true` reading and a map where no phase holds `plan:delivered` falls back to the state's own phase (doesn't throw, doesn't return `null` incorrectly).
- `storyPhase` is gone from `rules/phase.ts`, and `phase.test.ts` / `test/workflow.test.ts` no longer reference it (checked above: 3 call sites in `workflow.test.ts`, 7 in `phase.test.ts`, all test-only).

Plus: a changeset bumping `plot` (not `@plot-pm/board` — this slice touches no board code) minor, per *Versioning* in CLAUDE.md (new config key, new patterns) — description first, no `bumps:` block needed since the default skill bump applies to the `plot` package itself. `./scripts/check-agents-md.sh --write` must be run after editing `CLAUDE.md` and its diff committed alongside — CI refuses a mirror that differs from the source.

Run `node ../plot/scripts/board/plot-local-checks.mjs` before each push and run what it prints — that will include `packages/domain/**` vitest-related and `tsc --noEmit` for any file you touch, plus the repo-wide script gates (`check-agents-md.sh` among them). The suites in `CI suites` run in CI only; don't run them locally, especially not `test:e2e`.

No `.sh` file should need touching for this slice. If one does, `scripts/check-shell-lines.sh` ratchets total shipped shell line count against the merge base — pay for growth by removing shell elsewhere in the same change.

### Bookkeeping

- Push the first real commit as soon as it exists.
- Open the PR with `../plot/scripts/plot-open-pr.sh` (add `--draft` while work is still moving). Do not run `gh pr create` — it takes the title from the last commit subject, which on this estate is often `plot: build the board artifact`.
- When the PR exists, append `→ #<number>` to this branch's line under `## Slices` → *The declared map* in the plan.

### Scope guard

This branch owns:

- `packages/domain/src/rules/workflow-phases.ts` (new)
- `packages/domain/test/workflow-phases.test.ts` (new)
- `packages/domain/src/entities/workflow.ts` (the `PHASE_WORKFLOWS` derivation and its doc block only — not `BOARD_PHASES`, `PHASE_LEADERSHIP`, `phaseOrder` or `DevelopmentWorkflow`)
- `packages/domain/src/rules/phase.ts` (deleting `storyPhase` only — `toBoardPhase`, `rowPhase`, `planStatus` and the re-exports stay)
- `packages/domain/test/phase.test.ts`, `packages/domain/test/workflow.test.ts` (dropping `storyPhase` tests only)
- `CLAUDE.md` (`## Plot Config`, one new bullet) and the regenerated `AGENTS.md`
- one changeset under `.changeset/`

It does not touch `packages/board`, `packages/fleet`, any `.tsx`/`.ts` wire schema, or any `.sh` script. The only other branch in flight (`feature/a-merged-pending-check-is-asked-again`) doesn't overlap this scope, but re-check with `git fetch` before you push in case something new claimed the domain package meanwhile.

If you find something the plan did not anticipate, report it rather than improvising outside scope.
