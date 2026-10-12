# Panel round 2: the-fleet-verifies-what-it-delivered

- **Subject:** `docs/plans/2026-10-12-the-fleet-verifies-what-it-delivered.md`
- **Caller:** `/challenge-the-plan` Phase 3P, round 2
- **Commitment:** `Position: proceed | amend | reject`
- **Lenses:** estate, contradiction, deliverable, cost
- **Rubric:** (1) did the revision resolve each round-1 Open Point the plan marks resolved, verified against the code with file:line; (2) what new defect did the revision introduce; (3) is the plan ready to approve from this lens
- **Siblings:** 5 read, 0 unread (story plot-works-in-five-phases)
- **Gate:** all four verdicts committed on the first run (`plot-panel.mjs check`, exit 0 each); no juror was sent back
- **Reconcile:** `unanimous	amend	estate,contradiction,deliverable,cost`
- **Verdicts:** `round2-estate.md`, `round2-contradiction.md`, `round2-deliverable.md`, `round2-cost.md`; the round-1 files are unchanged

## What the panel agrees on

The revision closes the round-1 core. All four jurors confirm that one juror file can carry `Position`, `Evidence` and `Claim-1` to `Claim-N`, each read by its own `check` call: `readJuror` matches the label at the start of a line (`packages/domain/src/rules/panel.ts:127-132`). The deliverable juror ran this against scratch files: `Claim-1` does not match a `Claim-10` line, a missing `Claim-3` exits 3, and two words for `Claim-1` exit 3. The fold slice, `Verify command`, `Auto-verify` default off, D18's duplicate cost, the pinned commit, the issue idempotence, the five tracker sites, the wave split and `vnext` sorting last at `board.ts:423` hold in every verdict that checked them.

No juror says `proceed`, because each found a defect that the revision introduced. Three defects hold in two or more verdicts:

- **The RC checklist loses the Testing badge during the RC round** (estate, deliverable, cost). `/plot-release rc` renames `vnext-checklist.md`; the next verification run writes a new `vnext-checklist.md`, which sorts last again (`board.ts:420-424`), so the badge reads the new file while the RC sign-off is still open.
- **The juror's commands are empty at the pinned commit** (estate, cost). `plot-local-checks.mjs` asks `changedFiles`, which runs `git diff --name-only origin/<main>...<branch>` (`packages/domain/src/adapters/refs/refs-git.ts:308-317`). The delivery commit is an ancestor of main, so the diff is empty and the script names no check for the plan's files. `Evidence: executed` then vouches only for the generic gates.
- **`--verify` reuses step 5 text that does not fit it** (contradiction, deliverable). Step 2 answers "Already delivered." for a Delivered plan (`skills/plot-deliver/SKILL.md:96-98`), and the plan does not change step 2. Step 5.3 reads `.plot/panels/<subject>/panel.md` (`:351-353`), but the `verify-` prefix writes `verify-panel.md`. Step 5.1 numbers deliverables from Design and Slices, while `claimsOf` numbers Changelog entries, so jurors and the fold can number different lists. The round-1 point "the run must reuse step 5's panel" is therefore held only in part.

A fourth holds in two verdicts: **the `Verified:` write has no home.** `PlanRecordWrite.field` allows only `Approved`, `Started`, `Delivered` and `Released` (`packages/domain/src/workflows/decision.ts:76`), and no slice names a `Verified` value (estate, contradiction). Estate adds that `withRecord` fills a placeholder or appends a line and never replaces a filled one (`workflows/rendering.ts:66-96`), so a re-verification writes a second `Verified:` line, against the plan's "replaces the `Verified:` line".

## Where the jurors disagree

The positions are unanimous. The jurors differ on which defect blocks approval:

- **Estate:** the empty local-checks diff at the pinned commit is the one unresolved finding; every round-1 point holds.
- **Contradiction:** the `/plot-reject` path is the one unresolved finding. `/plot-reject` preserves all other content (`skills/plot-reject/SKILL.md:111-112`), so the `Verified:` record survives the reject, and plan line 99 forbids the fleet to re-run a recorded plan. After the next delivery the record and badge stay stale until a person runs `--verify`.
- **Deliverable:** the per-claim gate has no owner. `/plot-panel` gates and sends back one Commitment (`skills/plot-panel/SKILL.md:64`, `:127-130`); nothing owns the plan's claim that a juror who omits a `Claim-<n>` line "is refused and sent back by `/plot-panel` step 4". One missing line makes the fold write no record, and the fleet never restarts a failed run.
- **Cost:** the capacity claim is false today. The plan says a run counts as 1 against `Parallel agents` (plan line 85); `fitFleet` counts registered agents, idle ones included (`packages/domain/src/workflows/assign.ts:224`), so an unregistered verify process counts as 0, and with the fleet full the free-slot rule never starts a run. Slice 3 does not say which behaviour it builds.

These four do not contradict each other. Each is a different gap, and each lens saw only its own. The deliverable and cost findings both concern what the round-1 "resolved" text promised without a mechanism, which is round 1's failure mode again at a smaller scale.

## Findings one juror holds alone

- **Contradiction:** a Delivered tracer plan is selected by plan line 83, but D5 and `DESIGN-phases.md:114` say a tracer plan never reads in Testing, while D18 says "in Testing". The CI-suite refusal that plan line 71 relies on fires only in a worktree that holds `.plot-worker.pid` (`gate.ts:415-420`, as the juror cites), and the plan does not say that `verify-<slug>` holds it. The line `no issue: no Tracker declared` is wrong when `issueSource` answers `nobody` for a declared `Tracker` with no connector (`issue-source.ts:51-63`). `--at <sha>` can renumber claims, so an issue number can land on the wrong claim.
- **Deliverable:** the plan's own template line `Claim-1: supported | refuted` passes the gate as `committed supported` when a juror pastes it (tested, exit 0); the template must show `<supported|refuted>`. Changelog entry 2 does not name `issueSource`.
- **Cost:** a fresh pinned worktree has no `node_modules` and needs a `pnpm install` per run, which the plan does not price. The plan gives no run duration, so nobody can check that one run at a time keeps up with about 5.4 deliveries a day. Each failed run costs a person a manual `--verify`.
- **Estate:** a plan Released before its run starts is unverified, and `/plot-release` lists only refuted plans, so it does not name that plan; in a sample of ten plans, Delivered to Released took one to two days. The `fleet-settings-store.ts:56-68` citation points at the keys; the `autoDispatch` field and the literal rule are at `:90`, `:118`, `:139` and `:161`.

## A blind spot the four share

All four jurors judge the run on its success path and on its writes. None asks what a juror judges against when the plan's Changelog itself is wrong at the pinned commit, for example a Changelog entry added by the delivery booking after the last slice merged. More sharply: every juror checks that the run *can* produce a record, and none asks how often a run with three lenses and N claim labels completes without a refusal. The plan makes a refused panel a failed run that the fleet never restarts, and deliverable and cost each name one cause of a refusal; none measures the rate. The one committed delivery panel on the estate is a sample of one. A plan whose every refusal needs a person moves the cost the plan wants to remove from Testing back to a person, and the plan states no expected failure rate.

Second, the moderator's brief told the deliverable juror that indenting a `Position:` line hides it from the gate. The juror tested this and it is false: `readJuror` trims every line (`panel.ts:127-132`). Only a backtick or a mid-sentence position hides it. No other juror relied on the advice.

## What each juror looked at

- **Estate:** read the plan, the siblings, the story, `panel.ts`, `rendering.ts`, `decision.ts`, `refs-git.ts`, `local-checks.ts`, `board.ts`, `fleet-settings-store.ts`, `/plot-release`; ran `git log` and `git grep` and the panel check. No execution of the features.
- **Contradiction:** read the plan, all five siblings, the story D1–D22, `DESIGN-phases.md`, `/plot-reject`, `/plot-deliver` step 5, `gate.ts`, `issue-source.ts`, `decision.ts`, `panel.ts`, `board.ts`; ran the panel check. Reading only.
- **Deliverable:** the only juror that executed the mechanism: ran `plot-panel.mjs check` against scratch juror files for several labels, a missing label, a double label and a pasted template line. Read `panel.ts`, `/plot-panel`, `/plot-deliver` steps 2 and 5, `board.ts`.
- **Cost:** measured deliver commits since 2026-09-12 over 30 commit days (167, matching the plan) and read the three `main` workflow triggers, `assign.ts`, `refs-git.ts`, `board.ts`, `fleet-settings-store.ts`. No test, board or fleet command.

The moderator checked six citations by reading: `skills/plot-deliver/SKILL.md:96-98` and `:351-353`, `refs-git.ts:308-317`, `assign.ts:224`, `skills/plot-reject/SKILL.md:111-112` and `decision.ts:76`. Each says what the juror reports.

## Round-1 points not actually resolved

- **"The run must reuse `/plot-deliver` step 5's panel"** — held in part: step 2 refuses a Delivered plan, step 5.3 reads `panel.md` and not `verify-panel.md`, and step 5.1 numbers a different list from `claimsOf` (contradiction, deliverable).
- **"Record lines are moderator prose" / "the per-claim gate"** — the labels work, but nothing sends back a juror that omits a `Claim-<n>` line; `/plot-panel` gates one Commitment (deliverable).
- **"One process counted as 1 against `Parallel agents`"** — false today: the cap counts registered agents (`assign.ts:224`), and a verify process is not one (cost).
- **"Nothing moves a refuted plan back to supported"** — held for a fix that lands without a reject; after `/plot-reject` and a second delivery the old record survives and the fleet does not re-run (contradiction).
