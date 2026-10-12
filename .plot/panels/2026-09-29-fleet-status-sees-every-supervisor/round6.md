Position: proceed
Evidence: executed

Lens: is it buildable exactly as written, and safe? Juror r6-1080, 2026-09-30, macOS (Darwin 24.6.0). The classifier was built from the plan's wording and run under `/bin/bash` 3.2.57, the shell macOS ships. The Linux arms (`/proc`, cgroup, procps `ps`) were not run here; they are judged only on how precisely they are worded.

The *Safety* subsection holds. I started real decoy processes whose argv holds `$( … )`, `;`, backticks, `$(( ))`, nested quotes and `x[$( … )]`, and put the same shapes in the plan's fixture rows. No marker file appeared. With the awk `system()` form the plan forbids, the backtick and `$(( ))` markers did appear. So the rule is load-bearing and the wording is sufficient. Every Done-when fixture classifies as the plan says, the live machine classifies with no false positive, and every citation I checked holds. I found no defect. Two cheap additions follow, and neither blocks the build.

## What I ran and what it showed

Throwaway files under the scratch directory (all deleted): `classify.awk` does steps 1 to 4 and emits TSV. `classify32.sh` checks each spaced argv[0] with `[[ -f "$p" && -x "$p" ]]` in bash. A second awk pass does the top-level fold and the orphan test, because bash 3.2 has no `declare -A`. The script then reads cwd with `lsof -a -p "$pid" -d cwd -Fn`, or from a map file for the fixtures, and resolves the installation.

**Safety, real processes.** Each decoy was started with `bash -c 'exec -a "$1" /bin/sleep 60' _ "<args>"`, so `ps` shows exactly `<args>`:

```
DROP-noexec  95996  /bin/zsh -c x$(touch …/r6/pwned1) /bin/bash
DROP-noexec  95997  /bin/zsh -c x;touch …/r6/pwned2; /bin/bash
DROP-noexec  95998  /bin/zsh -c x`touch …/r6/pwned3` /bin/bash
DROP-noexec  96000  /bin/zsh -c x$(($(touch …/r6/pwned4))) /bin/bash
DROP-noexec  96001  /tmp/a$(touch …/r6/pwned5) b/node
DROP-noexec  96007  /tmp/a;touch …/r6/pwned6;b/node
DROP-noexec  96011  /tmp/q'"$(touch …/r6/pwned7)"'/sh
DROP-noexec  96013  x[$(touch …/r6/pwned8)] /bash
=== markers:
none created
```

The contrast, over the same candidate text:

```
awk system():
pwnedA        <- backtick form
pwnedB        <- $(( $( ) )) form
bash [[ ]]:
none
```

**Every other place text from another process reaches the script.** The plan's sources are `ps`, `lsof`, `launchctl list`, `id -un`, `readlink`, `/proc/<pid>/cgroup` and the `~` substitution. I tested the ones that can carry attacker-shaped text:

- **cwd.** Two decoys ran with their cwd in a real directory named `w$(touch …/pwned9)`\``touch …/pwned10`\``;touch …/pwned11<newline>nl/skills/plot/scripts`. One had argv `bash plot-fleet-scan.sh --json` and the other `bash skills/plot/scripts/plot-fleet-scan.sh`, so the cwd went through relative-path concatenation and suffix removal. Both were classified as scans, cwd and installation printed as text, and no marker appeared. `lsof -Fn` renders the newline as the two characters `\n` (`od -c`: `p w n e d 1 1 \ n n l /`), so a cwd holding a newline cannot split a line of output.
- **Row forgery through argv.** `perl -e 'sleep 30' "x<newline> 4242 1 501 node /evil/…/board-server.mjs"`. BSD `ps` prints the newline as `\012`, and `awk '$1=="4242"'` over the snapshot found `forged rows: 0`. So `pid`, `ppid` and `uid` are always `ps`'s own numbers on macOS. The pids that reach `lsof -p`, `launchctl` and `id -un`, and the `ppid == 1` test, therefore carry no argv text. I did not run procps here. Its documentation says it prints control characters in `args` as `?`, which gives the same result.
- `launchctl list` and `id -un` receive only those numbers. `readlink` and cgroup parsing read files and never pass their contents to a shell.

**Live snapshot**, `/bin/bash ./classify32.sh live3.txt`:

```
board        1969 ppid=1      cwd=/Users/jwloka/Quatico/ewz/ewz-kus-portal  inst=/Users/jwloka/.claude/plugins/marketplaces/plot-marketplace -
supervisor  10931 ppid=1      cwd=/Users/jwloka/Quatico/ewz/ewz-kus-portal  inst=/Users/jwloka/.claude/plugins/cache/plot-marketplace/plot/2.21.0 -
supervisor  10942 ppid=1      cwd=/Users/jwloka/Quatico/Agentic-Tools/plot  inst=/Users/jwloka/Quatico/Agentic-Tools/plot -
board       35248 ppid=1      cwd=/Users/jwloka/Quatico/Agentic-Tools/plot  inst=/Users/jwloka/.claude/plugins/marketplaces/plot-marketplace -
scan        43503 ppid=1969   cwd=/Users/jwloka/Quatico/ewz/ewz-kus-portal  inst=/Users/jwloka/.claude/plugins/marketplaces/plot-marketplace -
scan        76729 ppid=35248  cwd=/Users/jwloka/Quatico/Agentic-Tools/plot  inst=/Users/jwloka/.claude/plugins/marketplaces/plot-marketplace -
FOLD 76861 under 43503 / FOLD 76868 under 76861 / FOLD 76872 under 76868 / FOLD 77063 under 76729
```

These are the plan's four processes plus two in-flight scans, each with its subshells folded. My two cwd decoys, then orphaned, also appeared and were excluded from this list by hand. An earlier snapshot of the same machine held two scans from test harnesses. One was 28452, cwd a `plot-started-dryrun-*` sandbox, installation `.worktrees/free-c7b58b4f`. The other was 96918, run from `…/T/plot-hostshim-*/scripts/`, which lacks the full suffix and so printed `cannot determine`. Both behave as the plan specifies: a top-level scan with a live parent is counted in its group. The pass took 0.64 s wall time, including one `lsof` call per reported row.

**Fixtures.** Every row that Done-when lists, with `<box>` as a real scratch directory:

```
DROP-noexec 303  <box>/Dir Support/bin/node         (a directory: -f fails)
DROP-noexec 304  <box>/Gone Support/bin/node        (names no file / removed)
DROP-noexec 305  /bin/zsh -c cd x; /bin/bash
DROP-noexec 306  /bin/zsh -c x$(touch <box>/pwnedF1) /bin/bash
DROP-noexec 307  /bin/zsh -c x;touch <box>/pwnedF2; /bin/bash
FOLD 104 under 103 / FOLD 602 under 601 / FOLD 603 under 601 / FOLD 604 under 602
supervisor 101 inst=/s1 · supervisor 102 inst=/s2 · board 103 inst=/w (watcher pid) · board 105 inst=/p
board      301 inst=/opt/App Support/inst
supervisor 302 inst=/x        (<box>/Library/Application Support/fnm/…/bin/node, an executable file)
scan       401 cwd=/c inst=cannot determine          (bare `bash plot-fleet-scan.sh`)
scan       402 cwd=<box>/inst/skills/plot/scripts inst=<box>/inst
board      403 inst=/x        (--max-old-space-size 4096)
scan       404 inst=/x (-o pipefail) · scan 405 inst=/x (--norc)
board      501 cwd=THIS repo inst=THIS repo          (relative `node --watch skills/…`)
scan       502 cwd=/Users/o/other inst=/Users/o/other
board      503 cwd=cannot determine inst=cannot determine   (relative, empty lsof)
scan       601 (1 in flight) · scan 605 ppid=1 orphaned · scan 606 parent `systemd --user` orphaned
supervisor 701 inst=/q
none created
```

The following rows were not reported, as the plan requires: 201 `bash -c … board-server.mjs plot-fleet-scan.sh`, 202 `zsh -c`, 203 `node -e`, 204 `grep`, 205 `bash -c` with a spaced path, 206 `bash -lc`, 308 `node -pe`, 309 `node --eval=…`, 310 `…board-server.mjs.bak` and 406 `sh -xc :`.

**Citations checked on `main`:** `plot-fleetctl.sh:84` (LABEL), `:131-137` (`platform()`), `:476` and `:498` (`serves_line`), `:616` (summary), `:722` and `:742` (REFUSAL 4). `scripts-shell.ts:127` (`detached: true`) and `:158` (`child.kill('SIGKILL')`); the file is at `packages/domain/src/adapters/scripts/`. `package.json:14`. `fleetctl.test.mjs:130` (`guardBin`), `:211` (PATH) and `:1006` (`stubPlatform` with `kernel`). The launchctl stub answers `print` only. The file holds 72 tests. `ci.yml:61` is `ubuntu-latest`.

## What a measurement contradicts

Nothing in the plan. Each claim I executed held: the *Safety* rule, the four classifier steps, the fold, orphans (ppid 1 and `systemd --user`), relative resolution, `cannot determine` for a path without the full suffix, and the stated limits (removed interpreter, directory, `--rcfile`).

## What it must say before someone builds it

No blocking finding. Two sentences would each cost one line, and I recommend them:

1. **Widen *Safety*'s subject from argv to every string read from another process.** The rule as worded names "each candidate path" from argv. A cwd is just as attacker-shaped, because a directory name can hold `$( … )`, a backtick, `;` or a newline. The cwd flows through concatenation, suffix removal, the comparison with the repository root and printing. My build handled it safely only because nothing in it evaluates. One more Done-when row would lock that in: an `lsof` stub that answers `n<box>/w$(touch <box>/pwned)/skills/plot/scripts` for a bare `bash plot-fleet-scan.sh`, then an assertion that `<box>/pwned` is absent.
2. **Build it without associative arrays.** macOS ships bash 3.2, and three scripts on the estate already say so (`plot-reconcile-scan.sh:840`, `plot-fleet-scan.sh:2897`, `plot-dispatch.sh:3596`). The fold needs each parent's post-check kind, and the easiest way to get that is `declare -A`, which is how my first draft was written. A second awk pass over the checked rows works under 3.2, as demonstrated above.

## What executing revealed that reading would not

- The awk `system()` hazard is broader than the plan's measured pair (`$( … )`, `;`). Backticks and `$(( $( ) ))` also executed, so *Safety* is right to ban the mechanism and not list payloads.
- BSD `ps` renders an argv newline as `\012`, and `lsof -Fn` renders a cwd newline as `\n`. Neither snapshot can be split into forged rows, so the numeric fields the script passes to `lsof`, `launchctl` and `id` never carry argv text. Reading the plan does not show this.
- On a developer machine, scans from test harnesses show up as top-level scans (sandbox cwd, `.worktrees/free-*` installation, or `cannot determine` under `…/T/plot-hostshim-*`). So the block prints on a machine that runs `pnpm test`. That matches the rule the plan chose, but an operator who reads the block during a test run sees those rows too.
- My first classifier used `declare -A`, which works under Homebrew bash 5 and fails under `/bin/bash` 3.2. Recommendation 2 follows from that.

Processes: every decoy I started was checked with `ps -p` after `kill` and was gone. I signalled no other process.
