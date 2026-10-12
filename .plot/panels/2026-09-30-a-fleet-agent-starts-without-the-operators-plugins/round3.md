Position: proceed
Evidence: executed
Lens: round 3, did the amendment answer rounds 1 and 2, and is the startup `process.env.PLOT_AGENT_SETTINGS` design sound. Environment: macOS 24.6.0, read-only `git show origin/main:<path>` and `git grep origin/main`. Commit judged: origin/main 1464d20c.

## Findings

1. **All six round-2 points are answered in the design, not only in words.**
   - R2.1 (ten board spawns plus `plot-dispatch.sh:792`): "Where it reaches" names all ten sites and the shell spawn; Done-when tests "each of the ten spawn sites" and the detached `Brief command`.
   - R2.2 (five keys): "This repository's five `claude -p` command keys (`Idea`, `Story`, `Brief`, `Implement`, `Interrogate`) … It sets no `Approve command` or `Deliver command`."
   - R2.3 (synchronous sites): answered by removing the question. The board sets `process.env` once at startup, so `askForBrief` and `startImplement` need no new port operation and no `env` option.
   - R2.4 (`env`/`PATH`, boundary wording, `hooks`/`permissions.deny`): `env` is refused whole with the measured `PATH` reason; "a check against a switch-off by accident, not a boundary"; `hooks` and `permissions` named out of scope with the reason.
   - R2.5 (where the rule lives): domain rule `agentSettingsRefusal` in `packages/domain/src/rules/`, asked through `board/plot-agent-settings.mjs`, with the cost-rule argument.
   - R2.6 (key read from the desk): "The key is read from the `CLAUDE.md` of the tree that asks … a desk … that does not carry the key starts as today"; only the value resolves against the main checkout.

2. **All ten board spawn sites inherit `process.env`.**
   Command: `git show origin/main:packages/board/src/server/<f>.ts | sed -n '<l-4>,<l+14>p' | grep -nE "spawn|env|process\.env|detached"` for each site.
   Output: `idea.ts:713`, `implement.ts:225`, `interrogate.ts:323`, `story.ts:506`, `auto-deliver.ts:424`, `commission.ts:409`, `deliver.ts:531`, `reslice.ts:466` each show `spawn(` … `detached: true` … `env: { ...process.env,`. `brief-ask.ts:104` is `spawn('sh', ['-c', \`${command} "$@"\`, 'plot-brief', prompt], { cwd, detached: true, stdio })` and `approve.ts:297` is `{ cwd: opts.repoRoot, detached: true, stdio: [...] }`: no `env`, so they inherit. No agent-runner spawn builds `env` without `process.env`.

3. **No other board process reads an agent-runner key except `plot-ask.mjs`, and no shipped caller reaches that path.**
   Command: for each `skills/plot/scripts/board/*.mjs` on origin/main, `grep -cE "Idea command|Implement command|Brief command|Interrogate command|Story command|Approve command|Deliver command"`.
   Output: `board-server.mjs` 8, `plot-ask.mjs` 3, every other bundle 0 (`plot-registryd.mjs` 0). `plot-ask.mjs fleet` reaches `buildFleet` → `ensureCache` → `void refresh(opts, entry)` (`fleet.ts:3584`) → `maybeAutoDispatch` (`fleet.ts:3428`, `Brief command`) and `maybeAutoDeliver` (`fleet.ts:3458`), in its own node process, which the board's startup assignment does not reach. `git grep -nE "plot-ask" -- 'skills/**/*.md' 'skills/**/*.sh'` finds only the `deliverable` question (the deliver script) and prose; no skill or script asks `plot-ask.mjs fleet`. This path is reachable only by a hand-run `node plot-ask.mjs fleet` with the auto-dispatch switch on. It does not block the build; the implementer can set the variable in `entry/main.ts` the same way, or the plan can name it as out of scope. The registry daemon and `/api/continue` start the worker loop, which resolves the file itself.

4. **`index.ts` has a startup point before the first request.**
   Command: top-level statements of `packages/board/src/server/index.ts` on origin/main, and `build.mjs` lines 120-140.
   Output: the bundle is `format: 'esm'`, `platform: 'node'`, `target: 'node20'`, so top-level `await` is available. The statement order is `opts` → `estate` → `primeWorktreeRoot` → `http.createServer(serve)` → `server.listen(...)` (line 930). The fleet cache and its pulse start on the first `/api/fleet` request (`ensureCache`), not at import. An `await scriptsFor(opts).awaited(...)` placed before `server.listen` completes before any request and before any auto-dispatch pulse. `Scripts.awaited` exists (`packages/domain/src/ports/scripts.ts:197`, `scripts-shell.ts:107`).

5. **Refusing all of `env` is a stated trade-off with a workaround, not a defect.**
   The plan gives the reason (a settings `PATH` makes the gates fail open, measured). A project that needs `ANTHROPIC_MODEL` or similar can put it in its project-owned command key (`ANTHROPIC_MODEL=x claude -p …`) or the worker prompt, which the plan already treats as project text. On a refusal the agent starts as today, and the reason is logged. The plan does not name the lost capability in one sentence; that is a preference for wording.

6. **A new bundle is gated by existing CI, so its touchpoints are an implementer detail.**
   Command: `plot-resolve-artifact.sh:108` (`bundle_set` greps `shipped* = path.join(...)` in `build.mjs`); `git grep -l gitattributes origin/main -- scripts .github test`; `.gitattributes` bundle lines.
   Output: the shell bundle set and `bundles.generated.ts` are derived from `build.mjs`, and `test/reconcile/resolveartifact.test.mjs` compares them as sets. `.gitattributes` carries 26 `-merge` lines, and `scripts/check-bundle-attributes.sh` (run in `ci.yml`, tested by `bundle-attribute-gate.test.mjs`) fails a bundle without one. Done-when already requires the `CLAUDE.md` helper-script table entry.

7. **Every cited anchor holds and every Done-when item is testable.**
   Command: `sed -n` on origin/main at the cited lines.
   Output: `worker-prompt.sh:136` `harness="${PLOT_HARNESS:-claude}"` and `:160` `if [ -n "${PLOT_PRINT_INVOCATION:-}" ]`; `plot-worker-loop.sh:1631` `bash -c '. "$1"' _ "$prompt_file" &`; `plot-install-prompt.sh:77` `if grep -q 'PLOT_SESSION_FLAG' "$target"; then echo "current …"; exit 0`; `plot-dispatch.sh:792` `nohup sh -c "$cmd \"\$@\"" plot-brief`. Each Done-when item names an input, an observable output and an exit code or log line. The first item requires a real `claude -p` run, which the plan orders first and gives a stop condition.

8. **No other script launches `claude` directly.**
   Command: `git grep -nE "claude -p|\bclaude --" origin/main -- 'skills/**/*.sh' 'skills/**/*.mjs' ':!skills/plot/scripts/board/*'`.
   Output: only the two `echo` lines of the loop's usage message (`plot-worker-loop.sh:1291-1292`).

## What the plan must change
