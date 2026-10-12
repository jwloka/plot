Position: amend
Evidence: executed
Lens: fresh eyes on the amended text. macOS 15 (Darwin 24.6.0), /bin/sh = GNU bash 3.2.57, plan judged at origin/main 3de04fcc. No `claude` run in this round. Scratch directory `/private/tmp/claude-501/-Users-jwloka-Quatico-Agentic-Tools-plot/1520fd86-1f27-4630-a596-1cdb41c71fbf/scratchpad/juror-1099-r2.jzpKFU/`; nothing removed.

## Findings

### 1. Round 1's seven points: six are answered in the text, one is answered wrongly by count

- Point 1 (all agent-runner keys): answered with seven sites, but origin/main has ten (finding 2).
- Point 2 (recognition rule): answered by dropping the rewrite and exporting `PLOT_AGENT_SETTINGS`. This is the manifesto-5 option round 1 offered, and finding 3 shows it works under `sh -c`.
- Point 3 (main-checkout resolution, missing file): answered. One resolver, main-checkout rule, exit 3 on a missing file, and "Plot never passes `claude` a path that does not exist", which removes the need to measure `--settings <missing>`.
- Point 4 (harness guard, charter prompts): answered. The export happens before the loop sources whatever `resolve_prompt_file` chose, and the template guards on `harness`.
- Point 5 (install-prompt classification): answered with a named state, `settings-unread`, and the ordering after `current` is stated.
- Point 6 (refuse gate-disabling files, four gates): answered, but the refusal list misses a realistic key (finding 5).
- Point 7 (refusal measurement first): kept as the first Done-when item.

### 2. The board has ten agent-runner spawns, not seven; a shell-side one is also missing

```
$ git grep -nE "'-c'," origin/main -- 'packages/*.ts' ':!*test*'
packages/board/src/server/commission.ts:409:    ['-c', `${usable} "$@"`, 'plot-commission', ...
packages/board/src/server/deliver.ts:531:    ['-c', `${usable} "$@"`, 'plot-deliver', ...
packages/board/src/server/reslice.ts:466:    ['-c', `${usable} "$@"`, 'plot-reslice', ...
(plus the seven the plan lists, continue.ts:520 and registry.ts:1199)
$ git grep -ln IDEA_COMMAND_KEY origin/main -- packages ':!*test*'
commission.ts  deliver.ts  idea.ts  reslice.ts
```

`commission.ts:325`, `deliver.ts:419` and `reslice.ts:381` each read `usableCommand(readCfg(opts, IDEA_COMMAND_KEY, ''))`, so they run `Idea command`, which this repository sets to `PLOT_UNATTENDED=1 claude -p …`. Round 1 grepped for literal `'X command'` strings and missed the constant; the amendment copied the gap. `continue.ts:520` runs `Worker command` (the loop) and `registry.ts:1199` is a git program, so both are correctly out of scope.

The shell also starts one: `plot-dispatch.sh:552` reads `Brief command` and `:792` runs `nohup sh -c "$cmd \"\$@\"" plot-brief …` detached. It inherits the dispatch run's environment, not the loop's and not the board helper's, so it receives no `PLOT_AGENT_SETTINGS`. The plan's rule is "every `claude -p` the fleet starts"; eleven sites exist and seven are named.

### 3. `${PLOT_AGENT_SETTINGS:+--settings "$PLOT_AGENT_SETTINGS"}` survives the config round trip and `sh -c`, including a path with spaces

A throwaway repository with that value under `Story command`, read by origin/main's `plot-config.sh`, then run the way the board runs it, with a stub `claude` that prints its argv:

```
config value: [PLOT_UNATTENDED=1 claude -p ${PLOT_AGENT_SETTINGS:+--settings "$PLOT_AGENT_SETTINGS"} --permission-mode bypassPermissions]
== /bin/sh (set)
argv[1]=<-p>  argv[2]=<--settings>  argv[3]=<…/with space/agent settings.json>  argv[4]=<--permission-mode>  argv[5]=<bypassPermissions>  argv[6]=<the prompt>
== /bin/sh (unset)   argv = -p --permission-mode bypassPermissions "the prompt"
== /bin/sh (empty)   argv = -p --permission-mode bypassPermissions "the prompt"
```

dash, bash and ksh give the same six arguments. zsh joins `--settings <path>` into one argument, which does not matter: every spawn names `sh`. The mechanism is sound.

### 4. Environment reach: the loop paths are fine; two board sites pass no `env` and two are synchronous

- `brief-ask.ts:104` and `approve.ts:297` pass no `env` option and inherit `process.env`; the other eight spread `...process.env`. A helper that "returns the environment each spawn receives" works at all ten, but those two need an `env` option added. The plan does not say so; a test over "all seven" would catch it.
- `continue.ts:520` (restart) runs `Worker command`, which is `plot-worker-loop.sh`, so the loop's own export covers it. `plot-registryd --start-agents` applies `worker-start` writes through the performer, which reaches `plot-dispatch.sh`'s `start_worker` and the same loop. Neither skips the export.
- `askForBrief` (`brief-ask.ts:95-99`, `): string =>`) and `startImplement` (`implement.ts:198`, returns `{ log } | { failure }`) are synchronous. The `Scripts` port's only generic call, `awaited(script, args)` (`ports/scripts.ts:197`), returns a Promise; the only sync operations are `configSync` and `planMetaSync`. So the helper needs either a new sync port operation (a blocking spawn on a write route, which `board.ts:360-368` records as a measured cost) or both functions become async with their callers. The plan names neither.

### 5. The refusal list misses `env`, and a benign `env.PATH` switches every gate off

All four gates start with `trap 'exit 0' ERR` and `CMD=$(… | jq …) || exit 0` (`plot-state-gate.sh:52-57`). jq here is `/opt/homebrew/bin/jq`. Running origin/main's state gate with a PATH that lacks its tools:

```
$ printf '%s' '{"tool_name":"Bash","tool_input":{"command":"git commit -m x docs/plans/foo.md"}}' \
    | env PATH=$D/emptybin /bin/bash $D/gates/plot-state-gate.sh; echo "exit=$?"
…/plot-state-gate.sh: line 56: cat: command not found
exit=0
```

Claude Code settings accept an `env` object applied to the session. A project file with `"env": {"PATH": "/usr/bin:/bin"}`, written for an unrelated reason, removes Homebrew's jq on this machine and every gate allows every commit. Whether settings `env` reaches hook processes was not probed in this round (no `claude` runs allowed); it is the documented purpose of the key. Other keys that change what the gates do: `hooks` (merged, so it adds rather than removes, and cannot switch a gate off), `permissions.deny` on `Bash` (stops the agent, does not bypass a gate), and a Plot plugin installed under a name other than `plot` (not matched by `plot@…`). The plan states the refusal as "a refusal rather than advice" and as the rule's second half, which reads as a guarantee. It must either add `env` (at least `PATH`) to the refused keys, or state that the check refuses the two known switches and is not a boundary against a file written to defeat it.

### 6. Layering: no new spawn site, but the refusal is a decision placed in a shell script

- Spawn ratchet: `ci.yml:338-352` counts `spawn|spawnSync|execFile|execFileSync` outside `/adapters/`, `allowed=28`. A helper that calls the resolver through `scriptsFor(opts).awaited('plot-agent-settings.sh', [])` adds no counted site, and `ci.yml:380` ("One place reaches a script") passes because the name travels as an argument to the port. A sync variant (finding 4) must also live in `scripts-shell.ts`.
- Rule placement: the resolver both collects (read the key, resolve the path) and decides (refuse `plot@…: false`, `disableAllHooks`). CLAUDE.md says "No domain-specific code or behaviour lives outside the domain" and Manifesto principle 3 says scripts collect and report. The recent precedent (`plot-sprint-release.sh`, `plot-release-gate.sh`, `plot-open-pr.sh`) is a shell script asking a bundle for the rule. The plan does not say whether the gate-disabling rule is a domain rule the resolver asks, or a declared shell-only rule. `plot-config.sh`'s `Board artifact` resolution is precedent for the path half in shell; nothing is precedent for a refusal rule in shell since 2026-09-07.

### 7. Citations on origin/main

Correct: `plot-config.sh:60` (inside the `Board artifact` main-checkout paragraph, lines 60-63), `plot-worker-loop.sh:1631` (`bash -c '. "$1"' _ "$prompt_file" &`), `:1097-1138` (`resolve_prompt_file`), `templates/worker-prompt.sh:136` (`harness="${PLOT_HARNESS:-claude}"`), `plot-install-prompt.sh:77` (`grep -q 'PLOT_SESSION_FLAG'` → `current`, exit 0), and all seven spawn lines (`idea.ts:713` … `auto-deliver.ts:424`) point at the `'sh', ['-c', …]` call.

Wrong: "This repository's seven command keys". `CLAUDE.md` on origin/main sets five `claude -p` keys: `Idea` (line 71), `Story` (92), `Brief` (93), `Implement` (94), `Interrogate` (95). It sets no `Approve command` and no `Deliver command`. The last Done-when item cannot be met as written.

Minor: `plot-config.sh:194` reads the config from `git rev-parse --show-toplevel`, so in a desk the `Agent settings` KEY comes from the desk's `CLAUDE.md`, while the plan resolves only the VALUE against the main checkout. A desk cut before the key landed answers "absent" and starts with every plugin. That degrades to today's behaviour and is acceptable, but the plan's "a desk cut from an older main may not hold the file" argument applies to the key as much as to the file, and the text should say which one it protects.

### 8. Done-when testability

- Measurement first: testable, needs a real `claude -p`.
- Resolver: testable; four cases named.
- Template under `PLOT_PRINT_INVOCATION`: testable (`worker-prompt.sh:160` prints the argv without launching).
- Loop export before a charter prompt: testable with a stub prompt. This repository's one charter (`reviewer.json`) names `.plot/worker-prompt.sh`, so a test needs a fixture charter naming a different file.
- "Each of the seven board spawns … asserted by a test over all seven": testable, and it would pass with three spawns uncovered (finding 2).
- `settings-unread`: testable. It checks only `.plot/worker-prompt.sh`; a charter-declared prompt file is not classified.
- Config and keys: untestable as written ("seven command keys", finding 7).
- "Board impact: none": the board gains a helper and changes ten spawns. No payload changes, which is what the line means; it should say "no payload change" rather than "none".

## What the plan must change

1. List all ten board agent-runner spawns: add `commission.ts:409`, `deliver.ts:531` and `reslice.ts:466`, which run `Idea command` through `IDEA_COMMAND_KEY`. Add the shell spawn `plot-dispatch.sh:792` (`Brief command`), which must call the resolver and export the variable itself. Change the Done-when test from "all seven" to all eleven.
2. Replace "This repository's seven command keys" with the five this repository sets (`Idea`, `Story`, `Brief`, `Implement`, `Interrogate`), or add `Approve command` and `Deliver command` deliberately and say so.
3. State how the helper answers at the two synchronous sites (`askForBrief`, `startImplement`): a new sync `Scripts` operation in `scripts-shell.ts`, or making both async. Say that `brief-ask.ts` and `approve.ts` gain an `env` option.
4. Add `env` (at least `PATH`) to the keys the resolver refuses, or reword the refusal as a check on two named switches that is not a boundary against a file written to defeat the gates. Name `hooks` and `permissions.deny` as out of scope and why.
5. Say where the gate-disabling rule lives: a domain rule the resolver asks through a bundle, per "A Shell Script Asks The Domain", or a declared shell-only rule with the reason.
6. Say that the `Agent settings` key is read from the desk's `CLAUDE.md` and only the value resolves against the main checkout, and that a desk without the key starts as today.
