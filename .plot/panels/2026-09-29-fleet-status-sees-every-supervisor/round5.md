Position: amend
Evidence: executed

Lens: is it buildable exactly as written, with every Done-when bullet assertable and true? Juror r5-1080, 2026-09-30, macOS (Darwin 24.6.0, bash 5.3). The Linux arms were read and not run.

The design holds. The classifier, implemented step by step from the plan's wording, reproduces the live machine exactly and classifies every fixture the plan lists as the plan says it should. Five findings remain, all at the level of a sentence or a fixture. One is a safety requirement: the plan does not say how `test -x` runs, and the obvious reading runs text from other processes' argv through a shell. The round-4 `test -x` rule does what it claims. It also drops a live process silently in two cases I measured, and the plan does not state that limit.

## What I ran and what it showed

I wrote a throwaway `classify.sh` (awk for steps 1 to 4, bash for `test -x`, the top-level fold, the orphan check, cwd and installation) under the scratch directory. I ran it on `ps axww -o pid=,ppid=,uid=,args=` and on 41 synthetic rows, then deleted it.

**Live snapshot, 1003 rows, 0.78 s wall time including `lsof` per reported row:**

```
board        1969 ppid=1      cwd=/Users/jwloka/Quatico/ewz/ewz-kus-portal  inst=/Users/jwloka/.claude/plugins/marketplaces/plot-marketplace
supervisor  10931 ppid=1      cwd=/Users/jwloka/Quatico/ewz/ewz-kus-portal  inst=/Users/jwloka/.claude/plugins/cache/plot-marketplace/plot/2.21.0
supervisor  10942 ppid=1      cwd=/Users/jwloka/Quatico/Agentic-Tools/plot  inst=/Users/jwloka/Quatico/Agentic-Tools/plot
scan        21114 ppid=35248  cwd=/Users/jwloka/Quatico/Agentic-Tools/plot  inst=/Users/jwloka/.claude/plugins/marketplaces/plot-marketplace
scan        25985 ppid=1969   cwd=/Users/jwloka/Quatico/ewz/ewz-kus-portal  inst=/Users/jwloka/.claude/plugins/marketplaces/plot-marketplace
board       35248 ppid=1      cwd=/Users/jwloka/Quatico/Agentic-Tools/plot  inst=/Users/jwloka/.claude/plugins/marketplaces/plot-marketplace
scan        87901 ppid=1      cwd=/Users/jwloka/Quatico/ewz/ewz-kus-portal  inst=/Users/jwloka/.claude/plugins/marketplaces/plot-marketplace orphaned
scan        99738 ppid=99736  cwd=/Users/jwloka/Quatico/ewz/ewz-kus-portal  inst=/Users/jwloka/.claude/plugins/cache/plot-marketplace/plot/2.21.0
FOLD	28523	under 25985 (scan)
FOLD	38137	under 21114 (scan)
FOLD	38141	under 38137 (scan)
```

Ground truth: 13 rows name a Plot artifact. The classifier reported 8, folded 3 subshells, and excluded the 2 `/bin/zsh -c …` agent shells (99663, 99736). No false positive and no miss. Scan 87901 is a live orphan in `ewz-kus-portal`, so the block this plan adds would print on this machine now. An earlier snapshot 20 s before held two more orphans (11568, 76032), which had exited by the time this run started.

**Fixtures (every row the plan lists, plus probes), cwd from a map file:**

```
supervisor    101 ppid=1      cwd=/c  inst=/s1                       two supervisors
supervisor    102 ppid=1      cwd=/c  inst=/s2
board         103 ppid=1      cwd=/c  inst=/w                        --watch pair, watcher pid
board         105 ppid=1      cwd=/c  inst=/p                        plain board
board         301 ppid=1      cwd=/c  inst=/opt/App Support/inst     spaced installation
supervisor    302 ppid=1      cwd=/c  inst=/x                        <box>/Library/Application Support/fnm/.../bin/node (a file)
board         306 ppid=1      cwd=/c  inst=/y                        <box>/App Support/bin/node (symlink to real node)
board         401 ppid=1      cwd=/c  inst=/x                        --max-old-space-size 4096
scan          402 ppid=50     cwd=/c  inst=/x                        -o pipefail
scan          403 ppid=50     cwd=/c  inst=/x                        --norc
scan          407 ppid=50     cwd=/c  inst=/c/plot-fleet-scan.sh     bare `bash plot-fleet-scan.sh`  <- see finding 4
scan          408 ppid=50     cwd=/c  inst=/dev/null /x              --rcfile: the stated limit
board         501 ppid=1      cwd=/Users/jwloka/Quatico/Agentic-Tools/plot  inst=/Users/jwloka/Quatico/Agentic-Tools/plot   relative, THIS repository
scan          502 ppid=50     cwd=/Users/o/other  inst=/Users/o/other                            relative, other checkout
board         503 ppid=1      cwd=cannot determine  inst=cannot determine                        relative, empty lsof
scan          601 ppid=105    cwd=/c  inst=/p                        one scan, three subshells -> 1
scan          605 ppid=1      cwd=/c  inst=/p orphaned
scan          606 ppid=607    cwd=/c  inst=/p orphaned               parent `/usr/lib/systemd/systemd --user`
supervisor    701 ppid=1      cwd=/c  inst=/q                        stands in for com.quatico.ewz.registryd (label not read)
DROP-noexec	303	/Users/u/Library/Application Support/fnm/node-versions/v24/installation/bin/node   <- see finding 1
DROP-noexec	304	<box>/Nope Support/bin/node                                                        names no file: correct
DROP-noexec	305	/bin/zsh -c cd x; /bin/bash                                                        decoy: correct
FOLD	104	under 103 (board)
FOLD	602	under 601 (scan)
FOLD	603	under 601 (scan)
FOLD	604	under 602 (scan)
```

The classifier excluded, as the plan says: `bash -c 'sleep 45; : …board-server.mjs plot-fleet-scan.sh'`, `zsh -c '…plot-registryd.mjs'`, `node -e require('…board-server.mjs')`, `grep board-server.mjs`, `bash -c 'sleep 45; : /opt/App Support/…/plot-fleet-scan.sh'`, `bash -lc`, `sh -xc :`, `/bin/bash -ec`, and `sudo bash`.

**Citations.** All of them hold on `main` at 645f25bf: `plot-fleetctl.sh:84` (LABEL), `:131-137` (`platform()`, `none` without `systemctl`), `:476` and `:498` (`serves_line`), `:616` (summary), `:722` and `:742` (REFUSAL 4); `scripts-shell.ts:127` (`detached: true`) and `:158` (`child.kill('SIGKILL')`); `units/README.md:71`, `:73-75`, `:137`; `package.json:14` (`node --watch skills/plot/scripts/board/board-server.mjs`); `fleetctl.test.mjs:130` (`const guardBin`), `:211` (PATH), `:1006` (`stubPlatform`, which stubs `uname -s`); `ci.yml:61` (`ubuntu-latest`); the count is 72 tests.

## What a measurement contradicts

**1. The Done-when fixture for a spaced interpreter cannot be created on the runner as written.** Bullet 5 names the literal row `/Users/u/Library/Application Support/fnm/…/bin/node …` "with that interpreter created as an executable file in the test box". The test box is a temporary directory. On `ubuntu-latest`, `/Users/u` does not exist and the runner cannot create it without root. With that literal path, `test -x` fails, and the row the bullet requires to be found is dropped (row 303 above). The fixture has to be `<box>/Library/Application Support/fnm/…/bin/node`, and the bullet must say so.

**2. The round-4 rule drops a real, running process silently. Measured twice.**

- *Interpreter deleted after launch.* I copied `node` to `…/Del Support/bin/node` and started a stand-in `plot-registryd.mjs --start-agents` from it (pid 80838). I then removed the binary and took a snapshot. Result: `pid 80838 NOT REPORTED`, `DROP-noexec 80838 …/Del Support/bin/node`. The process was alive, and `ps -o comm=` still named it. I killed it and verified it was gone.
- *A path the operator cannot stat.* An executable behind a mode-000 directory (`…/Locked Support/bin/node`, row 920) gave `DROP-noexec`. Another user's `~/Library` has this shape.

The plan's own stance elsewhere is that a process whose cwd cannot be read "is never omitted". This rule omits one and prints nothing. The shape is narrow: it needs a spaced interpreter path (fnm on macOS, the plan's own motivating case) and a binary that is gone or unreadable, for example after `fnm uninstall` of the version the unit baked in.

**3. `test -x` admits a directory.** A row `<scratch>/Dir Support/bash /x/…/plot-fleet-scan.sh`, where `Dir Support/bash` is a directory, classified as a scan (row 910). The plan says "an executable file", and `test -x` does not test that. `[[ -f && -x ]]` does. The shape is contrived, and the fix is one operator.

**4. The installation rule has no answer for a path that lacks the full suffix.** The third pass in the plan says it classified "a bare `bash plot-fleet-scan.sh`". The installation of that row is "the argv path minus `/skills/plot/scripts/plot-fleet-scan.sh`", and that suffix is not in `/c/plot-fleet-scan.sh`. So the literal rule prints `installed: /c/plot-fleet-scan.sh`, which is a file, not an installation (row 407). The same happens to any board whose path ends `/board/board-server.mjs` but not `/skills/plot/scripts/board/board-server.mjs`. The kind table admits both shapes, and the installation rule does not cover the second.

## What it must say before someone builds it

1. **How `test -x` runs.** The plan puts the check inside "an `awk` pass … in four steps". In awk, the natural form is `system("test -x \"" c "\"")`. That shell-evaluates text taken from any user's process argv. Measured with the row `/bin/zsh -c x$(touch <scratch>/PWNED) /bin/bash /x/…/plot-fleet-scan.sh`: `system rc=1`, and `PWNED` was created. The same row through `[[ -x "$c" ]]` on a bash variable created nothing. `--status` must never execute another process's argv. The plan must say: the awk pass emits the candidate argv[0] as data, and bash tests it with `[[ -f "$c" && -x "$c" ]]`, never through `system()`, `eval` or an interpolated `sh -c`. It must also add a Done-when fixture: a row whose candidate argv[0] holds `$(touch <box>/marker)` leaves no marker. On this machine, 9 live rows have a spaced candidate argv[0] and would be tested. None of them held a metacharacter today.
2. **What a spaced argv[0] that fails the test means.** One of two decisions is needed. (a) State it as a limit next to the `--rcfile` limit: "a process whose spaced interpreter path is deleted or unreadable is not found". (b) Take the interpreter from the process instead of the file system. On macOS, `ps -o comm=` printed the full spaced path for 80838 after its binary was gone, and on Linux `comm` is the basename (`node`, `bash`), so a second `ps -o pid=,comm=` read answers "is argv[0] an interpreter" without stat. Option (b) costs a second snapshot, joined by pid. I recommend (a) unless someone runs the supervisor from fnm today. The rule's purpose, keeping the first match out of another shell's command string, holds either way.
3. **Where the artifact name ends.** "The path runs to the end of the artifact name", and the table says "ends `/board/board-server.mjs`". Neither says what may follow. If anything may follow, `node -pe require('/x/…/board-server.mjs')` classifies as a board with `installed: /c/require('/x`, because `-pe` is not in the disqualifier list (`-e`, `-p`, `--eval`, `--print`). The same happens to `--eval=…` and to `-pe require("…") x`. I measured this under the lax reading. Under the strict reading (the name is followed by a space or ends the args), all three are excluded. The plan must state the strict reading. It should also treat `node` single-dash clusters containing `e` or `p` and `--eval=`/`--print=` like the bash `c` cluster, because `node -pe` is the common idiom.
4. **The installation of a path that lacks `/skills/plot/scripts/…`.** Say that it prints `installed:  cannot determine`, or name the rule that replaces it, and add the bare `bash plot-fleet-scan.sh` row to Done-when with its expected `installed:` line.
5. **Bullet 5's path:** `<box>/Library/Application Support/…`, not `/Users/u/…`.

The fixtures also need two small test-harness additions. The plan's Done-when names neither, but a builder will find both. `stubPlatform`'s `launchctl` stub answers `print` only (`fleetctl.test.mjs:1024-1026`), and the plan reads `launchctl list`. `lsof` and `id` have no stub today. None of this blocks the build.

Linux arms (read, not run): `readlink "$PLOT_PROC_ROOT/<pid>/cwd"`, the `0::` line's last `.service` segment, the `systemd --user` parent, and the `uname -s` arm choice are each specified precisely enough to implement and to assert with the fixtures the bullets name. The real `/proc/<pid>/cwd` bullet (a `sleep` in a temp dir; pid 1 unreadable as non-root) is assertable on `ubuntu-latest`.

## What executing revealed that reading would not

- **The injection.** Reading step 1 as a rule about paths, it looks harmless. Implementing it as the plan places it, inside the awk pass, gives the shortest code path, and that path runs `$( … )` from a stranger's command line. The fixture the plan already carries, `/bin/zsh -c cd x; /bin/bash …`, has exactly the shape where the candidate string is argv text and not a path.
- **The deleted-binary drop.** A live process with a deleted executable is invisible to the rule, while `ps` itself still names the interpreter. Only a running process shows that.
- **The live orphan.** Scan 87901 (ppid 1, `ewz-kus-portal`) exists right now, and two more existed 20 s earlier. The orphan count is not hypothetical, and on this machine the block would print today.
- **The fold holds on a live three-level subshell chain** (21114, then 38137, then 38141), not only on synthetic rows.
