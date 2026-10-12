# Round 3, cost lens — design-work-proves-the-path

Position: amend

The three design moves hold against the code at `8d7230934`. The spike approval stays under the `approve` action, the controller gate refuses a bare `--spike` call, the person arm keys on the gated `State:` phase, and the shell arithmetic is internally correct and still passes the ratchet under a more realistic count. One defect remains that a sentence must fix: moving the dispatch rewrite into slice 1 changes what `plot-dispatch.sh` tells an operator for every non-Design plan, and the plan resolves that by rewriting the two contract tests that pin the old behaviour. Slice 1 also becomes the largest and widest PR of the plan, and the plan does not say so.

## Rubric answers

### a. D10 on every channel — holds, with one wording risk

- **Workflow.** `workflows/approve.ts:161-180` refuses `NONE` and `''` as `state-unreadable` (`:169-174`), so a plan with its `State:` line removed cannot reach any arm. The state gate already refuses the removal of the `State:` line without a receipt, so keying `approvalArm` on the phase closes the round-2 channel (removing the `Spike approved:` record) by construction.
- **HTTP agent arm.** `server/approve.ts:306` today reads only `readReview(...) === 'in-session'` (`:147-159`, plan-meta of the working-tree file). Slice 2 makes it ask `approvalArm`. With the `State:` line removed, `approvalArm({phase: '', review: 'pr'})` answers `pr`, so no 409 fires and the board spawns an agent that the bundle then refuses with `state-unreadable`. The approval does not happen; the cost is one agent that can only refuse, which is the cost the 409 exists to avoid (LOW).
- **Wording risk in the bundle (LOW).** `inSession` at `entry/approve.ts:480` drives three things: the PR read (`:487-491`), the unattended refusal (`:527`), and, through the workflow's own `inSession` (`workflows/approve.ts:227`), the PR checks (`:229`) and the `pr-ready`/`pr-merge` writes (`:249`). The plan says "the bundle's `inSession` reading" asks the rule. A worker who replaces `inSession` wholesale with `approvalArm === 'person'` skips the merge of an open plan PR, which contradicts the plan's own sentence that "an open plan PR still merges pinned to its head" (line 71). The slice should say that the arm decides `--who` and the unattended refusal, and that the `Review:` word still decides whether a plan PR is read and merged.

### b. A Design plan with a spike approved by no person — no path found

`approve` in `transitions/plan.ts:258-262` and the workflow both pass `approved` as a phase, but reaching `approved` needs a `State:` write, which only a receipted `plot-approve.sh`/`.mjs` run makes. `plot-approve.sh` is an 8-line launcher that `exec`s the bundle (`:12`), so both names run one workflow. A `ballot` Design plan keeps `review-human` (`workflows/approve.ts:215-216`). I found no channel that skips `--who` once slice 2 lands.

### c. The controller gate refuses a bare `plot-approve.mjs --spike` — holds

`GATED` maps `plot-approve.mjs` to `approve` (`rules/ci-suite.ts:233-239`). `actionFor` returns `null` only for a flag in `NO_ENDPOINT` (`:306-307`: `--dry-run`, `--help`, `-h`), and `--spike` is neither there nor in `VALUE_FLAGS` (`:316`), so `node .../plot-approve.mjs --spike <slug> --who <h>` answers `approve` (`:319-325`) and needs the same receipt a plain approval needs. `ControllerAction` (`rules/controller-gate.ts:11`) does not change. One consequence the plan does not state: one `approve` receipt licenses either mode, so the receipt does not say which approval the person asked for. Both modes demand a declared `--who`, so this is not a D10 gap.

### d. The shell-line arithmetic — correct as written, optimistic in its inputs, and the margin holds

- **What the gate counts.** `scripts/check-shell-lines.sh:40-47` counts non-comment, non-blank lines of every `.sh` under `skills/`, HEAD against the merge base (`:97-106`), with no allowance (`:15-19`). Embedded Python inside `plot-fleet-scan.sh` counts as shell; Python `#` comments do not.
- **The removal is real.** `plot-dispatch.sh:2957-3004` holds 44 counted lines (measured with the gate's own regex), and `:2954-2955` are the two `sed` lines: −46. `gate_meta` (`:2953`) stays, because the waits gate reads it at `:3094`, and `gate_source` (`:2947-2951`) must stay to feed `plangate`'s `source`. The table's sums are right: +8 +7 −43 = −28, and doubling the additions gives +36 against −46.
- **The additions are under-counted.** The precedent is `design_raw`, which costs a front-matter read (`plot-plan-meta.sh:851`), a canonical read (`:991`), a select (`:562`) and an emit (`:760`): four lines, not the three the table gives `spike_approved_raw`. `tracer` follows the same shape (about +3, not +2). The spike indexes on the `P` row need a comprehension in the Python print at `plot-fleet-scan.sh:3110`, and the per-slice `spike` column on the verdict line (`:4561`) needs a membership test against the comma list, about +3 to +4, not +1. The `plangate` call with a fail-closed check on a missing bundle is +3 to +5. My estimate is +25 to +30 added, so the net is about −16 to −21, not −28. The slice still passes, and the plan already makes the PR state the measured count (LOW).

### e. Dispatch behaviour for non-Design plans — it changes, and the plan rewrites the tests that pin it (MEDIUM)

Word by word, shell `case` (`plot-dispatch.sh:2957-3004`) against `plangate` (`workflows/dispatch.ts:527-571`):

| Arm | Shell | `plangate` | Change |
|---|---|---|---|
| `draft` | "still Draft on <source> — nothing may be dispatched", ref explanation, "Review it, then: /plot-approve <slug>" | `phase-draft`, "still Draft on <source> … If you approved it locally, push that approval." | loses `/plot-approve <slug>` |
| `delivered`/`released` | "already <phase> — its work is done", "To start new work: /plot-idea" | `state-terminal`, first sentence only | loses `/plot-idea` |
| `""` | "cannot read the phase of …" | `state-unreadable`, "cannot read the state of …" | wording |
| `NONE` | falls to `*)`: "in phase 'NONE', not Approved" + `/plot-approve` | `state-unreadable` (`:538-543`) | reclassified |
| other (`design`) | "in phase '<p>', not Approved", "Correct the 'State:' line … /plot-approve <slug>" | `state-wrong`, "in state '<p>', not Approved." | loses the fix and `/plot-approve` |
| `same-branch` | … "Implement on that branch instead: /plot-implement <slug>" | `impl-same-branch`, no command | loses `/plot-implement` |
| `none` | "knowledge-only work, nothing to implement." | "knowledge-only work." | loses "nothing to implement" |
| unrecognised `Impl:` | names the four valid answers | names none | loses the valid answers |
| exit code | `exit 1` everywhere | "exits non-zero" (plan line 52), unnamed | unspecified |

Two contract tests fail as the plan writes the slice: `test/reconcile/dispatch.test.mjs:975` asserts `/plot-approve/` with the message "must say how to fix it, not just refuse", and `:1031` asserts `/nothing to implement/i` for `Impl: none`. The plan's remedy, "the contract tests that assert the shell's refusal words read the domain's words" (line 52, slice 1), deletes a pinned property to make the refactor pass, and names neither test. The Changelog line "`plot-dispatch.sh` asks the domain … in place of its own copy" promises no behaviour change, and five of nine arms lose the operator's next command. The fix costs no shell: the `plangate` details (TypeScript) or a per-reason hint in the `plot-ask.mjs plangate` printer carry the shell's next-step lines, slice 1 names `dispatch.test.mjs:975` and `:1031` as tests that keep their assertions, and the plan names the exit code and that a missing `plot-ask.mjs` refuses (fail closed), as `plot-verdicts.mjs` callers do (`plot-fleet-scan.sh:5027`).

Two smaller input gaps for the same call (LOW): `plangate` is a non-exported `const` (`workflows/dispatch.ts:486`) and `plot-ask.mjs` knows `board`, `fleet` and `deliverable` only (`entry/ask.ts:46`); and `plangate` reads `refResolved`, `file`, `parsed`, `source` and `allowLocal` (`dispatch.ts:73-100`, `:504-525`), not only plan-meta JSON. `dispatch.test.mjs:2552` asserts that the Draft refusal names `origin/main`, so the shell must pass `gate_source`. "Pipes the plan-meta JSON it already holds" under-describes the call.

### f. Ready to approve from the cost lens — after one amendment

## Findings

1. **MEDIUM — the dispatch rewrite drops the operator's next command on five arms and rewrites two tests to match** (`plot-dispatch.sh:2957-3004` against `workflows/dispatch.ts:527-571`; `test/reconcile/dispatch.test.mjs:975`, `:1031`). Keep the hints in TypeScript or in the `plangate` printer, keep both assertions, and name the exit code and the fail-closed missing-bundle case.
2. **MEDIUM — slice 1 is now the plan's largest and widest PR, and the plan does not say so.** It touches about 15 files across shell (`plot-plan-meta.sh`, `plot-fleet-scan.sh`, `plot-dispatch.sh`), board (`PlanMetaSchema`, `slicesFrom`, `entry/ask.ts`), domain (`spikeOf`, `SliceReadings`, pulse `PlanSchema`, an exported `plangate`), contract tests and two templates, and it changes dispatch for every plan in the estate. The ratchet forces the coupling, because room freed by a separate dispatch slice is gone for the next (`check-shell-lines.sh:15-19`). Rollback is also priced by the ratchet: once a later slice touches the same paths, a revert of slice 1 is no longer exact (`:59-72`) and its +46 lines are refused, so a defect in the new gate is fixed forward in `plangate`. In round 2 I called a 12-to-15-file slice too large; this one is the same size, and the right answer here is to say why and keep the dispatch rewrite as its own commit inside the PR, not to split it.
3. **LOW — the shell estimate is optimistic** (`plot-plan-meta.sh:562`, `:760`, `:851`, `:991` precedent; `plot-fleet-scan.sh:3110`, `:4561`). The realistic net is about −16 to −21, and the slice still passes.
4. **LOW — the `plangate` question needs more than plan-meta JSON** (`workflows/dispatch.ts:73-100`, `:486`; `entry/ask.ts:46`; `dispatch.test.mjs:2552`).
5. **LOW — "the bundle's `inSession` reading asks the rule" invites skipping the plan-PR merge** (`entry/approve.ts:480`, `:487-491`; `workflows/approve.ts:227`, `:249`).
6. **LOW — the 409 does not fire for a plan with no `State:` line**, so the board spawns an agent that only refuses (`server/approve.ts:306`, `workflows/approve.ts:169-174`). D10 holds.

No HIGH finding. No decision D1 to D27 needs to change.

## What I looked at and ran

I read the subject plan in full, `round2.md` and `round2-cost.md`, and the story's decision table (D1 to D27, `STORY-plot-works-in-five-phases.md:75-104`). I read code with `sed`, `grep` and the Read tool: `scripts/check-shell-lines.sh` in full; `plot-dispatch.sh:2925-3024` (Read tool) and a `grep` of its `gate_*` variables and bundle calls; `plot-plan-meta.sh` around the `design_raw`, `approved_raw`, `deferred` and `waits` parsing and the not-found record at `:314`; `plot-fleet-scan.sh:3100-3165`, `:4545-4570`, `:5020-5036` and its `plan_meta_*` readers; `workflows/dispatch.ts:70-110`, `:440-571`; `rules/eligible.ts:30-45`; `entry/verdicts.ts:60-95`; `entry/ask.ts` (question type); `rules/ci-suite.ts:160-360`; `rules/controller-gate.ts:1-40`; `server/approve.ts:140-160`, `:270-360`; `entry/approve.ts:470-535`; `workflows/approve.ts:160-280`; `transitions/plan.ts:250-275`; `plot-approve.sh`; `package.json` scripts and `ci.yml` (`grep` for the build, contracts and ratchet steps); `test/reconcile/dispatch.test.mjs:960-1050` and `:2535-2560`. I counted the removed lines with the gate's own regex (`grep -vcE '^[[:space:]]*(#|$)'` over `:2957-3004`: 44). I ran no tests, no gates, no fleet or board commands, and edited no file but this one.
