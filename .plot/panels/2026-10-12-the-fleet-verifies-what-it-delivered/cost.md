# Cost lens — the-fleet-verifies-what-it-delivered

Position: amend

## Findings

### 1. The motivation's claims are true, and the cost is stated nowhere

- Every factual claim in `## Motivation` checks out on this branch. `skills/plot-deliver/SKILL.md:188` is step 5, and `supported | refuted` sits at `:267`. `docs/releases/` holds exactly `v2.1.0`, `v2.9.0` and `v2.19.0` checklists. `packages/domain/src/ports/tracker.ts:41` is `StatusWrite`, and `:32-40` refuses a body, a label or an assignee. `packages/domain/src/rules/auto-deliver.ts:312-316` is the comment about a refuted delivery panel.
- The plan names no lens count, no model, no command, no switch and no per-run cost. The only cost sentence is "The fleet's capacity counts each juror like any agent" (plan:49). The sibling `the-fleet-writes-the-design.md:43` names the command (`Idea command`), the layering path and the run record. This plan names only the run record.

### 2. The volume: zero on day one, about six plans a day after that

- The first run covers no plan. On this branch, 0 plans read `State: Delivered`: 419 read `Released`, 17 `Rejected`, 9 `Superseded`, 6 `Draft` and 1 `Approved` (grep over `docs/plans/*.md`). Open Point 14's default (plan:64) therefore costs nothing at the start. The plan does not say so, and it can.
- The steady state is high. Since 2026-09-12, `origin/main` carries 168 `plot: deliver` commits, and 170 plans carry a `Delivered:` date in that window. That is about 6 plans a day. The `## Changelog` sections of the 65 plans delivered in October hold 2.7 entries on average.
- The delivery-to-release gap is short. Over 417 plans with both records, the median is 1 day and the 90th percentile is 3 days. Plan:51 drops the record when the plan is Released before its run ends. A slow or queued run therefore pays its whole token cost and keeps nothing. The plan does not measure this case.

### 3. The panel's jurors are not fleet agents, so "counts each juror like any agent" has no mechanism

- `/plot-panel` fans out through the `Task` tool inside one session (`skills/plot-panel/SKILL.md:15`, `:109`). The one existing unattended panel route starts a single process with the `Interrogate command` (Opus in this repo's config) and lets the skill fan out inside it (`packages/board/src/server/interrogate.ts:11-28`).
- The fleet's cap is the board's `Parallel agents` setting (`packages/fleet/src/shared/fleet-settings-store.ts:57`, `:92`; `packages/fleet/src/server/entry/registryd-main.ts:980`), and it counts worker processes. The default fleet is 3 (`packages/domain/src/rules/fleet-size.ts:15`).
- The plan must choose one of two costs and say which. If the panel is one process, the cap sees 1 while 3 or more frontier jurors run, and the machine load is understated. If each juror counts, a 3-lens panel holds the whole default fleet and starves slice dispatch for the duration. Plan:49 names neither case.
- `plot-fleetd` performs exactly two opt-in writes today, `--start-agents` and `--sweep-temp` (`skills/plot/scripts/README.md:94`). Automatic dispatch has its own switch (`autoDispatch`, `fleet-settings-store.ts:90`). The plan adds a third automatic class, a frontier panel per plan, with no switch and no unit flag.

### 4. Every record is a push to the default branch, and every push to main runs three workflows

- Plan:51 writes the record "through the same commit path `plot-deliver.mjs` uses". That path is a commit plus a push onto the default branch (`packages/domain/src/workflows/deliver.ts:224-225`).
- `ci.yml`, `build-bundles.yml` and `release.yml` all run on `push: branches: [main]`, and no workflow has a `paths` or `paths-ignore` filter (grep over `.github/workflows/*.yml`). `validate` alone has `timeout-minutes: 25` (`ci.yml:194`).
- At 6 plans a day, the records add about 6 pushes to main a day, the same count as delivery itself. The checklist slice (plan:57, plan:79) rewrites `docs/releases/next-checklist.md` on main. The plan does not say whether that rewrite joins the record's commit. If it does not, the push count doubles to about 12 a day.
- The checklist's consumer is rare. The repo has 33 version tags and 3 RC tags, and 3 checklists exist. The fleet would rewrite a file on main about 6 times a day for a flow that ran 3 times in 33 releases. A checklist derived on demand by `/plot-release rc` from the records costs no push. The plan does not weigh this option.

### 5. The issue write is not idempotent across a failed push

- Plan:53 says "The record stores the issue number, so a later read opens none twice". The plan orders the steps as panel, record, issues, but the record must carry the issue number, so the issue opens before the record is pushed. If the push then fails (a race on main, or a release in between, plan:51), the issue exists and no record names it.
- "One run per plan" (plan:49) stops the fleet from a second attempt, so the fleet itself does not duplicate. A person who re-runs the plan does duplicate, because nothing reads the tracker for an existing issue. The plan must name the order and the recovery: record the issue number in the fleet's state before the push, or search the tracker by label and title before an open.
- In this repository the cost is zero today. `## Plot Config` declares no `Tracker` key, so `trackerNone` answers `unaskable` (`packages/domain/src/ports/tracker.ts`, `CLAUDE.md` connector section). The plan's own behaviour for that case (plan:53) is correct.

### 6. A Behaviour juror that runs claims at a fleet desk meets the CI-suite refusal and the operator's board

- Plan:49 asks a juror to "run what a claim says where it can". Many changelog claims in this estate name a suite or the board. The controller gate refuses a CI suite at a fleet desk (`packages/domain/src/rules/ci-suite.ts:5`, `:139`), and `CLAUDE.md` (Testing) records 53 concurrent `node --test` processes and an unresponsive board from two local e2e runs.
- The plan names no checkout for "the default branch at its current head" (plan:49): a desk, a worktree, or the operator's checkout. It names no list of commands a juror may run. A juror running board tests on the machine that serves the board is the blast radius the memory index records as "Local test:board takes the operator's board down".

### 7. Agreement with the spec and decisions

- The plan follows D11 and `DESIGN-phases.md` §6 "In Testing" (spec lines 255-265) item by item. It re-decides nothing.
- A manually delivered plan already ran a step-5 panel with the same vocabulary (`skills/plot-deliver/SKILL.md:188-324`). The fleet runs a second panel on it. Step 5 writes `.plot/panels/<subject>/panel.md` (`skills/plot-deliver/SKILL.md:352`), but that file is not in the plan and the plan does not read it. D11 says "each Delivered plan", so a second run is in scope. The plan must state the duplicate cost, not avoid it.

### The single most important change

Add a cost statement to `## Design` and make the run switchable: the command and model the panel runs (the `Interrogate command` is the precedent), the lens count, how the run counts against `Parallel agents`, a fleet setting that turns verification off as `autoDispatch` turns dispatch off, and one push per plan with the record and the checklist in the same commit.

## What I looked at

- `docs/plans/2026-10-12-the-fleet-verifies-what-it-delivered.md` (whole), `docs/plans/2026-10-12-the-fleet-writes-the-design.md:25-65`, the story's Open Points and D9-D12 (`STORY-plot-works-in-five-phases.md:53-98`), `DESIGN-phases.md:245-267`
- `skills/plot-deliver/SKILL.md:185-330`, `skills/plot-release/SKILL.md:215-248`, `skills/plot-panel/SKILL.md` (grep for Task and fan-out), `skills/plot/scripts/README.md:53,59,94`
- `packages/domain/src/ports/tracker.ts:1-80`, `packages/domain/src/rules/fleet-size.ts:1-40`, `packages/domain/src/rules/budget-record.ts`, `packages/domain/src/rules/plan-spend.ts`, `packages/domain/src/rules/auto-deliver.ts:1-40,312-316`, `packages/domain/src/rules/ci-suite.ts` (exports), `packages/domain/src/workflows/deliver.ts` (grep for commit and push)
- `packages/board/src/server/interrogate.ts:1-60`, `packages/fleet/src/shared/fleet-settings-store.ts:57-165`, `packages/fleet/src/shared/auto-writes.ts`, `packages/fleet/src/server/entry/registryd-main.ts:973-1022`
- `.github/workflows/{ci,build-bundles,release}.yml` triggers and timeouts
- Commands: grep of `State:` values over `docs/plans/*.md`; Delivered-to-Released lag over 417 plans; `git log --since=2026-09-12 origin/main` counts of `plot: deliver` and all commits; `git tag -l` for versions and RC tags; average `## Changelog` entries over plans delivered in October

Unresolved finding: the plan does not say how a panel run counts against `Parallel agents` or which command and model it runs, so its token and capacity cost at about 6 Delivered plans a day cannot be checked before approval.
