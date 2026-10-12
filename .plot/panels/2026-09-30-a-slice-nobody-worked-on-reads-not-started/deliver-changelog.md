# Delivery juror: Changelog lens

Position: supported
Evidence: executed

## Texts checked

- Plan `## Changelog` (docs/plans/2026-09-30-a-slice-nobody-worked-on-reads-not-started.md), one bullet plus *Board impact: yes … no payload field is added or removed*.
- `.changeset/a-slice-with-no-work-waits-in-not-started.md` (#1106, merge 6e65021b): `'@plot-pm/board': patch`, no `bumps:` and no `plan:` line.
- `.changeset/zero-ahead-is-not-merged.md` (#1108, merge f1d63485): `'plot': patch`, `'@plot-pm/board': patch`, description first, then `plan:` and `bumps: skills: plot: patch`, in the order CLAUDE.md requires.

## Claim against diff

| Claim | Text | Diff | Verdict |
|---|---|---|---|
| `blocked`/`waiting`/`unknown` with no worker reads NOT STARTED with its own sentence naming the prerequisite | changeset #1106, plan changelog ("a slice whose branch does not exist waits in NOT STARTED") | `fleet.ts` classifyGroup: three arms after the worker block, `waitsOn` trailing parameter, `rowsFromPulse` passes `b.waits_on`; the tail is guarded by `state !== 'wip'` → *not recognised* | matches |
| instead of *commits, no PR ever opened* in WAITING ON YOU | changeset #1106 | these states used to fall to the `wip` tail; the new arms return before it | matches |
| closed PR stays in the open section while the worker is `running`/`waiting`, back to DONE when no agent is live | changeset #1106, plan changelog | `liveAgent`/`declined` in `rowsFromPulse`; `rowQuietKind` gets `declined ? 'closed' : null`; the closed-PR sentence is appended as a second fact | matches (the changeset does not mention that the `closed-pr` quiet kind is dropped, which is an omission and not an error) |
| zero-ahead ref behind main: `merged` only for a MERGED PR or an offline scan, `wip` for OPEN, `open` on a complete list, `unknown` otherwise | changeset #1108, plan changelog ("no longer reads as merged when the host was asked and holds no merged PR") | `branch-state.ts` ownState: the table as written in the plan | matches, with one wording gap (see below) |
| the scan sends completeness as an eleventh field | changeset #1108 | `plot-fleet-scan.sh`: `list_complete` from `.list-complete`, appended to each line; the refill at :3929 carries `cut -f11`; the bundle `FIELDS = 11`; the entry docs updated | matches |
| no payload field added or removed | plan Board impact | #1106 touches no schema (`waits_on` already existed); `prListComplete` is an internal `BranchReadings` field and not on the board payload | matches |
| package names valid, bump present for a `skills/` change | both changesets | #1106 ships `board-server.mjs`/`plot-ask.mjs` under `skills/`, but those are the board's built artifacts, and the repo convention for board changes is `'@plot-pm/board'` alone; #1108 edits `plot-fleet-scan.sh` and bumps `plot` | matches |

## Executed

- `plot-branch-state.mjs` probed for a zero-ahead ref behind main (refTip != mainTip, 0 ahead): NONE/true → `open`, NONE/false → `unknown`, CLOSED/true → `open`, CLOSED/false → `unknown`, OPEN → `wip`, MERGED → `merged`, `unasked`+NONE → `merged`; a 10-field line → exit 2 with *expected 11 tab-separated fields, got 10*.
- `npx vitest run` over `a-slice-with-no-work-waits-in-not-started.test.ts`, `the-three-measured-rows.test.ts` and `classifier-is-total.test.ts` (packages/board, Node 24): 3 files, 50 tests passed.

## Wording defects, none of them a missing delivery

1. **Changeset #1108 leaves out CLOSED.** It says `open` *"when a complete pull-request list holds none"* and `unknown` *"otherwise"*. The code, like the plan's table, reads `none` **or `CLOSED`** as `open` on a complete list (probe: CLOSED/true → `open`). A reader of the literal text would expect a branch with only a closed PR to read `unknown`. Suggested amendment: *"`open` when a complete pull-request list holds no open or merged one"*.
2. **Changeset #1108 says "an offline scan".** `unasked` also covers a repository with no git host. That is narrower than the code, not contradicted by it.
3. **The plan changelog's "whatever its PR history" is broader than the diff.** The diff makes a live agent outrank a **closed** PR. A live agent on a branch with an **open, ready** PR still takes the PR arm (`fleet.ts:4497`, unchanged) and reads WAITING ON MACHINE or WAITING ON YOU, not WORKING. Suggested amendment: *"a slice with a live agent stays in WORKING after its pull request is closed"*.
4. **The plan changelog calls it "a claimed branch".** In the rule's vocabulary `claimed` is a branch with commits ahead and none real. The subject here is a ref with zero ahead. Suggested amendment: *"A pushed branch with no commit of its own"*.

The changesets and the changelog both cover each behaviour the two diffs change, and every claim holds for the cases the plan names. The four defects are over-generalisations or omissions in the wording, and each has a one-line repair. None names behaviour the code lacks for the plan's subject, so the delivery is not refuted. The wording should be fixed before `/plot-release` publishes it.
