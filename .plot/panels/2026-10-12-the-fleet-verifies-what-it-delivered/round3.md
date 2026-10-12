# Panel round 3: the-fleet-verifies-what-it-delivered

- **Subject:** `docs/plans/2026-10-12-the-fleet-verifies-what-it-delivered.md`
- **Caller:** `/challenge-the-plan` Phase 3P, round 3 (narrow round)
- **Commitment:** `Position: proceed | amend | reject`
- **Lenses:** estate, deliverable
- **Rubric:** check each mechanism the round-2 revision added against the code with file:line — the label-list Commitment, `verifyStart` and the `assign.ts` change, `.plot-verify.pid` in `gate.ts`, `refs.recordCommit` and the `stale` rule, `plot-verify.mjs files` with `plot-local-checks.mjs --files`, the in-place RC checklist, `withRecord` `mode: 'replace'`, the 3-failure guard; for each, does it build on what exists or duplicate it, can its slice deliver it in its wave, and does an acceptance criterion prove it
- **Siblings:** 5 read, 0 unread (story plot-works-in-five-phases)
- **Gate:** both verdicts committed on the first run (`plot-panel.mjs check Position "proceed,amend,reject" <lens>`, exit 0 each, `committed	estate	amend` and `committed	deliverable	amend`); no juror was sent back
- **Reconcile:** `unanimous	amend	estate,deliverable` (exit 0)
- **Verdicts:** `round3-estate.md`, `round3-deliverable.md`; the round-1 and round-2 files are unchanged

## What the panel agrees on

Both jurors confirm that most of the revision builds on code that exists and that its citations hold: per-label checking works with today's gate (`panel.ts:127-132`, `:162-165`; CLI `entry/panel.ts:191-215`), the gate's desk test sits at `gate.ts:416-421` and `:473`, `recordCommit` is new (the nearest operation, `lastCommitTouching` at `refs.ts:474`, finds a commit by path), `deliverability.ts:140-150` already combines `prMergeCommit` and `commitFiles`, `vnext` sorts last at `board.ts:420-424`, and `withRecord` (`rendering.ts:66-93`) and `decision.ts:76` change as stated. Every Changelog entry has a slice, and each consumer waits on its producer.

Both jurors hold one defect independently: **the headroom check in `verifyStart` cannot refuse.** `fleetSize` never answers 0 for one more process; a starved machine still gets a ceiling of 1 (`rules/fleet-size.ts:88` `STARVED_CEILING = 1`, `:169`). So the plan's "the machine's headroom" condition starts a run of 4 Frontier contexts on a starved machine. Estate names the rule that already defers a start there: `machineDefers` (`rules/auto-dispatch.ts:404`) with the `Machine override` key. The moderator read `fleet-size.ts:88` and `:169` and confirms.

## The gate run (deliverable juror)

The deliverable juror wrote five scratch files under `/Users/jwloka/.claude/jobs/ca0ab00d/tmp/r3-gate/` and made 26 `check` calls with the verify vocabulary (`Position "supported,refuted"`, `Evidence "executed,read"`, `Claim-<n> "supported,refuted"`) and one `reconcile` call. The verbatim commands and output are in `round3-deliverable.md` § *Gate run*.

- `a-full.md` (Position, Evidence, Claim-1, Claim-2, Claim-3, Claim-10): all six labels exit 0. `Claim-10:` does not satisfy `Claim-1:`, because the match includes the colon.
- `b-missing.md` (no Claim-2): exit 3, `no 'Claim-2:' line — Claim-2: <supported|refuted>`.
- `c-template.md` (pasted `Claim-1: <supported|refuted>`): exit 3, `'<supported|refuted>' is not one of supported, refuted`.
- `d-two-values.md` (Claim-2 twice, two words): exit 3, `claims both supported and refuted`.
- `e-echoed-claims.md` (the claim list copied in as `Claim-<n>: <claim text>`): exit 3 on every label, for example `'The fleet verifies every Delivered plan' is not one of supported, refuted`.
- `reconcile` takes one reading per juror.

**Result:** the per-label checking the plan describes works with today's script and needs no script or domain change. The change is in `skills/plot-panel/SKILL.md` only (parameters `:58`, Commitment `:64`, brief `:79`, `:111`, `:113-119`, unattended text `:104-105`, step 3 `:125-130`, step 4 `:138-142`, step 5 `:149-157`), and the fold slice names it. The juror's first loop exited 2 on every call because zsh did not split the label from its words; that was the test loop, and the rerun with explicit arguments gives the results above.

## Where the jurors differ

The positions are unanimous. Each juror holds findings the other did not report, and none contradicts the other:

- **Estate, HIGH — the juror command runs the old bundle.** Inside the pinned worktree, `node skills/plot/scripts/board/plot-local-checks.mjs --files` resolves to the bundle of the delivery commit. Every plan delivered before the slice lands carries a bundle with no `--files`, which covers the whole first run. Today's entry ignores an unknown flag (`entry/local-checks.ts:191-196`, read by the moderator) and falls back to `changedFiles('HEAD')`, which is empty there, so the juror gets only the `**` gates and nothing says so. `plot-verify.mjs` has the same exposure. The plan must name the bundle by an absolute path outside the pinned worktree. Deliverable did not test this, because it checked that `--files` is named, not which copy runs.
- **Deliverable, MEDIUM — no slice books the record.** `perform-fs.ts` skips the `commit` and `push` write kinds; delivery books them in `entry/deliver.ts` through a booking worktree with a micro-PR fallback. The verify worktree is detached at the delivery commit, and no `plot-verify.mjs` command performs the writes. Estate did not reach the booking path.
- **Estate, MEDIUM — the failure record duplicates auto-delivery's.** `AUTO_DELIVER_MAX_FAILURES = 3`, `retryVerdict` and `recordDeliveryFailure` (`rules/auto-deliver.ts:61-133`) live in the in-flight store keyed `'dispatch' | 'deliver'` (`in-flight-store.ts:100-127`); runs start through `startBoardRun` (`board-run.ts:184`); the closed list of log kinds has no `verify` (`agent-log.ts:317-329`). Auto-delivery stops one plan after 3 failures with backoff; this plan stops every run after 3 failures across plans. The plan names none of this.
- **Estate, MEDIUM — the verify worktree reads as an unknown desk.** The reaper and the reconcile scan list any worktree under `Worktree root` without `.plot-worker.pid` as "needs a person" (`entry/reap.ts:590-610`, read by the moderator; `plot-reconcile-scan.sh:2586-2598`). "A detached worktree is no desk" holds only for the fleet scan.
- **Deliverable, MEDIUM — the reconcile label is unnamed.** `reconcile` takes one reading per juror, and the plan only implies `Position`.
- **Deliverable, MEDIUM — the `claims` output format is unnamed.** If a list line starts with `Claim-<n>:` and a juror copies it, every label is refused (probe e), and the 3-failure guard then stops the fleet.
- **Deliverable, MEDIUM — the plan has no `## Acceptance` section.** Its own `claimsOf` would judge only its 4 Changelog entries, and mechanisms 2, 3, 5, 7 and 8 are proved by slice text only.

## Findings one juror holds alone, LOW

- **Estate:** `assign.ts:224` is a comment line; the count is at `:227`. `/plot-deliver` step 5 already checks two labels (`SKILL.md:318-319`); if it passes both as the new list, an `Evidence:` refusal gains a send-back, which is a behaviour change the plan says does not happen. No script runs `pnpm install` at a desk; the agent does it because `CLAUDE.md` says so. `plot-release/SKILL.md:191` looks for an open RC checklist with `v*-checklist.md`, which matches `vnext-checklist.md` with no `RC:` line (read by the moderator). `DESIGN-phases.md:269` says a later plan cannot refute an earlier claim, which is stronger than the plan's correct text. The gate that reads `.plot-verify.pid` is the installed plugin's copy, so the CI-suite guard works only after a plugin release carries it.
- **Deliverable:** the Changelog leaves out the `/plot-panel` label list and `Prefix`, `plot-local-checks.mjs --files`, and the 3-failure guard with its row. `.gitignore:63` covers `.plot-worker.pid` and not `.plot-verify.pid` (read by the moderator). `verificationOf` reads `stale` by date only while the fleet also compares commits, so board and fleet can disagree after a same-day reject and re-delivery. No slice owns the tracer case of `verificationOf`; slice 1 does not wait on `a-slice-is-marked-spike`. `jurorPath` and `moderationPath` have no production caller, so a `Prefix` on them ships nothing by itself.

## A blind spot the two share

Both jurors read the pinned worktree as a place where the run *reads* code. Only estate asked which *code runs* there, and neither followed the same question to its end: every tool the run executes from the worktree — `plot-local-checks.mjs`, `plot-verify.mjs`, `plot-panel.mjs`, the skills the jurors load — is the delivery commit's copy, not the copy this plan ships. The first run therefore verifies with tools that predate the verification feature. The plan needs one rule: the run executes the default branch's tools against the pinned tree, and reads only the plan and its code at the pin.

Second, the round confirms the round-2 shape: each revision closes the named gaps and opens seams where a new mechanism meets an existing one (booking, failure records, worktree classification, headroom). Two lenses found seven MEDIUM seams that round 2's four lenses could not see because the mechanisms did not exist then. A further revision is likely to add seams of the same kind.

## What each juror looked at or ran

- **Estate:** read the plan, the five siblings, the story, `DESIGN-phases.md`, `panel.ts`, `entry/panel.ts`, `gate.ts`, `assign.ts`, `fleet-size.ts`, `auto-dispatch.ts`, `auto-deliver.ts`, `in-flight-store.ts`, `board-run.ts`, `agent-log.ts`, `refs.ts`, `deliverability.ts`, `entry/local-checks.ts`, `entry/reap.ts`, `plot-reconcile-scan.sh`, `rendering.ts`, `decision.ts`, `board.ts`, `/plot-release`, `/plot-deliver`, `plot-install-hooks.sh`; ran `git grep` and the panel check on its own file. No feature was executed.
- **Deliverable:** ran the panel gate 26 times against five scratch files and once in `reconcile`; read `panel.ts`, `entry/panel.ts`, `/plot-panel`, `/plot-deliver` steps 2 and 5, `fleet-size.ts`, `perform-fs.ts`, `entry/deliver.ts`, `local-checks.ts`, `gate.ts`, `board.ts`, `.gitignore`.
- **Moderator:** read `gate.ts:405-476`, `assign.ts:215-230`, `rendering.ts:60-93`, `fleet-size.ts:88`, `:165-175`, `perform-fs.ts:62-72`, `entry/local-checks.ts:185-197`, `entry/reap.ts:588-606`, `plot-release/SKILL.md:189-193` and `.gitignore`; each says what the juror reports.

## Judgement for the caller

Not ready to approve. One HIGH (the pinned worktree runs the old bundle) and seven MEDIUM seams are open. Each has a one-sentence fix in Design and in one slice's text, and none changes the slice structure.
