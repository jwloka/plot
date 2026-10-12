## Implementation brief — the-fleet-verifies-what-it-delivered (the spike)

- **Plan (canonical):** [docs/plans/2026-10-12-the-fleet-verifies-what-it-delivered.md](../../docs/plans/2026-10-12-the-fleet-verifies-what-it-delivered.md) on `main`
- **Approved:** 2026-10-12, Jan Wloka, plan-PR #1608 merged
- **Branch:** `feature/a-pinned-run-verifies-one-plan` (base: `main`)
- **Ends as:** one PR to `main`
- **Review of the code:** standard PR review

This is the plan's spike, marked `<!-- spike -->` and alone under its own `## Slices` heading. Six sibling branches (`feature/a-delivered-plan-carries-its-verification` through `feature/the-fleet-keeps-the-release-checklist`) are held via `.plot/hold` entries (decision D29) until this branch's Acceptance criteria hold in CI on its own PR. Nothing else on this plan opens until a person reads this PR's CI result and either confirms or rewrites the six held branches, then removes the holds. There is no dispatch gate reading the `<!-- spike -->` marker yet — that ships later, in `the-design-work-proves-the-path` — so this branch runs because a person placed it, not because a mechanism admitted it.

### What to build

The plan's whole mechanism rests on one claim: the default branch's own tools, run against a plan's pinned delivery commit, can judge that plan's claims and write a gated verification record. Nothing today proves that end to end — `plot-verify.mjs` does not exist, `plot-local-checks.mjs` has no `--files` flag (it diffs `origin/<main>...HEAD`, which is empty at a commit already on main), `withRecord` never replaces a filled line, `PlanRecordWrite.field` has no `Verified`, and `jurorPath`/`moderationPath` take no prefix. Build the smallest version of the whole pipe, on one Delivered fixture plan, with juror files written by the test rather than a model, so CI — not a human judgment call — proves the mechanism:

1. **`refs.recordCommit(file, field)`** — one new refs port operation, in `packages/domain/src/ports/refs.ts` and the git adapter. One `git log` that answers the newest first-parent commit on the default branch whose diff adds a *filled* value to `field` in `file` (e.g. `Delivered:`). This is the pin.
2. **`claimsOf(plan)`** — a domain rule that numbers the plan's `## Changelog` entries in file order, then its `## Acceptance` items where present. `plot-verify.mjs claims <slug> <sha>` prints the list as `<n>. <claim text>`, one per line — **never** `Claim-<n>: <text>`. A test asserts no output line matches `^Claim-[0-9]+:`.
3. **`plot-local-checks.mjs --files <path>`** — reads the changed-files list from that file instead of `changedFiles('HEAD')` + `workingChanges()`. An unknown argument exits 2 (today every argument but `--ci-suite-refusal` is silently ignored — fix that here, for every future caller, not just this one).
4. **`board/plot-verify.mjs`** with three subcommands:
   - `prepare <slug> [--at <sha>]` — fetches `origin/<main>`, adds two detached trees under `.plot/state/verify/<slug>/` via the trees port's `add`: `tools/` at `origin/<main>`, `pin/` at the delivery commit (`recordCommit`, or `--at`'s sha). Writes `.plot-verify.pid` at `pin/`'s root plus `.gitignore` and `info/exclude` (`trees.excludePath`) entries for it. Runs `pnpm install --frozen-lockfile` in `pin/` once, timing it. Builds the claims and file list from `host.prMergeCommit(branch)` + `refs.commitFiles(sha)` per merged slice branch (the same pair `deliverability.ts:140-150` already combines — no new port operation there). Refuses `tools-unavailable: <path>` when the tools tree holds no `plot-verify.mjs`/`plot-local-checks.mjs`, `pin-not-found` with no delivery commit, `install-failed` on a non-zero install.
   - `claims <slug> <sha>` — the numbered list, see above.
   - `fold` — see `foldVerification` below.
   - `record <slug>` — books the `Verified:` line and `## Verification` section onto `main` (see *Booking the record*), then removes all three trees (two verify trees plus the booking worktree) and the `plot/verify-<slug>` branch.
5. **The optional `prefix` parameter on `jurorPath`/`moderationPath`** (`packages/domain/src/rules/panel.ts`) — `jurorPath(subject, lens, prefix?)` and `moderationPath(subject, prefix?)`, default `''`. This run calls them with `'verify-'`, producing `.plot/panels/<slug>/verify-<lens>.md` and `verify-panel.md`, so a verify run never overwrites a Draft round's `panel.md`.
6. **`foldVerification(claims, jurors)`** — a domain rule reading every juror file once per claim label (through `jurorPath` with the prefix). `supported` when every juror committed `supported` for that claim; `refuted` when one or more committed `refuted` (names the lenses on each side — one refutation decides, matching the "every juror asked to refute" rubric); no record, non-zero exit naming the label and the juror, when any juror's file is `refused` for that label.
7. **`PlanRecordWrite.field` gains `'Verified'`** (`packages/domain/src/workflows/decision.ts:76`), and **`withRecord` gains an optional `mode: 'replace'`** (`packages/domain/src/workflows/rendering.ts:66-93`) — today it only fills a placeholder or appends, never overwrites a filled line. Only the `Verified` write passes `replace`; every other field's call site is unchanged, so a second verify run leaves exactly one `Verified:` line.
8. **A new write kind `plan-section`** — replaces or adds one `##` section of a plan file (here, `## Verification`), with its renderer in `rendering.ts` and performer in `adapters/performer/perform-fs.ts`.
9. **Booking the record** — `perform-fs.ts` skips the `commit`/`push` write kinds, and the pinned tree sits detached at an old commit, so neither tree can carry the write. Follow `entry/deliver.ts`'s own pattern exactly: a fresh booking worktree on `plot/verify-<slug>` from `origin/<main>` (`trees.addBranch`), write the plan there, stage through the trees port, `commitAndPush` (`entry/ladder.ts:123`) with a `plot: verify <slug>` message — which falls back to a micro-PR on rejection, same as delivery — then `removeOnly` the booking worktree and both verify trees.

### Decisions already made — do not re-derive them

**Why this is the spike and not slice 2 or 3.** Three panel rounds on this plan each found a gap in the pinned-run mechanism the previous round missed (estate questions about `--files` reading nothing at a pinned commit, `withRecord` silently appending a second record, no slice booking the writes at all). The riskiest, least-proven part of the whole plan is "the default branch's tools, run against an old pinned commit, actually produce a gated record" — so it ships alone, first, proven by CI against a sandbox fixture, before six more branches build on top of an assumption nobody has executed. Don't widen this branch's scope to cover the fleet's scheduling, the tracker's issue-open, or the release checklist — those are the six held branches, by design, and each one's `.plot/hold` line names this branch's Acceptance as its own gate.

**Why the tools come from `origin/<main>`, never from the pinned tree's own bundle.** The pinned commit's own `plot-local-checks.mjs` ignores `--files` entirely — it's old code, not this slice's code. If the run used the pin's own scripts, `--files` would silently do nothing, exactly reproducing the bug this slice exists to fix. So every command of the run is called by absolute path from the `tools/` tree (`origin/<main>`, fetched fresh at prepare-time), with `pin/` only ever used as a working directory or a source of files to diff. The spike's own Acceptance item 1 proves this split directly: a sandbox whose delivery commit's bundle ignores `--files`, run through the **tools** tree's copy, prints the expected check; run through the **pin**'s own copy, prints none.

**Why `recordCommit` reads the *commit that added* the value, not the field's current value.** A plan's `Delivered:` line can exist at `HEAD` long after the commit that wrote it — other edits to the file happen after delivery (Notes entries, annotation updates). Reading "the newest commit touching this file" would drift forward with every unrelated edit. `recordCommit` specifically answers the one commit where the field transitioned from empty/placeholder to a filled value, so the pin is stable across later cosmetic edits to the same file.

**Why claims are a plain numbered list, never `Claim-<n>: <text>`.** A juror that pastes the claims list verbatim into its verdict file would otherwise accidentally satisfy the panel gate with no real judgment — `readJuror` takes the first word after the colon, so `Claim-1: refuted to proceed, but X...` (pasted claim text that happens to start with a commitment word) could pass the gate by accident. Printing `1. <claim text>` with no colon-after-label syntax makes that structurally impossible: there is no line in the claims output a juror could copy-paste that the gate would read as a commitment. This is tested directly (Acceptance item 3 / `claims` test).

**Why `foldVerification` is a domain rule and not panel moderation prose.** Round 1 flagged this as a direct contradiction: moderator prose is not a gated output. Every `## Verification` line must trace to `readJuror`'s structured read of a committed label, never to the moderation step's free text. `/plot-panel` still writes `verify-panel.md` for a human to read, but the record-writing path never touches it.

**Why `withRecord`'s replace mode is opt-in per call site, not a global behavior change.** Every other field (`Approved`, `Started`, `Delivered`, `Released`) is written once per lifecycle event and must never silently overwrite a prior value — that's the existing "fill-or-append, never replace" invariant protecting history. `Verified` is the one field re-written on every re-verification, so it alone passes `mode: 'replace'`. Don't default the parameter to `'replace'` or thread it through unrelated call sites.

**Rules carried over unchanged, worth not re-breaking:**
- `.plot/state/` is `.gitignore`d and sits outside `Worktree root` — the reaper, the reconcile scan, and the fleet scan all key off paths under `Worktree root` or a `.plot-worker.pid` marker, so none of them will see `.plot/state/verify/<slug>/` as a desk. Don't move these trees under `Worktree root`.
- `perform-fs.ts` skipping `commit`/`push` for *every* worktree is existing, deliberate behavior (a detached/pinned tree must never accidentally push) — the booking worktree's `commitAndPush` is a separate, explicit call outside that skip, exactly mirroring how `entry/deliver.ts` already does it. Don't try to make `perform-fs.ts` perform those kinds generally.
- Absent is not false: `prepare`'s refusals (`tools-unavailable`, `pin-not-found`, `install-failed`) are exit codes a caller checks, never a quiet no-op. `plot-local-checks.mjs`'s new "unknown argument" case is exit 2, not an ignored flag — this closes a real latent bug (every argument except `--ci-suite-refusal` is silently ignored today) for every caller, not just this one.

### Done when

The plan's `## Acceptance` section, first block only (*"The spike, `feature/a-pinned-run-verifies-one-plan`"*), is the specification — the other three blocks (record/panel-labels, run/tracker-write, issues/checklist) belong to the six held branches and are explicitly out of scope here. Lifted, with what each catches:

- **The split proof**: in a sandbox repo whose delivery commit's `plot-local-checks.mjs` ignores `--files`, and whose `origin/<main>` carries the current bundle, `prepare` builds `pin/` at the delivery commit and `tools/` at `origin/<main>`; the **tools** tree's `plot-local-checks.mjs --files <list>`, run with `pin/` as cwd, prints the fixture's `Local checks` match for the plan's file; the **pin**'s own bundle, run the same way, prints none. Catches a run that quietly uses the wrong tree's code and would otherwise check nothing while reporting success.
- `recordCommit(file, 'Delivered')` answers the commit that *added* the filled line, not a later commit that only touched the file. Catches pin drift from unrelated later edits.
- `claims` prints `<n>. <claim text>` with no line matching `^Claim-[0-9]+:`. Catches a juror accidentally auto-passing the gate from pasted claim text.
- Three test-written juror files, no model: all `supported` → one `supported` line per claim; one `refuted` on `Claim-2` → a `refuted` line naming the lenses on each side; a file missing its `Claim-2:` line → no record, `fold` exits non-zero naming `Claim-2` and the juror. Catches a fold that produces a plausible-looking record from an incomplete input.
- `record` pushes one commit `plot: verify <slug>` to the sandbox's origin, carrying the `Verified:` line (delivery/judged/tools commits named) and the `## Verification` section; a second `record` run leaves exactly one of each. Catches `withRecord`'s append-only default silently duplicating the record on re-verification.
- After `record`, no tree remains under `.plot/state/verify/<slug>/`, no `plot/verify-<slug>` branch remains, and `git worktree list` shows no verify tree. Catches a leaked worktree that would otherwise accumulate across runs.
- `prepare` refuses `tools-unavailable`, `pin-not-found`, `install-failed` as specified, each exiting non-zero and writing no record.
- `plot-local-checks.mjs` with an unrecognized argument exits 2.

Plus: a changeset, description first and `bumps:` block last (`CLAUDE.md` *Versioning* — 11% of past changesets got this backwards), `bumps: plot: minor`. Domain unit tests plus `test/reconcile/verify-pinned-run.test.mjs` over a sandbox repository with a bare origin, the host answered by a stub, and juror files written by the test (no model call in CI).

For tests: run `node skills/plot/scripts/board/plot-local-checks.mjs` before each push and run what it prints — it resolves the related tests and typecheck for whichever package you touch (most likely `packages/domain` and `packages/board`) plus the relevant `scripts/check-*.sh` gates. The suites under the `CI suites` config key (`test:e2e`, `test:contracts`, `test:board`, domain coverage, `test/reconcile/*.test.mjs`) run in CI on this PR — never run them locally; a failure there comes back as a correction, not a local obligation.

Name the shell gate if you touch any `.sh` file: `scripts/check-shell-lines.sh` refuses a PR whose shell under `skills/` grows past its own merge base, with no stored allowance. This slice is mostly TypeScript/domain plus one new `.mjs` entry bundle — if a `.sh` line does move, pay for the growth in the same change (remove shell elsewhere, or push the rule into the domain behind a bundle).

### Bookkeeping

Open the PR through the controller, never `gh pr create`:

```bash
skills/plot/scripts/plot-open-pr.sh          # current branch
skills/plot/scripts/plot-open-pr.sh --draft  # while work is still moving
```

It reads which plan names this branch and opens the PR with the slice heading as title, the plan and this brief in the body. Push the first real commit as soon as it exists — a branch with no PR and no commits is invisible to the fleet. Once the PR exists, append `→ #<number>` to this branch's line in the plan's `## Slices` section (`### The spike` heading, `feature/a-pinned-run-verifies-one-plan` line) on `main` — check `git branch --show-current` is `main` before that edit.

### Scope guard

This branch owns:
- `packages/domain/src/ports/refs.ts` and `packages/domain/src/adapters/refs/refs-git.ts` — `recordCommit`
- `packages/domain/src/rules/` — `claimsOf`, `foldVerification` (new files)
- `packages/domain/src/rules/panel.ts` — the optional `prefix` parameter on `jurorPath`/`moderationPath`
- `packages/domain/src/workflows/decision.ts` — `PlanRecordWrite.field` gains `'Verified'`
- `packages/domain/src/workflows/rendering.ts` — `withRecord`'s `mode: 'replace'`, the `plan-section` write kind's renderer
- `packages/domain/src/adapters/performer/perform-fs.ts` — the `plan-section` performer
- `packages/board/src/server/entry/local-checks.ts` — `--files <path>` and the unknown-argument exit 2
- `skills/plot/scripts/board/plot-verify.mjs` (new) and its `packages/board/src/server/entry/` backing module
- A changeset file

**No other branch on this plan is in flight.** All six siblings are held via `.plot/hold` (D29) with no open worktree — there is nothing to collide with. If you find something this brief or the plan did not anticipate — a seventh refusal case, a port operation that already exists under a different name, a gate that fires differently than described above — report it rather than improvising past this branch's scope. In particular, do not start building `verificationOf`, the fleet's `Auto-verify` switch, `issueOpen`, or the release checklist rewrite — those are the six held branches, explicitly out of scope here, and dispatching into them before this spike's Acceptance holds in CI is exactly what D29's holds exist to prevent.
