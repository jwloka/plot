## Implementation brief — the-channel-closes-its-review-findings (wave: Mod reload and gate)

- **Plan (canonical):** [docs/plans/2026-10-10-the-channel-closes-its-review-findings.md](../../docs/plans/2026-10-10-the-channel-closes-its-review-findings.md) on `main`
- **Approved:** 2026-10-10, Jan Wloka, plan-PR #1497 merged
- **Branch:** `bug/the-mod-follows-after-a-reload` (base: `main`)
- **Ends as:** one PR to `main`
- **Review of the code:** per plan Review (`pr`)

This is the plan's last slice. The six earlier branches (default-branch reading age, channel heartbeat/inputs, fleetd wiring tests, brief-writer row, board readings wiring, page event throttle) touch no file this slice touches — nothing here waits on them, and nothing waits on this.

### What to build

Fix five defects in `plot-follow`, the Claude Code mod that turns fleet channel findings into toasts, a status pane, and — for a few listed finding names — a new agent turn. All five were filed from the review of `the-fleet-reports-what-changed-on-the-host` as issue #1481 (findings M1–M3, L1, L2):

1. **M1 — a reload drops the connection.** `follow.tsx:92-114` starts the connect loop and the 30 s retry timer only inside `session.start`'s detached block. `/reload-plugins` or a `userConfig` change reloads the module and loses both, while `held` (an `atom`, `follow.tsx:24`) survives the reload with stale findings still showing. Start the loop at module load too, and mark the pane stale (not just "nothing heard yet" — it *has* heard, it just isn't sure it's current) until the channel answers again.
2. **M2 — `clear` doesn't clear a held line.** `turnGate` (`follow-channel.ts:86`) returns `{ start: false, text: '', state }` unchanged for any finding name not in `listed`, and `clear` is deliberately never listed (it's a channel protocol signal, not something an operator turns on). So a `clear` finding removes its slot from `held` findings via `absorbFinding` (`follow-channel.ts:117-123`, which the pane reads for display) but never touches the turn gate's own `held: readonly string[]` lines (`TurnGateState.held`, `follow-channel.ts:40`) — those are formatted strings keyed by nothing, so there's no slot to remove by. A line one a turn-gate `held` list stays queued for the *next* turn's text even after the channel says the underlying finding is gone.
3. **M3 — one gate key for every repo and session.** `GATE_KEY = 'turn-gate'` (`follow.tsx:20`) is a single literal. `readGate` → `turnGate` → `$.store.set(GATE_KEY, decided.state)` (`follow.tsx:33-45`) is a plain read-modify-write with no version check. Two repos open in two sessions share one `TurnGateState`, so repo A's held findings and turn count leak into repo B's gate, and a race between two `arrive()` calls (same repo, two fast findings) can lose one's `held` line entirely.
4. **L1 — a fleetd restart re-opens closed questions.** `follow.tsx:69-73` replaces the whole `held` finding list on every `welcome` with no comparison to what was already held, and `arrive()` runs `turnGate` for every `finding` message with no check against the previous reading. A fleetd restart republishes every current finding; each one re-enters the gate as if new, which can start a turn about something nothing actually changed on.
5. **L2 — an exception leaks the follower.** The read loop (`follow.tsx:51-83`) only calls `lines.return?.()` on the `ended` path (line 80), set by a `served`/`refused` message. A throw from `JSON.parse(line)` (line 68) or from `arrive()` propagates out of `follow()` uncaught by any `finally`, so the async iterator is never closed. The outer `catch` in `connect()` (line 106) catches the throw and resets `isRunning = false`, so the next 30 s tick starts a **second** follower process on top of the first one, which never got torn down.

### The decisions this slice settles — do not re-derive them

**The fix for M1 is "also start on module load", not "replace `session.start`".** `session.start` is awaited before the first prompt (the comment at `follow.tsx:96-97` says so), so the connect/retry setup there is deliberately detached (`void (async () => {...})()`) to avoid delaying that prompt. A reload doesn't re-fire `session.start` — it just re-executes the module top level. So the fix adds a second entry point at module scope, not a change to what `session.start` does. Guard against double-starting both loops when a *normal* (non-reload) module load is followed by a real `session.start` in the same process — `isRunning` already exists for exactly this shape; reuse it rather than adding a second flag.

**M2's fix is in `follow-channel.ts`, not `follow.tsx`.** `turnGate`'s early return at line 86 is correct for every other unlisted name — it's specifically `clear` that needs different handling, because `clear` is a structural signal (an *un-finding*) rather than an ignorable one. The natural shape: `turnGate` special-cases `finding.finding === 'clear'` before the `listed` check, and removes any `held` line whose slot (`monitor`/`branch`, matching `slotOf` in `absorbFinding`) matches the arriving `clear`. That means `TurnGateState.held` needs to carry enough structure to compute a slot, not just a formatted display string — check whether this means `held` changes from `readonly string[]` to something slot-aware before the text is rendered at turn-start (`held.join('\n')`, line 99), since changing that shape changes the persisted `TurnGateState` that `follow.test.ts`'s fixtures seed directly via `mock.store(on, { [GATE]: {...} })`. The existing `clear` test for `absorbFinding` (`follow-channel.test.ts:135-139`) is unaffected — it's about pane display, not the gate — write the new test for `turnGate` and `clear` as its own case.

**M3's `ifVersion` is new vocabulary — nothing in the estate uses it today.** `grep -rn ifVersion` across the repo returns nothing. There is no existing `$.store` compare-and-swap pattern to copy; whatever the mod SDK (`claude-code`) exposes for optimistic writes needs to be found in that package's own type declarations/docs first, not assumed from this repo's conventions. Keying the gate per repository is the simpler half — `GATE_KEY` becomes a function of `e.cwd` (the repo path `session.start` already receives, `follow.tsx:92`), e.g. `` `turn-gate:${cwd}` ``. Do both halves; the per-repo key alone does not fix the same-repo race in #4 below, and the race fix alone does not fix cross-repo leakage.

**L1's "unchanged" comparison is per-slot, matching `absorbFinding`'s own notion of identity.** A finding is "the same as before" when it occupies the same slot (`monitor` + `branch`) and reports the same `evidence`/`since` — not when the whole `FollowedFinding` object is `===`-equal, since a fresh `welcome` always constructs new objects. Compare against what `held` (the atom, not the turn gate) already has for that slot before deciding whether `arrive()` should run `turnGate` at all. The `welcome` handler (`follow.tsx:69-71`) currently discards the previous `held.findings` outright (`() => ({ findings: message.current, heard: true })`) — the fix needs the previous value to compare against, so this likely becomes an `update()` callback that reads `h.findings` rather than a flat replace.

**L2's fix is a `finally`, not a new catch.** Wrap the loop body in `follow()` (lines 54-83) so that `lines.return?.(undefined as never)` runs whether the loop exits via `ended`, via `step.done`, or via a thrown exception — not only on the `ended` branch. The existing `ended` handling becomes redundant once the `finally` covers it; keep the early `break` for the `ended` case (it should still stop reading immediately) but let the `finally` own closing the iterator exactly once. The outer `connect()` catch (line 106) stays as the thing that resets `$.ui.status` and `isRunning` — this fix is about the iterator, not about `connect()`'s retry behavior.

**Rule carried over from `the-fleet-reports-what-changed-on-the-host`, unchanged here: absence is not false.** `readGate`'s fallback to `EMPTY_TURN_GATE` (`follow.tsx:35-37`) when the store holds anything unexpected is deliberate, matching the rest of this estate's convention that a missing/malformed stored value means "no reading yet," never a reading of `false`/empty-as-equivalent-to-zero. Don't collapse that check when touching `readGate` for the per-repo key change.

### Done when

The plan's `## Done when` is stated through its Changelog line for this slice: *"The plot-follow mod keeps following after a reload, drops a line that a `clear` retracted, and keeps its turn gate per repository."* That names three of the five findings (M1, M2, M3) explicitly; L1 and L2 are the same issue's lower-severity findings and are in scope for this branch per the Slices section (`#1481 M1–M3, L1, L2`).

Lift these assertions because a naive fix passes without them:
- **M1:** a test that reloads the module (re-imports/re-executes `register`, however `follow.test.ts`'s harness allows that) and asserts the connect loop restarts — not just that `session.start` still works the first time.
- **M2:** a `turnGate` test where a `clear` arrives after a line is already held for that slot, asserting the line is gone from `state.held` — the existing `absorbFinding` clear test does not exercise `turnGate` at all.
- **M3:** a test with two concurrent `arrive()` calls (or two sessions) against the same underlying store key, asserting neither write clobbers the other's `held` line — a sequential test alone won't catch a missing `ifVersion`.
- **L1:** a test where `welcome` republishes a finding identical to one already in `held`, asserting `turnGate`/`arrive` runs no turn start for it.
- **L2:** a test where the follower's stdout emits malformed JSON (so `JSON.parse` throws) partway through, asserting exactly one `process.spawn` call total across a subsequent retry tick — `follow.test.ts`'s `seen.spawned` array already exists for this.

Each test above should fail on `main` before the fix and pass after — confirm that rather than trusting the description.

Plus: this touches no browser test and `packages/board`, so `EXPECTED_TESTS` in `stubbed-tests-start-no-board.test.ts` does not move. `mods/plot-follow/hooks/follow-channel.ts` must stay byte-identical to `packages/domain/src/rules/follow-channel.ts` — `packages/domain/corpus/follow-channel.corpus.test.ts` fails the branch if they drift, so any change to the domain file must be copied into the mod's file in the same commit, not ported later. Run `node skills/plot/scripts/board/plot-local-checks.mjs` before each push and run what it prints — it resolves the related `packages/domain` tests and typecheck for the files this branch touches, plus the repo's shell gates. The suites named in `CI suites` run in CI on every PR; don't run them locally as a matter of course.

`scripts/check-shell-lines.sh` refuses a PR whose shell under `skills/` grew past its merge base. This slice touches no `.sh` file, so it should not trip — if a fix ends up touching a shell script, that growth must be paid for in the same change.

### Bookkeeping

Open the PR through the controller once there's a real commit:

```bash
skills/plot/scripts/plot-open-pr.sh          # or --draft while work is still moving
```

Push the first real commit as soon as it exists — don't wait for all five findings to be done locally first. When the PR is created, append `→ #<number>` to this branch's line in the plan's `## Slices` section (`bug/the-mod-follows-after-a-reload` under "Mod reload and gate").

### Scope guard

This branch owns:
- `mods/plot-follow/hooks/follow.tsx`
- `packages/domain/src/rules/follow-channel.ts` **and** its byte-identical copy `mods/plot-follow/hooks/follow-channel.ts` (both files, same commit, every time either changes)
- `mods/plot-follow/hooks/follow.test.ts`
- `packages/domain/test/follow-channel.test.ts`

No other branch in this plan touches any of these four files (plan Notes: "the other slices share no file"). The six sibling slices are own-branch, independent, and — per the fleet scan at the time this brief was written — none has a remote ref yet beyond what the plan's `Started:` records already show for `the-fleetd-wiring-has-tests`, `the-brief-writer-row-reads-the-rule`, `the-board-builds-the-default-branch-reading`, and `the-page-hears-the-last-event`. A collision is not expected; if one surfaces anyway, report it rather than improvising outside scope.

If anything about the five findings above turns out to need a mechanism the plan didn't anticipate — e.g. the mod SDK has no compare-and-swap primitive at all, or reload hooks work differently than assumed — report that rather than guessing past it.
