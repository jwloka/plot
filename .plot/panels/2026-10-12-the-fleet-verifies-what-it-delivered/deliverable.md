# Deliverable lens — the-fleet-verifies-what-it-delivered

Position: amend

## Changelog to slice map

| Changelog entry (plan:15-17) | Slices that build it |
|---|---|
| E1. The fleet verifies every Delivered plan; `Verified:` record and `## Verification` section | slice 1 `a-delivered-plan-carries-its-verification` (format and reader, plan:70) and slice 2 `the-fleet-verifies-a-delivered-plan` (the run and the write, plan:74) |
| E2. One `ai-generated` issue per refuted claim; the board flags a refuted plan | slice 3 `a-refuted-claim-opens-an-issue` (plan:75) and the badge in slice 1 (plan:70) |
| E3. The fleet keeps a manual release checklist; `/plot-release rc` starts from it | slice 4 `the-fleet-keeps-the-release-checklist` (plan:79) |

Every slice maps to a Changelog entry and every entry has a slice. Every branch line carries a `builds:` annotation on the branch line, which is the place `plot-plan-meta.sh:155-162` reads it. The map is complete on paper. The findings below are about whether the slices can ship what the entries say, in the order the waves allow.

## Findings

### 1. The panel mechanism cannot produce a per-claim record, and no slice builds the step between them (HIGH)

- The record that slice 1 defines has one line per claim, each `supported` or `refuted` (plan:38-45, plan:47). DESIGN-phases.md:259 says each juror judges each claim.
- The panel gate reads one position per verdict file. `rules/panel.ts:142-160` refuses a file whose `Position:` lines name different positions. `/plot-deliver` step 5 asks each juror for one `Position: supported | refuted` for the whole plan (`skills/plot-deliver/SKILL.md:265-268`), checked by `plot-panel.mjs check` (`:316-318`).
- So a juror that finds claim A supported and claim B refuted cannot say so in one verdict file. The fleet must either run one panel per claim, or give the panel a per-claim verdict format, and in both cases it must fold N jurors' positions on a claim into one line of the record. The plan says the fleet "implements none of it" (plan:49). That is false for the record the plan ships.
- No slice names this step: slice 2 says "runs `/plot-panel` per unverified Delivered plan" (plan:74), slice 1 builds only the reader `verificationOf` (plan:70). The fold from verdict files to record lines, and the rule for juror disagreement on one claim, have no owner and no `builds:` name. Changelog E1 cannot ship without it.

### 2. Wave 2 runs the issue slice beside the run it depends on (HIGH for ordering)

- Wave *The panel and the issues* holds two branches (plan:72-75). Under the template, branches under one `###` heading run concurrently, and a wave is eligible only when every prior wave merged (`.plot/templates/plan.md:80-84`).
- `a-refuted-claim-opens-an-issue` builds "one `ai-generated` issue per refuted claim; the issue number in the record" (plan:75). The refuted claims come from the run that `the-fleet-verifies-a-delivered-plan` builds in the same wave. One of the two agents builds against code that does not exist on its base, or the wiring falls between them.
- Fix: split slice 3 into the port write (`issueOpen` on the port, both connectors, `trackerNone`, the port doc), which can stay in wave 2, and the wiring (one issue per refuted claim, the number in the record), which moves to a later wave or into slice 2. Alternatively give slice 3 `<!-- waits: feature/the-fleet-verifies-a-delivered-plan -->`.

### 3. Slice 2's "delivery commit path" has no write for a section (MEDIUM)

- The delivery workflow emits typed writes: `plan-phase`, `plan-record`, `index-move`, `commit`, `push` (`workflows/deliver.ts:194-225`). The write union in `workflows/decision.ts` holds `plan-phase`, `plan-record`, `plan-annotation`, `hold-clear`, `sprint-annotation`, `sprint-note` and `index-move` (decision.ts, kinds at lines 63-138). No kind writes a plan section.
- `Verified:` fits `plan-record`. The `## Verification` section does not. A new write kind, its renderer (`workflows/rendering.ts:265` area) and its performer (`adapters/performer/perform-fs.ts:138` area) are needed. Slice 2 names none of them. The delivery push also goes to a `plot/deliver-<slug>` branch onto the default branch (deliver.ts:225); the plan says the record lands "onto the default branch" (plan:51) without saying which branch name the verification commit uses.

### 4. Slice 2 names no runner key, and the precedent exists outside the fleet (MEDIUM)

- A panel needs an agent. `packages/board/src/server/interrogate.ts:27-28` declares `Interrogate command` as REQUIRED "no script can run a panel", and the fleet already reads its own runner keys (`fleet/src/shared/implement-run.ts:42` `Implement command`, `brief-ask.ts:27` `Brief command`).
- Slice 2 does not say which key the fleet runs the panel with, or what it does when the key is absent. The deliverable search in Notes (plan:85) did not list `interrogate.ts`, which is the closest existing caller of `/plot-panel` started by code, so the plan's "third caller" count (plan:49) is unverified.

### 5. Two Design items have no slice and no Changelog entry (LOW)

- "A failed run is recorded in the fleet's state and shown in the Delivery tab's *Waiting on you*" (plan:49). No slice names the row. The Delivery tab is built by `feature/the-tabs-are-discovery-planning-delivery` of `the-board-has-three-tabs`, which this plan does not wait on; today the section is the Agents tab's `waiting-on-you` (`packages/board/src/app/lib/agent-rows/sections.ts:26`).
- "`/plot-release` lists refuted plans before it cuts a release" (plan:55). Slice 4 says `/plot-release rc` lists them (plan:79). The Design names any release; the slice names only rc. One of the two must change.

### 6. The first slice's wait has no stated reason (LOW)

- Slice 1 waits on `feature/the-phases-are-a-declaration` (plan:70, plan:84), and the story agrees (STORY:49). Nothing slice 1 builds reads a phase: `verificationOf` reads two plan fields, and D12 says the fleet reads states only (STORY:83, DESIGN-phases.md:247). If the wait is for a card or payload change, the note should name it; otherwise the wait delays the whole plan for no build reason.

## Claims checked and true

- `/plot-deliver` step 5 runs a lens panel with `supported`/`refuted` (`skills/plot-deliver/SKILL.md:188-191`, `:265-268`, `:316-318`).
- Automatic delivery runs no panel (`rules/auto-deliver.ts:280-323`); its `:313-314` names a panel only as history.
- `/plot-release rc` writes `docs/releases/v<version>-checklist.md` from delivered plans' Changelogs (`skills/plot-release/SKILL.md:217-246`), and forbids an agent to sign off (`:244-246`). The three checklists `v2.1.0`, `v2.9.0`, `v2.19.0` exist in `docs/releases/`.
- The tracker port's only write is `statusWrite` (`ports/tracker.ts:90-172`), and its doc refuses a body or label (`:31-40`). Both connectors write through `plot-host.sh` (`adapters/tracker/tracker-jira.ts:67-98`, `tracker-github.ts:72`); `plot-host.sh issue-list` states it writes nothing (`skills/plot/scripts/plot-host.sh:4617-4621`). Slice 3 therefore also needs a new `plot-host.sh` write op per scheme, which it does not name.
- Acceptance: the plan has no `## Acceptance` section, so its own claims are the three Changelog entries, each checkable by a run. One plan in `docs/plans/` has an `## Acceptance` heading, so the acceptance half of the claim set will be empty for nearly every plan; that is a fact for the panel prompt, not a defect.

## What I looked at

- Files: `docs/plans/2026-10-12-the-fleet-verifies-what-it-delivered.md`; the `## Slices` sections of the five sibling plans; `docs/stories/plot-works-in-five-phases/STORY-plot-works-in-five-phases.md:25-98`; `DESIGN-phases.md` §6-§8; `.plot/templates/plan.md:60-111`; `skills/plot/scripts/plot-plan-meta.sh:125-175`; `skills/plot-deliver/SKILL.md:185-320`; `skills/plot-release/SKILL.md:215-248`; `packages/domain/src/ports/tracker.ts`; `packages/domain/src/rules/panel.ts:60-160`; `packages/domain/src/rules/auto-deliver.ts:280-323`; `packages/domain/src/workflows/deliver.ts`; `packages/domain/src/workflows/decision.ts`; `packages/domain/src/adapters/tracker/*`; `packages/board/src/server/interrogate.ts:1-60`; `packages/fleet/src/shared/implement-run.ts:1-53`; `skills/plot/scripts/plot-host.sh:4610-4622`.
- Commands: `grep`, `sed -n`, `ls` over the worktree; no tests, no board or fleet commands.

Unresolved finding: the panel gate accepts one position per verdict file (`rules/panel.ts:142-160`), so the plan must name the slice that turns jurors' verdicts into one supported/refuted line per claim, or change the record to one position per plan.
