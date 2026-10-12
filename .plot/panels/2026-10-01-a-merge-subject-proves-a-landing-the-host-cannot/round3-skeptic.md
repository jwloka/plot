# Round 3 — refutation skeptic

Position: amend
Evidence: executed

Subject: `docs/plans/2026-10-01-a-merge-subject-proves-a-landing-the-host-cannot.md` at `5b62e9e1`, amended after round 2. Read in a detached worktree of `5b62e9e1`. A shell fixture (`juror3-1139-skeptic/r` in the session scratchpad) builds the age cases with the plan's batched commands.

## Round 1 and 2 asks

All answered in text: the remaining hold is stated; the reused-name, two-plan and claimed-name cases have tests; the ancestry call carries its declaration; the auto-delivery stick is addressed by a skip; the import test is scoped to `packages/*/src/` and called a guard, not the gate; the line references now hold (`plot-fleet-scan.sh:408-409`, `:561`; `plot-deliver.sh:181`; `plot-worker-loop.sh:2213` is the call and `:594` the comment, as the plan says).

## Executed

- **The age test answers as designed.** Fixture: `main` merges `bug/flaky`, the plan is added on `idea/p`, `main` merges `bug/racy`, then `idea/p` merges and a later `bug/after`. `merge-base --is-ancestor <merge> <added>`: flaky `yes` (ignored), racy `no` (the stated draft-window limit), after `no`. The `active/` symlink appears as its own `A` entry and the dated file as another, so reading the dated path is necessary and sufficient.
- **The rename limit is stated with the wrong mechanism.** The plan says a rename "moves `<added>` forward". That is the per-file lookup's behaviour. The batched walk runs with git's default rename detection, so a renamed dated file shows as `R`, never `A`: after `git mv 2026-10-01-p.md 2026-10-01-q.md` the walk lists only the old path. The new path is absent from the answer, the plan gets no subjects, and its branches go to the host. On `origin/main` 4 of 392 dated plans have no `A` entry for their current path (`2026-08-20-every-section-has-one-subject.md`, `2026-08-23-the-agents-tab-filters-to-the-sprint.md`, `2026-08-25-a-wip-branch-nobody-is-on-is-not-startable.md`, `2026-09-07-the-build-pipeline-is-its-own-connector.md`). The direction is safe. A cheap improvement exists: read `--diff-filter=AR --name-status` in the same one call and follow each `R` to the original `A`, so the age survives a retitle.

## New defect, blocking

**The `evidence` field does not reach `planAutoDeliver`.** The pulse is parsed through `BranchSchema` (`packages/domain/src/entities/fleet.ts:174`), a plain `z.object`, which strips keys it does not declare. A scan that emits `evidence: "subject"` is parsed into a branch without it, the auto-delivery skip never fires, and the round-2 stick returns with every test that builds its pulse as a typed object still green. The plan must add `evidence` and `subjectIgnored` to `BranchSchema` with defaults, and the tick test must build its pulse by parsing scan JSON through `FleetReadingSchema`, not by literal.

## Smaller

- "Each such branch is answered once" is false as worded. `terminal_cached` discards an entry when `origin/<main>` moves (`plot-fleet-scan.sh:1256-1271`), so a delivery candidate is asked again after every merge to main until the host answers. Say "once per main tip".

## What the plan must change

1. Add `evidence` and `subjectIgnored` to `BranchSchema` with defaults; the tick test parses scan JSON.
2. Restate the rename limit for the batched walk (absent, not moved forward), or follow `R` entries to the original add.
3. "Answered once" becomes "once per tip of `origin/<main>`".
