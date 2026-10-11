## Implementation brief — the-channel-closes-its-review-findings (wave: Board readings wiring)

- **Plan (canonical):** docs/plans/2026-10-10-the-channel-closes-its-review-findings.md on main
- **Approved:** 2026-10-10, Jan Wloka, plan-PR #1497 merged
- **Branch:** `bug/the-board-builds-the-default-branch-reading` (base: `main`)
- **Ends as:** one PR to `main`
- **Review of the code:** per repo convention (PR review)

This slice follows slice 4 ("Brief-writer row", `bug/the-brief-writer-row-reads-the-rule`) because both touch `agents-tab.browser.test.ts`. Slice 4 merged as PR #1532 (`c8e3437a1`) on 2026-10-11 — this branch is unblocked. No other slice shares a file with this one.

### What to build

Close out issue #1476 (4 findings, all on `main` at `eb4bda159` and still open — verified again just now, nothing moved since the plan's audit):

1. **M1 — no test proves `buildBoard` wires the default-branch reading in.** `Estate.defaultBranch` (`packages/board/src/server/estate.ts:54,87,126`) and `BuildBoardOptions.defaultBranchStore` (`board.ts:217-218`) both exist and are plumbed, but grepping `packages/board/test/unit/` for `defaultBranchStore` returns nothing. Deleting `board.ts:2143-2144` (the `checksSha` field on a card's PR) or `:2352` (`defaultBranch: defaultBranchReading` in the returned shape) would not fail a single test. Add a unit test that builds a board through `opts.defaultBranchStore` with a fixture store and a PR record carrying `checksSha`, and asserts both land in the output.
2. **L1 — `mockEstate`'s comment is already stale, in the other direction.** `estate.ts:124-126` says "a mock board never ran fleetd and has nothing to report" — true — but the field itself is real and read nowhere in `buildBoard` except to echo it back out as `defaultBranch: defaultBranchReading` (`:2352`). Decide: wire `Estate.defaultBranch` into something `buildBoard` actually consults (there may be nothing left to wire — `defaultBranchReading` already comes from `defaultBranchStoreFor(opts)`, not from `Estate`), or remove the unused field and correct the comment. Don't leave both a live field and a comment describing the wrong gap.
3. **L2 — `checksShaSuffix('')` renders `" @"`.** `checks-reading.ts:134-137` only tests `undefined`. The adapters currently drop an empty string before it reaches this function (`host-shell.ts:95`, `pr-refresh.ts:1091`), so this is a latent bug, not an observed one — guard `''` the same as `undefined` and reword the absent-case sentence: it currently claims "These checks are not bound to a commit" (a host-level fact — Jenkins), but an empty/missing `checksSha` from a host that *does* bind checks to commits is a different situation — the board just didn't record it. Say that instead.
4. **L3 — the short-SHA assertion doesn't test truncation.** `checks-reading.test.ts:157-160` passes `checksSha: 'a048b6f1234567890'` (18 chars) and asserts `toContain('a048b6f')` (7 chars) — `.toContain` passes whether or not `.slice(0, 7)` ran, because the 7-char string is a substring of the 18-char one either way. Assert the exact 7-char suffix (`toBe`, not `toContain`), or assert the detail does NOT contain the 8th character onward.
5. **L4 — the green-branch browser test waits on the wrong signal.** `agents-tab.browser.test.ts:4052` ("shows no extra panel entry when the default branch is green") waits on `page.getByText('Waiting on you')` — a fleet-payload render — before polling `[data-status-panel]`. The board payload (which carries the default-branch reading this test is actually about) can arrive on a separate request; the fleet text landing first doesn't prove the board payload has. Wait on a board-payload-specific signal before the poll. **This adds no new `it(`** — change the existing test's wait, don't add one. `EXPECTED_TESTS` (`stubbed-tests-start-no-board.test.ts:671`, currently `557`) stays unchanged.

### Decisions the plan already settled — do not re-derive them

- **This is a wiring/test-coverage slice, not a behavior-change slice for M1 and L1.** The plan's own audit (Notes, line 174) found `Estate.defaultBranch` already present and `buildBoard`'s card-level `checksSha` field already present — verified again today, both still true. The gap M1 names is a missing *test*, not missing code. Resist the urge to "fix" code that already works; the fix is proving it with a test that would fail if the wiring broke.
- **L1's resolution is open-ended on purpose** (plan Design, Slice 5 intro says "wired or removed") — the plan does not pre-decide whether `Estate.defaultBranch` survives. Read what `buildBoard` actually does with it before choosing; don't assume removal is safer than wiring, or vice versa.
- **The `checksSha`-vs-`headSha` distinction in `checksShaSuffix`'s existing TSDoc is load-bearing** (`checks-reading.ts`, the comment above the function): `checksSha` is used *because* Jenkins doesn't bind checks to a commit and `headSha` would misrepresent that. The L2 fix must not blur this — the new empty-string message is about the board failing to *record* a binding that exists, not about a host that has none. Keep both sentences distinguishable.
- **No `EXPECTED_TESTS` bump for this slice.** Per plan Design (`## Design › Approach`, second bullet): slices 4 and 5 change existing browser tests only. If you find yourself adding an `it(` here, that's a signal you've misread the finding — L4 is a wait-condition fix on an existing test, not new coverage.

### Done when

The plan's `## Done when` doesn't exist as a literal section in this plan (it uses per-slice bullet lists instead) — treat the slice-5 bullet in `## Slices` as the spec: *"a unit test builds a board from a fixture store and a PR record with `checksSha`, the Estate's `defaultBranch` is wired or removed, `checksShaSuffix` handles `''` and names a missing record, and the green browser test waits on the board payload (#1476 M1, L1–L4)."*

Assertions a naive implementation would pass without, and what each catches:

- The new unit test must build through `opts.defaultBranchStore` and assert on the **output** (not just that the function doesn't throw) — otherwise deleting `board.ts:2143-2144` or `:2352` still passes it, which is the exact gap M1 names.
- The L3 fix must assert the *exact* 7-char suffix or explicitly assert the 8th+ characters are absent — `toContain` on a short substring of a long truncatable string proves nothing about truncation.
- The L4 fix must change what the test waits on, not just add a longer timeout — a longer timeout on the same fleet-payload signal still doesn't prove the board payload landed.

Plus: run the local checks before each push —

```bash
node skills/plot/scripts/board/plot-local-checks.mjs
```

and run what it prints: the tests naming a changed file, the related tests and typecheck for `packages/domain` and `packages/board`, plus the gate tests and `scripts/check-*.sh`. The suites in `CI suites` (`pnpm run test:e2e`, `test:contracts`, `test:board`, the domain vitest run with coverage, `test/reconcile/*.test.mjs`) run in CI on every PR — don't run them locally as a matter of course; `test:e2e` especially is CI's gate, not a local one (see CLAUDE.md § Testing).

**Shell gate:** `scripts/check-shell-lines.sh` refuses a PR whose shell under `skills/` grew past its merge base. This slice touches no `.sh` file per its file list, so this should be a non-issue — but if a fix ends up touching `plot-host.sh` or similar, growth must be paid for by removing shell elsewhere in the same change.

**Board artifact:** this slice changes `packages/board/src/server/board.ts` and `estate.ts` — real board source, not the generated bundle. Keeping the board working is part of the Definition of Done (CLAUDE.md § Testing). On a merge/rebase conflict in the generated `board-server.mjs` artifact, restore it from the merge base rather than committing a rebuild (CLAUDE.md has the exact procedure).

### Bookkeeping

Open the PR through the controller once the first real commit exists:

```bash
skills/plot/scripts/plot-open-pr.sh          # current branch
skills/plot/scripts/plot-open-pr.sh --draft  # while work is still moving
```

Never `gh pr create` directly — it can't resolve the plan's wave heading or detect a branch already carrying a PR. When the PR is created, append `→ #<number>` to this branch's line in the plan's `## Slices` section (the "Board readings wiring" heading, `bug/the-board-builds-the-default-branch-reading` line).

### Scope guard

This branch owns:

- `packages/board/src/server/board.ts` (test only — no production change expected unless L1 decides to remove `Estate.defaultBranch`)
- `packages/board/src/server/estate.ts`
- `packages/domain/src/rules/checks-reading.ts`
- `packages/domain/test/checks-reading.test.ts`
- a new or existing board unit test (file TBD — none currently covers `defaultBranchStore`)
- `packages/board/test/integration/agents-tab.browser.test.ts` (only the L4 wait condition — slice 4 already landed its own changes here)

Other branches in this plan, re-verified via `gh pr list` on 2026-10-11:

- `bug/a-stale-default-branch-reading-holds-nothing` (slice 1) — **merged**, PR #1505.
- `bug/the-channel-stamps-what-it-hears` (slice 2) — **merged**, PR #1513.
- `bug/the-fleetd-wiring-has-tests` (slice 3) — **merged**, PR #1523.
- `bug/the-brief-writer-row-reads-the-rule` (slice 4) — **merged**, PR #1532.
- `bug/the-page-hears-the-last-event` (slice 6) — no PR yet, no branch pushed.
- `bug/the-mod-follows-after-a-reload` (slice 7) — no PR yet, no branch pushed.

Every wave this one depends on has landed — nothing blocks starting it.

None of these touch this slice's files per the plan's own file-overlap analysis (Notes: "The other slices share no file"). A collision would be a plan error, not an expected risk.

If you find something the plan did not anticipate, report it rather than improvising outside scope.
