## Implementation brief — the-controllers-close-their-review-findings (wave 3: The implement lock lives on disk)

- **Plan (canonical):** [docs/plans/2026-10-10-the-controllers-close-their-review-findings.md](../../docs/plans/2026-10-10-the-controllers-close-their-review-findings.md) on `main`
- **Approved:** 2026-10-10, Jan Wloka, plan-PR #1498 merged
- **Branch:** `bug/the-implement-lock-lives-on-disk` (base: `main`)
- **Ends as:** one PR to `main`
- **Review of the code:** PR

Wave 1 (`bug/the-approval-asks-the-domain`, PR #1506) is merged. Wave 2 (`bug/the-entries-write-through-a-port`, PR #1515) is in flight but touches no file this wave touches. This wave is independent of wave 2 and wave 4 — nothing here touches `entry/approve.ts`, `entry/deliver.ts`, `entry/merge.ts` or `workflows/merge.ts`.

### What to build

`implementRunning` (`packages/fleet/src/shared/implement-run.ts:138-142`) is a module-level `const running = new Set<string>()`. It answers *is an implement child alive for this slug* by checking whether **this process** started it — correct for the board's own double-click guard, wrong for a second caller in a second process. `plot-dispatch-command.mjs` (`packages/fleet/src/server/entry/dispatch-command.ts`) is exactly that second caller: a one-shot CLI process that calls `startDispatch` → `startImplement`, which checks the *same* `running` Set — empty in a fresh process, so the CLI's own lock can never fire, and the CLI can never see the board's. Two independent processes, each with their own `Set`, cannot block each other. This is #1458 M2.

The CLI's current fix for "the caller should know when the implement is done" is worse than the lock gap: `run()` in `dispatch-command.ts:104` does `const end = await started.ended`, which is the whole `onExit` callback chain — the CLI process sits blocked for up to `IMPLEMENT_TIMEOUT_MS` (5 minutes) with nothing printed, because the brief it's waiting on names the command that should have returned once the implement *started*. This is #1458 M3, and it is the reason `implementRunning` must move off an in-memory `Set` and onto something both processes can read: once the lock is readable from disk, the CLI can return as soon as `startImplement` reports the state file says `running <pid>`, instead of awaiting the full `ended` promise.

This wave also folds in three smaller findings that touch the same two files: `briefBranchFromPulse` (`packages/fleet/src/shared/dispatch-command.ts:74-75`) duplicates `nextBriefBranch` (`packages/board/src/server/implement.ts:78-82`) — same body, same `startableBranches(pulse, slug, new Set())[0] ?? null`, kept as two copies because the board route predates the fleet CLI route. Four `function` declarations in `implement-run.ts` (lines 35, 48, 101, 141) should be arrows per the domain package's style rule, and the `{@link implementStatus}` TSDoc links at `:44` and `:153` name a board-only symbol from a file the fleet package does not import — a dangling cross-package reference. And `continue-command.test.ts` has five tests, none of which exercises a desk actually holding a `PLOT-BLOCKED` marker; the dispatch-command tests at `:65` and `:76` inject `pulse: () => null`, so no test here currently exercises the bridged-pulse path through a blocked desk either.

### The decisions the plan settles — do not re-derive them

**The lock is a file, read by both the pid that wrote it and any other reader — not a second `Set`, not a lock-manager dependency.** The design section is explicit: `implementRunning(repoRoot, slug)` reads *the implement state file that `startImplement` already writes* (`running <pid>`) and answers `true` only where that pid is alive. The state file already exists — `implementStatePath` (`implement-run.ts:48-50`) and the `running <pid>` marker `markBoardRun` writes (`board-run.ts:141-148`) are the exact artifact to read, not a new one to invent. The signature changes from `implementRunning(slug): boolean` to `implementRunning(repoRoot, slug): boolean` — every caller passes a path instead of relying on module state, which is what makes it visible across a process boundary. `readRunState`'s `alive(pid)` check (`board-run.ts:274-282`, `process.kill(pid, 0)`) is the pid-liveness test already written in this package; reuse it rather than re-implementing `kill(pid, 0)` a second time. A dead pid must read as not-running — that is the whole point of checking liveness rather than file existence, and it is why a crashed run does not hold the plan forever.

**The lock is *taken* with `O_EXCL`, not merely read.** `startImplement` currently truncates the log and marks the state file unconditionally (`implement-run.ts:188-197`, `fs.writeFileSync(log, ...)` then `markBoardRun`). Two processes started half a second apart would both pass that unconditional write. The plan requires an exclusive create (`{ flag: 'wx' }` on `fs.writeFileSync`, or `fs.openSync(path, 'wx')`) *before* the log is truncated, so the second process's open throws `EEXIST` and loses the race outright rather than both processes believing they hold the slug. Order matters: take the lock file first, truncate the log second — a process that loses the race must not have already destroyed the other's log.

**`plot-dispatch-command.mjs` starts the implement AND the follow-up dispatch in one detached process, and returns once the state file reads `running <pid>`.** This is the fix for #1458 M3, and it changes the CLI's returned exit code semantics: today exit 0 means *the dispatch started* (after awaiting `ended`); the plan's target is that the command exits once implement has *started*, detached, so a caller with a 120 s tool timeout (this repo's own `claude -p` wrapper, named explicitly in the plan) does not kill the implement mid-run by holding the parent process open. Re-read `dispatch-command.ts:69-115`'s `run()` for the current blocking shape before changing it — the `ended` promise and its `DispatchEnd`/`DispatchStart` types in `dispatch-command.ts` (shared, not the entry) are what need to decouple into "started" vs. "finished" reporting.

**One `briefBranchFromPulse`, not two.** The board (`packages/board/src/server/implement.ts:78-82`, `nextBriefBranch`) and the fleet CLI (`packages/fleet/src/shared/dispatch-command.ts:74-75`, `briefBranchFromPulse`) compute the identical thing from the identical rule (`startableBranches(pulse, slug, new Set())[0] ?? null`). The plan says *"the board calls the fleet's `briefBranchFromPulse`, and deletes `nextBriefBranch`"* — the fleet package is the one kept (it is lower in the dependency graph; the board already imports from `@plot-pm/fleet/shared/implement-run`, so adding one more import from the same package is not a new dependency direction). Delete `nextBriefBranch` from `implement.ts` and have `handleImplement`'s `deps.briefBranch` default import the fleet's version. The deliverable search in the plan's Notes section already confirms this: `briefBranchFromPulse` is "kept, `nextBriefBranch` removed."

**Four declarations become arrows — this is a domain-package style rule applied by location, not a universal rewrite.** `CLAUDE.md`'s "Arrow functions, not declarations" rule is scoped to `packages/domain/src/`, and this file is in `packages/fleet/src/shared/`. But the plan explicitly calls these four out (#1458 L3) as part of this slice's scope, so convert exactly `implementLogPath` (`:35`), `implementStatePath` (`:48`), `implementRunning` (`:101` in the plan's finding table — current line `:141`) and whichever fourth declaration remains after the others are already arrows (`implementBranchStatePath` and `implementBranchRecordPath` are already arrow consts; check `startImplement` itself, which is also already an arrow — re-read the file once more after the signature change above to find which four are still `function`). Convert only inside this file; this is not licence to rewrite declarations elsewhere in `packages/fleet`.

**The two `{@link implementStatus}` TSDoc links point at a symbol this file's package does not own.** `implementStatus` is defined in `packages/board/src/server/implement.ts:164`, not in `@plot-pm/fleet`. A `{@link}` naming a symbol the linking file's own package cannot resolve is the dangling reference #1458 L3 flags. Rewrite both (`implement-run.ts:44` and `:153`) to name a fleet-package symbol instead — most likely `implementRunState` or the state file itself, whichever the comment is actually trying to point a reader at; read the surrounding sentence at each site to judge which.

**A continue test must exercise `PLOT-BLOCKED`, not just route refusals.** `continue-command.test.ts`'s existing four `continueBranch` tests all probe routing refusals (`unknown-branch`, `no-worktree`) with fixture desks that hold no marker at all. Add a fixture desk whose on-disk state carries a `PLOT-BLOCKED` marker and assert that calling the continue command against it with an answer starts a new pid — the plan's own wording: *"A test runs `plot-continue-command` against a desk holding `PLOT-BLOCKED` with the default `bridgedPulse` and asserts that a new pid starts."* Note "with the default `bridgedPulse`" — this test should NOT inject `pulse: () => null` the way the existing dispatch-command tests do; it is specifically testing the bridged-pulse path end to end, which no existing test does today (confirmed: `dispatch-command.test.ts:65,76,86` all inject `pulse: () => null`).

### Done when

Per-finding, from the plan's table:

- #1458 M2 — `implementRunning` reads the on-disk state file (pid liveness via `alive()`), not a process-local `Set`; a test proves a second, separately-imported module instance (simulating a second process) reads a lock the first instance took, and reads it free once that pid is no longer alive.
- #1458 M3 — `plot-dispatch-command.mjs` exits once the implement has started (state file reads `running <pid>`), not once the whole dispatch has ended; a test proves the command returns before `ended` resolves.
- #1458 L2 — `nextBriefBranch` is deleted from `packages/board/src/server/implement.ts`; the board calls `briefBranchFromPulse` from `@plot-pm/fleet/shared/dispatch-command`.
- #1458 L3 — the four flagged declarations in `implement-run.ts` are arrows; both `{@link implementStatus}` TSDoc links name a symbol inside `@plot-pm/fleet` instead.
- #1458 L4 — a `continue-command.test.ts` test exercises a desk holding `PLOT-BLOCKED` through the default (non-null) `bridgedPulse` and asserts a new pid starts.

Plus, specific assertions a naive fix would pass without:

- A test for the `O_EXCL` take proving the SECOND of two near-simultaneous `startImplement` calls for the same slug fails to take the lock (or is refused) rather than silently overwriting the first's log — a lock that is merely *read* correctly but still *written* unconditionally reintroduces the race the plan is fixing.
- A test proving a dead pid in the state file reads as not-running — write `running 999999` (or another pid guaranteed not to exist) directly to the state file and assert `implementRunning` returns `false`. Without this, the fix only handles the cross-process *read*, not the crash-recovery half the plan calls out ("a dead pid reads as not running, so a crashed run does not hold the plan forever").
- A test on `briefBranchFromPulse`/`nextBriefBranch` consolidation proving the board's route still resolves a branch correctly after the deletion — a passing typecheck does not prove the re-wired import actually gets called with the right `pulse`/`slug` arguments at the route.

Plus the repo's own gates: run `node skills/plot/scripts/board/plot-local-checks.mjs` before each push and run what it prints — this touches `packages/fleet/src/**` and `packages/board/src/**` (both have vitest + typecheck entries in `## Plot Config`). Add a changeset for `plot` with the description first and the `bumps:` block last, per `CLAUDE.md`'s Versioning section. This slice touches no `.sh` file, so `scripts/check-shell-lines.sh`'s budget does not apply — if work reveals a reason to touch one, that trade needs to be budgeted explicitly rather than assumed free.

### Bookkeeping

Open the PR through the controller once the branch exists and holds a commit:

```bash
skills/plot/scripts/plot-open-pr.sh          # current branch
skills/plot/scripts/plot-open-pr.sh --draft  # while work is still moving
```

Do not run `gh pr create` — the controller reads which plan names the branch and titles the PR from the wave heading, not the last commit subject. Push the first real commit as soon as it exists, and append `→ #<number>` to this branch's line in the plan's `## Slices` section once the PR is created.

### Scope guard

This branch owns: `packages/fleet/src/shared/implement-run.ts` (the on-disk lock, the `O_EXCL` take, the arrow conversions, the TSDoc link fixes), `packages/fleet/src/server/entry/dispatch-command.ts` (the detach-and-return-early change), `packages/fleet/src/shared/dispatch-command.ts` (`briefBranchFromPulse` stays; the `DispatchStart`/`DispatchEnd` shape may need to change to support early return), `packages/board/src/server/implement.ts` (delete `nextBriefBranch`, call the fleet's version instead), `packages/fleet/test/unit/continue-command.test.ts` and `packages/fleet/test/unit/dispatch-command.test.ts` (new coverage).

Two sibling branches are in flight under the same plan: `bug/the-entries-write-through-a-port` (`entry/approve.ts`, `entry/deliver.ts`, `PlanStore`, `Trees` — no overlap with this wave's files) and `bug/the-merge-reads-what-it-claims` (`entry/merge.ts`, `workflows/merge.ts`, `CLAUDE.md`/`AGENTS.md` line 499 — no overlap). No slice edits `plot-controller-gate.sh` or `rules/ci-suite.ts`; those findings moved to a different plan (`the-gates-are-launchers`) and are out of scope here.

If you find something the plan did not anticipate, report it rather than improvising outside scope.
