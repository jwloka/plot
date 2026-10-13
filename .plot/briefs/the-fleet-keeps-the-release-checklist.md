## Implementation brief — the-fleet-verifies-what-it-delivered ("The checklist")

- **Plan (canonical):** [docs/plans/active/the-fleet-verifies-what-it-delivered.md](../../docs/plans/active/the-fleet-verifies-what-it-delivered.md) on `main`
- **Approved:** 2026-10-12, Jan Wloka, plan-PR #1608 merged
- **Branch:** `feature/the-fleet-keeps-the-release-checklist` (base: `main`)
- **Ends as:** one PR to `main`
- **Review of the code:** standard PR review

This branch is the plan's last wave, "The checklist," and its one member. It
waits on nothing else in this plan — the plan's `## Slices` records no
`waits_on` for it — but the spike-first hold that once covered it
(D29, *Notes*) has already been lifted: `.plot/hold` is empty and the merge
commit `b5634e358 plot: lift the spike-first holds of two plans` is on
`main`, following the spike `feature/a-pinned-run-verifies-one-plan`'s merge
as PR #1618. Nothing blocks starting this branch now.

### What to build

The verify workflow (built by this plan's other branches, in particular
`feature/the-fleet-verifies-a-delivered-plan`) needs somewhere to write a
running release checklist as plans verify, so a person doing the human
testing round always has one current file to work from — rather than
waiting for `/plot-release rc` to generate it from scratch at cut time. This
slice builds that file and its two touch points:

1. **The verify workflow writes `docs/releases/vnext-checklist.md`** in the
   same commit as its `Verified:` record (*Writing the record*, plan line
   140), for as long as the file carries no `RC:` line. Each verified plan
   gets one `- [ ]` item, shaped exactly as `/plot-release rc` already shapes
   one (`skills/plot-release/SKILL.md:234`): `<feature/bug slug> —
   <changelog summary>`, with `verified N/N` appended. A plan whose
   verification refutes a claim is listed instead under a `## Refuted`
   heading, with its issue number (from `feature/a-refuted-claim-opens-an-issue`,
   a sibling branch — reference its `.plot/state/verify/<slug>.json` issue
   number field, don't rebuild issue-opening here). The two sign-off lines
   (`## Sign-off`) are always written empty, per the standing rule in
   `plot-release`'s own RC path (SKILL.md:247-248): an agent never fills a
   sign-off line, because that blank is the record of a person taking
   responsibility.
2. **`/plot-release rc` changes**: when `docs/releases/vnext-checklist.md`
   already exists, it adds the RC tag line (`RC: v<version>-rc.<n>
   (YYYY-MM-DD)`) and the version heading **in place** — rewriting the
   existing file's header rather than generating a fresh one from its own
   plan-scan logic (SKILL.md § 2A, `:219-245`). Only when no
   `vnext-checklist.md` exists does it fall back to today's behavior:
   generate `v<version>-checklist.md` from scratch by scanning
   `docs/plans/delivered/`.
3. **The final `/plot-release` (non-`rc`, step 2B/5)** renames a
   `vnext-checklist.md` that carries an `RC:` line to
   `docs/releases/v<version>-checklist.md`. A `vnext-checklist.md` with no
   `RC:` line is not an RC checklist yet (no plan has gone through an RC
   round) and must not be renamed.
4. **`/plot-release` with no argument** (the version-detection step,
   `skills/plot-release/SKILL.md:191` area, `v*-checklist.md` glob) must
   treat a bare `vnext-checklist.md` — one with no `RC:` line — as *not* an
   RC checklist in progress. Only a `vnext-checklist.md` carrying an `RC:`
   line reads as an open RC round. This is the one behavior change to that
   step; its glob already matches `vnext-checklist.md` today, which is the
   bug this item closes.
5. **`/plot-release` lists refuted and unverified plans** before step 1, so
   a person cutting a release sees what verification found before deciding
   whether to proceed. It also names `/plot-reject` as the remedy for a
   refuted plan, in the same listing.

Close by pointing at the plan: `## Design` → *The release checklist* (lines
150-158) and the Acceptance line for this slice (line 255) are canonical;
this is orientation.

### Decisions already made — do not re-derive them

**Why `vnext-checklist.md` and not a version-named file from the start.**
The board's Testing badge (`packages/board/src/server/board.ts:421-422`,
quoted at `.plot/briefs/` siblings and the plan's Open Points, line 166)
reads the **lexically last** `*-checklist.md` file in the release directory
via a plain `.sort()` (`board.ts:428`, `readChecklist`). `vnext` sorts after
every `v<digit>` name in plain string comparison — `"vnext" > "v9.9.9"`
character-by-character at the second character (`n` > `.`) — so naming the
file `vnext-checklist.md` from the first verification guarantees the badge
picks it up with **no change to `board.ts`'s sort or read logic**. This was
resolved in plan round 1 (line 180) after a panel finding that
`next-checklist.md` (no `v` prefix) would never reach the badge at all,
since `readChecklist`'s glob is `/-checklist\.md$/` and sort order among
matching files is what decides "newest," not the glob itself — so the name
has to out-sort every real version, not merely match the pattern.

**Why the file is rewritten in place through the RC round rather than
replaced.** Resolved in round 2 (plan line 184) against a concrete failure
mode: if `/plot-release rc` ever wrote a *new* `vnext-checklist.md` after
renaming the previous one to a versioned name, the fresh empty file would
sort last and the badge would show 0/0 progress while a real RC's sign-off
was still open. The fix is that `rc` **never generates a fresh
`vnext-checklist.md` once one with an `RC:` line exists** — it only renames
on final release — and this slice's own writer (the verify workflow) leaves
a file carrying `RC:` strictly alone, touching `vnext-checklist.md` only
`while it carries no RC: line` (plan line 152, the Acceptance line at 255).
Read that clause literally: it is the guard against clobbering an in-flight
RC's progress.

**The checklist's shape matches `rc`'s exactly, with one line added.** This
is a reuse decision, not an independent format: one `- [ ]` item per
delivered feature/bug plan (never docs/infra — see `plot-release`'s own
README: *"Only feature and bug plans are included in release notes —
docs/infra are live when merged"*), from its Changelog. The one addition
this slice makes to the existing shape is the `verified N/N` suffix per
item and the `## Refuted` heading for plans with a refuted claim — neither
of which `rc`'s from-scratch generator needs to produce on its own, because
by the time `rc` runs, every item it's filling in from scratch (the
fallback path, item 2 above) is a plan with no verification record yet.

**No tracker interaction lives in this slice.** The issue number attached to
a refuted item comes from reading `.plot/state/verify/<slug>.json` (written
by `feature/a-refuted-claim-opens-an-issue`), not from calling the tracker
port. This slice only reads that file if it exists; it opens no issues and
calls no port.

**`checklist: string | null` already exists** on the release entity
(`packages/domain/src/entities/release.ts:41`) and `transitions/release.ts`
already references it — the plan's Notes (line 261) record this from a
deliverable search specifically so this slice doesn't re-add a field that's
already there. Check what currently sets that field and whether it needs to
read the new in-place-edited file correctly, rather than assuming a
fresh-write code path.

### Done when

The plan's `## Done when`-equivalent is its Acceptance line for this slice
(line 255): *"The verify workflow writes `vnext-checklist.md` while it
carries no `RC:` line and leaves it unchanged after; `/plot-release rc` adds
the RC line in place, and the final release renames it."* That is the
literal test: write it once with no `RC:` line, run the writer again,
confirm the file is byte-identical or at least unchanged in its checklist
items (a second verification of a *different* plan should still append or
update that plan's own item, so "leaves it unchanged" means *the RC-line
guard holds*, not that the file is frozen in content — guard against
over-reading this as "never touch it again").

Also assert, because a naive implementation would pass without them:
- A `vnext-checklist.md` with an `RC:` line is left alone by a second verify
  run (the guard that resolved the round-2 panel finding above) — write a
  test that runs the verify-record writer twice, the second time after
  manually adding an `RC:` line, and asserts the file is untouched by the
  second run.
- `/plot-release` with no argument, given a `vnext-checklist.md` carrying no
  `RC:` line, does **not** treat it as an open RC round (the bug this slice
  fixes per item 4 above) — without this assertion, the existing glob match
  silently reinstates the bug.
- The final release's rename only fires on a `vnext-checklist.md` that
  *does* carry an `RC:` line; a bare one is left for the next verify run to
  keep updating.
- `/plot-release`'s refuted/unverified listing fires before step 1 even
  when zero plans are refuted or unverified (prints nothing extra, doesn't
  error).

Plus the repo's standing gates:
- `scripts/check-shell-lines.sh` — if this slice touches a `.sh` file (it
  may, if `/plot-release`'s version-detection logic lives partly in shell),
  growth must be paid for in the same change by removing shell elsewhere.
- A changeset: description first, `bumps:` block last (CLAUDE.md's ordering
  rule — a `bumps:`-first changeset publishes a blank release note). This
  touches `plot-release` and possibly the fleet's verify workflow package;
  name both if both change.
- Update `skills/plot-release/SKILL.md`'s `## Model Guidance` table for any
  step whose judgment load changed (the in-place rewrite and the
  refuted/unverified listing are both still mechanical — Small/Mid tier,
  not a new judgment call).
- Run `node skills/plot/scripts/board/plot-local-checks.mjs` before each
  push and run what it prints. The suites under `CI suites` in this repo's
  `## Plot Config` run in CI, not locally — a failure there comes back as a
  correction. Do not run `pnpm run test:e2e` locally; it is CI's gate only.

### Bookkeeping

Open the PR through the controller, not `gh pr create`:

```bash
skills/plot/scripts/plot-open-pr.sh          # current branch
skills/plot/scripts/plot-open-pr.sh --draft  # while still moving
```

When the PR exists, append `→ #<number>` to this branch's line in the
plan's `## Slices` section (`### The checklist`, line 224). Push the first
real commit as soon as it exists.

### Scope guard

This branch owns:
- `docs/releases/vnext-checklist.md` — the new writer path and the
  in-place-rewrite behavior of `rc`'s existing writer
- `skills/plot-release/SKILL.md` — the `rc` path's in-place-edit branch, the
  final-release rename condition, the no-argument detection fix, and the
  new refuted/unverified listing before step 1
- the part of the verify workflow (wherever `feature/the-fleet-verifies-a-delivered-plan`
  lands its record-writing code) that emits the checklist item — coordinate
  with that branch rather than duplicating its write path; this slice reads
  or extends what it provides, it does not re-architect the verify
  workflow's commit

**Do not touch** the verify record mechanics themselves (`Verified:` line,
`## Verification` section, `foldVerification`) — those are the spike's and
`feature/a-delivered-plan-carries-its-verification`'s territory, already
shipped or in flight. Siblings in flight, verified against the plan's
`## Slices` section at hand-off time (2026-10-13):
- `feature/the-jurors-fold-into-one-line-per-claim`,
  `feature/a-delivered-plan-carries-its-verification`,
  `feature/the-fleet-verifies-a-delivered-plan` — all show `Started:`
  records in the plan's `## Status` section already; each owns its own area
  (panel labels, the verification record, the fleet's run loop) and none
  touches `docs/releases/` or `plot-release`.
- `feature/a-tracker-opens-an-issue`, `feature/a-refuted-claim-opens-an-issue`
  — also show `Started:` records; the refuted-claim branch is this slice's
  one dependency for the issue-number field in a `## Refuted` item, read
  from its `.plot/state/verify/<slug>.json` output rather than rebuilt here.

If you find something the plan did not anticipate, report it rather than
improvising outside scope.
