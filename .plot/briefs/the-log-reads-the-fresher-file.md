## Implementation brief — the-fleet-closes-its-review-findings (wave 8: The log reads the fresher file)

- **Plan (canonical):** [docs/plans/2026-10-10-the-fleet-closes-its-review-findings.md](../../docs/plans/2026-10-10-the-fleet-closes-its-review-findings.md) on `main`
- **Approved:** 2026-10-10, Jan Wloka, plan-PR #1499 merged
- **Branch:** `bug/the-log-reads-the-fresher-file` (base: `main`)
- **Ends as:** one PR to `main`
- **Review of the code:** per repo convention (PR review)

Waves 1–7 of this plan are all merged (#1514, #1527, #1537, #1541, #1548, #1557, #1560, #1572). Nothing ahead of this branch is still open, and no other open PR touches `plot-fleetctl.sh` or `test/reconcile/fleetctl.test.mjs` — this slice can start clean.

### What to build

`tick_age_seconds` (`skills/plot/scripts/plot-fleetctl.sh:508-522`) picks its log by **existence**, not freshness: it reads `fleetd.log` whenever that file exists at all, falling back to `registryd.log` only when `fleetd.log` is absent entirely (`:510`). The daemon does not restart itself when its bundle changes, so a supervisor process started under the pre-rename bundle keeps ticking into `registryd.log` while `fleetd.log` sits empty or stale. The moment anything — even a single `/plot-fleet --once` under a newer bundle — creates `fleetd.log`, `--status` latches onto that file and reports its age, even though `registryd.log` is the one actually receiving fresh ticks. A healthy supervisor then reads as stale once that stale `fleetd.log`'s age crosses `FLEET_TICK_STALE_SECONDS`. Fix: compare the mtimes of both files (where each exists) and read the **newer** one.

This is issue #1443, filed as review findings on #1442 (`bug/the-supervisor-logs-as-fleetd`). The plan names it as slice 8, answering #1443 in full (M1, M2, L1–L5).

### The decisions this slice settles — do not re-derive them

**The plan's own line-number citations for `log-rotation.test.mjs` are stale — read `fleetctl.test.mjs` instead.** The plan (and issue #1443 L2, L5) cite `log-rotation.test.mjs:290-293` and `:302-305` for the "exists too" wording and the exact-source match. That file has moved since those measurements: `0d6fc20e4` (#1537, "The gate prints its tick" — wave 3 of this plan) touched it after the #1443 measurements were taken, and it now runs 300 lines with different content at those line numbers (it no longer contains an exact-source match on `processLog(join(logs, 'fleetd.log'))` at all — checked 2026-10-11). **The actual `tick_age_seconds` behavior is tested in `test/reconcile/fleetctl.test.mjs`**, not `log-rotation.test.mjs`:
- `fleetctl.test.mjs:1317` — "`--status` carries the tick age on the running summary line, and only with a log"
- `fleetctl.test.mjs:1350` — "`--status` reads the tick age from registryd.log while fleetd.log is absent" — this test's own closing assertions (`:1369-1373`) currently encode the *existence-first* behavior this slice must invert: it writes a fresh, empty `fleetd.log` beside an old, backdated `registryd.log` and asserts the **fresh** file's age wins ("Once fleetd.log exists it is the reading"). Under a freshness comparison this assertion is backwards and must become the opposite — the test needs a case where `fleetd.log` is older (per the plan's `## Slices` line: "with a test where `fleetd.log` is older"), and this existing test's expectation when both files exist needs correcting to match freshness-by-mtime rather than existence-first.
- `fleetctl.test.mjs:1377` — "`--status` prints no tick age outside the running arm" — unaffected by this change, but confirms the summary line's `tick_age=` field format to preserve.

Do not touch `log-rotation.test.mjs` for #1443's test changes — it is a different contract (log rotation/truncation, not the fallback-log choice) and the plan's own line references into it no longer resolve to the content described.

**`#1443 L4` (a cleanup line in `units/README.md`) still holds and is unwritten.** Checked 2026-10-11: `skills/plot/units/README.md` names the rename and the dual-label addressing scheme but has no line telling an operator how to remove the old, now-unrotated `registryd.log`, `registryd.err` and their `.1`–`.3` generations (up to ~40 MB per repo per the issue). Add one.

**`#1443 L1` — "Read why before restarting" names only the stdout log; crash and startup failures go to `.err` or the journal.** `plot-fleetctl.sh:837` and `:877` both print `Read why before restarting: .../fleetd.log`, but a `plot-fleetd failed to start:` message and crash traces write to `fleetd.err` (`registryd-main.ts:2070`-area), or to the systemd journal under systemd. Name `fleetd.err` and the journal alongside (or instead of) `fleetd.log` at both sites.

**`#1443 M2` — the comment at `plot-fleetctl.sh:505-506` names the wrong condition.** It currently reads: *"A unit filled before the rename to plot-fleetd writes `registryd.log` until `--stop` and `--start` fill it again, so that name is read when `fleetd.log` is absent."* Per the issue, this is inaccurate: the new code opens `fleetd.log`/`fleetd.err` itself regardless of what the plist says, so `registryd.log` only keeps receiving ticks while a **process started from the pre-change bundle** is still alive — any restart (not just an explicit `--stop`/`--start`) ends that. Reword to say "a supervisor process started before this change" rather than naming `--stop`/`--start` as the trigger.

**`#1443 L2` — `process-log.ts:21` undated "exists too".** The comment describing a hand-started `nohup … >> registryd.log` loop should carry a date or drop the filename, per the issue. (Note: this line lives in `packages/fleet/src/shared/process-log.ts`, a TypeScript source file, not the stale `log-rotation.test.mjs:6` the plan cites — confirm the live location before editing.)

### Done when

The plan's `## Done when` list does not name this slice individually — its tests are folded into the plan-level list, which this slice does not complete alone (other slices own the other bullets). This slice's own completion is the issue's fix list:

- `tick_age_seconds` returns the age of whichever of `fleetd.log`/`registryd.log` has the newer mtime, when both exist.
- A test in `test/reconcile/fleetctl.test.mjs` covers the case where `fleetd.log` is **older** than `registryd.log` and asserts the registryd reading wins — the inverse of what `:1350`'s existing test currently asserts when both files are present.
- The existing `--status reads the tick age from registryd.log while fleetd.log is absent` test's assertion at `:1369-1373` is corrected: a freshly-created, near-empty `fleetd.log` must NOT win over an actively-ticking, more-recently-written `registryd.log` purely because it exists.
- The `plot-fleetctl.sh:505-506` comment names "a supervisor process started before this change," not `--stop`/`--start`.
- `plot-fleetctl.sh:837` and `:877` name `fleetd.err` (and the journal) for startup/crash diagnosis, not only `fleetd.log`.
- `process-log.ts`'s "exists too" comment is dated or loses the filename.
- `skills/plot/units/README.md` gains a cleanup line for old `registryd.*` logs and their rotated generations.

Plus: the repo's gates — build artifacts, changeset, platform constraints. This slice touches `skills/plot/scripts/plot-fleetctl.sh` directly (shell, not a generated bundle) and `packages/fleet/src/shared/process-log.ts` (TypeScript, rebuilt into the board bundle by main after merge — do not commit a rebuilt bundle yourself). Add a changeset per [Versioning](../../CLAUDE.md#versioning): description first, `bumps:` block last, optionally naming this plan via a `plan:` line. For tests, run `node skills/plot/scripts/board/plot-local-checks.mjs` from the repo root before each push and run what it prints; the suites in the `CI suites` config key run in CI, and a failure there comes back as a correction. Do not run the full `test:e2e` suite locally — it is CI's gate, not a local one.

`scripts/check-shell-lines.sh` refuses a PR whose shell under `skills/` is longer than at its merge base. This slice edits `plot-fleetctl.sh` (shell) — if the freshness-comparison logic and the two comment rewrites add net lines, remove an equal number elsewhere in the same change, or move the decision into the domain and ask it through a bundle. The gate stores no number and has no override.

### Bookkeeping

Open the PR through the controller once the first real commit exists:

```bash
skills/plot/scripts/plot-open-pr.sh          # current branch, or
skills/plot/scripts/plot-open-pr.sh --draft  # while work is still moving
```

Do not run `gh pr create` directly. When the PR is created, append `→ #<number>` to this branch's line in the plan's `## Slices` section (the "The log reads the fresher file" heading, `bug/the-log-reads-the-fresher-file` line). Push the first real commit as soon as it exists.

### Scope guard

This branch owns:
- `skills/plot/scripts/plot-fleetctl.sh` (the `tick_age_seconds` function and its two restart-hint `printf` call sites)
- `packages/fleet/src/shared/process-log.ts` (one comment date/wording fix)
- `test/reconcile/fleetctl.test.mjs` (the two tests at and around `:1317` and `:1350`)
- `skills/plot/units/README.md` (one new cleanup line)

No other branch from this plan is currently open (all 7 prior-wave branches are merged: #1514, #1527, #1537, #1541, #1548, #1557, #1560, #1572). The only other open PR in the repo is the automated `changeset-release/main` release PR (#1502), which does not touch these files.

Do not edit `test/reconcile/log-rotation.test.mjs` for this slice — despite the plan's and the issue's references to it, that file's current content (300 lines, last touched by wave 3's #1537) covers a different contract (rotation/truncation of the log writer) and no longer contains the exact-source match the citations describe. If you find a genuine #1443 L5-shaped defect in that file during this work, report it rather than fixing it here — it is out of this branch's named scope.

If you find something the plan did not anticipate, report it rather than improvising outside scope.
