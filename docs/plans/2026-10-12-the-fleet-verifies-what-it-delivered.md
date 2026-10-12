# The fleet verifies what it delivered

> For each Delivered plan the fleet runs a verification panel against the merged work on the default branch, writes a verification record into the plan, opens one `ai-generated` issue per refuted claim, flags a refuted plan, and keeps a manual release checklist for the endgame round. Release stays a person's act.

## Status

- **State:** Draft
- **Type:** feature
- **Story:** plot-works-in-five-phases
- **Review:** pr
- **Impl:** own branches
- **Rounds:** 1

## Changelog

- The fleet verifies every Delivered plan against the commit that delivered it, including a plan that `/plot-deliver` already panelled at delivery: each Changelog entry and acceptance claim is judged supported or refuted by a gated juror line, and the plan gains a `Verified:` record and a `## Verification` section. The `Auto-verify` setting turns the run on and off, and the `Verify command` key names its runner.
- The fleet opens one issue, labelled `ai-generated`, for each refuted claim where the repository declares a `Tracker`, and the board flags a plan with a refuted claim. `/plot-release` lists refuted plans before it cuts a release.
- `/plot-deliver --verify <slug>` runs the verification panel on a Delivered plan by hand, at the delivery commit or at a commit the person names, and replaces the record.
- The fleet keeps a manual release checklist for the human testing round in `docs/releases/vnext-checklist.md`. `/plot-release rc` starts from it.

<!-- Board impact: a new Status record (`Verified:`), a new plan section (`## Verification`), a refuted badge on the card, and a failed-verification row in *Waiting on you*. The Testing badge reads `docs/releases/vnext-checklist.md`, because `board.ts:423` reads the lexically last `*-checklist.md` and `vnext` sorts after every `v<digit>` name. No change to the template or the docs/plans layout. -->

## Motivation

D11 in [the story](../stories/plot-works-in-five-phases/STORY-plot-works-in-five-phases.md) gives the fleet the mechanical part of Testing. Measured on `main` at `75f093cb9`, 2026-10-12:

- `/plot-deliver` step 5 (`skills/plot-deliver/SKILL.md:188`) runs a lens panel through `/plot-panel` before delivery, with two gated commitment lines, `Position: supported | refuted` and `Evidence: executed | read` (`:266-269`, `:318-319`), and three lenses, Deliverable, Behaviour and Changelog (`:251-255`). It runs once, at delivery, inside a person's session, and gives one position per juror for the whole plan. Of 130 directories under `.plot/panels/`, 1 holds a committed delivery panel (`2026-09-30-a-slice-nobody-worked-on-reads-not-started/deliver-*.md`). Nothing questions a plan after it is Delivered.
- Automatic delivery (`packages/domain/src/rules/auto-deliver.ts`) delivers a plan whose slices have merged, with no panel. Its comment at `:311-315` names the gap.
- The panel gate reads one position per juror file: `readJuror` refuses a file whose `Position:` lines name two words (`packages/domain/src/rules/panel.ts:162-165`). A second label is a second `check` call with no domain change (`skills/plot-deliver/SKILL.md:304-306`).
- `/plot-panel` is a skill, and no script can run a panel (`packages/board/src/server/interrogate.ts:27-28`). The board starts one through the `Interrogate command` with a prompt naming a caller skill that supplies all four parameters (`interrogate.ts:111-117`).
- `/plot-release rc` writes `docs/releases/v<version>-checklist.md` with one item per delivered feature or bug plan (`skills/plot-release/SKILL.md:219-246`). Three checklists exist on `main`: `v2.1.0`, `v2.9.0` and `v2.19.0`. The board's Testing badge reads the lexically last `*-checklist.md` (`packages/board/src/server/board.ts:423`).
- Plot writes one fact to a tracker, a status (`packages/domain/src/ports/tracker.ts:41` `StatusWrite`). Five sites refuse any other write: `tracker.ts:31-40`, `:84-88`, `:126-129`, `skills/plot/scripts/plot-host.sh:4929-4934` and `skills/plot-deliver/SKILL.md:450`. D11 decides a second write: opening an issue.
- This repository's `## Plot Config` declares no `Tracker` key, so `trackerFor` answers `trackerNone` (`packages/domain/src/adapters/tracker/tracker-resolve.ts:35-44`).
- 0 of 452 plans carry an `## Acceptance` section. 0 plans read `State: Delivered` (419 Released). `origin/main` carries 167 `plot: deliver` commits since 2026-09-12, about 5.4 a day. Every push to `main` runs `ci.yml`, `build-bundles.yml` and `release.yml`, with no path filter.

## Design

### Approach

The design spec is [DESIGN-phases.md](../stories/plot-works-in-five-phases/DESIGN-phases.md) §6, *In Testing*.

**The claims.** `claimsOf(plan)` numbers the plan's `## Changelog` entries in file order, then the items of an `## Acceptance` section where the plan has one (none today). Claim numbers are read from the plan at the pinned commit, so a later edit of the Changelog does not renumber a run's claims.

**The pinned commit.** A run judges the plan at its delivery commit: the commit on the default branch that added the plan's `Delivered:` record. Every slice of the plan has merged at that commit, and no later plan has. The run checks out that commit in a detached worktree under `Worktree root`, named `verify-<slug>`, and removes it when the run ends. A later plan that changes a behaviour therefore cannot refute an earlier claim. A person who wants to judge a claim at a later commit runs `/plot-deliver --verify <slug> --at <sha>` (below), and the record names that commit.

**The verification record.** A Delivered plan gains two things:

```markdown
- **Verified:** 2026-10-20 at 1a2b3c4, 5 supported, 1 refuted

## Verification

- Claim-1 supported — <claim> — 3 of 3 (executed: behaviour, deliverable)
- Claim-4 refuted — <claim> — behaviour refuted; deliverable, changelog supported — #1712
- Claim-5 refuted — <claim> — changelog refuted — no issue: no Tracker declared
```

`verificationOf(plan)` reads them and answers `unverified`, `supported` or `refuted`, with the refuted claims, their issue numbers and the pinned commit. The record is not a `State:` change, so `plot-state-gate.sh` is not involved.

**The panel is `/plot-deliver` step 5's panel.** The fleet's run is `/plot-deliver --verify <slug>`, a new mode of the existing skill. It runs steps 2, 3 and 5.1 to 5.3 against a Delivered plan and flips no phase. It hands `/plot-panel` step 5's three lenses and step 5's rubric by reference, and step 5's two commitment lines, plus one label per claim:

```
Position: supported | refuted
Evidence: executed | read
Claim-1: supported | refuted
Claim-2: supported | refuted
```

Each label is one `plot-panel.mjs check` call per juror, as step 5 already gates `Evidence`. A juror that omits a claim's line, or names two words for it, is refused and sent back by `/plot-panel` step 4. The `Position:` line is the juror's answer for the whole plan; it is kept because step 5's reconciliation reads it. The fleet implements no part of the panel. What it adds is the fold below.

**Juror commands.** A juror runs what a claim says where the pinned worktree allows: the commands `node skills/plot/scripts/board/plot-local-checks.mjs` prints for the files the plan changed, and the plan's own bundles. The controller gate refuses a `CI suites` command at a fleet desk (`packages/domain/src/rules/ci-suite.ts:139`), and a juror starts no board or fleet command. A claim that only a CI suite proves is judged from the CI run on the plan's merge commits and committed `Evidence: read`, as the one committed delivery panel did for `fleet.test.mjs`.

**File names.** `/plot-panel` gains an optional fifth parameter, `Prefix`, default empty, applied to every juror file and to the moderation. `jurorPath` and `moderationPath` (`panel.ts:49`, `:58`) take it. The verification run passes `verify-`, so it writes `.plot/panels/<slug>/verify-<lens>.md` and `verify-panel.md` and never overwrites the Draft rounds' `panel.md`.

**The fold.** `foldVerification(claims, jurors)` is a domain rule. It reads every juror file once per claim label through `readJuror` and gives one line per claim:

- `supported` when every juror commits `supported` for that claim.
- `refuted` when one or more jurors commit `refuted` for that claim. The line names the lenses on each side. One refutation decides, because step 5 asks every juror to refute (Principle 12) and a person reads the issue.
- No record when `readPanel` answers `refused` for any label. The run counts as failed.

The line carries which jurors committed `Evidence: executed`.

**The run.** `plot-fleetd` asks `verificationOf` for every plan that reads `State: Delivered`, including a plan that `/plot-deliver` step 5 panelled at delivery: the delivery panel writes no record, so the plan reads `unverified` and the fleet verifies it again (D18). For an `unverified` plan with no run in the fleet's state, it starts one run through the layering rule: the fleet's controller asks the domain, and an adapter starts the process. The runner is the `Verify command` key, with a prompt naming `/plot-deliver --verify <slug>` and `PLOT_UNATTENDED=1`. The key is its own, as `packages/fleet/src/shared/implement-run.ts:22-42` states the rule *one capability, one key*. This repository declares it with `--model opus`, as step 5 asks a Frontier tier for the panel (`skills/plot-deliver/SKILL.md:191`). An absent key starts nothing, and the fleet's status names the key, as `interrogateAvailability` does (`interrogate.ts:40-53`).

**Cost and capacity.** One run is one worker process that holds a moderator and three `Task` jurors, so 4 Frontier contexts. `Parallel agents` counts processes (`packages/fleet/src/server/entry/registryd-main.ts:980`), so a run counts as 1 and the machine runs 4 contexts. The fleet runs at most one verification at a time and starts one only when the cap has a free slot, so a run never displaces a slice agent. At about 5.4 Delivered plans a day, a repository with the switch on pays about 5.4 runs a day, 4 Frontier contexts each, and gets about 5.4 record pushes to `main` a day, the same count as delivery. Each push runs the three `main` workflows. A path filter on those workflows is outside this plan.

**The switch.** The `Auto-verify` key seeds an `autoVerify` field in `.plot/state/fleet-controls.json`, beside `autoDispatch` (`packages/fleet/src/shared/fleet-settings-store.ts:56-68`). It defaults OFF, by the same rule: the exact literal `true` turns it on, anything else reads as off. Off starts no run and stops none.

**Writing the record.** A new write kind `plan-section` replaces or adds one `##` section of a plan file, with its renderer in `workflows/rendering.ts` and its performer in `adapters/performer/perform-fs.ts`. The `Verified:` line is a `plan-record` write (`workflows/decision.ts:72`). The verify workflow emits `plan-record`, `plan-section`, the juror files, the checklist file, one `commit` (`plot: verify <slug>`) and one `push` on `plot/verify-<slug>` onto the default branch, as `workflows/deliver.ts:224-225` does for delivery. A plan Released while its run was going keeps the record, so no paid run is discarded; the checklist leaves it out.

**Issues for refuted claims.** The tracker port gains `issueOpen({ title, body, labels })`, and `plot-host.sh` gains an `issue-open` op for `jira` and `github-issues`. The verify workflow resolves the port through `trackerForIssues` (from `tickets-and-stories-have-lanes`, `feature/the-tracker-lists-closed-issues`), which follows `issueSource`: `tracker` resolves to the declared connector, which opens the issue; `git-host` resolves to the read-only `trackerGitHost`, which answers `unaskable` on `issueOpen` as it does on `statusWrite`; `nobody` resolves to `trackerNone`. The issue reads and the issue write therefore follow one decision. The port's doc names it as the second write Plot makes to a tracker, decided by D11, and keeps its refusal of every other widening; the five sites in Motivation say so. The order makes the open idempotent: the fold, then one `issueOpen` per refuted claim with no issue number yet, each number written to `.plot/state/verify/<slug>.json` as it returns, then the record's commit and push carrying the numbers. A push that fails is retried on the next pass from the state file, and opens nothing again. A re-verification opens nothing for a claim whose line already carries a number.

**No tracker.** `trackerGitHost` and `trackerNone` answer `unaskable`, and the claim's line reads `no issue: no Tracker declared`. This repository declares no `Tracker`, so its own runs open zero issues; the refuted badge, *Waiting on you* and `/plot-release`'s list carry the signal instead. Declaring `Tracker: github-issues` here is a config change for the operator, not a slice of this plan.

**The flag.** `planStatus` is not changed. A new card property `verification` carries `verificationOf`'s answer, and a refuted plan shows a *refuted* badge with the count. Before step 1, `/plot-release` lists every refuted plan in the release, in both the RC and the final path, and the person decides. A refuted plan that needs more slices goes back to Approved through the existing `/plot-reject`.

**A failed run.** The fleet records one run per plan in its state. A run that exits non-zero, or whose panel is refused, is not started again. `verificationRow(plan, runState)` is a domain property that puts a failed run in *Waiting on you* (`packages/board/src/app/lib/agent-rows/sections.ts:26`) with its log. `the-board-has-three-tabs` renames that tab to Delivery and keeps the section's content (D9).

**Re-verification.** `/plot-deliver --verify <slug> [--at <sha>]` is the one path that writes a record over an existing one. A person runs it after a fix lands, or to restart a failed run. With no `--at`, it judges the delivery commit again; with `--at`, the named commit. It replaces the `## Verification` section and the `Verified:` line, keeps each issue number on its claim's line, and adds a Notes line naming the earlier record. The fleet never re-runs a plan that has a record. Closing an issue stays a person's act (D11).

**The release checklist.** The verify workflow rewrites `docs/releases/vnext-checklist.md` in the record's own commit, so it costs no extra push. Its shape is `/plot-release rc`'s: one `- [ ]` item per feature or bug plan delivered since the last release tag, from its Changelog, with `verified N/N` beside it; refuted plans under a `## Refuted` heading with their issue numbers; the two sign-off lines empty. `/plot-release rc` renames the file to `docs/releases/v<version>-checklist.md` and adds the RC line; with no `vnext` file it writes the checklist as today. The fleet fills no sign-off line, as `/plot-release` already forbids an agent (`skills/plot-release/SKILL.md:244-246`).

**What stays human.** The fleet delivers nothing new, releases nothing, fills no sign-off, closes no issue and re-runs no recorded plan (D11).

### Open Points

- [x] The checklist's file name before a version exists (story Open Point 11). — resolved: `docs/releases/vnext-checklist.md`, which sorts after every `v<digit>` file so the Testing badge at `board.ts:423` reads it; `/plot-release rc` renames it.
- [ ] Which plans the first run covers (story Open Point 14). Plan default: Delivered plans only, from the day the slice lands; Released plans are not run. Measured: 0 plans read Delivered today, so the first run covers none.
- [x] [Estate] The panel gate reads one position per juror file (`rules/panel.ts:162-165`), so the plan must name the gated labels that give each claim its own `supported` or `refuted` before slice 1 fixes the record's shape. — *panel round 1, amend* — resolved: one label `Claim-<n>: supported | refuted` per claim, one `plot-panel.mjs check` call each, beside step 5's `Position` and `Evidence`.
- [x] [Contradiction] The `## Verification` lines are moderator prose unless a gated output produces them: one panel per claim, one gated label per claim, or a record of one position per plan. — *panel round 1, amend* — resolved: one gated label per claim; every record line comes from `readJuror` output through `foldVerification`, never from the moderation.
- [x] [Deliverable] No slice owns the step that folds the jurors' verdicts into one line per claim, nor the rule for jurors who disagree on one claim. — *panel round 1, amend* — resolved: `feature/the-jurors-fold-into-one-line-per-claim` builds `foldVerification`; one `refuted` decides a claim, and the line names the lenses on each side.
- [x] [Cost] The plan does not name the command and model the run uses, how the run counts against `Parallel agents`, or a setting that turns verification off, so its cost at about 6 Delivered plans a day cannot be checked. — *panel round 1, amend* — resolved: `Verify command` (Opus here), one process counted as 1 against `Parallel agents` holding 4 Frontier contexts, one run at a time, `Auto-verify` default off; cost stated in *Cost and capacity*.
- [x] [Panel] The run must reuse `/plot-deliver` step 5's panel, not a parallel one. — *panel round 1* — resolved: the run is `/plot-deliver --verify`, with step 5's lenses, rubric and both commitment lines, and a `verify-` file prefix.
- [x] [Panel] A plan that `/plot-deliver` step 5 already panelled. — resolved by D18: the fleet verifies it again in Testing, at one more run of 4 Frontier contexts per hand-delivered plan; step 5 does not change.
- [x] [Panel] Claims checked at the default branch's head can be refuted by a later plan. — *panel round 1* — resolved: a run is pinned to the plan's delivery commit, and the record names the commit.
- [x] [Panel] Nothing moves a refuted plan back to supported after a fix. — *panel round 1* — resolved: `/plot-deliver --verify <slug> [--at <sha>]` is the re-verification path; the fleet never re-runs a recorded plan.
- [x] [Panel] An issue opens before the record that makes it idempotent is pushed. — *panel round 1* — resolved: each issue number goes to `.plot/state/verify/<slug>.json` before the push, and a failed push is retried from it.
- [x] [Panel] This repository has no `Tracker` key, so its own run opens no issue. — *panel round 1* — resolved: stated; the line reads `no issue: no Tracker declared`, and the badge, *Waiting on you* and `/plot-release` carry the signal.
- [x] [Panel] `issueOpen` needs a `plot-host.sh` write op, and four more doc sites still refuse a ticket. — *panel round 1* — resolved: the issue-write slice adds `issue-open` and amends all five sites.
- [x] [Panel] The issue slice ran in the same wave as the run it consumes. — *panel round 1* — resolved: the port write and the wiring are two slices, and the wiring is in a later wave than the run.
- [x] [Panel] `next-checklist.md` never reaches the board's badge, and one item per claim is not `rc`'s shape. — *panel round 1* — resolved: the file is `vnext-checklist.md`, with one item per plan as `rc` writes.
- [x] [Panel] Each record and each checklist rewrite is a push to `main`. — *panel round 1* — resolved: the checklist joins the record's commit, so about 5.4 pushes a day; stated in *Cost and capacity*.

## Slices

### The record

- `feature/a-delivered-plan-carries-its-verification` <!-- waits: feature/the-phases-are-a-declaration --> — `claimsOf`; the `Verified:` record with its pinned commit and the `## Verification` section; `verificationOf` and `refutedClaims`; `plot-plan-meta.sh` reports `verified_raw`; the card's `verification` property and *refuted* badge <!-- builds: verificationOf, refutedClaims and the refuted badge -->

### The fold

- `feature/the-jurors-fold-into-one-line-per-claim` — `foldVerification` over `readJuror` per `Claim-<n>` label, with the one-refutation rule; the optional `Prefix` on `jurorPath`, `moderationPath` and `/plot-panel`; the `plan-section` write kind, its renderer and performer; the verify workflow's writes and `board/plot-verify.mjs` <!-- builds: foldVerification and the plan-section write -->

### The run and the tracker write

- `feature/the-fleet-verifies-a-delivered-plan` — `/plot-deliver --verify <slug> [--at <sha>]` with step 5's lenses, rubric, commitment lines and `Claim-<n>` labels; the pinned worktree; `Verify command`, and this repo's `CLAUDE.md` `## Plot Config` declares it with `./scripts/check-agents-md.sh --write` regenerating `AGENTS.md`; a plan panelled at delivery is verified again (D18); `Auto-verify` and `autoVerify`; `plot-fleetd` starts one run at a time within `Parallel agents`; one run per plan in the fleet's state; `verificationRow` in *Waiting on you* <!-- builds: the fleet's verification run and the Auto-verify switch -->
- `feature/a-tracker-opens-an-issue` <!-- waits: feature/the-tracker-lists-closed-issues --> — `issueOpen` on the tracker port, `trackerJira`, `trackerGithub`, `trackerGitHost` (answers `unaskable`) and `trackerNone`; the verify workflow resolves the port through `trackerForIssues`; the `plot-host.sh issue-open` op; the five sites that refuse a ticket name the second write <!-- builds: issueOpen and plot-host.sh issue-open -->

### The issues

- `feature/a-refuted-claim-opens-an-issue` — the verify workflow opens one `ai-generated` issue per refuted claim with no number; the numbers in `.plot/state/verify/<slug>.json` before the push; the retried push; the `no issue` line under `trackerNone` <!-- builds: one issue per refuted claim -->

### The checklist

- `feature/the-fleet-keeps-the-release-checklist` — `docs/releases/vnext-checklist.md` in the record's commit; `/plot-release rc` renames it; `/plot-release` lists refuted plans before step 1 and names `/plot-reject` <!-- builds: the fleet-kept release checklist -->

## Notes

- 2026-10-12: drafted by an unattended `/plot-idea` batch run from jwloka's decisions of the same day. Type, Review and Impl came from the prompt.
- 2026-10-12: the first slice waits on `feature/the-phases-are-a-declaration` of `the-phases-are-declared`, because the story's Current Plan orders Phase 6 after Phase 1 and that slice moves the `toBoardPhase` callers in `packages/board/src/server/board.ts`, the file where this slice adds the card's `verification` property. Nothing this plan builds reads a phase name (D12).
- 2026-10-12, deliverable search (`plot-deliverable-search.sh`): `verification` returned no verification record, only `drop.ts:150`, `plot-board-verify.sh` and `plot-install-hooks.sh`, which verify other things. `refuted` returned `rules/panel.ts:65`, the panel's caller vocabulary that this plan reuses, and `rules/auto-deliver.ts:314`. `releaseChecklist` returned `entities/release.ts:41` (`checklist: string | null`, the RC checklist path) and `transitions/release.ts:18`. `issueCreate` returned no artifact; `plot-host.sh issue-list` (`:4617`) states that it writes nothing to a tracker.
- 2026-10-12, round 1 revision: the one reader of a checklist file is `board.ts:423`; no domain module reads a checklist file by name. `interrogate.ts` is a second code-started caller of `/plot-panel` through `/challenge-the-plan`, so this plan's run is the third caller of the mechanism and the second started by code.
- 2026-10-12, decision D18: the panelled-plan question is resolved. `issueOpen` resolves through `trackerForIssues`, so `feature/a-tracker-opens-an-issue` waits on `feature/the-tracker-lists-closed-issues` of `tickets-and-stories-have-lanes`, which builds the resolver and `trackerGitHost`.
