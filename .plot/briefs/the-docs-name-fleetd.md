## Implementation brief — the-fleet-closes-its-review-findings (wave 12: The docs name fleetd)

- **Plan (canonical):** [docs/plans/2026-10-10-the-fleet-closes-its-review-findings.md](../../docs/plans/2026-10-10-the-fleet-closes-its-review-findings.md) on `main`
- **Approved:** 2026-10-10, Jan Wloka, plan-PR #1499 merged
- **Branch:** `bug/the-docs-name-fleetd` (base: `main`)
- **Ends as:** one PR to `main`
- **Review of the code:** per repo convention (PR review)

All eleven prior waves of this plan are merged (#1514, #1527, #1537, #1541, #1548, #1557, #1560, #1572, #1579, #1583, #1589). This is the last wave. This branch can start clean.

### What to build

This slice answers #1438 L1, L2 and #1445 L1, L2, L5 — a text-only wave (the plan's own `<!-- builds: nothing nameable; text only -->` note). Verified fresh against current `main`, not the plan's `c9d63311d` snapshot — several findings have drifted:

**#1438 L1 — `plot-registryd` leaves the five current docs.** Still holds at all five cited locations, verified today:
- `CLAUDE.md:177` and `AGENTS.md:177` — the skills table row for `plot-fleet/`: `...over \`plot-registryd\` and its agents...` → `plot-fleetd`.
- `README.md:110` — `**/plot-fleet**...` paragraph: `Starts, stops and reports on \`plot-registryd\` and the agents...` → `plot-fleetd`.
- `skills/plot-pulse/README.md:13` — `\`/plot-fleet\` is now fleet control...over \`plot-registryd\` and the agents.` → `plot-fleetd`.

These four are **current-state** descriptions (what the command does today) — rewrite plainly, no historical qualifier.

**#1438 L2 — dated measurements carry the new name.** `docs/definition-of-done.md:68` is different in kind from the four above: it is a **dated measurement** ("Measured on one rebase, 2026-09-05: ... \`plot-ask.mjs\` took five and \`plot-registryd.mjs\` took three"). That measurement ran *before* the rename — `plot-registryd.mjs` is literally what the file was called that day. Don't silently rewrite it to `plot-fleetd.mjs` (that would misstate what was measured); say `plot-registryd.mjs (since renamed plot-fleetd.mjs)` so the historical fact and the current name both read correctly. This is the one line in this slice that is *not* a plain find-and-replace — the other four are.

Two companion locations the plan's measurement table named under L2 (`.gitattributes:43`, `ci.yml:888`, `scripts/check-bundle-attributes.sh:8`, `test/reconcile/artifact.test.mjs:260`) were already fixed by a sibling wave (`710b4a002`, "The label migration leaves shell") — they all read `plot-fleetd.mjs` plainly now, dated 2026-09-05/06, with no stale name anywhere. **Don't touch them.** `docs/definition-of-done.md:68` is the only survivor of that group, and it needs the opposite treatment (keep the old name, annotate it) rather than the treatment its siblings got (just rename).

**#1445 L1 — `--dry-run` doc.** Already correct. `registryd-main.ts:143` reads `node skills/plot/scripts/board/plot-fleetd.mjs --dry-run # decide, write nothing`, and the body at `:220-226` and `:1364` documents `--dry-run` as accepted-and-ignored (the tick always decides; `--dry-run` only suppresses the write) accurately against the code at `:247` (`else if (arg === '--dry-run') continue;`). The plan's L1 finding is listed as **holds** against the `c9d63311d` snapshot, but a sibling wave already fixed it. Confirm this reads correctly on your checkout; if it still does, this bullet needs no change — don't invent a diff to satisfy the issue number.

**#1445 L2 — `CLAUDE.md` names the wrong `foldPrIndex` caller.** Still holds. `CLAUDE.md:483` and `AGENTS.md:483` ("One writer") say `\`fleet.ts\` is the only caller of \`foldPrIndex\``. The real (and only) caller today is `packages/fleet/src/shared/pr-refresh.ts:1281` — not `packages/board/.../fleet.ts`, and not `pr-refresh.ts:1275` as the plan's own cross-reference guesses (wave merges have shifted it by six lines). Grep `foldPrIndex` on your checkout before editing — don't trust either line number verbatim. Fix: name `pr-refresh.ts`, not `fleet.ts`.

**#1445 L5 — domain TSDoc narrates history.** Narrower than the plan's three citations once re-checked: `fleet-state-file.ts` moved to `packages/domain/src/adapters/fleet-state/fleet-state-file.ts` during a sibling wave, and its line ~12 (`BRIDGE_MAX_AGE_MS`'s doc comment, "Unchanged from the board's own constant") is factual, not narrating — no fix needed there. `scan-owner.ts:16` today is a one-line field doc (`/** Epoch ms the bridged pulse was written, or \`null\` where there is none. */`) — also clean. The live violation is in `packages/domain/src/ports/fleet-state.ts` only, two spots:
  - `:11` — `**ONE WRITER.** After \`the-fleet-owns-the-scan-and-pr-index\`, \`plot-fleetd\` is the only process that calls \`write\`.` — names a plan slug. State the current invariant instead: `plot-fleetd` is the only process that calls `write`; the board reads and does not write while a fleet is running.
  - `:65` — `The shape \`pulse-bridge.ts\` defined before this port existed, plus \`prError\`` — narrates what used to define the shape. State what the shape is today: seven fields covering the pulse and the facts read on their own timer, written together on every success.

  Re-grep `fleet-state.ts`, `scan-owner.ts` and the adapter file on your checkout before editing — this brief's line numbers are current as of writing it but a merge in flight could shift them.

### The decisions this slice settles — do not re-derive them

**This is a find-and-fix-four-plus-annotate-one wave, not a rename sweep.** Three of the plan's cited sites (`.gitattributes`, `ci.yml`, `check-bundle-attributes.sh`, `artifact.test.mjs` — four files, one finding) are already fixed by a merged sibling wave. Re-verifying them costs one grep; re-fixing them produces a no-op diff that still touches the file, which is unneeded churn in a text-only PR.

**`docs/definition-of-done.md:68` keeps the old name on purpose.** The repo's own convention (CLAUDE.md's dated-measurement sections throughout) is that a measurement is dated and true to what it measured; a name that didn't exist yet at measurement time is not retroactively correct to insert. The plan's own wording for this exact line is `plot-registryd.mjs (since renamed plot-fleetd.mjs)` — that phrase is not an existing convention elsewhere in the repo (checked: it appears nowhere but this plan), so it is this slice's wording to introduce, not one to go hunting for.

**`AGENTS.md` is generated, never hand-edited.** Every `CLAUDE.md` fix in this slice (`:177`, `:483`) needs the mirror edit applied by tooling, not by hand: edit `CLAUDE.md` only, then run `./scripts/check-agents-md.sh --write` to regenerate `AGENTS.md`. CI refuses a mirror that differs from a fresh `--write`.

**Re-verify every line number before editing — this wave runs last and absorbs the most drift.** Three of this plan's own findings (`#1445 L1`, two of the three `#1445 L5` citations, four of the five `#1438 L2` citations) were already fixed or moved by the ten sibling waves that merged first. Grep the quoted text, confirm the finding still holds, then fix it — don't trust a line number or a "holds" verdict from the plan's `c9d63311d` snapshot without checking your own checkout first.

### Done when

The plan's `## Done when` list does not name this slice individually — it is the one wave with `<!-- builds: nothing nameable; text only -->`. This slice's own completion is the issue's fix list, re-verified against current `main` rather than the plan's snapshot:

- `CLAUDE.md:177` and `README.md:110` and `skills/plot-pulse/README.md:13` name `plot-fleetd`, not `plot-registryd`, as the process `/plot-fleet` starts/stops/reports on.
- `docs/definition-of-done.md:68` keeps `plot-registryd.mjs` as the measured name and adds `(since renamed plot-fleetd.mjs)` beside it.
- `CLAUDE.md:483` names `pr-refresh.ts` (verify the exact line on your checkout), not `fleet.ts`, as the one caller of `foldPrIndex`.
- `packages/domain/src/ports/fleet-state.ts` carries no sentence naming a plan slug or describing what a file "used to" define — only what the port means and returns today.
- `AGENTS.md` is regenerated via `./scripts/check-agents-md.sh --write` and matches `CLAUDE.md` exactly (CI's own check on this).
- `node skills/plot/scripts/board/plot-local-checks.mjs` and the commands it prints pass.

Plus: the repo's gates. This slice touches no shell and no shipped bundle, so `scripts/check-shell-lines.sh` and the bundle-diff gate are unaffected. It does **not** need a changeset per [Versioning](../../CLAUDE.md#versioning) — docs-only text changes to `CLAUDE.md`/`AGENTS.md`/`README.md`/skill `README.md` files aren't a skill or package behavior change; if your editor disagrees and a gate demands one, add the minimal patch-level changeset rather than arguing with the gate. For tests, run `node skills/plot/scripts/board/plot-local-checks.mjs` from the repo root before pushing and run what it prints; the suites in the `CI suites` config key run in CI, and a failure there comes back as a correction. Do not run the full `test:e2e` suite locally.

### Bookkeeping

Open the PR through the controller once the first real commit exists:

```bash
skills/plot/scripts/plot-open-pr.sh          # current branch, or
skills/plot/scripts/plot-open-pr.sh --draft  # while work is still moving
```

Do not run `gh pr create` directly. When the PR is created, append `→ #<number>` to this branch's line in the plan's `## Slices` section (the "The docs name fleetd" heading, `bug/the-docs-name-fleetd` line). Push the first real commit as soon as it exists.

### Scope guard

This branch owns:
- `CLAUDE.md` and its generated mirror `AGENTS.md` (regenerate, never hand-edit the mirror)
- `README.md`
- `skills/plot-pulse/README.md`
- `docs/definition-of-done.md`
- `packages/domain/src/ports/fleet-state.ts` (TSDoc only — no behavior change)

No other branch in this plan is open concurrently — this is the last wave, and the plan's own file-overlap note (slices 1 and 13 touch `scan-owner.ts`; slices 3, 8, 13 touch `registryd-main.ts`) does not apply to this wave's file set. If you find a sixth site naming `plot-registryd` or a fourth narrating TSDoc comment the plan did not anticipate, report it rather than expanding scope silently — the plan's own finding list is what this slice is scored against.
