# The fleet verifies what it delivered

> For each Delivered plan the fleet runs a verification panel against the merged work on the default branch, writes a verification record into the plan, opens one `ai-generated` issue per refuted claim, flags a refuted plan, and keeps a manual release checklist for the endgame round. Release stays a person's act.

## Status

- **State:** Draft
- **Type:** feature
- **Story:** plot-works-in-five-phases
- **Review:** pr
- **Impl:** own branches

## Changelog

- The fleet verifies every Delivered plan against the merged code: each Changelog entry and acceptance claim is judged supported or refuted, and the plan gains a `Verified:` record and a `## Verification` section.
- The fleet opens one issue, labelled `ai-generated`, for each refuted claim, and the board flags a plan with a refuted claim.
- The fleet keeps a manual release checklist for the human testing round. `/plot-release rc` starts from it.

<!-- Board impact: a new Status record (`Verified:`), a new plan section (`## Verification`) and a refuted flag on the card. The release checklist gains a fleet-written draft. No change to the template or the docs/plans layout. -->

## Motivation

D11 in [the story](../stories/plot-works-in-five-phases/STORY-plot-works-in-five-phases.md) gives the fleet the mechanical part of Testing. Measured on `main` at `75f093cb9`, 2026-10-12:

- `/plot-deliver` step 5 (`skills/plot-deliver/SKILL.md:188`) runs a lens panel through `/plot-panel` before delivery, with the positions `supported` and `refuted` (`:267`, `:318`). It runs once, at delivery, inside a person's session. Nothing questions a plan after it is Delivered.
- Automatic delivery (`packages/domain/src/rules/auto-deliver.ts`) delivers a plan whose slices have merged, with no panel.
- `/plot-release rc` writes `docs/releases/v<version>-checklist.md` from the Changelog of every plan delivered since the last release (`skills/plot-release/SKILL.md:217-246`). Three checklists exist on `main`: `v2.1.0`, `v2.9.0` and `v2.19.0`.
- Plot writes one fact to a tracker, a status (`packages/domain/src/ports/tracker.ts:41` `StatusWrite`), and the port's doc refuses to widen the write to a body or a label (`:31-40`). D11 decides a second write: opening an issue.

## Design

### Approach

The design spec is [DESIGN-phases.md](../stories/plot-works-in-five-phases/DESIGN-phases.md) §6, *In Testing*.

**The verification record.** A Delivered plan gains two things:

```markdown
- **Verified:** 2026-10-20, 5 supported, 1 refuted

## Verification

- supported — <claim> — <the command a juror ran, and what it showed>
- refuted — <claim> — <what a juror found> — #1712
```

`verificationOf(plan)` reads them and answers `unverified`, `supported` or `refuted`, with the refuted claims and their issue numbers. The claims are the plan's `## Changelog` entries and, where the plan has one, the items of an `## Acceptance` section. The record is not a `State:` change, so the state gate is not involved.

**The panel.** For a plan whose `verificationOf` answers `unverified`, `plot-fleetd` runs `/plot-panel` with the caller vocabulary `supported,refuted`, one juror per lens, against the default branch at its current head. This is the mechanism `/plot-deliver` step 5 calls; the fleet is its third caller and implements none of it. A juror must run what a claim says where it can, as step 5 asks. A verdict file that names no position is refused by the panel's own gate. The fleet's capacity counts each juror like any agent. One run per plan: a failed run is recorded in the fleet's state and shown in the Delivery tab's *Waiting on you*, and is not started again.

**Writing the record.** The fleet writes the record onto the default branch through the same commit path `plot-deliver.mjs` uses for the `Delivered:` record. A plan that is Released before its run ends keeps no record and is not run.

**Issues for refuted claims.** The tracker port gains `issueOpen({ title, body, labels })`. The fleet opens one issue per refuted claim with the label `ai-generated`, a title naming the plan and the claim, and a body with the juror's evidence and a link to the plan. The record stores the issue number, so a later read opens none twice. `trackerNone` answers `unaskable`; the record then says that no issue was opened and why. The port's doc names this as the second write Plot makes to a tracker, decided by D11, and keeps its refusal of every other widening.

**The flag.** `planStatus` is not changed. A new card property `verification` carries `verificationOf`'s answer, and a refuted plan shows a *refuted* badge with the count. `/plot-release` lists refuted plans before it cuts a release, and the person decides.

**The release checklist.** The fleet keeps `docs/releases/next-checklist.md` in the shape `/plot-release rc` writes: one `- [ ]` item per supported claim of every Delivered plan since the last release, refuted claims listed apart with their issues, and the two sign-off lines empty. `/plot-release rc` renames it to `docs/releases/v<version>-checklist.md` and adds the RC line. The fleet fills no sign-off line, as `/plot-release` already forbids an agent.

**What stays human.** The fleet delivers nothing new, releases nothing, fills no sign-off and closes no issue (D11).

### Open Points

- [ ] The checklist's file name before a version exists. Plan default: `docs/releases/next-checklist.md`, renamed by `/plot-release rc` (story Open Point 11).
- [ ] Which plans the first run covers. Plan default: Delivered plans only, from the day the slice lands; Released plans are not run (story Open Point 14).

## Slices

### The record

- `feature/a-delivered-plan-carries-its-verification` <!-- waits: feature/the-phases-are-a-declaration --> — the `Verified:` record and `## Verification` section; `verificationOf` and `refutedClaims`; `plot-plan-meta.sh` reports `verified_raw`; the card's `verification` property and *refuted* badge <!-- builds: verificationOf, refutedClaims and the refuted badge -->

### The panel and the issues

- `feature/the-fleet-verifies-a-delivered-plan` — `plot-fleetd` runs `/plot-panel` per unverified Delivered plan; one run per plan; the record written through the delivery commit path <!-- builds: the fleet's verification run -->
- `feature/a-refuted-claim-opens-an-issue` — `issueOpen` on the tracker port and both connectors; one `ai-generated` issue per refuted claim; the issue number in the record; the port's doc <!-- builds: issueOpen and one issue per refuted claim -->

### The checklist

- `feature/the-fleet-keeps-the-release-checklist` — `docs/releases/next-checklist.md` from the verification records; `/plot-release rc` renames it and lists refuted plans <!-- builds: the fleet-kept release checklist -->

## Notes

- 2026-10-12: drafted by an unattended `/plot-idea` batch run from jwloka's decisions of the same day. Type, Review and Impl came from the prompt.
- 2026-10-12: the first slice waits on `feature/the-phases-are-a-declaration` of `the-phases-are-declared`, the plan this one depends on.
- 2026-10-12, deliverable search (`plot-deliverable-search.sh`): `verification` returned no verification record, only `drop.ts:150`, `plot-board-verify.sh` and `plot-install-hooks.sh`, which verify other things. `refuted` returned `rules/panel.ts:65`, the panel's caller vocabulary that this plan reuses, and `rules/auto-deliver.ts:314`. `releaseChecklist` returned `entities/release.ts:41` (`checklist: string | null`, the RC checklist path) and `transitions/release.ts:18`, which read the file this plan drafts. `issueCreate` returned no artifact; `plot-host.sh issue-list` (`:4617`) states that it writes nothing to a tracker.
