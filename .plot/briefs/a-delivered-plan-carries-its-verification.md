## Implementation brief — the-fleet-verifies-what-it-delivered (wave: the record and the panel's labels)

- **Plan (canonical):** [docs/plans/2026-10-12-the-fleet-verifies-what-it-delivered.md](../../docs/plans/2026-10-12-the-fleet-verifies-what-it-delivered.md) on `main`
- **Approved:** 2026-10-12, Jan Wloka, plan-PR #1608 merged
- **Branch:** `feature/a-delivered-plan-carries-its-verification` (base: `main`)
- **Ends as:** one PR to `main`
- **Review of the code:** standard PR review (`Review: pr`)

This branch's `waits:` annotation names `feature/the-board-draws-the-declared-phases`
(plan `the-phases-are-declared`) and `feature/a-slice-is-marked-spike` (plan
`design-work-proves-the-path`). **Both have merged** — into `5d78df1e8`
("The board draws the map", #1623) — so this branch is unblocked. The plan's
own spike, `feature/a-pinned-run-verifies-one-plan`, also merged (PR #1618,
`fb9f840804`), and its sibling in this same wave,
`feature/the-jurors-fold-into-one-line-per-claim`, merged too (PR #1625,
`fb9f840804`). `plot-fleet-scan.sh --next the-fleet-verifies-what-it-delivered`
returns exactly this branch — confirm that yourself before starting, since
plan state can move between this brief being written and read.

### What to build

A Delivered plan's verification state must be a **readable property of the
plan text**, not a status this slice invents separately. Three things, all in
`packages/domain/src/`:

1. **`verificationOf(plan, deliveryCommit)`** — a domain rule reading the
   plan's `## Status` and `## Verification` section, answering one of
   `'unverified' | 'supported' | 'refuted' | 'stale'`:
   - `unverified` — no `Verified:` line yet, **or** the plan reads
     `Tracer: yes` (tracer plans never verify — D5, D14; the `tracer` field
     already exists on `plot-plan-meta.sh`'s JSON output and on
     `FleetReadingSchema` at `packages/domain/src/entities/fleet.ts:720`,
     shipped by the now-merged `a-slice-is-marked-spike`. Read it from there;
     do not re-derive `Tracer:` parsing).
   - `stale` — the record exists but no longer matches: the plan's current
     `Delivered:` date differs from the record's delivery date, the plan has
     no `Delivered:` line at all (post-`/plot-reject`), **or** the caller
     passes a `deliveryCommit` that differs from the record's delivery
     commit. This three-way check matters because both the board (reading
     at render time) and the fleet (deciding whether to verify) call this
     with `recordCommit(file, 'Delivered')` as the reading, so they must
     agree — see *The decisions the plan settles* below.
   - `supported` / `refuted` — read straight from the `## Verification`
     section's per-claim lines (`Claim-N supported — ...` /
     `Claim-N refuted — ...`), written by `foldVerification` (already
     shipped by the spike). `refuted` if any claim line says so.
2. **`refutedClaims(plan)`** — the list of refuted claim lines from
   `## Verification`, each carrying its claim number, text, and issue number
   or `no issue: <reason>` if present. This is what the board's badge and
   `/plot-release`'s refused-plan listing both read; don't duplicate the
   parsing in two places.
3. **`plot-plan-meta.sh` reports `verified_raw`** — follow the exact pattern
   already there for `delivered_raw`/`approved_raw`
   (`skills/plot/scripts/plot-plan-meta.sh:1009` parses `delivered` the same
   way `canon_delivered` is captured; mirror it for a `canon_verified` /
   `verified_raw` pair, including the placeholder-stripping and JSON escaping
   those two already share). This is a shell script change, so it counts
   against `scripts/check-shell-lines.sh`'s ratchet — see *Done when*.

Plus, on the board side (`packages/board/src/server/board.ts`):

4. **The card's `verification` property** — set from `verificationOf`,
   consumed by a *refuted* badge with the refuted-claim count, following the
   existing "no guessed badge" rule already documented at `board.ts:421`
   (*"produces no badge — never a guessed number"*) for the checklist-file
   reader. `verificationOf` must answer `unverified` with no badge drawn,
   not a badge reading "unverified" — the badge exists only for `refuted`.
5. **The board's Delivered-plan scan reads `recordCommit(file, 'Delivered')`**
   for every Delivered plan it lists, and passes that as `verificationOf`'s
   `deliveryCommit` argument — this is the one call site this slice adds to
   the scan; it is not a new scan pass.

### The decisions the plan settles — do not re-derive them

**Both `stale` triggers (date mismatch and commit mismatch) are needed, and
neither alone is sufficient.** A same-day `/plot-reject` + re-deliver can
produce the *same* `Delivered:` date on two different delivery commits
(reject, fix, redeliver same day) — date comparison alone would miss that.
Conversely a cosmetic later edit to the plan file does not change
`Delivered:` or the delivery commit, so commit comparison alone correctly
reports `stale` as `false` for an unrelated edit. The plan's own text
(*The verification record*, line 77 of the plan) is explicit that the board
and the fleet "both pass `recordCommit(file, 'Delivered')`, so both give one
answer after a same-day rejection and second delivery" — meaning this rule
must be callable identically from both the board's read path and the
fleet's eligibility check (built in a later wave, `feature/the-fleet-verifies-a-delivered-plan`),
with no board-specific or fleet-specific branching inside it.

**`unverified` for a tracer plan is a *terminal* answer, not a default that a
later record overwrites.** A tracer plan's claims are judged "where the
dependent's Changelog states them" (plan line 81) — meaning a tracer plan
itself never gains a `## Verification` section or a `Verified:` line, ever.
`verificationOf` must check `Tracer: yes` **before** looking for a `Verified:`
line, so a tracer plan that somehow acquired one (it shouldn't, but don't
trust that) still answers `unverified`, with no badge.

**The record is parsed from plan text, not from a separate state file.**
`verificationOf(plan, deliveryCommit)` takes the plan's rendered markdown (or
whatever the domain's existing plan-reading rules already parse it into) and
a reading, and returns a pure answer — no I/O inside the rule itself. This
mirrors how every other plan-status rule in this domain already works
(`planStatus`, `phaseGate`, etc.) and is why the board can "ask it on every
render" (plan line 77) with no caching concern.

**Carried-over invariants, unchanged by this slice:**
- Absence is not false. A plan with no `## Verification` section is
  `unverified`, not an error and not a false `refuted`/`supported`.
- The badge rule at `board.ts:421` ("no badge — never a guessed number")
  extends to this slice's refuted badge: if `refutedClaims` can't confidently
  parse a line, that claim is omitted from the count rather than guessed.
- `plot-plan-meta.sh`'s existing `*_raw` fields (`delivered_raw`,
  `approved_raw`) are the pattern for `verified_raw` — read the surrounding
  canon-capture lines before adding a third parallel block; don't invent a
  new parsing convention next to two established ones.

### Done when

The plan's Acceptance block for this wave is the specification:

> `verificationOf` answers `unverified`, `supported`, `refuted` and `stale`
> from plan text, `stale` for a changed `Delivered:` date, for an absent
> `Delivered:` line and for a different delivery commit with the same date,
> and `unverified` for a `Tracer: yes` plan; one browser test shows the
> *refuted* badge.

Each clause is a separate test case — write (or confirm) a unit test per
answer, not one combined test that happens to touch all four. The browser
test is the one place this slice's behavior can only be proven by rendering
(per `CLAUDE.md`'s *Every rendered state is a domain property* rule) — the
**decision** of whether to show the badge is `verificationOf`'s job and must
be unit-tested separately from the **rendering** of that decision.

Plus the repo's standing gates:
- `scripts/check-shell-lines.sh` — this slice *does* touch
  `plot-plan-meta.sh`, so unlike its sibling slice it cannot claim zero shell
  growth for free. If the `verified_raw` addition grows the script's line
  count past this branch's merge base, pay for it in the same change (trim
  shell elsewhere, or push logic into the domain behind a bundle) — the gate
  stores no number and grants no exemption.
- A changeset: `bumps: plot: minor` — description first, `bumps:` block last
  (`CLAUDE.md`'s changeset ordering rule).
- Run `node skills/plot/scripts/board/plot-local-checks.mjs` before each push
  and run what it prints — it resolves the related tests and typecheck for
  `packages/domain` and `packages/board`, plus the `scripts/check-*.sh` gates
  your changed files touch. The suites under this repo's `CI suites` key run
  in CI on this PR, never locally; a failure there comes back as a
  correction.

### Bookkeeping

Open the PR through the controller, never `gh pr create`:

```bash
skills/plot/scripts/plot-open-pr.sh          # current branch
skills/plot/scripts/plot-open-pr.sh --draft  # while still moving
```

When the PR exists, append `→ #<number>` to this branch's line in the plan's
`## Slices` section (`### The record and the panel's labels` heading,
`feature/a-delivered-plan-carries-its-verification` line) on `main`. Push the
first real commit as soon as it exists — a branch with no PR and no commits
is invisible to the fleet.

### Scope guard

This branch owns:
- `packages/domain/src/rules/` — `verificationOf`, `refutedClaims` (new
  files, or additions beside `foldVerification` if a shared module makes
  sense — your call, but keep `foldVerification` itself untouched; it is
  the spike's, already shipped)
- `packages/board/src/server/board.ts` — the card's `verification` property,
  the *refuted* badge, and the Delivered-plan scan's `recordCommit` call
- `skills/plot/scripts/plot-plan-meta.sh` — `verified_raw` / `canon_verified`
- A changeset file

**Do not touch** `packages/domain/src/rules/panel.ts`,
`skills/plot-panel/SKILL.md`, or the `plot-panel.mjs` bundle — those belong to
the sibling in this same wave, `feature/the-jurors-fold-into-one-line-per-claim`
(already merged as PR #1625; nothing left to coordinate with there). Do not
start on `/plot-deliver`'s *Verify mode* section, the `Auto-verify` switch,
`issueOpen`, or the release checklist rewrite — those are the next two waves
(`feature/the-fleet-verifies-a-delivered-plan`, `feature/a-tracker-opens-an-issue`,
`feature/a-refuted-claim-opens-an-issue`, `feature/the-fleet-keeps-the-release-checklist`),
still blocked behind this wave merging.

If you find something the plan did not anticipate, report it rather than
improvising outside scope.
