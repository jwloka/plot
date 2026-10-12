Position: amend
Evidence: executed

Juror lens: is the rewrite true on today's machine, and buildable. Measured 2026-09-30 09:49–09:52, uptime 29 min (the machine was rebooted after round 1), load averages `2.67 22.67 100.35`.

## What I ran and what it showed

**The process picture today: two supervisors, one board, one scan.**

```
$ ps -axo pid,ppid,user,etime,command | grep -E 'board-server\.mjs|plot-registryd\.mjs|plot-fleet-scan' | grep -v grep
 1710 96139 jwloka  00:00 bash ~/.claude/plugins/marketplaces/plot-marketplace/skills/plot/scripts/plot-fleet-scan.sh --stream
10931     1 jwloka  26:22 node(v24.21.0) ~/.claude/plugins/cache/plot-marketplace/plot/2.21.0/skills/plot/scripts/board/plot-registryd.mjs --start-agents
10942     1 jwloka  26:22 node(v24.4.1)  /Users/jwloka/Quatico/Agentic-Tools/plot/skills/plot/scripts/board/plot-registryd.mjs --start-agents
35248     1 jwloka  09:55 node ~/.claude/plugins/marketplaces/plot-marketplace/skills/plot/scripts/board/board-server.mjs
96139 35248 jwloka  00:13 bash ~/.claude/plugins/marketplaces/plot-marketplace/skills/plot/scripts/plot-fleet-scan.sh --stream
```

The three-board picture does not hold today. One board runs, from the marketplace installation. Both supervisors still have zero children. Two supervisors from two installations still run at once, so the feature is still justified for the supervisor half; the board half now rests on a transient.

**The proposed enumeration, run exactly:**

```
$ pgrep -f 'board/plot-registryd\.mjs'      → 10931 10942
$ pgrep -f 'board/board-server\.mjs'        → 35248
```

**The self-match trap, reproduced.** A shell whose argv holds the string is matched by both patterns:

```
$ bash -c 'sleep 4; : board/board-server.mjs board/plot-registryd.mjs' &
$ pgrep -lf 'board/board-server\.mjs'
14302 bash -c sleep 4; : board/board-server.mjs board/plot-registryd.mjs
35248 node .../board/board-server.mjs
$ pgrep -lf 'board/plot-registryd\.mjs'
10931 .../plot-registryd.mjs --start-agents
10942 .../plot-registryd.mjs --start-agents
14302 bash -c sleep 4; : board/board-server.mjs board/plot-registryd.mjs
```

`bash -c "pgrep -f ..."` with ONE command did not self-match, because bash execs a lone command. Any agent session running `ps | grep board-server.mjs; …` or a Claude Code Bash wrapper (`zsh -c '…board/board-server.mjs…'`) is a multi-command shell and is counted as a board.

**The `node --watch` parent.** `package.json:14` runs the board as `node --watch skills/plot/scripts/board/board-server.mjs`, and `plot-boardctl.sh:42-43` records the measured tree `9518 node --watch …board-server.mjs` → `27674 node …board-server.mjs`. Both argvs match the pattern, so one `pnpm board` enumerates as two boards. No `--watch` board ran today, so this is read from the code and the recorded measurement, not re-executed.

**The cwd reading works for this user's processes, including launchd jobs, without sudo:**

```
$ lsof -a -p 10931 -d cwd -Fn   → n/Users/jwloka/Quatico/ewz/ewz-kus-portal   rc=0
$ lsof -a -p 10942 -d cwd -Fn   → n/Users/jwloka/Quatico/Agentic-Tools/plot   rc=0
$ lsof -a -p 35248 -d cwd -Fn   → n/Users/jwloka/Quatico/Agentic-Tools/plot   rc=0
  0.053 s per call
$ lsof -a -p 349 -d cwd        (root's syslogd)  → no output, rc=1
```

For another user's process `lsof` prints nothing and exits 1. It prints no error text, so "cannot be read" must be decided by empty output, not by parsing a message. `pgrep -f` lists every user's processes by default, so such a row will appear.

**The launchd label by pid works for both supervisors:**

```
$ launchctl list | awk '$1==10931'   → 10931 0 com.plot-pm.registryd.ewz-kus-portal
$ launchctl list | awk '$1==10942'   → 10942 0 com.plot-pm.registryd
```

**Scans by parentage — one scan is four processes named `plot-fleet-scan.sh`.** Six samples at 2 s intervals of board 35248's subtree, every one of them:

```
19913 bash .../plot-fleet-scan.sh --stream
  31805 bash .../plot-fleet-scan.sh --stream
    31826 bash .../plot-fleet-scan.sh --stream
      31836 bash .../plot-fleet-scan.sh --stream
        31838 bash .../plot-host.sh pr-state bug…
          … four more plot-host.sh subshells …
            awk …
scan-named descendants: 4   direct pgrep -P 35248 -f plot-fleet-scan: 1
```

Bash subshells (`$( … )`, pipelines) carry the parent's argv. Counting descendants by name reports 4 scans where the board runs 1.

**A timed-out scan is reparented, not a descendant.** `fleet.ts:3270-3292` streams the scan with `timeoutMs: FLEET_SCAN_BUDGET_MS` (90 000), and `scripts-shell.ts:158` answers the timeout with `child.kill('SIGKILL')` on the top bash only — no process group, no tree walk. Reproduced in a scratch dir with a script named `plot-fleet-scan.sh` holding one `$( … )`, spawned and SIGKILLed from node the same way:

```
-- before kill
54866 54850 bash …/plot-fleet-scan.sh        (54850 = node)
54867 54866 bash …/plot-fleet-scan.sh
54868 54867 bash …/plot-fleet-scan.sh
SIGKILLed 54866
-- after SIGKILL of the scan's top bash
54867     1 bash …/plot-fleet-scan.sh
54868 54867 bash …/plot-fleet-scan.sh
54869 54868 sleep 6
-- after node exited
54867     1 bash …/plot-fleet-scan.sh        (still running)
```

**Current `--status`, the byte-identical baseline:** 0.117 s, prints the supervisor block and `summary: agents_running=0 agents_other=2 supervisor=up install=running tick_age=35`.

**Test seam:** `test/reconcile/fleetctl.test.mjs` puts `guardBin` first on PATH (`:211`), so `pgrep`, `lsof`, `launchctl` and `ps` stubs are all reachable. The file holds 72 `test(`/`it(` calls today, not the plan's 67.

## What a measurement contradicts

1. **"Scans in flight, counted by parentage" undercounts in the one case the plan exists for.** The Motivation's condition is `/api/fleet` timing out at 90 s. A timeout SIGKILLs the scan's top bash, and its subtree reparents to pid 1 and keeps running. The board then starts the next scan. So the accumulation that loads the machine consists of processes that descend from NO board. Parentage attributes them to nobody, and the plan's Done-when forbids the only global count. The board with 5 orphaned scans reads `scans in flight: 1`.

2. **"Descendants" overcounts by the subshell factor.** One live scan appears as four `plot-fleet-scan.sh` processes. The plan says `pgrep -P <board pid>` "and its descendants". Descendants gives 4, direct children gives 1. The round-1 figure "17 `plot-fleet-scan.sh` processes, from five installations" is therefore not 17 scans. It could be 4 or 5 scans plus subshells, or orphans. The Motivation table must say what it counted.

3. **The mockup and the Done-when disagree about which path a row prints.** The mockup shows installations (`~/.claude/plugins/marketplaces/plot-marketplace`, `…/cache/…/2.21.0`, `.worktrees/free-28240a09`). The Done-when says "carries its checkout, read from its cwd". Today these differ for every process that is not this repo's own: board 35248 is the marketplace installation serving `/Users/jwloka/Quatico/Agentic-Tools/plot`; supervisor 10931 is the cache-2.21.0 installation serving `ewz-kus-portal`. The round-1 table listed installations only. The installation explains version skew (11 cached versions sit in `~/.claude/plugins/cache/plot-marketplace/plot/`), the checkout explains which estate is loaded. Both are needed, and the plan names only one per place.

4. **"Silent when this checkout's supervisor is the only Plot process" is not the common case.** The common single-checkout machine runs one supervisor AND one board for the same checkout — exactly today's board 35248, cwd this repo. Under the stated rule that board is "a Plot process other than this checkout's supervisor", so the second block prints on every normal machine. The Done-when "the common case must not get longer" then holds only on a machine with no board.

5. **The enumeration counts non-Plot processes.** The self-match trap is real for any multi-command shell or agent wrapper holding the string, and `node --watch` doubles every `pnpm board`. The plan presents `pgrep -f` as finding "every Plot process whatever it was labelled" with no filter.

## What it must say before someone builds it

- **Orphaned scans are a named population.** Report scans whose ppid is 1 (or whose root ancestor is not a board), attributed by their cwd and script path — both survive reparenting (cwd is inherited; argv names the installation). Output shape, for example: `orphaned scans: 3  (cwd /Users/…/plot, installation …/plot-marketplace)`. Without this line the reading is blind in the saturated case.
- **A scan is counted as a TOP-LEVEL process**: a `plot-fleet-scan.sh` process whose parent is not itself `plot-fleet-scan.sh`. Never "descendants named plot-fleet-scan".
- **A board is the node process whose parent is not a matching `node --watch`.** State the rule for collapsing a watcher and its child into one row, and keep the watcher pid, since `plot-boardctl.sh --stop` already treats the pair as one board.
- **Match the executable, not the argv substring.** Require argv[0] to be `node` (basename) and the `.mjs` path to be an argument, or read `ps -o comm=`. This drops `bash -c '…board-server.mjs…'` and grep lines. A Done-when bullet should assert a stubbed `bash -c … board/board-server.mjs` row is NOT reported.
- **Each row names both paths**: the installation (from argv) and the checkout (from cwd). "This checkout's" is decided by cwd.
- **Restate the silence rule.** Silent when every Plot process's cwd is this checkout — this checkout's supervisor plus this checkout's board. The byte-identical Done-when then covers the real common case.
- **"cwd unreadable" is decided by empty `lsof -Fn` output**, not by exit code or a message. A process owned by another user is the test case.
- **Fix the Motivation table**: say whether 17 counted processes or top-level scans, or mark it as unattributed. Update "67 tests" to the current count or drop the number.
- **Name the upstream defect, and do not fix it here**: `scripts-shell.ts:158` and `fleet.ts:1121` SIGKILL only the top of a bash tree, so a timed-out scan keeps running unowned. That is the most likely origin of the accumulation this plan observes. It belongs to its own bug plan (kill the process group: `detached: true` + `process.kill(-pid)`). This plan makes it visible; that plan removes it.

## What executing revealed that reading would not

- Reading `pgrep -P <pid> and its descendants` looks like a precise attribution. Executing it showed one scan as four processes, and SIGKILLing a scan showed its children leave the board's tree entirely. The two errors point in opposite directions, so a single sampled number could look plausible while being wrong both ways.
- The single-command `bash -c "pgrep …"` did NOT self-match, which reads like the trap is absent. The multi-command shell did match. A test that only tries the one-command form passes falsely.
- `lsof` on another user's process fails silently (empty output, rc 1), not with the permission message a reader expects.
- Today's machine shows the installation/checkout split on every row that is not this repo's own supervisor. The round-1 table listed installations, and the rewrite's Done-when switched to checkouts without noticing they are different facts.
- The buildability half holds: `guardBin` can stub `pgrep`, `ps`, `lsof` and `launchctl`, and every bullet above is assertable with stubbed listings. The Linux `/proc/<pid>/cwd` arm needs either a stubbable proc root (for example `PLOT_PROC_ROOT`) or a real process in the ubuntu job; the plan should name which.
