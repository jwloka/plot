## Implementation brief — the-controllers-close-their-review-findings (wave 4: The merge reads what it claims)

- **Plan (canonical):** [docs/plans/2026-10-10-the-controllers-close-their-review-findings.md](../../docs/plans/2026-10-10-the-controllers-close-their-review-findings.md) on `main`
- **Approved:** 2026-10-10, Jan Wloka, plan-PR #1498 merged
- **Branch:** `bug/the-merge-reads-what-it-claims` (base: `main`)
- **Ends as:** one PR to `main`
- **Review of the code:** PR

Waves 1–3 (`bug/the-approval-asks-the-domain` merged as #1506; `bug/the-entries-write-through-a-port` merged as #1515; `bug/the-implement-lock-lives-on-disk`, in flight) touch `entry/approve.ts`, `PlanStore`, `Trees`, `implement-run.ts` and `dispatch-command.ts`. This wave touches none of those files — `entry/merge.ts`, `workflows/merge.ts`, `rules/default-branch.ts`, `entry/main.ts`, and `CLAUDE.md`/`AGENTS.md` line 499 — so it carries no ordering dependency on the other three and can run in parallel with whichever of them is still open.

### What to build

Four findings from review pass #1483, confirmed still live on this branch's base:

- **#1483 L2 — a failed default-branch read merges.** `entry/merge.ts:38` (`mergeAt`) reads `reading.ok ? reading.value : null` — a port call that failed (`ok: false`, e.g. EACCES/EIO reading the reading file) is folded into the same `null` the domain treats as "no reading, holds nothing." The domain's `MergeReadings.defaultBranch` type has no slot for "the read itself broke," so a transient disk error on the one file that would have blocked the merge instead reads as permission to proceed.
- **#1483 M2 — the moved-head fixture passes without the pin.** `test/reconcile/host.test.mjs:418-424`'s fixture sets `ghFail` unconditionally for every `gh` call in that test, so the merge fails regardless of what `--match-head-commit` names — a revert of the pin argument would still show this test failing (for the wrong reason) or passing by accident. It needs to fail the merge **only** when the pinned sha doesn't match the stub's head, so a regression in the pin itself is what the test actually proves.
- **#1483 L1 — `checks-unbound` has no producer.** `workflows/merge.ts:85` refuses when `pr.checksSha !== pr.headSha`, but `plot-host.sh:3577` always sets `checksSha` to `headRefOid` — no adapter today can produce the mismatch this refusal guards against. The refusal is correct defense-in-depth, not dead code to delete; TSDoc needs to say so explicitly, naming that no live producer exists today.
- **#1483 L3 — no argv test for `plot-ask.mjs merge`.** `entry/main.ts:144-149` validates `pr` and `sha` before calling `mergeAt` (checks `pr` is all-digits; `sha` is only checked for truthiness, not shape) but no test exercises this validation path directly — `merge-entry.test.ts` only tests `mergeAt` itself, never the CLI argument parsing in front of it.
- **#1483 L4 — `CLAUDE.md:499` contradicts itself in the same paragraph.** The paragraph first states `merge` is "a tenth" controller endpoint reachable with no board via `plot-ask.mjs merge <pr> <sha>`, then two sentences later says `plot-ask.mjs` answers "`board`, `fleet` and `deliverable` plus `release-claim` and **no lifecycle action**" — `merge` is both named as a lifecycle action reachable through `plot-ask.mjs` and excluded from the count of what `plot-ask.mjs` answers, in the same paragraph.

### The decisions the plan settles — do not re-derive them

**The failed-read refusal is a new `MergeReadings` shape, not a `try/catch` in the entry.** Per *A Decision Reads The Index* in `CLAUDE.md`, "a missing, unparseable or other-version file still reads as `null` and holds nothing" — that part of the contract is right and must not change. What's missing is a THIRD state alongside `null` (no reading) and a real `DefaultBranchReading` (a reading): a failed read. `DefaultBranchStore.read()`'s own TSDoc already distinguishes `null` ("there is no file or the file is not one this Plot knows") from `failed` ("the read itself broke") at the `PortResult` level — `mergeAt`'s `reading.ok ? reading.value : null` is where that distinction gets thrown away. The fix threads `reading.ok` through to the domain so `merge()` can refuse `unaskable` on a failed read, the same refusal code already used for a host that didn't answer — don't invent a second refusal code for "the default-branch port didn't answer" when `unaskable` already means exactly that for the PR lookup.

**The age bound is `defaultBranchRed`, already written — call it, don't reimplement it.** `rules/default-branch.ts` already has `defaultBranchRed(reading, now, checksWaitMs)`, which wraps `settledRed` with the exact aging logic this finding needs: "a reading whose `askedAt`... is older than `checksWaitMs`... counts as no reading and holds nothing." `workflows/merge.ts:90`'s current check (`defaultBranch.settled !== undefined && settledRed(defaultBranch)`) calls the unaged `settledRed` directly. Switch that call site to `defaultBranchRed`, passing `now` and `checksWaitMs` through `MergeInput` (or wherever the plan's Design section implies the clock enters — `merge()` itself is a pure domain function and currently takes no `now`, so this is the one signature change this slice makes to that function). This is the plan's own Open-Question answer: "`Checks wait`; a reading older than it counts as no reading, for the merge controller **and the fleet's hold**, and no new key is added" — the fleet's own hold (a sibling plan, `the-channel-closes-its-review-findings`, #1463 M1) is landing the same call against the same function; do not add a second aging helper that duplicates `defaultBranchRed`.

**The host-fixture fix is a test change only.** `host.test.mjs:418-424` is production-adjacent test code, not the `pr-merge` implementation — `plot-host.sh`'s `--match-head-commit` argument passing is already correct (confirmed in the passing "pins the merge with `--match-head-commit`" test just above the broken fixture). The fix narrows `ghFail` to fire conditionally on the sha argument the stub receives not matching the fixture's intended head, so the test distinguishes "the pin matched, host still rejected" (not this finding) from "the pin didn't match, so of course it failed" (what the test currently can't tell apart from a reverted pin).

**`checks-unbound`'s TSDoc states the gap, not a promise to close it.** This is documentation only: `workflows/merge.ts`'s doc comment for `checks-unbound` (or the function's own doc block) needs one sentence naming that `plot-host.sh` always sets `checksSha` to `headRefOid` today, so no adapter can currently trigger this refusal — it exists for a future adapter that might report checks against a different commit than the head. Do not remove the refusal branch; removing defense-in-depth because today's single adapter happens not to need it is the opposite of what the finding asks for.

**The argv test belongs beside the other `main.ts` argv tests, exercising the CLI boundary, not `mergeAt`.** `merge-entry.test.ts` already covers `mergeAt`'s domain-facing behavior; this finding wants a test that drives `main.ts`'s dispatcher directly with bad argv (`['merge']`, `['merge', '7']`, `['merge', 'abc', 'deadbeef']`, and a sha shorter than 40 hex characters) and asserts each exits 2 with the usage string on stderr — mirroring whatever pattern the existing `release-claim` or `deliverable` argv tests in the same file already use for shape-checking. Note `entry/main.ts:146` only checks `pr` is numeric; it does **not** currently validate `sha`'s length/hex-ness at all — read the plan's Design section line again ("a test covers `merge`, `merge 7`, `merge abc deadbeef` and a short sha, each exit 2") before assuming the existing code already does this. If `main.ts` doesn't yet refuse a malformed sha, this slice adds that check, since the test the plan specifies requires it to exit 2.

**The `CLAUDE.md` fix is "state one count," and the generated `AGENTS.md` follows, not a hand-edit.** Change line 499's final sentence so the paragraph counts `plot-ask.mjs`'s board-free answers consistently with the earlier sentence naming `merge` as reachable through it — the simplest fix is dropping "and no lifecycle action" (since `merge` *is* one) rather than restructuring the whole paragraph. After editing `CLAUDE.md`, run `./scripts/check-agents-md.sh --write` to regenerate `AGENTS.md` — never hand-edit `AGENTS.md`, it's generated and CI refuses a mirror that differs from what the script produces.

### Done when

Per-finding, from the plan's table:

- #1483 M2 — `host.test.mjs`'s moved-head fixture fails the merge only on an unmatched `--match-head-commit` pin, not unconditionally.
- #1483 L1 — `workflows/merge.ts`'s `checks-unbound` TSDoc states that no adapter today produces a `checksSha` other than the head.
- #1483 L2 — `mergeAt` refuses `unaskable` when the default-branch port read fails (`ok: false`), distinct from the existing `null`-holds-nothing path for a missing/unparseable/other-version file.
- #1483 L3 — a test drives `entry/main.ts`'s `merge` argv branch directly (not through `mergeAt`) and asserts `merge`, `merge 7`, `merge abc deadbeef`, and a short-sha call each exit 2.
- #1483 L4 — `CLAUDE.md:499` no longer excludes `merge` from `plot-ask.mjs`'s board-free actions in the same breath it names `merge` as one; `AGENTS.md` regenerated via `./scripts/check-agents-md.sh --write`.

Plus, specific assertions a naive fix would pass without:

- A test proving a merge still succeeds when the default-branch reading is simply absent (`null`, no file) — the L2 fix must not turn "no reading" into a refusal; only a **failed** read (`ok: false`) should refuse. A fix that refuses on both collapses back to the old over-broad behavior in the other direction.
- A test proving the age bound actually lifts a hold: a reading settled red but with `askedAt` older than `Checks wait` must NOT block the merge (reads as no reading), while the same red reading within the bound still does. Switching `settledRed` to `defaultBranchRed` without a test on both sides of the age boundary would pass a type check while silently keeping the old unaged behavior if the `now`/`checksWaitMs` wiring is wrong.
- A test that the narrowed `host.test.mjs` fixture still catches a genuine regression — revert `--match-head-commit`'s argument in `plot-host.sh` locally and confirm the test fails; a narrowing that only changes *when* `ghFail` fires but still passes when the pin is broken isn't the fix.

Plus the repo's own gates: run `node skills/plot/scripts/board/plot-local-checks.mjs` before each push and run what it prints — this slice touches `packages/domain/src/**` (vitest + `tsc --noEmit`) and `packages/board/src/**` (vitest + typecheck), both named in `## Plot Config`, plus `test/reconcile/host.test.mjs` (`node --test`). Add a changeset for `plot` with the description first and the `bumps:` block last, per `CLAUDE.md`'s Versioning section — `patch` fits unless the `MergeReadings`/`merge()` signature change is judged to warrant `minor`. This slice touches no `.sh` file under `skills/`, so `scripts/check-shell-lines.sh`'s budget does not apply; if work reveals a reason to touch one, budget that trade explicitly rather than assume it's free.

### Bookkeeping

Open the PR through the controller once the branch exists and holds a commit:

```bash
skills/plot/scripts/plot-open-pr.sh          # current branch
skills/plot/scripts/plot-open-pr.sh --draft  # while work is still moving
```

Do not run `gh pr create` — the controller reads which plan names the branch and titles the PR from the wave heading, not the last commit subject. Push the first real commit as soon as it exists, and append `→ #<number>` to this branch's line in the plan's `## Slices` section once the PR is created.

### Scope guard

This branch owns: `packages/board/src/server/entry/merge.ts` (the failed-read threading), `packages/domain/src/workflows/merge.ts` (the `defaultBranchRed` call, the `checks-unbound` TSDoc, any `MergeReadings`/`MergeInput` shape change the age bound needs), `packages/domain/src/rules/default-branch.ts` (read-only reference to the existing `defaultBranchRed` — do not change its behavior, this slice only adds a caller), `packages/board/src/server/entry/main.ts` (the `merge` argv validation), `test/reconcile/host.test.mjs` (the moved-head fixture), `CLAUDE.md` line 499 and the generated `AGENTS.md`.

Three sibling branches are in flight under the same plan, none overlapping this one's files: `bug/the-approval-asks-the-domain` (merged, #1506), `bug/the-entries-write-through-a-port` (merged, #1515), `bug/the-implement-lock-lives-on-disk` (`implement-run.ts`, `dispatch-command.ts`, `board/server/implement.ts`). A fourth plan, `the-channel-closes-its-review-findings`, is landing a sibling caller of `defaultBranchRed` for the fleet's own hold (#1463 M1) — if that lands first, confirm the function's signature didn't shift under you before wiring this slice's call. No slice in this plan edits `plot-controller-gate.sh` or `rules/ci-suite.ts`; those findings moved to `the-gates-are-launchers`.

If you find something the plan did not anticipate, report it rather than improvising outside scope.
