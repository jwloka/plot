## Implementation brief — the-fleet-closes-its-review-findings (wave 12: The docs name fleetd)

- **Plan (canonical):** [docs/plans/2026-10-10-the-fleet-closes-its-review-findings.md](../../docs/plans/2026-10-10-the-fleet-closes-its-review-findings.md) on `main`
- **Approved:** 2026-10-10, Jan Wloka, plan-PR #1499 merged
- **Branch:** `bug/the-docs-name-fleetd` (base: `main`)
- **Ends as:** one PR to `main`
- **Review of the code:** per repo convention (PR review)

This is the last wave in the plan. All 11 prior waves are merged, most recently `bug/the-unit-runs-its-harness` (#1589, `b8184b92a`). Nothing runs after this one, and this slice shares no file with any of them — it edits docs only.

### What to build

This slice answers #1438 L1, L2 and #1445 L1, L2, L5: five prose fixes, none of them code.

**Re-verified against the current tree (2026-10-11), not just the plan's `c9d63311d` baseline, because part of this is already done:**

1. **#1438 L1 — `plot-registryd` survives in five docs.** Still true today in exactly the five files the plan names, all present-tense descriptions (not dated measurements) — straight rename to `plot-fleetd`, no parenthetical:
   - `CLAUDE.md:177` — the `plot-fleet/` row of the skills table
   - `AGENTS.md:177` — the mirrored row (regenerate, don't hand-edit — see Bookkeeping)
   - `README.md:110` — the `/plot-fleet` paragraph under "The fleet commands"
   - `skills/plot-pulse/README.md:13` — "over `plot-registryd` and the agents"
   - `docs/definition-of-done.md:68` — **this one is different.** It's a dated measurement ("Measured on one rebase, 2026-09-05: … `plot-registryd.mjs` took three"), which is #1445 L2's territory, not L1's. Per the plan's own phrasing, dated measurements get `plot-registryd.mjs (since renamed plot-fleetd.mjs)` — not a silent rename, because the measurement was taken against the old binary and a bare rename would misstate what was measured.

2. **#1438 L2 — "dated measurements carry the new name."** The plan lists four sites: `.gitattributes:43`, `ci.yml:888`, `scripts/check-bundle-attributes.sh:8`, `test/reconcile/artifact.test.mjs:260`. **Three of these are already fixed** — checked 2026-10-11, none of the three contain `plot-registryd` any more (`ci.yml` has no `registryd` string at all; `check-bundle-attributes.sh` has none; `artifact.test.mjs` has none). Only `.gitattributes:43` still says it, and it's the same dated-measurement case as `definition-of-done.md:68` above: "`plot-registryd.mjs` took three" → `plot-registryd.mjs (since renamed plot-fleetd.mjs)`. Likely cause: an earlier wave (`428dabd94`, "The supervisor is plot-fleetd") already touched the other three incidentally. **Do not assume the other three need no look** — re-grep before editing, in case something regressed since this brief was written; but go in expecting one file, not four.

3. **#1445 L1 — `--dry-run` starts the scan clock, doc says otherwise.** Check `packages/fleet/src/server/entry/registryd-main.ts` around line 139 (doc) and 1918 (the clock start). On re-check, the TSDoc just above `argsFrom` (now around line 217–229) already documents `--dry-run` as "ACCEPTED AND IGNORED," which reads like it already matches behavior — **but that's a different claim than L1's**. L1 says the clock *starts* under `--dry-run` regardless of the flag; verify whether the doc at line ~139 (a different, earlier comment — the module-level or `main()` one) still claims `--dry-run` suppresses the clock, or omits that it doesn't. If the `argsFrom` doc already covers it accurately, the fix may be nothing more than confirming no other comment in the file contradicts it, or adding one line where the clock is actually started (`:1918`) cross-referencing this behavior.

4. **#1445 L2 — `CLAUDE.md` names the wrong `foldPrIndex` caller.** `CLAUDE.md:483` and `AGENTS.md:483` currently read: *"`fleet.ts` is the only caller of `foldPrIndex`."* Verified 2026-10-11: this is false today. The only caller is `packages/fleet/src/shared/pr-refresh.ts:1281`. Fix the sentence to name `pr-refresh.ts`, in both `CLAUDE.md` and the regenerated `AGENTS.md` mirror.

5. **#1445 L5 — domain TSDoc narrates history instead of stating current behavior.** The plan's original evidence pointed at `ports/fleet-state.ts:7,11,65`, `fleet-state-file.ts:12`, `scan-owner.ts:16`. Re-checked 2026-10-11: `ports/fleet-state.ts` already reads cleanly — its comments state current contracts ("ONE WRITER… `plot-fleetd` is the only process that calls `write`") with no registryd-era narration left. `fleet-state-file.ts` also **moved** — it's now `packages/domain/src/adapters/fleet-state/fleet-state-file.ts`, not the flat path the plan names; re-read it at its current location before judging whether line 12 still narrates rather than states. `scan-owner.ts:16` is inside the `ScanOwnerReadings` interface doc block and already reads as a plain field description, not narration. **This finding may already be resolved by an earlier wave's incidental touch, the same way #1438 L2's three sites were** — confirm by reading all three files at their current paths before writing anything; if none narrate, say so in the PR body rather than inventing an edit.

### The decision this slice settles — do not re-derive it

**A dated measurement keeps its old name with a parenthetical; a present-tense description gets a silent rename.** This is the plan's own distinction (`## Slices`, this heading: "the four dated measurements say `plot-registryd.mjs (since renamed plot-fleetd.mjs)`" vs. "`plot-registryd` leaves the five current docs"). Collapsing the two into one find-and-replace would be wrong for the dated sites — it would make a 2026-09-05 measurement read as if it were taken against a binary that didn't carry that name yet.

**Re-verify every finding against the live tree before editing, not just the plan's table.** Three of the plan's four #1438 L2 sites and apparently all of #1445 L5's sites are already fixed by prior waves in this same plan (`428dabd94` and others touched `plot-fleetctl.sh`, the domain's fleet-state files, and build-attribute tooling along the way). The plan's evidence column is a snapshot at `c9d63311d`; this slice runs after eleven other merges. Where a finding is already resolved, note it as such in the PR body rather than re-touching a file that no longer needs it — an edit with no behavior or text change is what `git blame` punishes hardest.

**`AGENTS.md` is generated, never hand-edited.** Per `CLAUDE.md`'s own Contributing section: edit `CLAUDE.md`, then run `./scripts/check-agents-md.sh --write` to regenerate the mirror. CI refuses a mirror that differs from what that script produces.

### Done when

The plan's `## Done when` list names no bullet specific to this slice — the slice's own annotation is explicit: `builds: nothing nameable; text only`. This slice's completion is the issue list it answers:

- `plot-registryd` no longer appears in `CLAUDE.md:177`, `README.md:110`, `skills/plot-pulse/README.md:13`, or their generated counterparts — renamed to `plot-fleetd`.
- `docs/definition-of-done.md:68` and `.gitattributes:43` (if still present) read `plot-registryd.mjs (since renamed plot-fleetd.mjs)`, preserving what was actually measured.
- `CLAUDE.md:483` / `AGENTS.md:483` name `pr-refresh.ts`, not `fleet.ts`, as the one `foldPrIndex` caller.
- `registryd-main.ts`'s documentation of `--dry-run` accurately states whether the scan clock starts regardless of the flag.
- Any domain TSDoc still narrating the registryd→fleetd rename (rather than stating current behavior) is rewritten to state the current contract; where none is found, the PR body says so.
- `./scripts/check-agents-md.sh --write` has been run and its diff (if any) is committed alongside the `CLAUDE.md` edits.

Plus: the repo's gates. This slice touches no shippable bundle and no `.sh` file, so `scripts/check-shell-lines.sh` and the bundle-diff gate are not in play — but `./scripts/check-agents-md.sh` (no `--write`) still runs in CI and fails on drift, so run the `--write` form locally first. For tests, run `node skills/plot/scripts/board/plot-local-checks.mjs` from the repo root before each push and run what it prints; the suites in the `CI suites` config key run in CI, and a failure there comes back as a correction. Do not run the full `test:e2e` suite locally — it is CI's gate, not a local one. A changeset is optional for a docs-only PR but still welcome per [Versioning](../../CLAUDE.md#versioning) if any skill-facing wording changed in a way worth a changelog line; this slice touches no skill directory, so it most likely needs none.

### Bookkeeping

Open the PR through the controller once the first real commit exists:

```bash
skills/plot/scripts/plot-open-pr.sh          # current branch, or
skills/plot/scripts/plot-open-pr.sh --draft  # while work is still moving
```

Do not run `gh pr create` directly. When the PR is created, append `→ #<number>` to this branch's line in the plan's `## Slices` section (the "The docs name fleetd" heading, `bug/the-docs-name-fleetd` line). Push the first real commit as soon as it exists.

### Scope guard

This branch owns:
- `CLAUDE.md` (the skills table row, the `foldPrIndex` caller sentence)
- `AGENTS.md` (regenerated from the above via `./scripts/check-agents-md.sh --write` — never hand-edited)
- `README.md:110`
- `skills/plot-pulse/README.md:13`
- `docs/definition-of-done.md:68`
- `.gitattributes` (only if the registryd mention is still present — re-check first)
- `packages/fleet/src/server/entry/registryd-main.ts` (doc comments only, around the `--dry-run` parsing and clock-start logic — no behavior change)
- Any domain TSDoc file confirmed (not assumed) to still narrate the rename: `packages/domain/src/ports/fleet-state.ts`, `packages/domain/src/adapters/fleet-state/fleet-state-file.ts`, `packages/domain/src/rules/scan-owner.ts`

No other branch is in flight on this plan — this is the last wave. If any of the files above resist a clean docs-only fix because the underlying behavior itself looks wrong (not just mis-described), report that rather than expanding this slice's scope to fix it.
