## Implementation brief — the-fleet-writes-the-design (wave 3: The spec run)

- **Plan (canonical):** [docs/plans/2026-10-12-the-fleet-writes-the-design.md](../../docs/plans/2026-10-12-the-fleet-writes-the-design.md) on `main`
- **Approved:** 2026-10-13, jwloka, plan-PR #1608 merged
- **Branch:** `feature/the-fleet-commissions-the-spec` (base: `main`)
- **Ends as:** one PR to `main`
- **Review of the code:** per repo convention (standard PR review)

This branch is the third wave. It depends on the first two, both merged: `feature/the-fleet-dispatches-an-approved-spike` (#1665, admits a Design plan's approved spike into auto-dispatch) and `feature/the-fleet-reads-design-work` (#1672, the pure rules `specIsEmpty`, `designWork`, `specStart`, `specDeclined`, `specRow` in `packages/domain/src/rules/design-work.ts`, plus `rules/fleet-run.ts` extracted from `rules/auto-verify.ts`). This slice is the one that actually starts and settles a spec-writing agent run. The next wave, *The button goes*, waits on nothing of this slice's but follows it in heading order; *The spec rows* waits on a sibling plan's branch (`feature/waiting-on-you-shows-a-failed-verification`), not on this one.

### What to build

A new fleet pass, `packages/fleet/src/shared/auto-design.ts`, that is the auto-verify pass's sibling: for each Design plan with an empty `## Spec` section, it reads `designWork`/`specStart` (already built, pure, in `packages/domain/src/rules/design-work.ts`) against local state, asks the host only when those say `ask-host`, and on `start` claims `idea/<slug>-spec` by pushing one empty commit, runs the `Design command` agent in its own worktree at `.plot/state/design/<slug>/`, and on completion settles the run through the eight-row table in the plan's Design section ("Settling a run"), opening the PR itself via `Host.prCreate({ draft: true })` rather than leaving that to the agent.

The observed problem this fixes: today a spec is written only through the board's *Commission design* route, which tells its agent to leave `State:` and `## Spec` alone but write nothing — so the route currently does none of its job (plan Motivation, first bullet). This slice is what actually writes the spec, automatically, once `Auto-design: true` is set.

### The decisions the plan settles — do not re-derive them

**Host read last, not first.** `specStart` refuses using only local readings — `off`, `running`, `declined`, `halted`, `stopped`, `waiting`, `queue-unread`, `no-free-agent`, `starved` — before ever answering `ask-host`. Only then does `specDeclined` make the one `host.prState('idea/<slug>-spec')` call. This is why a pass that refuses locally (stopped, halted, waiting, no slot) makes zero host calls — tested explicitly in Acceptance ("Zero host calls"). Do not reorder this: a host call per pass per Design plan is the cost this ordering was built to avoid.

**fleetd opens the PR, not the agent.** The prompt instructs the agent to write the spec, commit, and push `idea/<slug>-spec` — and explicitly forbids it from opening a PR, editing `State:`, approving anything, or touching a tracker. fleetd calls `Host.prCreate` itself after the run ends. Rejected alternative: having the agent open its own PR. Killed because fleetd then has no way to distinguish "agent forgot to open a PR" from "agent finished cleanly" — a failed `pr-create` only becomes a recorded, retryable failure (`pr-not-opened`) if fleetd is the one making the call and reading the outcome.

**The claim is a pushed ref, not a lock file.** `idea/<slug>-spec` on origin, created via one empty `plot: claim idea/<slug>-spec` commit (reuses `CLAIM_SUBJECT_PREFIX` from `rules/empty-claim.ts`) through `Trees.addBranch`/`commit`/`push`. A rejected push means another machine already holds the run — no new run starts. This is the same mechanism `/plot-implement`'s own branch-claim push uses; it needs no lock manager because git's ref-update atomicity is the lock.

**One writer of the store, enforced by mark files, not a file lock.** `auto-design-in-flight.json` is written only by fleetd. `plot-design.mjs restart <slug>` never writes it directly — it writes a separate mark file at `.plot/state/design/restart/<slug>.<epoch-ms>.json` (temp file + rename), and fleetd folds every mark file it finds into the store at the start of each pass, then deletes exactly the files it read. Rejected alternative: a lock file. Killed because `updateVerifyState` (the function this reuses) is only atomic inside one process, the fleet package holds no cross-process file lock today, and a lock adds a new "stale lock left by a crashed process" failure mode that a mark file does not have (each mark file already has exactly one writer).

**Deleting a remote ref requires reading `prMerged` first, never a PR's `state`.** The plan adds `Trees.deleteRemoteBranch(branch, expectedTip)` — `git push --force-with-lease=refs/heads/<branch>:<tip> origin --delete <branch>`, so it only deletes the tip that was actually read (protects against a race where someone pushed more commits between read and delete). Every deletion of a `work` ref (one that holds a written spec but failed to land, or has no PR) reads `host.prMerged` first and only deletes on `not-merged`. This is this repo's standing rule, "One Answer To 'Did This Land'" (CLAUDE.md) — a PR's `state` reports `CLOSED` even when merged (squash merges rewrite history), so `mergedAt` is the only trustworthy signal, never ancestry or `state`.

**The settlement table has exactly 7 rows** (plan "Settling a run" table) keyed by what `claimTip` reads for the branch (`work` / `claim-only` / `absent` / `unknown`) crossed with secondary reads (spec written? PR open? `prCreate` succeeded?). Implement all 7 rows — don't collapse `work`+no-PR+empty-spec into the same outcome as `work`+no-PR+written-spec; they diverge (`spec-empty` failure+delete vs. `pr-not-opened` failure+keep-for-retry).

**`pr-not-opened` is retried without re-running the agent.** `designWork`'s `open-pr` answer is for exactly this case: the branch already carries a written spec, but the PR step failed last time. A retry pass calls only `prState` then `prCreate` again — no new agent, no new worktree. This keeps the retry budget cheap (plan "The cost" section: a retry costs one `prState` + one `prCreate`, nothing more) and is why `designWork` has a dedicated `open-pr` answer distinct from `write-spec`.

**A restart mark passes `off`/`declined`/`halted`/`stopped`/`waiting` exactly once, never `running` or a slot refusal (D36).** `plot-design.mjs restart <slug>` lets a person force one run even with `Auto-design: false`, or after 3 failures halted everything — but it still waits for a free agent slot and still refuses if a run is already going. Don't let restart bypass concurrency; it only bypasses the opt-in/halt/retry-backoff gates.

**The restart records `answeredPr`, and a restarted run's failure does not get re-declined by the PR the person already closed.** `specDeclined` only declines for a closed PR *above* `answeredPr`. Without this, closing a PR → restarting → the new run failing would read the same old closed-PR number and decline again, trapping the plan.

**The concurrency bound is mutual, not one-directional.** `specStart` refuses while a verify run is going for that plan; symmetrically, `verifyStart` (existing code in `rules/auto-verify.ts`) gains a new refusal for a going spec run. `scaleUp`'s `running` count (`packages/domain/src/workflows/assign.ts:229`) includes going spec runs beside `verifying`, so a spec run consumes a slice-agent slot — this is how the "`Parallel agents` + 1" ceiling in DESIGN-phases.md §6 is actually enforced, not a comment-only promise. When both a verify run and a spec run could start in the same pass, verify goes first (plan states this ordering explicitly — don't make it a coin flip).

**Everything reusable from auto-verify is being extracted, not copied.** `rules/fleet-run.ts` pulls `VerifyStore`→`RunStore`, `VERIFY_HALT_AFTER`→`RUN_HALT_AFTER`, `recordVerifyFailure`→`recordRunFailure`, `verifyRetryVerdict`→`runRetryVerdict`, `failuresSinceSuccess`, `verifyHalted`→`runHalted`, and `slotRefusal` (the last three refusals of `verifyStart`). `auto-verify.ts` re-exports these under their *existing* names so no caller of `verifyStart` needs to change. Mirror this exactly — don't duplicate the logic under new names in `auto-design.ts`; import from `fleet-run.ts`. Likewise `packages/fleet/src/shared/fleet-run.ts` extracts the state-file reader/writer, `pidAlive`, `runGoing` (was `verifyRunGoing`), `boundSecondsOf`, and the status-line format.

**`RunStore` carries 4 design-only fields beyond the shared ones:** `declined[slug]` (commit + PR number), `answeredPr[slug]`, `restart[slug]` (commit of a pending restart), `orphans[slug]` (tip + PR reading of an orphaned `work` ref). These live alongside the shared run-record/failure/`lastSuccessAt` fields, not in a separate store.

**`host.ts:80-88`'s TSDoc gets rewritten**, not just the `draft` field added: it now says a caller sets `draft: true` for a proposal awaiting a person, and omits it for a finding. This is a real behavior change in prose, not incidental — read the current TSDoc before editing it.

**`Design command` is its own config key, not reused from `Idea command`.** Per the one-capability-one-key rule already established for `implement-run.ts:22-33`: writing a spec is a distinct capability from drafting an idea, even though this repo's own `## Plot Config` will set both to the same `claude -p --model opus` invocation line. Add `Design command` and `Auto-design: false` as new keys beside the existing `Verify command`/`Auto-verify: false` pair.

### Done when

The plan's `## Acceptance` section is the specification — in particular the paragraphs "Start rule", "Spec run", "One writer", and the `verifyStart`/`scaleUp` cross-reference into `packages/domain/test/auto-verify.test.ts`. Pull out these assertions specifically because a naive implementation passes without them:

- **Zero host calls** on every local refusal (`stopped`, `halted`, `waiting`, `no-free-agent`, absent ref) — easy to miss if a test only checks the `ask-host` path.
- **A rejected claim push starts nothing** — don't let a push failure fall through to starting the agent anyway.
- **A closed spec PR with an absent ref writes the declined mark and asks the host nothing on the next pass** — the declined mark must short-circuit future `ask-host` cycles, not just be recorded for display.
- **The restart-then-fail-then-retry case does not re-decline against the already-closed PR** — this is the `answeredPr` mechanism; a test that restarts, fails, and retries should show `specDeclined` answering `start`, not `declined`, on the second attempt.
- **A dead-pid run record settles on the next pass** (crash recovery), a stale `claim-only` ref past `Claim stale after` is deleted as `stale-claim`, and an orphaned `work` ref past `Worker bound` with no PR gets exactly one `prState` read and a `no-pr` row — then none on the following pass (it's now a known orphan, not re-probed every pass).
- **The prompt itself forbids a `State:` edit and forbids opening a PR** — if the Acceptance test asserts prompt *content*, match the plan's given wording rather than paraphrasing, since the state gate (`plot-state-gate.sh`) would otherwise silently swallow a wrongly-written `State:` line from this agent with no error surfaced here.
- **`verifyStart` refusing `running` while a spec run goes**, and the going spec run counting in `scaleUp`'s `running` tally beside `:247-252` in `auto-verify.test.ts` — this is a change to an *existing* test file, not just new tests in `auto-design.test.ts`.

Plus: this repo's gates. `scripts/check-shell-lines.sh` refuses a PR whose shell under `skills/` grew past its merge base — this slice adds `plot-design.mjs` and its launcher wiring (`build.mjs`, `bundles.generated.ts`, `.gitattributes`), which is TypeScript bundled to JS, not new `.sh`; if any `.sh` file is touched, growth must be paid for by removing shell elsewhere in the same change. Run `node skills/plot/scripts/board/plot-local-checks.mjs` before each push and run exactly what it prints — the tests and typechecks for whichever packages you touched (`packages/domain`, `packages/fleet`, `packages/board` if the bundle declaration changes). The `CI suites` config key (`pnpm run test:e2e`, `test:contracts`, `test:board`, domain vitest coverage, `test/reconcile/*.test.mjs`) runs in CI on the PR — do not run the full suites locally; a failure there comes back as a correction, not a blocker now.

### Bookkeeping

Open the PR through the controller, never by hand:

```bash
../plot/scripts/plot-open-pr.sh          # current branch, ready
../plot/scripts/plot-open-pr.sh --draft  # while still moving
```

It reads the plan, titles the PR from this slice's wave heading ("The spec run"), and links the plan and this brief in the body. Push the first real commit as soon as it exists — don't wait for the full slice to be done before the PR exists.

When the PR is created, append `→ #<number>` to this branch's line in the plan's `## Slices` → `### The spec run` heading, and (no project board is configured in this repo's `## Plot Config`, so skip the board-status step).

### Scope guard

This branch owns: `packages/fleet/src/shared/fleet-run.ts` (new), `packages/fleet/src/shared/auto-design.ts` (new), `packages/domain/src/rules/fleet-run.ts` (new, if not already fully done by the prior merged slice — check current state of `rules/auto-verify.ts` before assuming what's left), `packages/domain/src/adapters/trees/trees-git.ts` and `trees-fixture.ts` (`deleteRemoteBranch`), `packages/domain/src/workflows/assign.ts:229` (`scaleUp`'s `running` count), `rules/auto-verify.ts`'s `verifyStart` (new refusal), `packages/fleet/src/shared/agent-log.ts` (`designPromptPath`, `designLogPath`), `packages/board/src/server/entry/design.ts` (new, `plot-design.mjs restart` entry) plus its `build.mjs`, `bundles.generated.ts`, and `.gitattributes` wiring, `packages/domain/src/ports/host.ts:80-99` (TSDoc rewrite + `draft` field — check if the prior merged slice already touched this), `test/reconcile/agent-settings-spawn.test.mjs` (`auto-design` added to `FLEET_SITES`/`SITES`), `CLAUDE.md`'s `## Plot Config` (`Design command`, `Auto-design: false` — then regenerate `AGENTS.md` via `./scripts/check-agents-md.sh --write`), `DESIGN-phases.md` §6 and the story's Open Points 9–10, and `skills/plot/scripts/README.md` (new script row for `plot-design.mjs`, per the helper-table gate).

The other two branches of this plan are merged, so their files are not in flight. The two branches after this one in the `## Slices` list are not yet started: *The button goes* (`feature/commission-design-is-removed`) touches `packages/board/src/server/commission.ts` and its many call sites — do not remove that route here even though this slice makes it functionally redundant; removal is explicitly its own slice. *The spec rows* (`feature/the-board-shows-the-spec-run`) owns `packages/board/src/app/lib/agent-rows/spec-row.ts` and the board rendering of `specRow`'s output — this slice must produce the `design` field on `/api/fleet` (`packages/board/src/server/fleet.ts:6771`, beside `verificationPayload`) for that slice to consume, but does not build the row-rendering component itself.

If you find something the plan did not anticipate, report it rather than improvising outside scope.
