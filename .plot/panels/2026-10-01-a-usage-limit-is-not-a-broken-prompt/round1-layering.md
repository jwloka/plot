# Round 1 — layering juror

Position: amend
Evidence: executed

## 1. Factual claims on origin/main

- True: the non-zero branch at `plot-worker-loop.sh:2008-2021` raises `attempts` and runs `continue` with no delay; `START_ATTEMPT_BUDGET` is 3 at `:366`; the prompt starts at `:1675`; the three sentences are constants at `:2011`, `:2014`, `:2019`; `EndingReasonSchema` at `entities/ending.ts:55` has no limit reason; `transitions/agent.ts:390` admits actor `agent` only for `unstarted`.
- False: *"The loop already asks `plot-prompt.mjs` once per pass (`:1106`)"*. `resolve_prompt_file` runs once at `:1281`, before the main loop at `:1879`. The entry itself says *"runs once, before its first prompt"* (`entry/prompt.ts`). The real per-pass precedent is `plot-slice-spend.mjs` (`:1011`, called at `:2114`). The conclusion survives.
- Mischaracterised: the plan says the cost rule *"permits"* a duplicate per pass. `CLAUDE.md:501` and `docs/shell-and-domain.md` §1 say a per-pass script *duplicates*. The plan's real argument is that this question is asked less often than per pass. That argument is sound; state it as a reading of the frequency rule.
- Path: the template is `skills/plot/templates/worker-prompt.sh:136`, not `templates/worker-prompt.sh:136`.
- Misleading: *"the sourced `plot-desk-dirt.sh`"*. The loop does not source it. The loop sources `plot-worker-state.sh` (`:712`) and reads desks through `plot_worker_dirty` (`:753-754`).

## 2. Layering and placement

- **Rule in `rules/prompt-exit.ts`, patterns under `adapters/`: correct.** The vendor gate (`ci.yml:299-311`) holds vendor knowledge in `adapters/`, and `adapters/host/listing-paging.ts` plus `rules/listing-page.ts` is the exact precedent: the rule takes a value, and the adapter supplies the table. The plan does not say this. A rule may not import an adapter (`CLAUDE.md` Layering Rule: *"it does not import an adapter"*). The slice must state that `promptExit` takes the patterns (or a harness reading) as an argument, and that `entry/prompt-exit.ts` joins the adapter table to the rule.
- **Matching stays in the rule.** The 100% threshold covers `src/!(adapters)/**` only (`packages/domain/vitest.config.ts:71`). Regex matching or reset parsing placed in the adapter would escape the coverage gate. The adapter must be data only.
- **Bundle, not a duplicate: correct.** It is asked only after a non-zero exit, and a duplicate would need a corpus pair (`shell-and-domain.md` §3) for no saved cost. Slice 1 must add the `build.mjs` block and the committed artifact (`shell-and-domain.md` §2); `check-bundle-attributes.sh` holds the rest.
- **Undefined: an unaskable bundle.** `shell-and-domain.md` §1 says *"a rule that cannot be asked refuses"*. The plan does not say what the loop does when `node` or the bundle fails. Today's `unstarted` path is the safe answer; the plan must state it.
- Arrow functions and the entity enum: `limited` goes into `EndingReasonSchema`, and `test/ending.test.ts:45` pins the option list, so slice 1 updates that test. No board or shell reader switches on the reason today.

## 3. Breaks an implementer hits

- **The fix is inert under the default launch.** `plot-dispatch.sh:1491` exports `PLOT_HARNESS="$launch_harness"`, and `plot-fleetctl.sh:897-899` records that this is empty unless a charter names a harness. The prompt template defaults it to `claude` (`:136`); the loop does not. If the loop passes `$PLOT_HARNESS` as written, the adapter sees an unknown harness, and every #1141 exit reads as today. A fake-harness test that sets `PLOT_HARNESS` explicitly passes and hides this.
- **The desk sentence becomes a new false sentence.** I ran `desk_dirt` and `plot_worker_dirty` on a clean repository holding only `.plot-worker.monitor.1.jsonl`. `desk_dirt` printed `?? .plot-worker.monitor.1.jsonl`; `plot_worker_dirty` printed nothing, because it drops `\.plot-worker\.` (`plot-worker-state.sh:89`, `:437`). An adopting repository lacks Plot's `.gitignore` lines 60-68, so on the #1141 estate the loop's own log, ending and monitor files count as *"uncommitted paths"*. A second dirt reading inside the loop also gives two answers about one tree, which `plot-desk-dirt.sh`'s header forbids.
- **Commits since the claim:** the claim commit is `plot: claim <branch>` (`:2270`). The plan does not name how the loop finds it. A desk restarted with `--restart` has no claim commit from this process.

## 4. Slices

Both slices are buildable. Slice 1's done holds without prose once the rule-input shape is fixed. Slice 2's done needs one more case: the harness name unset, as `plot-dispatch.sh` launches it.

## 5. Required change

State that the loop passes `${PLOT_HARNESS:-claude}` to the bundle, the same default as `worker-prompt.sh:136`, and add a slice 2 test with `PLOT_HARNESS` unset. Also, in the same edit, replace `plot-desk-dirt.sh` with the loop's existing `plot_worker_dirty`.
