Position: amend
Evidence: executed

Lens: is the plan buildable exactly as written, and is every Done-when bullet assertable and true? Plan read at `1f4a4228`. macOS only. The Linux arms were read and not executed.

## What I ran and what it showed

**The classifier as the plan words it**, in awk (`scratchpad/r4-1080/classify.awk`). argv[0] is the first whitespace token, and its basename selects the interpreter. The leading `-` tokens are options: a `bash`/`sh` option containing `c` disqualifies the row, and so does a `node` `-e`/`-p`/`--eval`/`--print`. The rest of the string must start with a path that ends in the artifact name, and spaces are allowed. A row folds when its parent is of the same kind. A top-level scan with ppid 1 is orphaned.

**Live snapshot**, `ps axww -o pid=,ppid=,uid=,args=`, 986 rows, load `32.88 34.61 42.57`:

```
TOP        board        1969 ppid=1  /Users/jwloka/.claude/plugins/marketplaces/plot-marketplace/skills/plot/scripts/board/board-server.mjs
TOP        supervisor  10931 ppid=1  /Users/jwloka/.claude/plugins/cache/plot-marketplace/plot/2.21.0/skills/plot/scripts/board/plot-registryd.mjs
TOP        supervisor  10942 ppid=1  /Users/jwloka/Quatico/Agentic-Tools/plot/skills/plot/scripts/board/plot-registryd.mjs
TOP        scan        34915 ppid=1969  /Users/jwloka/.claude/plugins/marketplaces/plot-marketplace/skills/plot/scripts/plot-fleet-scan.sh
TOP        board       35248 ppid=1  /Users/jwloka/.claude/plugins/marketplaces/plot-marketplace/skills/plot/scripts/board/board-server.mjs
folded     scan        91011 ppid=34915  /Users/jwloka/.claude/plugins/marketplaces/plot-marketplace/skills/plot/scripts/plot-fleet-scan.sh
1969 cwd=/Users/jwloka/Quatico/ewz/ewz-kus-portal
10931 cwd=/Users/jwloka/Quatico/ewz/ewz-kus-portal
10942 cwd=/Users/jwloka/Quatico/Agentic-Tools/plot
34915 cwd=/Users/jwloka/Quatico/ewz/ewz-kus-portal
35248 cwd=/Users/jwloka/Quatico/Agentic-Tools/plot
91011 cwd=/Users/jwloka/Quatico/ewz/ewz-kus-portal
10942	0	com.plot-pm.registryd
10931	0	com.plot-pm.registryd.ewz-kus-portal
```

Every row landed where the plan says. The machine has changed since the plan's 09:58 table: there is a second board now, **1969**, which serves `ewz-kus-portal` from the marketplace installation and owns the only scan in flight. So the scans in flight serve another checkout, and the block would print. The plan's scope claim, *the scans come from boards*, holds again on a third reading.

**Decoy and edge fixtures** (19 synthetic rows; a row with no output line was not reported):

```
 101 bash -c sleep 45; : /opt/App Support/…/plot-fleet-scan.sh          -> not reported   (plan: excluded)  OK
 102 bash -lc …/plot-fleet-scan.sh                                        -> not reported   OK
 103 /bin/bash -ec : …/plot-fleet-scan.sh                                 -> not reported   OK
 104 bash -c : /opt/App Support/…/board/board-server.mjs                  -> not reported   OK
 105 /bin/zsh -c …/board/plot-registryd.mjs                               -> not reported   OK
 106 node -e require('…/board/board-server.mjs')                          -> not reported   OK
 107 grep board-server.mjs                                                -> not reported   OK
 108 node --watch skills/plot/scripts/board/board-server.mjs              -> TOP board 108 (relative)  OK
 109 /usr/local/bin/node skills/…/board-server.mjs  (ppid 108)            -> folded into 108           OK
 110 bash skills/plot/scripts/plot-fleet-scan.sh --json (ppid 109)        -> TOP scan 110              OK
 111   (its subshell, ppid 110)                                           -> folded                    OK
 112 node /opt/App Support/inst/…/board-server.mjs                        -> TOP board, whole path     OK
 113 /bin/bash /opt/App Support/inst/…/plot-fleet-scan.sh --stream        -> TOP scan ORPHAN, whole path OK
 114 /Users/u/Library/Application Support/fnm/…/bin/node …/plot-registryd.mjs -> NOT REPORTED          MISS
 115 bash --norc …/plot-fleet-scan.sh                                     -> depends on reading of "contains c"
 116 node --max-old-space-size 4096 …/board-server.mjs                    -> board, installed: "4096 /x"   WRONG PATH
 117 bash -o pipefail …/plot-fleet-scan.sh                                -> scan, installed: "pipefail /x" WRONG PATH
 118 node …/plot-registryd.mjs --start-agents                             -> TOP supervisor            OK
 119 sh -xc …/plot-fleet-scan.sh                                          -> not reported              OK
```

**A real process confirms row 114.** I put a node symlink in a directory with a space and started a dummy `plot-registryd.mjs` from it. Then I stopped the process and checked that it was gone:

```
14388 14367   501 /private/tmp/…/r4-1080/App Support/bin/node /private/tmp/…/r4-1080/inst/skills/plot/scripts/board/plot-registryd.mjs --start-agents
classifier:
(end classifier)
node 14388 gone
```

**lsof:** `lsof -a -p 1 -d cwd -Fn` gives `rc=1 bytes=0`, the empty-output shape the plan names. Four calls took 0.226 s at load 33, about 0.056 s each, close to the plan's 0.053 s. `id -un 501` gives `jwloka`.

**A `ps` stub does not disturb today's worker state.** `plot-worker-state.sh` calls `ps` four times (`:198`, `:450`, `:566`, `:598`), and `--status` sources it. I pointed a naive `ps` stub, which only prints fixture rows, at a desk with a live sleeper:

```
real ps:  running|76137|
naive ps: running|76137|
```

So a `ps` stub in `guardBin` does not flip the two existing real-sleeper cases (`fleetctl.test.mjs:351`, `:441`). I checked this because it looked like a risk, and it holds.

**Byte-identical fixtures against today's output shape.** Today's `--status` prints three things: the supervisor arm (`:472-555`), one line per fleet worktree or `(no fleet worktrees under …)` (`:557-588`), and the `summary:` line at `:616`. The new block goes after `:616` and before `exit`, so today's bytes stay a strict prefix, and the silent case is assertable as whole-output equality. Each of the three fixtures needs `stubPlatform(box, { loaded: true })`, and the pid that stub gives `supervisor_pid` must also appear in the `ps` stub as a supervisor whose stubbed `lsof` cwd is `root`. Otherwise that supervisor counts as "another" and the block prints. `box` is `realpathSync`'d (`:71`), and `repo_root` is `git rev-parse --show-toplevel` (`:108`), which is physical on macOS (measured: `/private/var/folders/…`). So a stubbed cwd equal to `root` compares equal. All three fixtures can be built.

**Citations checked:**

| cited | found |
|---|---|
| `plot-fleetctl.sh:84` `LABEL=…` | exact |
| `serves_line` at `:476`, `:498` | exact (defined `:244`) |
| REFUSAL 4 at `:722-742` | exact (`:722` opens it) |
| `scripts-shell.ts:127` `detached: true`, `:158` `child.kill('SIGKILL')` | exact, file is `packages/domain/src/adapters/scripts/scripts-shell.ts` |
| `package.json:14` `node --watch skills/plot/scripts/board/board-server.mjs` | exact |
| `guardBin` defined `:130`, first on PATH `:211` | exact |
| 72 tests | 72 `test(` calls |
| `units/README.md:69-72` | **drifted**: the paragraph is at `:71` and the example fence at `:73-75`; `:69` is a closing fence |

## What a measurement contradicts

1. **A supervisor or board whose interpreter path holds a space is not found.** The plan handles a space in the *artifact* path and nowhere in argv[0]. `ps` prints argv[0] unquoted, so the first token is `/…/App` and its basename is not `node`. The row is dropped without a message, under a status that claims to list every Plot process. That is the failure the plan names against prefix enumeration (*"under a status line that claims it looked"*). The case is plausible: the unit bakes `$NODE` into ProgramArguments (`com.plot-pm.registryd.plist:34`), and on macOS fnm's platform data directory is `~/Library/Application Support/fnm`. The row can also be a real bash scan: `/Applications/Some App.app/…/bash` is the same shape.

2. **Option values break the space-tolerant path.** `node --max-old-space-size 4096 …` and `bash -o pipefail …` are reported, but the value is folded into the path, and they print `installed:  4096 /x` and `pipefail /x`. No invocation on this estate has that shape today. The plan's words still produce the wrong line.

3. **"An option containing `c`" also matches `--norc` and `--rcfile`.** Read literally, `bash --norc …/plot-fleet-scan.sh` is not a scan. Only single-dash clusters (`-c`, `-lc`, `-ec`, `-xc`) mean "a command string follows".

## What it must say before someone builds it

- **argv[0] is the prefix of the string up to the first `node`, `bash` or `sh` at a path boundary and followed by a space.** That is the first match of `(^|/)(node|bash|sh) `. Do not use the first whitespace token. Add a Done-when fixture: `/Users/u/Library/Application Support/fnm/…/bin/node /x/…/board/plot-registryd.mjs --start-agents` is found, with its label.
- **The artifact path starts at the first token after argv[0] that contains a `/`.** This skips slash-free option values, keeps relative paths (`skills/…` holds a slash), and keeps spaced paths (`/opt/App` starts it).
- **The `c` rule applies to single-dash option clusters only.**
- **The checkout arm is chosen by `uname -s`, not by `platform()`.** `platform()` answers `none` on a Linux host with no `systemctl`, and a board can run there. Say that the block prints under the `none` arm too. The macOS Done-when cases (stubbed `lsof`, `launchctl list`) must run under `stubPlatform(box, { kernel: 'Darwin', … })`, because CI is `ubuntu-latest` (`ci.yml:61`). Without that stub they take the `readlink` arm on CI and print `cannot determine`.
- **"Orphaned = ppid 1" is Linux-incomplete. This is a reading; I did not execute it.** On a systemd desktop the user manager (`systemd --user`) makes itself a child subreaper, so a scan whose board died reparents to that manager's pid and not to 1. It would count as in flight. Either define orphaned as "ppid is 1, or the parent's args are `…/systemd --user`" with a fixture row, or state the Linux limit in the plan. macOS has no subreaper, so the macOS reading holds.
- **On Linux the "label" is the unit name** (`plot-registryd-ewz`), not `$LABEL` (`com.plot-pm.registryd.ewz`). The label-to-unit mapping replaces characters and cannot be inverted (`units/README.md:137`). Say "unit" in the Linux row.
- Fix the `units/README.md` citation to `:71` and `:73-75`.

**Linux arms, not executed.** The cgroup rule is precise enough to implement and assert: take the `0::` line, take its last `/` segment, require the `.service` suffix, and remove it. The same holds for `PLOT_PROC_ROOT` defaulting to `/proc` with `readlink "$PLOT_PROC_ROOT/<pid>/cwd"`, and for `procps ps axww -o pid=,ppid=,uid=,args=`. The real-`sleep` cwd test is assertable on a non-root runner. That pid 1 is unreadable there is plausible for the `runner` user, and I did not check it.

## What executing revealed that reading would not

- The machine now runs **two boards**, and the one serving `ewz-kus-portal` owns the scan in flight. The mockup's "1 in flight, THIS repository" was already false 12 minutes after a reading taken from the same machine. This supports the plan's design: the block must be derived every time and must never be a remembered picture.
- The argv[0]-space miss is invisible when reading. The plan's sandbox and its ten synthetic rows all start with a bare `node`/`bash` or a space-free `/bin/bash`, so no fixture it describes could reveal the miss. It took a real process with a real interpreter path to show the row disappear.
- The `ps`-stub risk to the existing worker-state cases looked real on reading (`plot-worker-state.sh` calls `ps` four times) and is empty when measured.

Everything else holds. The live snapshot and 14 of the 19 fixtures classify as the plan says. The three silent fixtures can be built against today's output shape, and every citation but one is exact. The amendments are sentences plus two fixtures, and the design stays as written.
