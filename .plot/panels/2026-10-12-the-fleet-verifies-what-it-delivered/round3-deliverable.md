# Round 3 — Deliverable lens

Subject: `docs/plans/2026-10-12-the-fleet-verifies-what-it-delivered.md` at `8d7230934`. Lens: does every slice name something that ships, and does the changelog describe what the slices build?

## Findings

### The eight mechanisms against the code

- **Holds — 1. Per-label checking works with today's script.** `readJuror` matches `<label>:` at the start of a trimmed line (`packages/domain/src/rules/panel.ts:127-132`), so `Claim-10:` does not satisfy `Claim-1:`. A missing label, the pasted form `<supported|refuted>`, and two values for one label each exit 3 (see *Gate run*). The CLI (`packages/board/src/server/entry/panel.ts:191-215`) takes any label, so no script or domain change is needed. `/plot-deliver` step 5 already runs two `check` calls per juror (`skills/plot-deliver/SKILL.md:315-320`). The change is in `skills/plot-panel/SKILL.md` only, and slice 2 (`feature/the-jurors-fold-into-one-line-per-claim`, plan line 175) names it.
- **MEDIUM — 1a. The plan does not say which label `/plot-panel` step 5 reconciles.** Step 5 pipes one reading per juror into `plot-panel.mjs reconcile` (`skills/plot-panel/SKILL.md:149-155`), and `readingsFrom` takes one `<read>\t<lens>\t<detail>` line per juror (`entry/panel.ts:71-89`). With a list of labels, the skill must pick one. The plan says the `Position:` line "is kept because the moderation reads it" (plan line 81) but does not say that the first label of the list is the reconciled one. Slice 2 must name that rule, or `Claim-<n>` readings reach `reconcile` and the moderation reports a claim instead of the plan.
- **MEDIUM — 1b. The claims list format can refuse every juror.** `plot-verify.mjs claims` prints "one claim per line" (plan line 42) in no stated format. If it prints `Claim-3: <text>`, a juror that copies the list into its file is refused on every label: my file `e-echoed-claims.md` exits 3 with `'The fleet verifies every Delivered plan' is not one of supported, refuted`. The plan has no measured refusal rate (plan line 109), and the 3-failure guard then stops the fleet. Slice 2 must fix a list format that no line starts with `Claim-<n>:`, for example `3. <text>`.
- **What exactly changes in `skills/plot-panel/SKILL.md`:** the Parameters row `:64` (one or more labels, each with its words) and the count "four things" at `:58` (five with `Prefix`); the brief template `:79` and the step-2 juror instruction `:113-119` (show every label as `commitmentLine` renders it); step 3 `:125-130` (one `check` call per label per juror); step 4 `:138-142` (one send-back carrying every refusal text of that juror); step 5 `:149-157` (which label is reconciled, and the `Prefix` on `panel.md`); the unattended refusal `:104-105`; and the juror path `:111`. `jurorPath` and `moderationPath` (`panel.ts:49`, `:58`) have no production caller (only `packages/domain/test/panel.test.ts:189-192`), so the `Prefix` on them ships nothing unless `foldVerification` reads through them.
- **MEDIUM — 2. The headroom condition of `verifyStart` cannot refuse.** `fleetSize` returns `min(wanted, ceilingFor(headroom))`, and `ceilingFor` is never below 1: `STARVED_CEILING = 1` (`packages/domain/src/rules/fleet-size.ts:88`, `:121-160`, `:170-175`). With `requested = running + 1`, `wanted` is 1, so `start` is 1 on a `starved` machine too. The plan's *Capacity* (plan line 103) reads as if headroom vetoes a 4-Frontier-context run; it does not. The `assign.ts:227` change (count going runs in `running`) builds on `scaleUp` correctly, and `Parallel agents` + 1 follows: an idle full fleet plus one run. Slice 3 owns both. Fix: refuse on `headroom === 'starved'` (or `tight`) explicitly, and say so.
- **Holds — 3. `.plot-verify.pid`.** `underDesk` (`packages/board/src/server/entry/gate.ts:416-421`) and the CI-suite arm (`:473`) read only `.plot-worker.pid` today, so reading a second marker is a two-site change slice 3 names (plan line 179). LOW: `.gitignore:63` ignores `.plot-worker.pid` and not `.plot-verify.pid`; the untracked marker then enters `workingChanges`, which `local-checks.ts:99-107` unions with the changed files. No slice adds the ignore line.
- **Holds — 4. `refs.recordCommit` is new and named once.** No hit for `recordCommit` in `packages/` or `skills/`; slice 3 names it. LOW: `verificationOf` (slice 1) answers `stale` by date only, and the fleet (slice 3) also compares commits (plan line 60), so a same-day reject and re-delivery shows the old badge on the board while the fleet reads it stale. Two answers to one question.
- **Holds — 5. `plot-verify.mjs files` reuses existing ports.** `host.prMergeCommit` (`packages/domain/src/ports/host.ts:191`) and `refs.commitFiles` (`ports/refs.ts:308`) exist and `controllers/deliverability.ts:140-150` combines them. `changedFiles` diffs `origin/<main>...<branch>` (`adapters/refs/refs-git.ts:308-317`), and `local-checks.ts:100` passes `'HEAD'`, so `--files` is a real need. The entry parses only `--ci-suite-refusal` today (`local-checks.ts:191`); slice 3 names `--files`.
- **Holds — 6. In-place RC checklist.** `readChecklist` sorts names and takes the last (`packages/board/src/server/board.ts:421-424`), so `vnext-checklist.md` wins while it exists. Slice 5 (`feature/the-fleet-keeps-the-release-checklist`) names the `rc` in-place rule and the final rename.
- **Holds — 7. `mode: 'replace'`.** `withRecord` fills a placeholder or appends and never replaces (`workflows/rendering.ts:66-93`); `PlanRecordWrite.field` allows four fields (`workflows/decision.ts:76`). Slice 2 names both changes.
- **MEDIUM — 7a. No slice names who commits and pushes the record.** The plan says the verify workflow emits `commit` and `push` "as `workflows/deliver.ts:224-225` does" (plan line 113). `perform-fs.ts:68-69` skips both kinds; delivery performs them in `packages/board/src/server/entry/deliver.ts`, which "creates a booking worktree, writes the plan, commits, pushes, and falls back to a micro-PR" (`:49-54`, `:406-421`). The run's tree is a detached worktree at the delivery commit, not the default head, so the record needs its own booking worktree. `plot-verify.mjs` lists `claims`, `files` and `fold` (plan line 175) and no performing subcommand. Slice 2 or 3 must name the entry that books the record.
- **Holds, unproved — 8. The 3-consecutive-failure guard.** Slice 3 names it (plan line 179). Nothing in the code exists to reuse, and no criterion proves it.

### The changelog against the slices

- **MEDIUM — The plan has no `## Acceptance` section, so its own verification would judge only its four Changelog entries.** `claimsOf` numbers Changelog entries, then Acceptance items (plan line 42). The headroom rule, `mode: 'replace'`, `--files`, `.plot-verify.pid`, the 3-failure guard and the failed-run row are in slice text only, so this plan's own verify run would never judge them. An Acceptance list per slice closes it, and the plan's mechanism already reads one.
- **LOW — The Changelog omits three user-visible changes the slices ship.** `/plot-panel` takes a list of labels and a `Prefix` parameter (slice 2); `plot-local-checks.mjs --files` is a new option (slice 3); the fleet stops after 3 consecutive failed runs and shows a failed-verification row with its restart command (slice 3). Each changes what an operator sees and none has a Changelog line.
- **Holds — Every Changelog entry has a slice.** Entry 1 → slices 1, 2, 3; entry 2 → slices 4, 5 (`a-tracker-opens-an-issue`, `a-refuted-claim-opens-an-issue`), slice 1 (badge), slice 6 (release list); entry 3 → slice 3; entry 4 → slice 6. Wave order puts each consumer after its producer.
- **LOW — No slice owns the tracer arm of `verificationOf`.** The Design says `verificationOf` answers `unverified` for a tracer plan with no badge (plan line 62); slice 1 builds `verificationOf` but waits only on `feature/the-board-draws-the-declared-phases`, while the `tracer` field comes from `feature/a-slice-is-marked-spike`, which only slice 3 waits on. Without it, `/plot-release` (slice 6) lists a Delivered tracer plan as unverified.

### New defect from the revision

The revision introduced 1a, 1b, 2 and 7a: each is a mechanism added after round 2 whose seam with existing code (step 5's reconcile, the claims output, `fleetSize`'s floor of 1, the booking worktree) the plan does not name.

### Readiness from this lens

Not ready to approve. Every slice names something that ships and every Changelog entry has a slice, and the gate already does what mechanism 1 needs. Four seams are unnamed and the plan carries no acceptance criteria that its own verification could judge. Each fix is a sentence in a slice or a Design paragraph, not a redesign.

## Gate run

Scratch files under `/Users/jwloka/.claude/jobs/ca0ab00d/tmp/r3-gate/`. `P` is `$W/skills/plot/scripts/board/plot-panel.mjs`. Every call: `node $P check <Label> <words> behaviour < <file>`.

Usage probe:

```
$ node $P
plot-panel: usage: plot-panel.mjs check|reconcile ...
exit=2
```

(a) `a-full.md` — Claim-1 supported, Claim-2 refuted, Claim-3 supported, Claim-10 refuted, a position line refuted, Evidence executed:

```
$ check Position supported,refuted behaviour < a-full.md
committed	behaviour	refuted
exit=0
$ check Evidence executed,read behaviour < a-full.md
committed	behaviour	executed
exit=0
$ check Claim-1 supported,refuted behaviour < a-full.md
committed	behaviour	supported
exit=0
$ check Claim-2 supported,refuted behaviour < a-full.md
committed	behaviour	refuted
exit=0
$ check Claim-3 supported,refuted behaviour < a-full.md
committed	behaviour	supported
exit=0
$ check Claim-10 supported,refuted behaviour < a-full.md
committed	behaviour	refuted
exit=0
```

(b) `b-missing.md` — no Claim-2 line:

```
$ check Position supported,refuted behaviour < b-missing.md
committed	behaviour	supported
exit=0
$ check Evidence executed,read behaviour < b-missing.md
committed	behaviour	read
exit=0
$ check Claim-1 supported,refuted behaviour < b-missing.md
committed	behaviour	supported
exit=0
$ check Claim-2 supported,refuted behaviour < b-missing.md
plot-panel: behaviour must write 'Claim-2: <supported|refuted>'
uncommitted	behaviour	no 'Claim-2:' line — Claim-2: <supported|refuted>
exit=3
$ check Claim-3 supported,refuted behaviour < b-missing.md
committed	behaviour	supported
exit=0
$ check Claim-10 supported,refuted behaviour < b-missing.md
committed	behaviour	supported
exit=0
```

(c) `c-template.md` — Claim-1 written as the pasted template `<supported|refuted>`:

```
$ check Position supported,refuted behaviour < c-template.md
committed	behaviour	supported
exit=0
$ check Evidence executed,read behaviour < c-template.md
committed	behaviour	read
exit=0
$ check Claim-1 supported,refuted behaviour < c-template.md
plot-panel: behaviour must write 'Claim-1: <supported|refuted>'
uncommitted	behaviour	'<supported|refuted>' is not one of supported, refuted
exit=3
$ check Claim-2 supported,refuted behaviour < c-template.md
committed	behaviour	supported
exit=0
$ check Claim-3 supported,refuted behaviour < c-template.md
committed	behaviour	supported
exit=0
$ check Claim-10 supported,refuted behaviour < c-template.md
committed	behaviour	supported
exit=0
```

(d) `d-two-values.md` — two Claim-2 lines, supported and refuted:

```
$ check Position supported,refuted behaviour < d-two-values.md
committed	behaviour	refuted
exit=0
$ check Evidence executed,read behaviour < d-two-values.md
committed	behaviour	executed
exit=0
$ check Claim-1 supported,refuted behaviour < d-two-values.md
committed	behaviour	supported
exit=0
$ check Claim-2 supported,refuted behaviour < d-two-values.md
plot-panel: behaviour must write 'Claim-2: <supported|refuted>'
uncommitted	behaviour	claims both supported and refuted
exit=3
$ check Claim-3 supported,refuted behaviour < d-two-values.md
committed	behaviour	supported
exit=0
$ check Claim-10 supported,refuted behaviour < d-two-values.md
committed	behaviour	supported
exit=0
```

(e) `e-echoed-claims.md` — the claim list copied in as `Claim-<n>: <text>` above the verdict lines:

```
$ check Claim-1 supported,refuted behaviour < e-echoed-claims.md
plot-panel: behaviour must write 'Claim-1: <supported|refuted>'
uncommitted	behaviour	'The fleet verifies every Delivered plan' is not one of supported, refuted
exit=3
$ check Claim-2 supported,refuted behaviour < e-echoed-claims.md
plot-panel: behaviour must write 'Claim-2: <supported|refuted>'
uncommitted	behaviour	'The fleet opens one issue per refuted claim' is not one of supported, refuted
exit=3
```

Reconcile takes one reading per juror:

```
$ reconcile < readings.tsv     (behaviour supported, deliverable refuted)
divided	supported=behaviour	refuted=deliverable
exit=0
```

Conclusion: the described per-label checking works with today's script and needs no script or domain change. It needs the `/plot-panel` SKILL.md change listed under finding 1, which slice 2 names, plus the reconcile-label rule (1a) and a claims format (1b) that slice 2 does not name.

My first loop over the files ran under zsh, which did not split the label and words, and every call exited 2 with the usage line; that was my harness, and the run above uses explicit arguments.

## What I looked at or ran

- Read the plan in full; `skills/plot-panel/SKILL.md:50-160`; `skills/plot-deliver/SKILL.md:186-360`; `skills/plot-reject/SKILL.md:108-114`.
- Read `packages/domain/src/rules/panel.ts:40-200`, `packages/board/src/server/entry/panel.ts`, `packages/domain/src/rules/fleet-size.ts:60-175`, `packages/domain/src/workflows/assign.ts:200-246`, `packages/board/src/server/entry/gate.ts:405-516`, `packages/board/src/server/entry/local-checks.ts:85-130`, `:185-195`, `packages/domain/src/adapters/refs/refs-git.ts:300-320`, `packages/board/src/server/controllers/deliverability.ts:130-155`, `packages/domain/src/workflows/rendering.ts:66-93`, `packages/domain/src/workflows/decision.ts:68-80`, `packages/domain/src/workflows/deliver.ts:205-235`, `packages/board/src/server/entry/deliver.ts:45-75`, `packages/domain/src/adapters/performer/perform-fs.ts:55-80`, `packages/board/src/server/board.ts:415-426`, `.gitignore`.
- Grepped for `recordCommit`, `jurorPath`, `moderationPath`, `no-free-agent`, `prMergeCommit`, `commitFiles`.
- Ran `plot-panel.mjs` (usage, 26 `check` calls over five scratch files, one `reconcile`). No tests, board, fleet or pnpm.

Position: amend
