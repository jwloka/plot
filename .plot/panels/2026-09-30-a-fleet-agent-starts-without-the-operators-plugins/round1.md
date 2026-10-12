Position: amend
Evidence: executed
Lens: buildability, mechanism and safety. Claude Code 2.1.285, macOS 15.7 (Darwin 24.6.0), plan judged at origin/main 549d264d. Two real `claude -p` probes, run one at a time from a scratch directory outside the repository.

## Findings

### 1. The central mechanism works: `--settings` with `enabledPlugins:false` removes episodic-memory for one run and keeps Plot's plugin and its hooks

`claude --help` lists `--settings <file-or-json>` ("Path to a settings JSON file or a JSON string to load additional settings from"). The plugin id and marketplace are exact: `installed_plugins.json` holds `"episodic-memory@superpowers-marketplace"` at `.../episodic-memory/1.0.15`, and `~/.claude/settings.json` line 42 sets it `true`. Its `hooks/hooks.json` declares `SessionStart`, matcher `startup|resume`, command `node ${CLAUDE_PLUGIN_ROOT}/cli/episodic-memory.js sync --background`, `"async": true`; `cli/episodic-memory.js:84` spawns `dist/sync-cli.js`. `grep -ciE 'lock|pidfile|already running' dist/sync-cli.js` prints `0`, as the plan says.

Probe 1: `claude -p --settings $S/agent-settings.json --output-format stream-json --verbose --include-hook-events --max-turns 3 --permission-mode bypassPermissions 'Run the shell command `echo probe-ok` ...'` with the file `{"enabledPlugins":{"episodic-memory@superpowers-marketplace":false}}`. The `init` event's `plugins` list holds 34 names; `plot` is present and `episodic-memory` is absent (`grep -c episodic probe1.jsonl` = 0). Six `PreToolUse:Bash` hooks started on the one Bash call. Result `success`, 2 turns.

Probe 2: the same run with `--debug-file`. The log reads:

```
Read hooks.json for plugin episodic-memory (enabled=false; will NOT register, plugin is disabled): .../episodic-memory/1.0.15/hooks/hooks.json
Read hooks.json for plugin plot (enabled=true): .../plot-marketplace/plot/2.21.0/hooks/hooks.json
Loading hooks from plugin: plot
Found 47 plugins (34 enabled, 13 disabled)
```

So a `--settings` value for `enabledPlugins` overrides the user-level `true` for that key and leaves every other user-level entry in place: `plot@plot-marketplace` stays enabled. The mechanism the plan depends on is real.

sync-cli counts (`ps axww | grep -c '[s]ync-cli'`): before probe 1 = 1, after probe 1 = 1, before probe 2 = 1, after probe 2 = 1. The one process both times is pid 66605, ppid 1, running before either probe started; neither probe started a sync-cli. I killed nothing.

Not measured: the plan's own Done-when also asks that `plot-state-gate.sh` *refuses* a hand-written `State:` change in the run. The probes show Plot's `hooks.json` registered and six Bash PreToolUse hooks firing, not a refusal. That half stays for the slice to measure, as the plan already says.

### 2. The plan counts four board spawn sites; origin/main has seven, and this repository configures five of them

`git grep "'[A-Z][a-z]+ command'" origin/main -- packages/board/src/server/*.ts` finds `Idea command` (idea.ts:64), `Implement command` (implement.ts:61), `Interrogate command` (interrogate.ts:27), `Brief command` (brief-ask.ts:26), **`Story command` (story.ts:72)**, **`Approve command` (approve.ts:67)** and **`Deliver command` (auto-deliver.ts:78)**. Each spawns its own `spawn('sh', ['-c', `${command} "$@"`, 'plot-<verb>', prompt])` at idea.ts:713, implement.ts:225, interrogate.ts:323, brief-ask.ts:104, story.ts:506, approve.ts:297 and auto-deliver.ts:424. No shared helper exists. This repository's CLAUDE.md sets `Story command: PLOT_UNATTENDED=1 claude -p --permission-mode bypassPermissions` (line 91), so the plan as written leaves a configured `claude -p` path here without the flag. The plan's rule ("Every `claude -p` a fleet agent runs") and its Where-it-reaches list disagree.

### 3. "The command is a `claude` invocation" has no stated recognition rule

The configured value is `PLOT_UNATTENDED=1 claude -p --permission-mode bypassPermissions`, run through `sh -c`. The first word is an environment assignment, not the harness. Recognition needs a rule for assignments, `env ...`, an absolute path to `claude`, a wrapper script and `npx`. The plan does not name it, and says a non-claude command is "reported" without naming where (log, 4xx, board field). Seven copies of the rule at seven sites is the drift this repository's CLAUDE.md warns against; the plan must name one function or one domain rule that all seven call.

### 4. A relative path in a desk resolves against the wrong tree

The plan says the file is "relative to the repository root". `plot-config.sh:194` resolves root with `git rev-parse --show-toplevel`, which in a dispatch desk is the desk. Workers run `claude` in `.worktrees/<desk>` (worker-prompt.sh header: "`claude` runs in the agent's worktree"), and the Idea spawn runs in `ideaTree` (idea.ts:715), also a worktree. A desk cut from an older main, or a desk on a branch that predates the settings file, holds no such file. The repository already has the answer for another key: `Board artifact` "resolves against the MAIN CHECKOUT (the parent of `--git-common-dir`), never `--show-toplevel`, so a dispatch desk resolves the same file" (`plot-config.sh:60-63`). The plan names neither that rule nor who resolves the path: the loop (and exports an absolute path), or the project's prompt file. What `claude` does with a `--settings` path that does not exist was not probed (two-run limit). If it exits, every worker fails at start; if it ignores the path, the fix silently does nothing. The slice must measure it and say which.

### 5. The worker prompt substitutes the harness, and the plan handles that only for board commands

`skills/plot/templates/worker-prompt.sh:136` runs `harness="${PLOT_HARNESS:-claude}"` and launches `"$harness" ...`. `--settings` is Claude Code's flag. The plan's "another harness is left untouched and reported" rule covers the board commands and not the worker prompt, where a charter can name another harness.

### 6. `plot-install-prompt.sh` has no classification that "a prompt lacking `--settings`" can join

`plot-install-prompt.sh:77` returns `current` (exit 0) as soon as the file contains `PLOT_SESSION_FLAG`; `stale` and `present` exist only for the session flag (lines 82-87). There is no classification for any other missing flag: `--model`, `--reasoning-effort` and `--disallowedTools` are all absent from its checks. The Done-when "classifies an existing prompt that lacks it the way it classifies other missing flags" therefore has no referent. This repository's own `.plot/worker-prompt.sh` interpolates `PLOT_SESSION_FLAG` and reads `current` today, and would still read `current` after the key is set and the flag is missing. Each project owns its prompt file, so every adopting project keeps the multiplier until a person edits the file, and nothing tells them.

### 7. The worker loop reaches `claude` through the resolved prompt file on every path, which may not be `.plot/worker-prompt.sh`

`grep -nwE claude` over `skills/**/*.sh` finds no other direct invocation (only `plot-fleetctl.sh:907` and `plot-worker-state.sh:499`, which name the process and do not launch it). The loop launches one place, `bash -c '. "$1"' _ "$prompt_file" &` (plot-worker-loop.sh:1631). But `resolve_prompt_file` (lines 1099-1138) chooses a charter-declared prompt per agent, and origin/main tracks `.plot/charters/reviewer.json`. A charter-named prompt file is a third place the flag must reach. The plan names only `.plot/worker-prompt.sh` and the template.

### 8. The settings file can switch Plot's gates off, and the plan's rule says it cannot

The rule reads "those settings can switch plugins off without switching Plot's gates off", but nothing enforces it. A project file that lists `plot@plot-marketplace: false`, or sets `disableAllHooks: true`, passes straight through to every agent. On origin/main the gates reach this repository **only** through the plugin: `ls .claude/` fails ("No such file or directory"), so no `plot-install-hooks.sh` registration exists here. The plan also names three gates; `hooks/hooks.json` on origin/main and in plugin 2.21.0 registers four (`plot-controller-gate.sh` is the fourth).

### 9. Done-when testability

- The measurement item: testable, and finding 1 shows its first half holds. Its second half (a refused `State:` write) is testable and still unmeasured.
- The worker-prompt argv item: testable. The template already carries `PLOT_PRINT_INVOCATION`, which prints the assembled argv without launching; a stub harness is not needed.
- The board item: names only `Implement command`; untestable for the other six sites as written, and "reported" names no observable.
- The install-prompt item: has no referent (finding 6).
- The config item: testable.

### 10. Manifesto checklist

1 in git: yes. 2 project-agnostic: yes, the key is empty by default. 3 fails gracefully: not shown, because a missing file in a desk is unmeasured (finding 4). 4 opt-in: yes. 5 simpler without it: the board's command rewrite is the removable part. The command keys are already project-owned text, so a project can write `--settings <file>` into them itself, or the board can export an absolute `PLOT_AGENT_SETTINGS` for the command to interpolate, with no command sniffing. 6 manual: yes. 7 smaller model: yes. 8 scheduling: yes. 9 ceremony: proportionate.

Side effect of the probes: two sessions were recorded under `~/.claude/projects/` for the scratch path. All files I wrote are in `/private/tmp/claude-501/-Users-jwloka-Quatico-Agentic-Tools-plot/1520fd86-1f27-4630-a596-1cdb41c71fbf/scratchpad/juror-1099-r1.L4V7f2/`; nothing was removed.

## What the plan must change

1. List all seven board agent-runner keys (`Idea`, `Implement`, `Interrogate`, `Brief`, `Story`, `Approve`, `Deliver command`) in "Where it reaches" and in Done-when, or state which are excluded and why. `Story command` is configured with `claude -p` in this repository.
2. Name the one function or domain rule that decides "is a claude invocation" and that all seven spawn sites call, with its handling of leading `VAR=value` words, `env`, an absolute path and a wrapper script. Name where "reported" appears. Or drop the rewrite and export an absolute `PLOT_AGENT_SETTINGS` that a project's command interpolates (manifesto question 5).
3. Resolve a relative `Agent settings` value against the main checkout (parent of `--git-common-dir`), as `Board artifact` does. Have the loop and the board pass an absolute path. Measure and state what `claude -p --settings <missing file>` does, and decide whether a missing file refuses the launch or is reported.
4. Guard the worker-prompt flag on the harness being `claude`, as the board side is, and pass it through any charter-declared prompt file, not only `.plot/worker-prompt.sh`.
5. Replace the `plot-install-prompt.sh` Done-when with a real classification: a new state (or an extra report line) for a prompt that does not interpolate the settings variable while the key is set. Say that `current` today short-circuits before any such check.
6. Enforce the rule's second half: refuse, or report loudly, a settings file that disables `plot@*` or sets `disableAllHooks`. Correct the gate list to the four `hooks/hooks.json` registers.
7. Keep the refusal half of the measurement (`plot-state-gate.sh` refusing a `State:` write under `--settings`) as the first slice step. The plugin-disable half is shown above.
