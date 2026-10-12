Position: amend
Evidence: executed

Lens: is it buildable as written, and safe? Fresh juror, round 3. macOS 15.7 (Darwin 24.6.0), `/bin/bash` 3.2.57 and Homebrew bash 5.3, `/usr/bin/awk` 20200816, node v24.21.0, repo `main` at `6a0d830f`, and the verdict judges the text at `3459a897`, which adds `### Safety` and one Done-when. The only diff between the two is that section, its Done-when and a round-2 note, so findings 1-5 below apply unchanged. Finding 6 covers the new text. Everything ran inside one scratch directory, `…/scratchpad/r3-1083.yMxlub`. The live ledger was only read, once through `cp`. The real `$TMPDIR`, `/tmp` and `~/.plot/state/memo` were only listed.

## What I ran and what it showed

**1. Counts and citations hold.** 14 `mktemp` lines in `skills/plot/scripts/*.sh`: 5 template-less, 2 `/tmp`, 7 templated. `plot-host-err.$$` occurs 48 times. `/tmp/plot-open-pr` occurs 3 times, `plot-write-config.$$.req` 4 times and `.err` 3 times. 8 EXIT/INT/TERM traps in 7 scripts. Every other citation I checked matches: `plot-host.sh:1717-1722` and `:2655`, `plot-budget.sh:11-16`, `:210` and `:410-417`, `plot-fleetctl.sh:14-16`, `registryd-main.ts:113-118` and `:279`, `fleet.ts:1880`, the plist at `:34-36` and `:80-83`, `plot-boardctl.sh:423-425`, `ports/budget.ts:93`, `budget-record.ts:23`, `check-registry-not-leaked.mjs:116`, `fleetrefplans.test.mjs:274`, `idea-route.test.ts:378`, and `board.ts:1831, 1857, 2326`. The launchd registryd processes (pids 10931 and 10942) run with `TMPDIR=/var/folders/g0/…/T/`, which is the interactive shell's value. A sweep run by the supervisor therefore sees the same temp directory as the operator's shell.

Two statements are imprecise:
- `plot-update-board.sh:66` is the **fallback**. Line 64 writes `"${GIT_DIR}/plot-board-cache-…json"` whenever the script runs inside a git repository, and `/tmp` is used only outside one.
- *"All eight traps have that shape"* covers five of them. `plot-dispatch.sh:2654`, `plot-host.sh:2655` and `plot-worker-loop.sh:1611` are EXIT-only. An EXIT-only trap already runs its cleanup and exits 143 on TERM:

```
/bin/bash TERM rc=143 left=0         (exit-only trap; trap-ran printed)
/opt/homebrew/bin/bash TERM rc=143 left=0
```

The behaviour change therefore applies to the five `EXIT INT TERM` traps. The worker loop's TERM status does not change.

**2. `plot_tmpdir` / `plot_tmpfile`, built as specified** (file registry at `${TMPDIR}/plot-reg.$$`, traps installed at source time, `printf -v`, INT/TERM re-raise):

```
A=…/plot-plain.J1WfIX exists=y
B(from $())=…/plot-insub.uBMMO0 exists=y
C(from &)=…/plot-bg.0jwuSn exists=y
registry lines: 4
cmd-ran
/bin/bash plain rc=7 left=0
/opt/homebrew/bin/bash plain rc=7 left=0
/bin/bash SIGINT  code=null signal=SIGINT  after=false cmd=true left=0     (spawned from node)
/bin/bash SIGTERM code=null signal=SIGTERM after=false cmd=true left=0
/opt/homebrew/bin/bash SIGINT  … left=0
/opt/homebrew/bin/bash SIGTERM … left=0
bash-parent & TERM rc=143 after=0 left=0
```

A plain call, a call in `$(…)` and a call in `( … ) &` all survive until the owner exits, and all are removed then. The exit status (7) is kept. INT and TERM stop the script, and no command after the signal runs. The design works.

Two cases fail:

```
bash-parent & INT rc=7 after=1 left=0          # INT ignored: the script ran to the end
double-source left=plot-first.H8492k           # second `. plot-tmp.sh` truncated the registry
```

- A script that a non-interactive shell starts with `&` inherits SIGINT as ignored. Bash cannot trap a signal that was ignored on entry. Such a script does not stop on INT, and this is bash's rule, not a defect in the helper. The INT Done-when test must spawn from node or from a shell with job control. A `bash -c 'script &'` harness reads as a failure of the helper.
- Sourcing the helper twice in one shell re-runs its source-time setup, and the leak appears. The helper must guard that setup with a variable, because a library sourced by a script that already sources the helper sources it again. At its first source, the helper must also truncate a registry file left behind by a dead process with the same pid. Otherwise the new process runs that process's `c:` commands.

**3. The sweep, built as specified** (`$TMPDIR/plot-*` owned and older than the bound; `memo/<pid>` owned, older than the bound, and pid not alive; dry-run by default). Fixture: old `plot-host.*`, `plot-run.*` and `plot-host-err.*`; one young `plot-host.*`; old `tmp.*` foreign and `tmp.*` cache directories; old `com.apple.x` and `plotter-old`; memo directories for a live pid (old), a dead pid (old), a dead pid (young) and `notapid`:

```
=== dry-run
temp  T/plot-run.active
temp  T/plot-run.old2
temp  T/plot-host.old1
temp  T/plot-host-err.old3
memo  budget/memo/999991
=== --yes
T left:    com.apple.x  plot-host.young  plotter-old  tmp.OLDCACHE  tmp.OLDFOREIGN
memo left: 42792(live)  999992(dead, young)  notapid
```

It removes exactly the specified set. `plot-run.active` has an old directory mtime and a file inside it written a moment earlier, and the sweep removes it. The plan does not say which timestamp "older than" reads, and the entry's own mtime does not change when a deeper file changes. That is safe only under the plan's call-lifetime argument, and the plan must name the timestamp.

**Dry run against the real `$TMPDIR` (nothing removed):** it would remove **0** temp entries and **190 of 340** memo directories. `$TMPDIR` holds 3,754 `plot-*` entries, and none is older than 60 minutes: 960 `plot-host`, 252 `plot-host-jira`, 205 `plot-host-jenbin` and so on. That matches today's jurors running `host.test.mjs`. None is owned by another user, and every prefix is Plot's. `/tmp` holds 13 `plot-*` entries, none older than 24 h. The legacy `tmp.*` count rose from 95 to **158** during this session, and 158 of 158 hold a fleet-scan marker. The live scan leak runs at roughly ten directories a minute on this machine.

**4. The ledger, built as specified**, against a copy of the live ledger (832,346 lines): lock-free append, a first-line age check, a `mkdir` lock with a pid and start time, an odd/even `budget.gen` written by scratch file and `mv`, stale-lock breaking by rename, and a sequence-lock reader that reads current first, then `.1`, with 3 retries.

*A rotation forced between the reader's two reads:*

```
quiescent before: 209036 832168 false
  [hook] rotated, gen=2
  attempt1: count read=418072 1664336 g1=0 g2=2 -> discarded by the counter
  reader retry answer: 209036 832168 false
quiescent after: 209036 832168 false
```

The first attempt counts the generation twice, the counter discards that answer, and the retry is exact. This holds.

*The four-appender race, 4 × 150 lines, five trials each:*

```
one rotation   trial 1-5: final=[600 832946 false] torn=0 dupLines=0 unflaggedOver600=0
two rotations  trial 1-5: final=[597 597 false]   torn=0 dupLines=0 unflaggedOver600=0
```

With one rotation, all 600 lines are readable in every trial, and the read equals 832,346 + 600. With a second rotation forced 0.4 s later, 3 lines are gone in 5 of 5 trials. Those lines were appended to the old generation by writers that skipped a live lock before the first `mv`, and the second rotation discarded that generation. This is the two-generation bound working as designed. It also means the Done-when *"four concurrent appenders writing 600 lines while rotations fire leave all 600 readable"* fails by design when more than one rotation fires in the run.

*The plan's literal reader, "one `awk` pass over both":*

```
$ awk '{n++} END{print "n="n}' cur missing.1      # /usr/bin/awk 20200816
awk: can't open file missing.1
rc=2                                              # END not run
$ gawk … cur missing.1
gawk: … fatal: cannot open file `missing.1' … rc=2
```

`budget_rate_read` ends with `' "$path" 2>/dev/null || echo '{"spent":0,…}'`. Called with two file names, it answers **spent 0** whenever either file is missing. `.1` is missing on every machine until its first rotation, which is the first 24 h after release. `budget.tsv` is missing after every rotation until the next append. Spent 0 is the headroom direction, which the plan says the reader must never take. The counter does not catch it, because no rotation happened. A pipe of `{ cat budget.tsv; cat budget.tsv.1; } 2>/dev/null | awk …` keeps the order and tolerates both missing files. The measurements above used that form.

*The rotator SIGKILLed at two points, then 50 later appends:*

```
SIGKILL after the odd write, before mv:  after 50 appends: lock=none gen=4 broken.tsv=1 stderr=1
                                         reader: [50 2050 false]
SIGKILL after mv, before the even write: after 50 appends: lock=STILL-HELD gen=1 broken.tsv=0 stderr=0
                                         reader: [50 2050 true] in 0.062s (a quiescent pass is 0.010s)
```

After a kill before the `mv`, the next due append breaks the lock, records the break, and rotates. After a kill **after** the `mv`, the new `budget.tsv` is young, so no append tries the lock for 24 h. The lock stays, `budget.gen` stays odd, nothing is recorded, and every read runs four passes and answers `"rotating":true` until the next rotation is due. The count is correct, but the flag carries no information for a day, and the reader does four times the work on every GitHub call. The Done-when covers only the first kill point.

*Two breakers and one stale lock*: A inspects the stale lock and is descheduled for 1 s before its rename. B breaks the same lock, takes it, and holds it inside its rotation. The ledger's live window holds 20 lines:

```
before: live lines in window = 20 2020 false
breaks recorded: 2
plot-budget: broke a stale rotation lock (999999 0)
plot-budget: broke a stale rotation lock (999999 0)
after: live lines in window = 0 5 false   (expected 20)
```

A's rename took **B's live lock**. Both then rotated. The second `mv` moved a 5-line `budget.tsv` over `.1`, which held the generation just rotated and all 20 live-window lines. The reader then answered **0, not flagged**: the under-count the plan says cannot happen. The break file records two breaks of the dead pid 999999, and one of them was a break of a live lock. The plan says *"which only one breaker can win"*. That is true between two breakers of one lock, and false between a breaker and a fresh owner. The 10 s age rule also treats a live but stopped rotator as stale, for example after SIGSTOP or a laptop sleep, which gives the same result.

**5. The grep gate, in the two forms the plan's wording allows:**

```
(a) /tmp/ in a redirection only:  plot-host.sh 12, plot-open-pr.sh 1, plot-write-config.sh 2
    not seen, assigned to a variable and then redirected through it:
      plot-host.sh:578  tmp="/tmp/plot-host-prlist-err.$$"
      plot-host.sh:1051 _tmp="/tmp/plot-host-prlist-state-err.$$.$_s"
      plot-host.sh:4636 _hdr_tmp="/tmp/plot-host-limit.$$"
      plot-update-board.sh:66 CACHE_FILE="/tmp/plot-board-cache-…"
(b) any non-comment /tmp/ literal:  plot-host.sh 41, plot-open-pr.sh 3, plot-reap.sh 1, plot-update-board.sh 1, plot-write-config.sh 7
```

Form (a) misses 3 of the 9 sites. Form (b) refuses `plot-reap.sh:470`, which is a `case` pattern and writes nothing, and `plot-update-board.sh:66`, which slice 3 migrates. Under form (b), slice 1's gate is red on its own branch unless its exception list names both lines. `.dev/scripts/create-release.sh`, `scripts/migrate-plans-to-slices.sh` and `scripts/release-smoke.sh` also call `mktemp`, and all three lie outside the gate's scope.

**6. The Safety section at `3459a897`.**

*Can a grep gate tell a glob argument from a literal one?* Only for the direct form. That form becomes reliable once the gate removes quoting before it matches. I ran two gates against 16 fixture lines and against every `skills/plot/scripts/*.sh` and `scripts/*.sh`.

A first gate matches the anchor, then a glob character, on the raw line. It fires on fixtures 1, 3 and 4, which are correct. It also fires on three **false positives**: `rm -rf "$TMPDIR/tmp.*"`, where the `*` is quoted and literal; `rm -rf "${TMPDIR:?}/plot-foo.$$"`, where `?` is a guard; and a line whose glob belongs to a later `ls`. It **misses fixture 2**, `rm -rf "$(getconf DARWIN_USER_TEMP_DIR)"tmp.*`, which is the incident itself, because the space inside `$(getconf …)` ends the argument match.

A second gate first replaces every `"…"` span with a token and removes `${VAR:?}` and comments. It then matches an unquoted glob character after the token or an anchor:

```
v2 fires on file lines: 1 2 3 4 9 15      # $TMPDIR/tmp.*, $(getconf)tmp.*, unquoted $TMPDIR/plot-*, /tmp/plot-host-err.*,
                                          # "$d"/tmp.*, command rm "$TMPDIR"/tmp.*
v2 silent on: "$TMPDIR/tmp.*" (quoted literal), "${TMPDIR:?}/…", [ -d … ] && rm …, rm … && ls /tmp/[a-z]*,
              "$(getconf …)/plot-x.$$"
estate files firing (both gates): 0
```

The v2 gate is buildable, and the estate passes it today. It still cannot see five shapes, and all five appear in the fixtures:

```
find "$TMPDIR" -maxdepth 1 -name 'tmp.*' -delete
find "$TMPDIR" -name 'tmp.*' -exec rm -rf {} +
ls -d "$TMPDIR"/tmp.* | xargs rm -rf
rm -rf \
  "$TMPDIR"/tmp.*                              (continuation line)
d=$TMPDIR; rm -rf "$d"/tmp.*                    (v2 fires only because "$d" is quoted; unquoted $d/tmp.* is invisible)
```

`find -delete`, `find -exec rm` and `xargs rm` each occur **0** times in scope today, so the gate can refuse them outright at no cost. A continuation line can be joined before matching. Indirection through a variable is beyond any grep, and there the rule stays a rule. The sweep's own test is the gate for the sweep.

*The sweep's name shape excludes almost everything it exists to remove.* The Safety bullet matches `plot-<prefix>.<suffix>` or `plot-run.<suffix>`. In the real `$TMPDIR`, read only:

```
plot-* entries: 4952; with a dot (plot-<prefix>.<suffix>): 102; without a dot: 4850
plot-host-jira-MXdag9  plot-host-sweep-LrWPST  plot-host-pTFuyG  plot-host-dotenv-kGb8I7
```

In `test/` and `packages/*/test`, 629 `'plot-…-'` prefix literals end with a hyphen and 1 ends with a dot. `mkdtempSync` names an entry prefix plus six random characters, so no suite leftover carries a dot, and `plot-dispatch.sh:2652` and `plot-phase-gate.sh:239` use `plot-gate-XXXXXX` and `plot-phase-gate-XXXXXX` today. Under the new text, the sweep never removes the suites' `plot-host-*` leftovers, which are the 4,850 entries above. Layer 2's first bullet says *"the suites' `mkdtempSync` sites already use it"*, and the Safety section now contradicts that. The Done-when phrase *"`plot` without a dot"* is ambiguous: it can mean an entry named `plot`, or every `plot-…` entry without a dot, and the second reading forbids removing the suites' leftovers.

## What a measurement contradicts

- **The reader is not safe when a generation file is missing.** Both awks exit 2 on a missing input, and `budget_rate_read`'s `||` fallback turns that into `spent 0`. That is the state before the first rotation and after every rotation.
- **"A later append breaks the stale lock"** fails for a rotator killed after its `mv`. Lock and odd counter persist for up to 24 h with no record.
- **"Only one breaker can win"** fails against a fresh owner. In the test, 20 live-window lines went to 0, unflagged, and the break file named the wrong dead pid twice.
- **"Four concurrent appenders … while rotations fire leave all 600 readable"**: 597 in 5 of 5 trials with two rotations, 600 in 5 of 5 with one.
- **"All eight traps have that shape"**: three are EXIT-only and already exit 143 on TERM.
- **`plot-update-board.sh:66` writes `/tmp/…`**: only outside a git repository. Inside one, the cache goes to `$GIT_DIR`.
- **The Safety sweep shape against Layer 2**: 102 of 4,952 real `plot-*` entries match `plot-<prefix>.<suffix>`, and the suites name theirs `plot-<prefix>-XXXXXX`, so the sweep the Safety section specifies removes none of the suites' leftovers.
- **"The gate refuses an `rm` whose argument holds a glob"**: a raw-line grep misses `rm -rf "$(getconf DARWIN_USER_TEMP_DIR)"tmp.*`, the incident command itself, and fires on a quoted literal `*` and on `${TMPDIR:?}`. `find -delete`, `find -exec rm`, `xargs rm` and continuation lines pass any line grep.

## What it must say before someone builds it

1. **The reader reads the two generations with a pipe that tolerates a missing file**, for example `{ cat budget.tsv; cat budget.tsv.1; } 2>/dev/null | awk`, or passes only existing files and re-reads on a failure. It never passes a missing path to `awk`. Done-when: a ledger with no `.1` and a ledger with no `budget.tsv` each answer their true count, not 0.
2. **An odd counter with a dead or stale lock owner is repaired whenever someone sees it**, not only when a rotation is due. For example, an appender or reader that reads an odd counter checks the lock and, when it is stale, breaks it and sets the next even number. Done-when adds the SIGKILL-after-`mv` case: within one later append, the lock is gone, the counter is even, and one break is recorded.
3. **A break cannot take a live lock, and a rotator acts only while it still owns its lock.** After its rename, the breaker compares the renamed directory's owner line with the line it inspected. On a mismatch, it does not rotate. The rotator re-reads its owner file immediately before the `mv` and before removing the lock. Alternatively, rotation renames to a generation-numbered name that a second rotator cannot overwrite. Done-when adds the two-breaker interleaving above: the live-window count is unchanged, and the break file records exactly one break.
4. **The race Done-when names one rotation per run**, or it states that a line appended to a generation that a second rotation discards is lost by design and asserts that count.
5. **The gate matches any non-comment `/tmp/` literal, not only redirections**, and the exception list names `plot-reap.sh:470` (a `case` pattern) and `plot-update-board.sh:66` until slice 3 moves it, or slice 1 moves that cache. The plan states whether the three `mktemp` callers outside `skills/plot/scripts/` are in scope.
6. **The helper guards its source-time setup against a second source, truncates a stale `plot-reg.$$` at the first source, and fixes the registry path once**, so a later `TMPDIR` change in the script does not move it.
7. **The INT test spawns the script from node**, because a script started with `&` by a non-interactive shell ignores INT and cannot trap it.
8. **The sweep names the timestamp it compares**, the entry's own mtime, and the plan states that deeper writes do not refresh it.
9. **The rm-glob gate matches after removing `"…"` spans, `${VAR:?}` and comments, and after joining continuation lines**, and it covers `$(getconf …)` with spaces inside. It also refuses `find … -delete`, `find … -exec rm` and `xargs rm` in scope, each measured at 0 today. It states that indirection through a variable is outside its reach. Done-when adds the quoted-literal and `${TMPDIR:?}` lines as must-pass fixtures and the `$(getconf …)"tmp.*` line as a must-fail fixture.
10. **The sweep's name shape includes `mkdtempSync`'s shape**, `plot-<prefix>-` plus exactly six characters from `[A-Za-z0-9]`, because 4,850 of 4,952 `plot-*` entries measured have that shape. Otherwise the plan must state that the sweep never removes a suite leftover from a run outside the wrapper. Either way, the Done-when names the non-Plot survivors exactly (`tmp.X`, `plot`, `plotter-x`) instead of *"`plot` without a dot"*.
11. Correct *"all eight traps"* to five `EXIT INT TERM` traps and three EXIT-only traps, and correct the `plot-update-board.sh:66` description to the fallback outside a git repository.

## What executing revealed that reading would not

- BSD awk and gawk both **abort before `END`** on a missing second file. Read against the existing `|| echo '{"spent":0…}'`, the plan's "one `awk` pass over both" gives spent 0 on every machine for the first day after release. No reading of the plan shows this, because the plan never names the missing-file state.
- The seqlock itself is correct. The forced mid-read rotation was discarded and retried to the exact count, and all 600 lines survived one rotation. The defects are at the edges: a missing file, a kill after the `mv`, and a breaker racing a fresh owner. The two-breaker race produced an unflagged 0, the one answer the plan's argument says cannot occur.
- Bash cannot trap SIGINT when the signal was ignored on entry. A harness that starts the script with `&` reports the helper as broken when the helper is correct.
- The live `tmp.*` population rose from 95 to 158 during this session, all 158 carrying fleet-scan markers. Slice 1's rename of the cache stops about ten new directories a minute on this machine.

Paths removed, all inside `…/scratchpad/r3-1083.yMxlub`: `t1/tmp-TERM/plot-eo.*` and `t1/tmp-INT/plot-eo.*` (removed by the scripts' own traps); `t2/tmp` (reset 8 times by the harness, each time holding only the helper's own `plot-*` entries); `t3/fx/T/plot-host.old1`, `t3/fx/T/plot-run.old2`, `t3/fx/T/plot-host-err.old3`, `t3/fx/T/plot-run.active`, `t3/fx/budget/memo/999991` (the sweep's `--yes` on the fixture); `t5/h` (recreated per trial, 5 + 5 + 2 + 1 times); `t5/h/budget.gen` and `t5/h/budget.gen.41087.tmp`; `t5/stop`; `t5/answers.*`; `t5/base.tsv` (a 47.9 MB copy of the ledger). `t6/` holds only gate fixtures, and nothing in it was removed. Nothing outside the scratch directory was removed or modified. One background `sleep 300` that I started was killed.
