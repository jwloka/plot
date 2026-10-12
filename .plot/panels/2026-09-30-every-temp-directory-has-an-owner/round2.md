Position: amend
Evidence: executed

Lens: does the rewrite hold, and is slice 1 buildable exactly as written. Juror `r2-1083`, 2026-09-30, macOS 15.7 (Darwin 24.6), `/bin/bash` 3.2.57 and Homebrew bash 5.3.15, load average 23-38 throughout.

The rewrite's new central claim is false: **the sweep has no scheduled caller.** `plot-fleetctl.sh --once` is a manual command that nothing runs on a schedule, and it `exec`s node. The helper as specified also cannot be built: its natural call form, `d=$(plot_tmpdir x)`, either deletes the directory before the caller gets it or leaks it. The ledger's writer side holds under the round-1 race. Its reader order misses a whole live generation when a rotation lands between the reader's two reads.

## What I ran and what it showed

**1. Trap and mktemp counts: both hold.**

```
== traps naming EXIT/INT/TERM
plot-board-verify.sh:26:trap cleanup EXIT INT TERM
plot-dispatch.sh:2654:    trap 'rm -rf "$gate_dir"' EXIT
plot-install-hooks.sh:175:  trap cleanup EXIT INT TERM
plot-fleet-scan.sh:583:    && trap 'rm -rf "$HOST_STATE_CACHE" 2>/dev/null || true' EXIT INT TERM
plot-fleet-scan.sh:2588:  [ -n "$REF_TMP" ] && trap 'rm -rf "$REF_TMP"' EXIT INT TERM
plot-host.sh:2655:trap 'budget_memo_clear' EXIT
plot-resolve-artifact.sh:235:trap 'rmdir "$lock" 2>/dev/null || true' EXIT INT TERM
plot-worker-loop.sh:1611:trap _cleanup_on_exit EXIT
```

That is 8 traps in 7 scripts, as the plan says. The scripts hold 14 `mktemp` sites: the 5 template-less ones the plan names (fleet-scan:581, board-verify:28, install-hooks:177, reconcile-scan:477 and :2966), the 2 hardcoded `/tmp` ones (host:861, :933), and 7 that are already templated. No script sources `plot-host.sh` (`grep` for `. …plot-host.sh` / `source …plot-host.sh` over `skills scripts test packages`: 0 hits). The "a script that sources `plot-host.sh`" hazard is therefore hypothetical today.

**2. macOS `mktemp` against `TMPDIR`: the plan's claim holds, and `-t` fails as well.**

```
no template: /var/folders/g0/6b_pmp692z18k7nb0_cql_yc0000gn/T/tmp.sGI8OGfYzI
-t:          /var/folders/g0/6b_pmp692z18k7nb0_cql_yc0000gn/T/plot-x.FQsG9UBHpG
templated:   …/scratchpad/r2proto/tmpd//plot-x.lytb68
```

Only the explicit `"${TMPDIR:-/tmp}/plot-<prefix>.XXXXXX"` template lands under `TMPDIR`.

**3. The helper, built the way the plan describes it.** I sourced a helper that keeps the registry in a shell array, prints the path, and installs `trap … EXIT INT TERM` on first use. Then I called it the idiomatic way:

```
d=$(plot_tmpdir case1)
[/bin/bash]              returned …/plot-case1.8lFtuB ; exists-after-subst=NO
[/opt/homebrew/bin/bash] returned …/plot-case1.r4yMgf ; exists-after-subst=NO
```

The trap installs inside the command substitution's subshell, and it removes the directory when the substitution closes. In a second test I installed the trap once at source time:

```
exists-after-subst=yes
left after script exit: 1        (both bashes)
```

That version leaks, because the subshell appends to its own copy of the array. `plot-budget.sh:410-417` already records this same fact about the budget memo: *"a command substitution is a SUBSHELL: a variable the function sets inside one dies when the substitution closes."*

At least 4 of the 14 sites already run inside a substitution: `bb_branch_sweep` (host:861), whose own comment says *"This runs inside the command substitution `pr_list_call` wraps the sweep in"*; `gh_api_harvest`'s two files (host:2878, :2884), which run as `out="$(gh_api_harvest …)"`; and `lookup_plan_sprint` (reconcile-scan:2966), which runs as `plan_field=$(lookup_plan_sprint …)`.

**4. The existing trap shape does not stop the script on a signal.** This is the `trap 'rm -rf "$d"' EXIT INT TERM` form that all eight traps use:

```
TERM rc=0
AFTER-SIGNAL: script kept running; dir exists=no
INT rc=0     (SIGINT reset to default via perl, since a background job ignores it)
AFTER-SIGNAL: script kept running; dir exists=no
```

A handler that does not exit turns TERM or INT into "delete my temp files, then continue with exit status 0". A registry that copies the current shape copies this defect as well.

**5. A registry that works, on both bashes with `set -u`.** The prototype keeps a file-backed registry at `"${TMPDIR:-/tmp}/plot-reg.$$"`. `$$` is the key for the budget memo's reason: it is stable across subshells. The API is `plot_tmpdir VAR prefix`, which sets the variable through `printf -v` and forks no subshell. `plot_on_exit` appends a `c:` line. The script sources one EXIT trap that keeps `$?`. INT and TERM each have a handler that runs the cleanup, clears its own trap and re-raises the signal. The test script registers two directories (the fleet-scan pair), two commands, and a file registered inside `$(sub)`:

```
=== /bin/bash
A exists=y B exists=y sub-out=x
cmd1 ran
cmd2 ran (budget_memo_clear stand-in)
normal rc=7 left=0
INT rc=130 left=0 cmds=2
TERM rc=143 left=0 cmds=2
=== /opt/homebrew/bin/bash
(identical)
```

**6. The `/tmp` inventory is larger than the plan lists.**

```
lines with /tmp/ literal (non-comment) per file:
  plot-host.sh 41   plot-open-pr.sh 3   plot-reap.sh 1   plot-update-board.sh 1   plot-write-config.sh 7
distinct fixed-name /tmp paths in plot-host.sh:
  48 /tmp/plot-host-err.$$
   1 /tmp/plot-host-limit.$$            (:4636)
   1 /tmp/plot-host-prlist-err.$$       (:578)
   1 /tmp/plot-host-prlist-state-err.$$.$_s   (:1051)
   1 /tmp/plot-host-sweep.$$.XXXXXX     (:861)
   1 /tmp/plot-host-window.$$.XXXXXX    (:933)
```

`plot-open-pr.sh:222-225` and `plot-write-config.sh:104-118` also redirect stderr to fixed `/tmp/…$$` names. `plot-update-board.sh:66` writes `CACHE_FILE="/tmp/plot-board-cache-${OWNER}-${PROJECT_NUMBER}.json"`, which is a cache that persists across calls and is not a temp path. `plot-reap.sh:470` is a `case` pattern and writes nothing.

**7. Where the sweep's caller runs.**

```
units/com.plot-pm.registryd.plist:34-36   <string>__NODE__</string> <string>__REGISTRYD__</string> <string>--start-agents</string>
plot-fleetctl.sh:14-16   --once  one supervisor tick … THE GATE: the tick decides and performs nothing, so this is free
plot-fleetctl.sh:641     exec node "$registryd" --once
plist:26-28              `--start-agents` … defaults off so that `/plot-fleet --once` can run against a live estate for free
```

`crontab -l` is empty, and no source outside `plot-fleetctl.sh` invokes `plot-fleetctl.sh --once`.

**8. Ledger rotation, against a copy of the live 47,824,483-byte ledger.** I built the design as the plan specifies it: a lock-free append, a `head`-style read of the first line's `at-ms`, a `mkdir` lock (skip, never wait), a re-read under the lock, and `mv budget.tsv budget.tsv.1`. It wraps the real `budget_append` from a scratch worktree. Four appenders wrote 150 lines each, and one rotation was forced mid-stream through the same lock:

```
trial 1 (rotate at 0.3s): visible=600/600 dup=0 in.1=28  in.cur=572 rotations=1 total=831332/831332
trial 2 (rotate at 0.6s): visible=600/600 dup=0 in.1=62  in.cur=538 rotations=1 total=831335/831335
trial 3 (rotate at 1.0s): visible=600/600 dup=0 in.1=84  in.cur=516 rotations=1 total=831339/831339
trial 4 (rotate at 1.5s): visible=600/600 dup=0 in.1=156 in.cur=444 rotations=1 total=831344/831344
trial 5 (rotate at 2.0s): visible=600/600 dup=0 in.1=202 in.cur=398 rotations=1 total=831351/831351
trial 6 (rotate at 2.5s): visible=600/600 dup=0 in.1=248 in.cur=352 rotations=1 total=831352/831352
```

Five more trials let the appenders trigger the rotation themselves from the ledger's old first line. All five rotated exactly once, showed 600/600, and had 0 duplicate and 0 torn lines. No append is lost. Trial 4 printed `./rot.sh: line 7: …/budget.tsv: No such file or directory`. That came from `read < "$path" 2>/dev/null` in the moment after the rename. A redirection error is not caught by a trailing `2>/dev/null`, so the rotation check needs `{ read …; } 2>/dev/null`.

**9. The reader across the rotation boundary.**

```
-- deterministic: reader reads .1, rotation lands, reader reads current
   reader saw: A=100 B=0 C=3   (B is the live generation)
-- deterministic, reverse order (current then .1):
   reader saw: A=0 B=200 C=0
```

With the plan's order, `.1` then current, a rotation between the two reads makes the reader skip the whole generation that holds the live window. `budget_rate_read` then reports `spent:0` and `remaining:null` for that call, and `graphql_budget_spent` reads that as "not spent". The reverse order counts that generation twice. That direction is conservative: `spent` is inflated once, and `remaining` comes from the newest line, so duplicates do not change it.

**10. A SIGKILL during rotation.**

```
after SIGKILL of the rotator: lock present=YES
50 later appends, each due to rotate: rotated=NEVER current-lines=51
```

**11. `O_APPEND`, on the live processes (read-only `lsof +fg`).**

```
registryd (plot)  fd 1u flags R,W,AP,0x10000  …/plot/.plot/logs/registryd.log
registryd (plot)  fd 2u flags R,W,AP          …/plot/.plot/logs/registryd.err
registryd (ewz)   fd 1u flags R,W,AP,0x10000  …/ewz-kus-portal/.plot/logs/registryd.log
board (plot)      fd 1w/2w flags W,AP          …/plot/.plot/logs/board.log
board (ewz)       fd 1w/2w flags W,AP          …/ewz-kus-portal/.plot/logs/board.log
```

Both openers use `O_APPEND`, so the item the writer flagged as unverified is now verified. I then truncated a file under a live writer, and renamed a file under an appending writer:

```
append: size=1277 NULbytes=0   firstline=line 54
plain:  size=1692 NULbytes=415 firstline=line 54
rename: log exists=n log.1 lines=100
```

Truncating an `O_APPEND` file is safe. Truncating a plain `>` file leaves a hole of NUL bytes. After a rename, the inherited writer follows the inode and never creates the new name. That confirms the plan's reason for process-owned rotation.

**12. Connector windows.** No connector declares a window. The only window is `FALLBACK_WINDOW_MS = 60 * 60 * 1000` (`rules/budget-record.ts:23`) and `BUDGET_FALLBACK_WINDOW_MS=3600000` (`plot-budget.sh:210`). Both readers compute `from = max(now - 1h, latest passed reset)`, so 1 h is an upper bound on every window. `fleet.ts:309`'s `PR_FULL_READ_MS = 24 h` belongs to the PR index and is not a spend window. Nothing states a window longer than 24 h.

**13. `spend-rate` at the two-generation size**, best of 5, from a scratch worktree with `PLOT_BUDGET_HOME` set to a scratch directory, at load 38:

```
lines=0      0.119s
lines=2000   0.121s
lines=30700  0.153s
lines=61000  0.202s
lines=122000 0.345s
```

**14. Citations.** fleet-scan:581-583 and :2585-2588, host:861, :933, :1717-1722 and :2655, budget:11-16, `ports/budget.ts:93`, registryd-main:267-288 (`hostSaid(['spend-rate'])` at :279), boardctl:423-425 (both branches use `>>"$logfile"`), plist:80-83, `board.ts:1831, 1857, 2326`, check-registry:116, fleetrefplans:274 and idea-route:378 all hold. One drifted: `fleet.ts:1870` is a docblock, and the `spend-rate` call is at `:1880`.

## What a measurement contradicts

1. **"The sweep has a caller. `plot-fleetctl.sh --once` runs the sweep with `--yes` after its tick, because a tick is the one operator command already run on a schedule."** Three facts contradict it. Nothing runs `--once` on a schedule: the launchd unit runs `plot-registryd.mjs --start-agents` directly, and there is no cron entry. `--once` is `exec node "$registryd" --once`, so no code runs after its tick. And `--once` has a documented contract, *"the tick decides and performs nothing, so this is free"*, stated in `plot-fleetctl.sh:14-16` and in both unit files. A `--yes` sweep breaks that contract. Without a change, the SIGKILL backstop runs only when a person types a command, which is the limit the plan says it will not hide.
2. **"`plot_tmpdir <prefix>` … Each call records the path for removal"**, with one trap per process (item 3). The call form this implies, `d=$(plot_tmpdir x)`, removes the directory at once if the trap is installed lazily, and leaks it if the trap is installed at source time. Four existing sites run inside a substitution, so a shell-variable registry cannot see them wherever the call is made.
3. **"Two more hardcode `/tmp`"** (item 6). The count is at least 9 distinct fixed-name `/tmp` write paths in 4 scripts, and `/tmp/plot-host-err.$$` alone appears 48 times. The plan's own gate refuses a `/tmp/` path literal in a write, so slice 1 as written fails its own gate until these move too. `plot-update-board.sh:66` is persistent cache state. It belongs in the Layer 5 manifest, not in the temp helper.
4. **"`budget_rate_read` … read `budget.tsv.1` and then `budget.tsv`. An append that races a rename lands in one of the two files, and the reader reads both. So no append is lost."** The writer half is true: 600/600 in 11 trials. The reader half is false as ordered (item 9). With that order, a rotation between the two reads hides every line in the live window from that reader.
5. **The rotation lock has no recovery** (item 10). One SIGKILL during the rename window stops rotation permanently, and the growth this slice bounds comes back with no report.
6. **"`$TMPDIR/tmp.*` entries" in the sweep.** `tmp.*` is the default name of every template-less macOS `mktemp` (item 2), whichever program calls it. "Owned by this user and older than 24 h" cannot tell Plot's cache from another tool's directory. The fleet-scan cache has a recognisable shape: a directory that holds `.list-arrived`, `.list-complete`, `pr-list.json` or `pr-list-open.json` (`plot-fleet-scan.sh:855-1075`).
7. **"The Done-when bound is 0.2 s"** at about 61,000 lines. The measurement is 0.202 s at load 38, and 0.119 s of that is process start with an empty ledger. The bound passes or fails on machine load, not on the ledger.

## What it must say before someone builds it

- **Name the sweep's real caller, or state that it has none.** One option is a registryd tick that performs this one write behind the opt-in flag it already uses for `--start-agents` (`registryd-main.ts:117`). That keeps "decides and performs nothing" true for a plain `--once`. The other option is to state that the sweep runs only from `plot-reap.sh --yes` and `/plot-reconcile`. Remove the sentence that calls `plot-fleetctl.sh --once` scheduled.
- **Specify the helper's API and registry**: `plot_tmpdir VAR prefix` / `plot_tmpfile VAR prefix`, set through `printf -v` and not through output. The registry is a file keyed by `$$`, so a registration inside `$(…)` or `( … ) &` reaches the owner's trap. The prototype in item 5 does this in 25 lines on bash 3.2 and 5.3.
- **Specify the signal semantics**: INT and TERM run the registry, clear their own trap and re-raise, so the script exits with status 130 or 143. EXIT keeps `$?`. The Done-when should add: *a script sent TERM mid-run exits 143 and runs no command after the signal.*
- **List the full `/tmp` population in slice 1**: the 48 `plot-host-err.$$` redirects and the `limit`, `prlist-err` and `prlist-state-err` paths in `plot-host.sh`, `plot-open-pr.sh:222-225` and `plot-write-config.sh:104-118`. Move `plot-update-board.sh:66` to Layer 5 as a declared cache.
- **Replace the `tmp.*` name match with the cache's shape**, a directory that holds `.list-arrived` or `pr-list*.json`. The alternative is to drop `tmp.*` and give the operator a one-time command.
- **Fix the reader order**: read `budget.tsv` first, then `budget.tsv.1`, and accept one double count as the conservative direction. Or open both, compare the inodes, and read once when they match. Add a Done-when for this case: *a reader interrupted by a rotation between its two reads still counts the live generation.*
- **Give the lock a stale rule**: a lock directory older than a stated age (seconds, not hours) is removed and retaken. An appender that finds the lock skips the rotation and never waits. Add a Done-when: *after a SIGKILL during rotation, a later append rotates.*
- **Name the window the assertion reads**: `FALLBACK_WINDOW_MS` (1 h) is the upper bound of every window, and no connector declares its own. The assertion is then `generation length > FALLBACK_WINDOW_MS`, and it is checkable today.
- **Restate the speed bound relative to the floor**, for example *`spend-rate` over two generations at the measured rate takes at most 0.1 s more than over an empty ledger*. Or measure it at a stated load.
- Correct `fleet.ts:1870` to `:1880`.

## What executing revealed that reading would not

- The helper's failure mode depends on when the trap installs: install it lazily and the directory vanishes at once; install it eagerly and the directory leaks silently. Nothing in the plan text separates the two, and a review that reads only the bullet approves either one. This repository already learned the same lesson in `budget_rate`'s memo and wrote it down at `plot-budget.sh:410-417`.
- All eight existing traps continue after a TERM with exit status 0, having already deleted their files. No reading of the trap lines shows this.
- The ledger's writer-side design is sound under the exact race that broke `truncate()`: 0 of 600 lost against round 1's 59 of 600. Its weak points are the reader order and the lock, and only a deliberate interleaving shows them.
- `lsof +fg` settles the `O_APPEND` question for all four live log descriptors, so the plan can drop "the slice verifies it before it relies on it" and cite the reading.
- The live leak rate is higher than the plan's figure. About 50 new `tmp.*` entries appeared in `/var/folders/.../T` between 10:30 and 10:36 with two boards and two supervisors running. Seven of them hold 953-958 entries each, which is the host-state cache's one-file-per-branch shape. The plan's rate, about one a minute, came from one board.
- **A juror error, reported so the operator knows.** During the `mktemp` probe (item 2), I ran `rm -rf "$(getconf DARWIN_USER_TEMP_DIR)"tmp.*` to remove the one `tmp.*` entry my probe had created. The glob matched every `tmp.*` entry in the operator's real `/var/folders/.../T`, and the command removed all of them. I did not count them first. After the command, the directory held only the `tmp.*` entries created later (10:30 onward). The removed entries were overwhelmingly leaked fleet-scan caches. The command may also have removed the cache of a scan in flight: that scan would then read its host state as unavailable for one pass. It may also have removed another program's `tmp.*` directory, and I cannot now tell. No file under `~/.plot/state` or `.plot/logs` was touched. The mistake is item 6's hazard in miniature: a `tmp.*` match cannot tell Plot's entries from anyone else's.

Scratch worktree `r2-1083-wt` and prototype directory `r2proto` were removed. `git worktree list` shows neither.
