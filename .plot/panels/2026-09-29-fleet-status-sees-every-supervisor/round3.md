Position: amend
Evidence: executed

Juror: round 3, lens *is this plan buildable exactly as written, and does the classifier hold on this machine?* 2026-09-30.

## What I ran and what it showed

**1. The plan's classifier, as worded, over one `ps axww -o pid=,ppid=,user=,args=` snapshot of this machine** (960 rows; awk pass 0.011 s). Two decoys started under my scratch dir first: `bash -c 'sleep 30; : board/board-server.mjs'` (21978) and `zsh -c 'sleep 30; : board/plot-registryd.mjs'` (21979).

```
scan 3794 ppid=35248 jwloka /Users/jwloka/.claude/plugins/marketplaces/plot-marketplace/skills/plot/scripts/plot-fleet-scan.sh
supervisor 10931 ppid=1 jwloka /Users/jwloka/.claude/plugins/cache/plot-marketplace/plot/2.21.0/skills/plot/scripts/board/plot-registryd.mjs
supervisor 10942 ppid=1 jwloka /Users/jwloka/Quatico/Agentic-Tools/plot/skills/plot/scripts/board/plot-registryd.mjs
board 35248 ppid=1 jwloka /Users/jwloka/.claude/plugins/marketplaces/plot-marketplace/skills/plot/scripts/board/board-server.mjs
```

The same snapshot held four scan-named processes for that one scan (3794 → 21207 → 21216 → 21220), and the top-level rule folded them into one row. `pgrep -fl` over the same names printed 9 lines, including both decoys. Both decoys were excluded. My own tool shell (21967, a `/bin/zsh -c … eval '…'` whose argv held every artifact name) was excluded too. **On this machine the rule finds exactly the two real supervisors, the one real board and its one scan, and nothing else.**

cwd and label, as the plan specifies:

```
10931: n/Users/jwloka/Quatico/ewz/ewz-kus-portal
10942: n/Users/jwloka/Quatico/Agentic-Tools/plot
35248: n/Users/jwloka/Quatico/Agentic-Tools/plot
3794:  n/Users/jwloka/Quatico/Agentic-Tools/plot
10942	0	com.plot-pm.registryd
10931	0	com.plot-pm.registryd.ewz-kus-portal
lsof -a -p 1 -d cwd -Fn  → (no output) rc=1      ps -o user= -p 1 → root
```

**2. An installation path with a space.** Under `…/r3-1080/App Support/inst/` I started `node --watch …/board/board-server.mjs` (41218, child 41267) and a `plot-fleet-scan.sh` holding a `$( … )` (41220, subshell 41472), both with cwd `co/`. `ps` prints the path unquoted:

```
41218     1 jwloka  node --watch /private/tmp/…/r3-1080/App Support/inst/skills/plot/scripts/board/board-server.mjs
41220     1 jwloka  /bin/bash /private/tmp/…/r3-1080/App Support/inst/skills/plot/scripts/plot-fleet-scan.sh
```

The whitespace-split prototype missed both, as the plan says it would. I then wrote the space-tolerant reading the plan specifies ("matches the artifact path against the args string after argv[0] and its options"): strip argv[0] and leading `-…` tokens, match the remainder against `^.*/board/board-server\.mjs( |$)` and `^(.*/)?plot-fleet-scan\.sh( |$)`. It found both space-path processes and printed the whole path. It also printed this:

```
scan 55244 ppid=55216 [sleep 45; : /opt/App Support/skills/plot/scripts/plot-fleet-scan.sh]
```

55244 is a decoy, `bash -c 'sleep 45; : /opt/App Support/skills/plot/scripts/plot-fleet-scan.sh'`. The `-c` is stripped as an option, and the `-c` string ends in a scan path, so it matches. The decoy the plan's own sandbox used (`… board-server.mjs plot-fleet-scan.sh`) did not match (55243), because a space and not a `/` precedes the name.

**3. The silent case against the current `--status`.**

```
platform: launchd
supervisor: running (pid 10942) — com.plot-pm.registryd
  serves:  THIS repository (/Users/jwloka/Quatico/Agentic-Tools/plot)
  last tick: 37s ago (evidence, not the verdict — a busy tick writes at most every 60s)
  bug/a-state-sweep-is-one-request  running (pid 84525) — quiet 45630s
  (detached) scratch-implement-sprint-item  none
summary: agents_running=1 agents_other=1 supervisor=up install=running tick_age=38
```

10931 serves `ewz-kus-portal`, so under the plan's rule the second block prints, and the plan's mockup shows that. The mockup's `summary:` line matches today's field set. **Consistent.**

**4. Relative artifact paths.** The snapshot held `41708 timeout 120 bash skills/plot/scripts/plot-fleet-scan.sh --json` (another session's run), whose scan child 41709 has argv `skills/plot/scripts/plot-fleet-scan.sh`. `package.json:14` starts this repository's own board the same way: `node --watch skills/plot/scripts/board/board-server.mjs`.

**5. Citations.**

| cited | measured |
|---|---|
| `serves_line` at `:476`, `:498` | correct (defined `:244`) |
| `plot-fleetctl.sh:84` `LABEL=…` | correct |
| `units/README.md:69-72` | correct |
| `scripts-shell.ts:127` `detached: true`, `:158` `child.kill('SIGKILL')` | correct (`packages/domain/src/adapters/scripts/scripts-shell.ts`) |
| 72 tests in `fleetctl.test.mjs` | 72 `test(`/`it(` lines — correct |
| `guardBin` (`:211`) | `:211` is the `PATH` line that uses it. The definition is `:130`. Loose, not wrong |
| `--start`'s refusal at `plot-fleetctl.sh:681-696` | **wrong.** `:683` is REFUSAL 2b (no harness). The label refusal is REFUSAL 4, `:722-742` |

## What a measurement contradicts

- **The space-tolerant rule, as worded, re-admits the `-c` decoy that the rule exists to exclude.** The plan argues that decoys are excluded because "argv[1] is `-c`". The whitespace-split rule held that. The shipped rule strips options, and then the `-c` script is the remainder. Measured: 55244 is classified as a scan. The two Done-when bullets pull in opposite directions (decoy excluded, space path found), and the plan's mechanism does not satisfy both.
- **"The installation is the argv path minus `/skills/plot/scripts/…`" yields an empty string for a relative argv.** `pnpm board` (`package.json:14`) is exactly that case, and it is the board this repository runs. 41709 showed the same for a scan. The plan says nothing about resolving against cwd.
- **The `:681-696` citation points at the harness refusal**, not the label refusal.

## What it must say before someone builds it

1. **A shell with `-c` among its leading options is never a scan.** For `bash`/`sh`, the scan path must be the first non-option argument, and an option token containing `c` (`-c`, `-lc`, `-ec`) disqualifies the row. For `node`, strip options, then match. Add the `bash -c '…; : /a b/skills/plot/scripts/plot-fleet-scan.sh'` shape to the decoy Done-when bullet. That shape ends in the name and has a space, which is the one that fails.
2. **A relative artifact path resolves against the process's cwd** before the suffix is removed. Add a Done-when fixture: `node --watch skills/plot/scripts/board/board-server.mjs` with cwd = this checkout prints `installed:  THIS repository`, or whichever wording the plan picks. Without it, the dog-food board prints an empty `installed:` line.
3. **Say what the silence rule does with a foreign installation that serves this checkout.** Today's board (35248) is that case. The Motivation calls the installation/checkout pair "invisible to every existing reading", but the silence rule tests cwd only. With 10931 stopped, the pair stays invisible. Either print the block when an installation differs from this checkout, or state that it deliberately does not.
4. **Name ppid 1 as "parent gone", not "board no longer owns it".** My own `nohup`'d manual scan (41220) read ppid 1. The Changelog line ("scans whose board no longer owns them") claims a cause that the reading cannot see.
5. **Linux label arm: name the parse.** "The unit named in `/proc/<pid>/cgroup`" should say *the last path segment of the `0::` line ending `.service`*. No Done-when bullet asserts it. Either add one (a `PLOT_PROC_ROOT`-style override lets a fixture cgroup file be read on the runner), or put the label arm in *What this does NOT do* for Linux. The cwd arm is precise enough, and its ubuntu assertion is well-formed. procps truncates `user=` to 8 columns, so `owner <user>` can print a truncated name there. Say so or read the owner from `/proc/<pid>/status` `Uid:`.
6. **Fix `plot-fleetctl.sh:681-696` → `:722-742`.**

None of these changes the design. Each is a sentence plus a fixture.

## What executing revealed that reading would not

- **The prose argument for decoy exclusion and the prose fix for spaces look compatible, and they are not.** Only running the space-tolerant matcher against a `bash -c` whose string ends in the path shows the collision. The round-2 sandbox decoy happened to put a space before the name, so it could not show this.
- **The relative-path case is the common case, not an edge.** `pnpm board` and the harness scan (41709) both use it, and no installed-plugin reading in the plan shows it, because plugin boards launch with absolute paths.
- **On this machine the whitespace-split classifier is already exact**: 4 rows, 0 false positives, 4 subshells folded to 1 scan, the tool shell's own `eval` string excluded, 0.011 s. The design holds. The amendment covers two matcher details and one silence-rule decision.

Cleanup: every process I started (decoys 21978, 21979, 55243, 55244; board 41218/41267; scan 41220/41472) was signalled by recorded pid and verified gone. No other process was signalled.
