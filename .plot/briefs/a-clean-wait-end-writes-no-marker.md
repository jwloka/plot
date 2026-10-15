## Implementation brief — a-desk-that-ended-cleanly-at (slice: Clean end)

- **Plan (canonical):** [docs/plans/2026-10-15-a-desk-that-ended-cleanly-at.md](../../docs/plans/2026-10-15-a-desk-that-ended-cleanly-at.md) on `main`
- **Approved:** 2026-10-15, Jan Wloka, plan-PR #1744 merged
- **Branch:** `bug/a-clean-wait-end-writes-no-marker` (base: `main`)
- **Ends as:** one PR to `main`
- **Review of the code:** per repo convention (plot-review gate on `main`)

This slice ships alone; the plan's second slice (`bug/an-ended-desk-is-not-waiting-on-you`) reads the result of this one (a desk with no marker and no ending record) and decides what *Waiting on you* shows for it. Land this one and name the shape it leaves behind — the next slice depends on it, not on guessing it.

### What to build

Two desks (`free-04e1f562`, `free-eb358032`) ended cleanly at the free-wait bound on 2026-10-15 — no slice ever assigned, `.plot-worker.log` reporting the wait ran out with "nothing was cut short" — and both still got a generic `PLOT-BLOCKED.md`: "the agent declared itself blocked. Decide how it should proceed, or close out the slice." Neither agent said any such thing. `plot-reap.sh` then refused to reap both desks on exactly that marker, and fleetd sat at `agents=0` until a person intervened by hand.

Fix the write, not the read: a clean bound-end at `agentLoop` ROW 2 (`packages/domain/src/workflows/agent-loop.ts:473-484`) must leave the desk markerless, so `reapable.ts`'s existing `blocked-marker` refusal (`packages/domain/src/rules/reapable.ts:121-123`) simply doesn't fire — no new reap rule needed for this slice.

### The decisions this plan settles — do not re-derive them

**ROW 2 writes no ending record by design, and that is correct — the bug is not there.** `agent-loop.ts:478-484` returns `decide('agent-loop', [], { branch: '', exitCode: 124, ... })` — an empty `writes` array. `packages/domain/test/workflows-agent-loop.test.ts:111-118` already asserts this (`result.writes` is `[]`, `endWrite(result.writes)` is `undefined`). Do not add a `reason: 'bound'` write here to "make it explicit" — that would be new behavior the test above forbids, and it isn't what's broken.

**The marker is not coming from `registryd.ts`'s `endingAction` path for a true ROW 2 exit — verified, not assumed.** Traced `endingTableAnswer` (`packages/domain/src/rules/ending-action.ts:293-315`) against `readings.ending === null` (what a markerless, never-assigned desk actually reads): every reason-specific branch is skipped, and it falls through to line 311 (`readings.ending !== 'nothing-done'` — true for `null` — returns `'leave'`). `'leave'` never calls `askAPerson` (`packages/fleet/src/server/entry/registryd.ts:1132` only calls it on `'needs-a-person'`). So a genuine ROW 2 exit, read fresh, cannot produce this marker through this path. Do not "fix" `endingTableAnswer` for a `null`/`bound`-shaped ending expecting that to close the bug — it already answers correctly for that input.

**Working hypothesis, not yet runtime-confirmed (the motivating desks are gone — checked, no worktree or log survives locally): the marker is a *stale* `.plot-worker.ending.json` from an earlier cycle on the same desk, read as current.** Because ROW 2 writes nothing, any `.plot-worker.ending.json` left by a *prior* assignment on that same worktree (e.g. a real `blocked` ending from before the desk was freed and re-looped) is never cleared, and the next tick's `endingAction` read picks it up as if it described the current (clean) ending. The marker text the plan quotes is a verbatim match for `needsPersonMarker`'s `'blocked'` case (`ending-action.ts:503-507`), which only composes when `readings.ending === 'blocked'` — not `null`, not `'bound'`. That only happens via a real ROW 10 agent-declared-blocked write, or a leftover file from one. **Confirm this before writing the fix**: reproduce (or find current logs for) a desk that free-loops to the bound after a prior cycle left a `blocked`/other escalating ending on the same path, and check whether `.plot-worker.ending.json` is cleared when a desk is freed/reset. If confirmed, the fix is clearing or ignoring a stale ending record at free-loop reset — not touching `agent-loop.ts` ROW 2 or `ending-action.ts`'s table logic, both of which are already correct for a fresh `null` reading.

**There are three independent `PLOT-BLOCKED.md` write sites in this codebase — know which one you're chasing.** (1) `registryd.ts:1163` `askAPerson`, fed by `endingAction` for unregistered desks (ROW 2/3 territory). (2) `packages/domain/src/workflows/supervise.ts:178-183` (`superviseOne`/`rules/supervision.ts`), a *separate* classifier for still-registered agents, applied via `packages/fleet/src/server/entry/loop-writes.ts:179`. (3) `agentLoop` itself emits `{kind:'blocked-marker',...}` writes in-loop for `corrections-spent`/`unstarted`/`limited`/dropped-twice endings (`agent-loop.ts:429,653,667,793`), applied by the same performer as everything else (`perform-fs.ts:66`). A fix aimed at the wrong one will look right in a unit test and never touch the desks this plan is about — the motivating desks were unregistered (ROW 2 territory, path 1 or a stale file reaching it), not still-supervised agents (path 2).

**Rule carried over unchanged, from `CLAUDE.md`'s "Answers, never verdicts":** a merged PR's `mergedAt` is the one trustworthy "did this land" signal — `reapable.ts:130-132` already reads it that way (`readings.merge !== 'merged'`). Don't introduce an ancestry check here; none of this slice's logic needs one.

### Done when

The plan's `## Done when` is implicit in its Changelog: *"A desk whose loop ended at the free-wait bound with no slice offered no longer gets a `PLOT-BLOCKED.md`... and is reaped on the next pass."* For this slice specifically:

- A test shows a ROW 2 ending (free loop, `waitedSeconds >= boundSeconds`, no assignment ever held) leaves the desk with no `PLOT-BLOCKED.md` and `reapable.ts`'s `blocked-marker` refusal absent — extend `packages/domain/test/workflows-agent-loop.test.ts:111-118` or add a focused test asserting the *full path* (loop end → no marker write → `reapProblems` returns no `blocked-marker` entry for that tree), not just the already-covered `agentLoop` return value in isolation. The existing test only proves `agentLoop` writes nothing; it does not prove downstream nothing creates or leaves a marker for this case — that's the gap this slice closes.
- If the stale-ending-file hypothesis above is confirmed, add a test for the free-loop reset path (wherever a desk goes from holding an ending record to being free again) proving the record is cleared or ignored, not just that ROW 2 itself stays clean.
- Name explicitly, in the PR description, which of the three write sites above was actually responsible — this plan's own Open Questions left it unresolved, and closing it precisely is what makes the second slice's row-text work trustworthy.

Plus the repo's gates: no bundle diff (CI rebuilds `board-server.mjs` itself — do not commit a rebuilt bundle), and a changeset if this ships as a release-visible fix. Run `node skills/plot/scripts/board/plot-local-checks.mjs` before each push and run what it prints — it resolves the tests and typecheck for exactly the packages this change touches (`packages/domain/**`, possibly `packages/fleet/**`). The suites in the `CI suites` config key (`test:e2e`, `test:contracts`, `test:board`, domain coverage, `test/reconcile/*.test.mjs`) run in CI on every PR; don't run them locally as a matter of course — `test:e2e` especially is CI's gate, not a local one (see `CLAUDE.md` § Testing).

**`scripts/check-shell-lines.sh` ratchets the shipped shell under `skills/` against its merge base.** This slice is domain/fleet TypeScript, not shell — if it stays that way, the gate is a non-issue; if a `.sh` file ends up touched, growth must be paid for by removing an equal number of lines elsewhere in the same change.

### Bookkeeping

Open the PR through the controller once the branch exists and holds a commit:

```bash
skills/plot/scripts/plot-open-pr.sh          # current branch
skills/plot/scripts/plot-open-pr.sh --draft  # while still moving
```

Never `gh pr create` directly — it can't resolve the plan/wave heading this needs. Push the first real commit as soon as it exists (claims the branch visibly on the board). When the PR is created, append `→ #<number>` to this branch's line under the plan's `## Slices` → `### Clean end` heading, and set the PR to "Ready" on the project board if one is configured for this repo (check `## Plot Config` — none is currently declared here, so this likely doesn't apply).

### Scope guard

This branch owns: `packages/domain/src/workflows/agent-loop.ts` (ROW 2 and anything immediately adjacent to the free-loop reset), `packages/domain/src/rules/reapable.ts` only if the stale-record hypothesis requires a reapable-side change (unlikely — the existing `blocked-marker` check is correct once the write/staleness is fixed), and their test files.

**Not this branch's scope:** `packages/domain/src/rules/ending-action.ts` and `packages/fleet/src/server/entry/registryd.ts`'s `askAPerson`/marker-text composition — both are already correct for a fresh `null` reading per the trace above; touching them without a confirmed runtime reason re-opens a question this brief already closed. The sibling slice `bug/an-ended-desk-is-not-waiting-on-you` owns the *Waiting on you* row text and section membership — do not pre-empt it here; this slice's job is only that the marker doesn't exist (or a stale one doesn't survive) in the first place.

If you find something the plan did not anticipate — in particular, if the stale-ending-file hypothesis turns out to be wrong and a fourth write path is the real cause — report it rather than improvising outside scope; it changes what the second slice can assume.
