Position: amend
Evidence: executed

Juror lens: slices 2 and 3 — the script temp helper, the SIGKILL sweep, the budget `truncate()` caller, log rotation, and the inventory gate. Round 1.

## What I ran and what it showed

**1. `truncate()` callers, across packages/, skills/ and the shipped bundles.**

```
$ grep -rn "truncate(" packages/domain/src packages/board/src packages/*/test
packages/domain/src/ports/budget.ts:93:  truncate(keep: readonly BudgetEntry[]): Promise<PortResult<void>>;
packages/domain/test/budget-file.test.ts:211:    answer(await record.truncate(survivors(before, now)));
packages/domain/test/budget-file.test.ts:222 / :230 / :266  (tests only)
$ grep -o ".\{80\}truncate(.\{80\}" skills/plot/scripts/board/board-server.mjs   -> no budget truncate
```

The plan's claim holds, and it is narrower than the truth. `truncate()` has an implementation (`packages/domain/src/adapters/budget/budget-file.ts`, write-aside to `${path}.${pid}.tmp` and `rename`). **`budgetFile` itself has no production caller.** `grep -rn "budgetFile(\|BudgetRecord\|survivors(\|readWindow("` over `packages/*/src` finds only the adapter, the fixture, the port and the rule. No production code calls `lines()`, `survivors()` or `truncationOwed()` either.

**2. What the supervisor reads.** `registryd-main.ts:267-288` (`accountRate`) and `fleet.ts:1870` (`spendRateFor`) both call `scripts.hostSaid(['spend-rate'])`, which is `plot-host.sh spend-rate`, which is the shell's `budget_rate_read` awk pass. The supervisor tick never holds the ledger's lines. Writers: `plot-budget.sh` `budget_append`, sourced by `plot-host.sh` on every host call. The board and the supervisor only read, and only through the shell.

**3. Per-call cost of the read path, scratch copy of the 46 MB ledger vs its last 2,000 lines:**

```
real 1.24 real 1.25 real 1.23  <- big   (plot-host.sh spend-rate, 823,705 lines)
real 0.05 real 0.05 real 0.05  <- small
budget_rate github jwloka graphql:  big 1.11 s   small 0.01 s
```

`plot-host.sh:1717-1722` `graphql_budget_spent` calls `budget_rate` before a GitHub call is routed (`:1817`). Every GitHub call on this machine pays about 1.1 s for the ledger read today.

**4. Truncate against concurrent appends.** A harness bundled with esbuild from `budget-file.ts` and `budget-record.ts` ran `lines()` then `survivors()` then `truncate()` over a scratch copy of the ledger, while four shell loops each ran 150 `budget_append racetest wN api 1 - - - unknown` through `plot-budget.sh`:

```
{"lines":823809,"kept":1763,"readMs":58,"survivorsMs":597,"writeMs":5,"windowMs":660}
written=600 present=541 total=2200
```

**59 of 600 concurrent appends (9.8 %) were lost in one 660 ms window.** It is not race-free, and the adapter says so (`budget-file.ts`, *"A CONCURRENT APPEND CAN STILL BE LOST HERE"*). Two mechanisms: a line appended between `readFile` and `rename` is not in `keep`, and an appender whose `O_APPEND` fd opened the old inode writes into the unlinked file. After the first truncation the file holds ~1,800 lines, so the window shrinks to single-digit ms and the loss at ~1,270 lines/hour becomes rare. The first truncation over 46 MB is the expensive one.

**5. Who writes the ledger — the tests do.** One run of `test/reconcile/host.test.mjs` with `HOME` and `TMPDIR` pointed at scratch directories and `PLOT_BUDGET_HOME` unset:

```
exit=0
$HOME/.plot/state/budget.tsv   430 lines
  12 bitbucket/acme/api      284 bitbucket/plot-pm/api     3 bitbucket/unknown/api
   1 github/unknown/core      32 github/unknown/graphql   53 jenkins/unknown/
  12 jira/jira:f00ad3f47332   33 jira/jira:f3748467f3e4
$HOME/.plot/state/slots/   created
$TMPDIR entries: 365       (the plan's number, reproduced)
```

The operator's real ledger carries the same fixture accounts: `bitbucket/plot-pm` 32,220 lines, `jira/me@acme.test` 2,801, `bitbucket/acme` 1,112, plus `jira:f3748467f3e4` and `jira:f00ad3f47332`, the newest dated 2026-09-30 09:43. `~/.plot/state/slots/` holds `acme/` and `a/`. `grep -L PLOT_BUDGET_HOME` flags `test/reconcile/{parser,gate,init}.test.mjs` and `packages/domain/test/{host-shell,tracker-shell}.test.ts` among the fixture-account users.

**6. A third unbounded state path the plan's table omits.** `~/.plot/state/memo/` holds **353 pid directories, 2.1 MB**, the oldest from 2026-09-22 (15 on 09-22, 12 on 09-23, 38 on 09-24 ...). 4 of the 353 pids are live, which is pid reuse. `plot-host.sh:2655` is `trap 'budget_memo_clear' EXIT`. A scratch script with an EXIT-only trap left its directory on SIGKILL only:

```
TERM left: 0   INT left: 0   HUP left: 0   KILL left: 1
```

**7. `registryd.log.2026-09-21` — the writer is named.** No unit, `plot-fleetctl.sh`, registryd source or `/etc/newsyslog.d/` entry rotates it. `~/.bash_history:197030-197038` holds the sequence:

```
skills/plot/scripts/plot-fleetctl.sh --stop 2>&1 | tail -4
mv .plot/logs/registryd.log .plot/logs/registryd.log.2026-09-21 2>/dev/null && echo "rotiert"
git check-ignore -q .plot/logs/registryd.log.2026-09-21 && echo "  ja" || echo "  NEIN — aufpassen"
skills/plot/scripts/plot-fleetctl.sh --start 1 2>&1 | tail -6
```

An agent session rotated it by hand on 2026-09-21. `stat`:

```
birth Sep  8 16:24:22 2026  mod Sep 21 15:52:29 2026  registryd.log.2026-09-21
birth Sep 22 08:06:26 2026  mod Sep 30 09:54:51 2026  registryd.log
```

The old file holds 13,342 tick lines over **13 days**, about 10 KB per tick (the largest tick listed 257 `held on not-claimable` branches). The current log holds 5,944 ticks in 1.7 MB, about 290 bytes per tick. `~/.bash_history:34129` also shows a hand-started `nohup bash -c 'while true; do node .../plot-registryd.mjs --start-agents >> .plot/logs/registryd.log ...'` loop, a second writer outside launchd.

**8. Fleet-scan EXIT trap overwrite.** Confirmed at `plot-fleet-scan.sh:581-583` (`HOST_STATE_CACHE=$(mktemp -d)` + `trap ... EXIT INT TERM`) and `:2585-2588` (`REF_TMP` + `trap 'rm -rf "$REF_TMP"' EXIT INT TERM`), both at top level. Live: `$TMPDIR` held 24 `tmp.*` directories between 09:28 and 09:52 today, each holding branch-named host-state files, and 80 at about 10:05 with two boards running.

**Scripts with more than one EXIT trap:** only `plot-fleet-scan.sh` (2). `plot-worker-loop.sh` has three traps, on ALRM, USR1 and EXIT, one each. No sourced helper sets an EXIT trap. `plot-host.sh` sets one (`budget_memo_clear`).

**`mktemp` sites in `skills/plot/scripts/`:** `mktemp -d` in 4 scripts (5 sites: fleet-scan 2, dispatch, phase-gate, install-hooks). Plain `mktemp` (files) in 5 more: `plot-host.sh` ×4, `plot-reconcile-scan.sh` ×2, `plot-deliver.sh`, `plot-approve.sh`, `plot-board-verify.sh`. Two `plot-host.sh` sites hardcode `/tmp`: `:861` `mktemp "/tmp/plot-host-sweep.$$.XXXXXX"` and `:933` `mktemp "/tmp/plot-host-window.$$.XXXXXX"`, cleaned inline with `rm -f`.

**9. Long-lived processes and temp dirs.** `lsof` on the running `board-server.mjs` (pid 35248) and both `plot-registryd.mjs` processes shows no open file under `$TMPDIR` or `/tmp`. The board's `mkdtempSync` sites (`board.ts:1831, 1857, 2326`) are per request. `plot-worker-loop.sh:1690` arms `Worker bound` per PROMPT (`sleep $WORKER_BOUND_SECONDS; kill -ALRM`), and `:200` bounds a free agent's wait by the same number. A loop that hops runs slice after slice.

**10. Who runs the reaper.** No script calls `plot-reap.sh --yes`. `plot-fleetctl.sh` and the supervisor only name it. The supervisor *"decides and performs nothing"*.

## What a measurement contradicts

- **"`registryd.log.2026-09-21` | 131 MB, one day"** is false. The file spans 2026-09-08 16:24 to 2026-09-21 15:52, 13 days. The date is the day a person renamed it. Layer 5's reason for a size bound over a date bound (*"the measured failure is one day producing 131 MB"*) rests on this misreading. A size bound is still the right choice, because at today's ~290 bytes per tick and 1,440 ticks a day the log grows about 0.4 MB a day, and the old ~10 KB tick lines grew about 10 MB a day. The plan must replace the reason with that.
- **"What produced `registryd.log.2026-09-21` is not established"** is now established: a manual `mv` between `plot-fleetctl.sh --stop` and `--start 1` on 2026-09-21 (`~/.bash_history:197033`). That Done-when bullet can be closed in the plan now.
- **"The supervisor tick calls it after reading the ledger, keeping the entries inside the live window the port already computes"** describes code that does not exist. The tick does not read the ledger through the port. It asks `plot-host.sh spend-rate`, and the port's `lines()`/`survivors()` have no production caller. The slice must add a SECOND full read of the ledger (46 MB: 58 ms read + 597 ms `survivors`) to the tick, beside the shell read the tick already makes. That read is where truncation is licensed (`ports/budget.ts:79-82`: *"the reader has already established which lines are dead"*). The plan must say it adds that read.
- **"No Plot process runs longer than `Worker bound` (28,800 s)"** is false. The board and `plot-registryd.mjs` run for days under launchd, and `Worker bound` is armed per prompt, so a hopping worker loop outlives it. The 24 h sweep is still safe on this estate, but for a different reason: every Plot temp directory found is scoped to one call, one scan or one request (item 9). The argument must be *no temp directory outlives the call that made it*, not *no process outlives Worker bound*.
- **"The budget ledger grows 1.7 MB a day"** omits that the contract suites write into it. One `host.test.mjs` run adds 430 lines to `$HOME/.plot/state/budget.tsv`. At least 39,000 of the 823,705 lines carry fixture accounts. Layer 1 moves `TMPDIR` and not `HOME` or `PLOT_BUDGET_HOME`, so after slice 1 the suites still write to the operator's ledger and `slots/`, and the leak gate cannot see it, because the writes land outside the per-run root.
- **"The board runs the scan every 5 s … one per poll"**: measured, 24 `tmp.*` directories in 24 minutes, about one a minute per board. The scan takes longer than the poll. The leak is real. The rate in the plan is not the measured one.
- **The state table is incomplete.** It omits `~/.plot/state/memo/` (353 pid directories, 2.1 MB, unbounded under SIGKILL, and not reached by the `$TMPDIR` sweep), `~/.plot/state/slots/<fixture-account>/`, `.plot/logs/registryd.err`, and the truncate scratch `budget.tsv.<pid>.tmp`.

## What it must say before someone builds it

1. **Name the truncating reader and add its read.** Choose one: (a) the supervisor tick calls `budgetFile().lines()`, `survivors()`, and `truncate()` when `truncationOwed()`. This adds one full read per tick (≈0.66 s today, a few ms after the first prune). It bounds nothing on a machine that runs a board and no supervisor. (b) The board's 60 s refresh does it, because the board is the process that runs whenever Plot runs. With two checkouts, the record is per computer, so two boards or two supervisors truncate one file. The plan must state that this is acceptable (each loses at most the lines appended in its own window) or give the job to one process.
2. **State the append loss as a measured number**, not as "race-free". Measured: 59 of 600 concurrent appends lost across one 660 ms prune of the 46 MB file. Say that the first prune is the expensive one. Optionally do a one-off offline prune during the slice with the fleet stopped, so no live prune ever runs over 46 MB.
3. **Layer 1 must also set `PLOT_BUDGET_HOME`** (or `HOME`) to the per-run root, or the suites keep writing to the operator's `budget.tsv` and `slots/`. Done-when needs a bullet: *one run of `host.test.mjs` adds zero lines to the operator's `budget.tsv`*. This belongs to slice 1, and slice 3's bound depends on it.
4. **Add `~/.plot/state/memo/` to Layer 4.** Either the sweep covers `$PLOT_BUDGET_HOME/memo/<pid>` directories whose pid is dead and whose age passes the bound, or `plot-host.sh` stops keying the memo on a pid directory. The table must list it.
5. **Widen the Layer 3 gate from `mktemp -d` to every `mktemp`** and to hardcoded `/tmp`. The two `plot-host.sh` spools at `:861` and `:933` bypass `TMPDIR`, so Layer 1 does not relocate them and the `$TMPDIR/plot-*` sweep never reaches `/private/tmp` on macOS (where `$TMPDIR` is `/var/folders/.../T/`).
6. **Say that `plot_tmpdir`'s trap must compose with the traps it meets.** `plot-host.sh:2655` already owns `trap 'budget_memo_clear' EXIT`. If a script sources `plot-tmp.sh` and later sets its own EXIT trap, or the reverse, one replaces the other. That is the fleet-scan defect again. The helper needs a registration API (`plot_on_exit <cmd>`) that the memo clear also uses, and a gate that refuses any raw `trap ... EXIT` outside the helper. Refusing only raw `mktemp -d` is not enough.
7. **Say that the sweep is manual.** `plot-reap.sh` runs `--dry-run` by default and nothing runs it with `--yes`. So the SIGKILL backstop runs only when a person runs it. State that, or make `plot-fleetctl.sh --once` or the supervisor perform it, which would need its own licence.
8. **Fix the log numbers and the log writers.** Replace "one day" with 13 days. Name the second writer: `nohup ... >> .plot/logs/registryd.log` in `~/.bash_history:34129`, outside launchd. Under launchd, `StandardOutPath` is opened by launchd and not by `registryd-main.ts`, so *"rotate in the one place that opens each log"* does not apply to `registryd.log`: the process holds an fd it did not open. Rotation must either move to a file the process opens itself (stop using `StandardOutPath` for tick lines) or copy-truncate. A rename leaves launchd writing into the renamed inode. The plan must pick one.
9. **Inventory gate: name the mechanism.** A static grep cannot enumerate the paths. Writes are built from variables (`"$file.$BASHPID.tmp"`, `join(home, FILE)`, `${path}.${pid}.tmp`). A buildable form: run the contract suite in the per-run sandbox with `HOME`, `PLOT_BUDGET_HOME`, `PLOT_PR_INDEX_HOME` and a scratch repo pointed inside it. List every file under the sandbox's `.plot/`, `~/.plot/` and git-common-dir `.plot/` at the end. Match each path against a checked-in manifest of globs, each with one bound word, and fail on an unmatched path. Its coverage is exactly what the suites execute, and the plan must state that limit. This depends on slice 1's sandbox, so **the three slices are not independent** as the Notes claim. Slice 3's gate needs slice 1's root and the `HOME` redirect from item 3.

## What executing revealed that reading would not

- The file date in `registryd.log.2026-09-21` is a rename date. `stat` birth time and `~/.bash_history` show a 13-day file rotated by hand. Reading the plan's table gives "one day".
- The test suites are a writer to the operator's budget ledger. A scratch-`HOME` run of one file adds 430 lines and creates `slots/`. The live ledger carries fixture accounts dated today.
- The ledger's cost is 1.1-1.24 s per GitHub call through `graphql_budget_spent`, against 0.05 s at a pruned size. The plan says only "a per-call cost".
- A prune over today's file loses about 10 % of concurrent appends in its 660 ms window. The port's own comment calls the loss "one spend", which holds only after the first prune.
- `~/.plot/state/memo/` leaks one pid directory per SIGKILLed `plot-host.sh`: 353 of them. Neither the table nor the sweep covers it.
- The supervisor and the board never read the ledger through the port, so "the port already computes the window" names a computation that no running process performs.
