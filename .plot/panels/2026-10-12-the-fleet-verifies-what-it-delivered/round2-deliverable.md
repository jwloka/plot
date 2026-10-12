# Round 2 — deliverable

Position: amend

The gate accepts the per-claim labels exactly as the plan writes them, and every round-1 point has a slice that owns it. Two seams between the plan and the skills it reuses do not hold as written: `/plot-panel` gates and sends back one label, not N, and `/plot-deliver` steps 2 and 5.1 do not accept a Delivered plan or produce the plan's claim numbers.

## Round-1 points

- [Estate] One label per claim, one `check` call each — held. `readJuror` (`packages/domain/src/rules/panel.ts:119-167`) takes the label as a parameter, matches it case-insensitively at the start of a trimmed line (`:127-131`), and reads only lines with that label. Executed: one scratch file with Position, Evidence, `Claim-1`, `Claim-2` and `Claim-10` lines passed five separate `check` calls (exit 0 each, correct word each); `Claim-1` does not match the `Claim-10` line, because the match includes the colon; a missing `Claim-3` exits 3 with `no 'Claim-3:' line`; two different words on two `Claim-1` lines exit 3 with `claims both supported and refuted`. No domain change is needed, as `skills/plot-deliver/SKILL.md:304-306` states.
- [Contradiction] Record lines come from `readJuror` through `foldVerification`, not from the moderation — held in the plan text (Design, *The fold*), and the fold slice owns it (`feature/the-jurors-fold-into-one-line-per-claim`). Nothing exists on this branch yet, which is correct for a Draft.
- [Deliverable] A slice owns the fold and the disagreement rule — held. The fold slice names `foldVerification`, the one-refutation rule, `plan-section` and `board/plot-verify.mjs`.
- [Cost] Command, model, cap, switch — held in the plan text. `Parallel agents` is the cap the registry reads (`packages/fleet/src/server/entry/registryd-main.ts:980`); `Auto-dispatch` and its `false` default sit at `packages/fleet/src/shared/fleet-settings-store.ts:56,68`, so `Auto-verify` has a precedent.
- [Panel] Reuse step 5's panel — partly held. Lenses (`skills/plot-deliver/SKILL.md:251-255`) and both commitment lines (`:266-269`, `:318-319`) exist as the plan cites. The reuse of steps 2 and 5.1 does not hold; see New defects 2 and 3.
- [Panel] D18, a plan panelled at delivery is verified again — held. The story records D18 (`STORY-plot-works-in-five-phases.md:69`, `:93`), and slice 3 names it.
- [Panel] Pinned to the delivery commit — held in the plan text, slice 3 owns the pinned worktree.
- [Panel] Re-verification path — held; slice 3 owns `--verify [--at <sha>]`.
- [Panel] Issue idempotence through `.plot/state/verify/<slug>.json` — held; `feature/a-refuted-claim-opens-an-issue` owns it.
- [Panel] No `Tracker` here — held; stated, and the `no issue` line is in the issues slice.
- [Panel] `issue-open` op and the five refusal sites — held; `feature/a-tracker-opens-an-issue` names both.
- [Panel] Issue slice in a later wave — held; *The issues* wave follows *The run and the tracker write*.
- [Panel] Checklist file name — held. `readChecklist` filters `-checklist.md` and takes the last of a plain `.sort()` (`packages/board/src/server/board.ts:423-424`); `vnext` sorts after `v2.1.0`, `v2.19.0` and `v2.9.0`, the three files in `docs/releases/`.
- [Panel] One push per record — held; the checklist joins the record's commit, as `workflows/deliver.ts:224-225` does for delivery.

## New defects

1. `/plot-panel` takes one Commitment, so it cannot send back a juror that omits a `Claim-<n>` line. The plan says such a juror "is refused and sent back by `/plot-panel` step 4". `/plot-panel`'s Commitment parameter is singular, "The label and the words" (`skills/plot-panel/SKILL.md:64`), its brief shows one `<Label>:` line (`:113-116`), and step 3 checks one `$LABEL` per juror (`:127-130`). Step 4 re-runs only on that check. `/plot-deliver` step 5 gates `Evidence` with its own second `check` call (`skills/plot-deliver/SKILL.md:315-319`) and names no send-back for it. The fold slice edits `/plot-panel` only to add `Prefix`. Result: a juror that drops one of N claim lines is not sent back; `foldVerification` then answers no record, the run counts as failed, and the fleet never starts it again (Design, *A failed run*). One omitted line costs a whole 4-context run and a person's `--verify`. A slice must make `/plot-panel`'s Commitment a list of labels gated and sent back together, or `--verify` must own the send-back.
2. `/plot-deliver` step 2 refuses the plan `--verify` targets. Step 2 reads the phase and answers "Already delivered" for `Delivered` or `Released` (`skills/plot-deliver/SKILL.md:96-98`). The plan says `--verify` "runs steps 2, 3 and 5.1 to 5.3" and names no change to step 2. Slice 3 must state that `--verify` inverts step 2's phase check (Delivered, or Released for a run that outlived a release).
3. Step 5.1 does not produce the plan's claim numbers. Step 5.1 extracts deliverables from `## Design`, `## Slices` or any bulleted list and numbers them (`skills/plot-deliver/SKILL.md:199`). `claimsOf` numbers `## Changelog` entries, then `## Acceptance` items. If `--verify` runs 5.1 as written, the jurors' `Claim-<n>` numbers and the fold's claims refer to different lists, and the record attaches a verdict to the wrong claim. No slice names how the skill obtains `claimsOf`'s numbered list (a bundle such as `board/plot-verify.mjs` printing it would do); `claimsOf` is a domain function in slice 1 with no entry point named.
4. The plan's own label template passes the gate as `supported`. Executed: a scratch file holding the line `Claim-1: supported | refuted`, copied from the plan's commitment block, exits 0 as `committed supported`, because `readJuror` keeps the first word and discards the rest (`panel.ts:148-151`). With one line per claim, a juror that pastes the template commits every claim as supported, and the one-refutation rule cannot see it. The same property exists for `Position` today, but N pasted lines multiply it, and the default it produces is the verdict the panel exists to doubt. The brief should show the template as `<supported|refuted>` (the form `commitmentLine` renders, which fails the gate when pasted), not `supported | refuted`.
5. Step 5.3 reads `.plot/panels/<subject>/panel.md` (`skills/plot-deliver/SKILL.md:351-352`), but the `verify-` prefix writes `verify-panel.md`. Slice 3 must point 5.3 at the prefixed moderation, or say that `--verify` skips 5.3 because the record comes from the fold. The plan says both "runs 5.1 to 5.3" and "the record comes from the fold, never from the moderation".
6. A `vnext` checklist shadows the RC checklist. After `/plot-release rc` renames `vnext-checklist.md` to `v<version>-checklist.md`, the next verification run writes a new `vnext-checklist.md`, which sorts last, so `board.ts:423-424` shows the next release's checklist while the RC's sign-off round is still open. The plan should state which checklist the badge shows during an RC, or have the run not recreate `vnext` while an RC checklist is unsigned.
7. Changelog wording, minor: entry 2 says an issue opens "where the repository declares a `Tracker`", but the design resolves through `trackerForIssues` and `issueSource`, so a repository with a `Tracker` and `issueSource` set to `git-host` opens none. The entry should name `issueSource`.

## Ready to approve?

No. The per-claim gate, the fold and the slice ownership hold, and the Changelog matches the slices except for entry 2's wording. Defects 1 to 3 are in the reuse the plan relies on: as written, `/plot-deliver --verify` stops at step 2, numbers the wrong list at 5.1, and loses a whole run to one missing claim line that `/plot-panel` cannot send back. Each is a sentence in slice 3 or the fold slice, not a redesign.

## Unresolved finding

`/plot-panel` gates and sends back exactly one Commitment (`skills/plot-panel/SKILL.md:64`, `:127-130`), so the plan's claim that a juror missing a `Claim-<n>` line "is refused and sent back by `/plot-panel` step 4" has no owner, and one omitted line fails the run permanently.

## What I looked at

Read: the plan; round-1 `panel.md` directory listing; `packages/domain/src/rules/panel.ts` (whole); the bundled `skills/plot/scripts/board/plot-panel.mjs`; `skills/plot-panel/SKILL.md:56-160`; `skills/plot-deliver/SKILL.md:83-119`, `:180-386`; spot checks of `board.ts:420-425`, `workflows/decision.ts:70-74`, `workflows/deliver.ts:222-226`, `fleet-settings-store.ts:56-68`, `agent-rows/sections.ts:24-28`, `rules/ci-suite.ts:137-140`, `registryd-main.ts:978-981`; `ls docs/releases/`; D18 in the story.

Executed: `plot-panel.mjs check` against three scratch juror files under `/Users/jwloka/.claude/jobs/ca0ab00d/tmp/r2-deliverable/` — Position, Evidence, `Claim-1`, `Claim-2`, `Claim-10` and a missing `Claim-3` on one file; a pasted `supported | refuted` template line and an indented claim line on a second (both exit 0; indentation does not hide a line from the gate, because lines are trimmed); two contradictory `Claim-1` lines on a third (exit 3); and the literal label `Claim-<n>` (exit 3). Ran no tests, board or fleet commands.
