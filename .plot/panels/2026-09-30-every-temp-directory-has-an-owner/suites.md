Position: amend
Evidence: executed

Lens: Slice 1 — the suites own their temp root, and the leak gate. Node v24.21.0, macOS 15.7, repo at `6e54cc8b`.

## What I ran and what it showed

**The headline reproduces exactly.** `TMPDIR=<empty>/ node --test test/reconcile/host.test.mjs`, 3:35 wall, all pass:

```
     365
 126 plot-host
  36 plot-host-jira
  27 plot-host-jenbin
  26 plot-host-bb
  23 plot-host-jen
  22 plot-host-rate
  22 plot-host-dotenv
  16 plot-host-sweep
  12 plot-host-bbissue
  ... (31 prefixes in total)
```

**Other files, same method, each with an empty private TMPDIR. Entries counted at exit and again 40-45 s later:**

| File | pass/fail | at exit | +40-45 s |
|---|---|---|---|
| `test/reconcile/fleetrefplans` | 14/0 | 0 | 0 |
| `test/reconcile/dispatch` | 97/0 | 4 (`plot-gate` 2, `plot-sessenv`, `plot-manifest`) | 4 |
| `test/reconcile/budget` | 53/0 | 64 (`plot-budget-sh` 53, `plot-budget-stub` 9, `plot-wt-*` 2) | 64 |
| `test/reconcile/commitrecord` | 15/0 | 0 | 0 |
| `test/reconcile/state-gate` | 22/0 | 21 | 21 |
| `test/reconcile/restart` | 12/0 | 0 | 0 |
| `test/reconcile/workerstate` (spawns `detached: true`) | 21/0 | 0 | 0 |
| `test/reconcile/workerloop` (spawns `detached: true`) | 36/0 | 0 | 0 |
| `packages/board/test/lifetime` (spawns `detached: true`) | 7/0 | 1 (`plot-board-test`) | 1 |
| `packages/board/test/registry` | 7/0 | 0 | 0 |
| `packages/board/test/claim` | 5/0 | 0 | 0 |

**macOS `mktemp` ignores `TMPDIR` when it gets no template.** This is the finding that matters:

```
$ env TMPDIR=$S/mk bash -c 'echo "TMPDIR=$TMPDIR"; /usr/bin/mktemp -d; /usr/bin/mktemp -d -t x'
TMPDIR=/private/tmp/claude-501/.../j1083/mk
/var/folders/g0/6b_pmp692z18k7nb0_cql_yc0000gn/T/tmp.1JyBNYiAoy
/var/folders/g0/6b_pmp692z18k7nb0_cql_yc0000gn/T/x.M71vH939Aa
$ env TMPDIR=$S/mk node -e 'console.log(require("os").tmpdir())'
/private/tmp/claude-501/.../j1083/mk
```

`man mktemp` (macOS) says this is by design: `-t` and the template-less form use *"the _CS_DARWIN_USER_TEMP_DIR configuration variable if available. Fallback locations if _CS_DARWIN_USER_TEMP_DIR is not available are TMPDIR…"*.

A `bash -x` trace of the real scan under a private TMPDIR shows both directories. They land in different places:

```
+ HOST_STATE_CACHE=/var/folders/g0/6b_pmp692z18k7nb0_cql_yc0000gn/T/tmp.1OOKNe4H2H
+ trap 'rm -rf "$HOST_STATE_CACHE" 2>/dev/null || true' EXIT INT TERM
+ REF_TMP=/private/tmp/claude-501/.../j1083/scan//plot-fleet-ref.uCF3kO
+ trap 'rm -rf "$REF_TMP"' EXIT INT TERM
```

After exit, `tmp.1OOKNe4H2H` was still present in `/var/folders/.../T`. That reproduces slice 2's trap overwrite on the live script, and the leaked directory is **outside** the private root.

**The same scan tests with GNU `mktemp`**, the behaviour an `ubuntu-latest` CI runner has, reproduced by putting `gmktemp` first on PATH as `mktemp`:

```
== fleetrefplans # pass 14 # fail 0  exit=0 left=      11
  11 tmp
== fleetderived # pass 12 # fail 0  exit=0 left=       1
   1 tmp
== fleetclaimable # pass 10 # fail 0  exit=0 left=       4
   4 tmp
== fleet # pass 163 # fail 0  exit=0 left=      92
  82 tmp
   1 plot-fleet-throttledrow ... (10 plot-fleet-* in total)
```

**The same `fleetrefplans` run with stock macOS `mktemp`:** 0 entries were left in the private root, and 16 new `tmp.*` entries appeared in `/var/folders/.../T` during the run. 12 of the 16 held this file's fixture branch names (`bug_one-work`, `bug_anchor-work`, …), so this run leaked them. The other 4 held real estate branches (`add-gates-over-rules-principle`), which means a concurrent board wrote them, so I left them in place.

**Environment inheritance holds.** 181 `env: {` literals in `test/reconcile` and `packages/board/test` do not contain `process.env` on their own line. I sampled 7 call sites and every helper they reach spreads `...process.env` (`host.test.mjs:239`, `boardprobe:31`, `workermonitor:61`, `buildmonitor:71`, `second-slice:191`, `free-window:215`, `impl-status-index:381`). `fleetclaimable`'s `sandboxEnv()` copies `process.env` and deletes only `PLOT_REPO_ROOT`. I found no test that clears the environment. One test sets TMPDIR itself: `fleetrefplans.test.mjs:274` uses `TMPDIR: priv`, where `priv` comes from `os.tmpdir()`, so it stays inside the root.

**Hardcoded `/tmp` literals.** My count is 12 with `'/tmp` in `test/reconcile/` and 55 in `packages/board/test/`, or 73 across all quote kinds, against the plan's 14 + 60 = 74. I classified all of them, and **none creates a file**:
- `test/reconcile`: 2 comment lines in `reap-manifest`. The other 10 are `fleetctl.test.mjs:644-685` placeholder substitutions (`'/tmp/repo'`, `'/tmp/node'`) into a plist string.
- `packages/board/test`: every match is fixture data: manifest `worktree:` fields, pulse `local_worktree:`, log paths in stubbed HTTP bodies, and `registry.test.mjs:75`'s `WT`, which `fakeHome` only slugifies into a directory name under a `mkdtemp` home. Three need a note. `manifest-stamp-parity.test.ts:63` already reads `process.env.TMPDIR ?? '/tmp'`. `idea-route.test.ts:378` asserts that `/tmp/plot-pwned` does NOT exist, which is an injection canary and must stay literal. `helpers.mjs:104` is a comment.

**Where the wrapper would live.** `package.json:19` reads `./scripts/bounded.sh 1500 node --test … test/reconcile/*.test.mjs; s=$?; node scripts/check-registry-not-leaked.mjs || exit 1; exit $s`, and `bounded.sh` wraps only the `node --test` part. `test:board` (`:18`) wraps `sh -c 'build && test && vitest'`. In `bounded.sh`, `"$runner" -k 30s "$bound" "$@"` returns to the script after it kills the child, so the script survives a child SIGKILL and can remove the root afterwards. The script installs no trap of its own. It also has an unbounded branch: with no `timeout` or `gtimeout` on PATH it runs `"$@"` directly.

## What a measurement contradicts

1. **"`os.tmpdir()` reads `TMPDIR`, and so do `mktemp` and every script's `${TMPDIR:-/tmp}`. That covers the … sites without changing them."** On macOS this is false for `mktemp` with no template, and for `-t`. Five script sites use that form: `plot-fleet-scan.sh:581`, `plot-board-verify.sh:28`, `plot-install-hooks.sh:177`, `plot-reconcile-scan.sh:477`, `plot-reconcile-scan.sh:2966`. Two more ignore TMPDIR by construction: `plot-host.sh:861` and `:933` call `mktemp "/tmp/plot-host-sweep.$$.XXXXXX"`. So Layer 1 does not cover the process tree. It covers node and the templated `mktemp` calls.

2. **"The three slices are independent … Any can land first."** False for slice 1 on CI. With GNU `mktemp`, four scan-running files leave **98 `tmp.*` entries** in the root (11 + 1 + 4 + 82), all from the trap overwrite that slice 2 fixes. If slice 1 lands first with an empty-root gate, CI goes red on slice 2's defect. The fix is one of two: slice 1 waits for slice 2, or slice 1's allow list carries those entries.

3. **The gate is platform-divergent, and it is green on the platform where the damage was measured.** On macOS the same leak escapes the root: 12 directories in `/var/folders/.../T` from one `fleetrefplans` run, 0 in the root, and the gate reports clean. The plan measured the 20,939 `tmp.*` entries on a Mac. A gate that CI enforces but that cannot see the Mac-side population does not satisfy *"CI fails a test that leaves one behind"* for local runs.

4. **"The file has 17 `mkdtempSync` sites and 3 `rmSync` calls."** I measured **39** `mkdtempSync(` sites and **10** `rmSync` calls in `host.test.mjs`. The 365 is correct and the site counts are not. The 360 total for `test/reconcile/` matches.

5. **The static "no cleanup" count is a weak proxy for leaks.** `commitrecord` has 10 `mkdtempSync` sites and 1 cleanup-like match, and it leaves 0. `budget` has 5 sites and 0 cleanup, and it leaves 64. The migration step must work from the measured per-file count, not from a grep.

## What it must say before someone builds it

- **State that Layer 1 covers node and templated `mktemp` only.** Every `mktemp` in `skills/plot/scripts/*.sh` must pass an explicit `"${TMPDIR:-/tmp}/<prefix>.XXXXXX"` template, and the two hardcoded `/tmp/plot-host-*` spools must move under TMPDIR. This belongs in slice 1, or slice 1 must declare a dependency on slice 2's `plot-tmp.sh`, whose `plot_tmpdir` must itself pass a template. Slice 2's grep gate must refuse a template-less `mktemp` as well as a raw `mktemp -d`, because the defect is the missing template, not the `-d`.
- **Remove "Any can land first".** Either slice 2 lands before slice 1's gate turns on, or slice 1's shrink-only allow list names the scan files with their GNU-measured counts: `fleet` 82, `fleetrefplans` 11, `fleetclaimable` 4, `fleetderived` 1.
- **Make the gate see what escapes on macOS, or say that it cannot.** One option: the wrapper also diffs the owned `tmp.*` and `plot-*` entries in `getconf DARWIN_USER_TEMP_DIR` before and after the run. The concurrent board makes that a snapshot comparison, the problem `check-registry-not-leaked.mjs` already warns about, so it would have to be advisory. The other option: the plan states that the gate is authoritative on Linux CI only.
- **Keep `check-registry-not-leaked.mjs` outside the private TMPDIR.** Its temp set is `[os.tmpdir(), process.env.TMPDIR, '/tmp', '/var/tmp']` (`:116`). Run inside the wrapper, `os.tmpdir()` becomes the private root and the per-user `/var/folders/.../T` falls out of the set, while macOS `mktemp` still writes fixture desks there. The wrapper must run the registry check with the original TMPDIR, or the check must add `DARWIN_USER_TEMP_DIR`.
- **Put the root, and its trap, around the whole `test:contracts` string, not inside `bounded.sh`'s child.** `bounded.sh` must trap INT and TERM itself: a Ctrl-C or a CI cancel signals `bounded.sh`, not only its child. It must also handle its unbounded branch. The root must be named `plot-*`, so that Layer 4's sweep reaches the one directory a SIGKILL of the wrapper leaves.
- **Replace the `/tmp` classification bullet with its result.** 0 of 73 literals create a file. The bullet is a finding, not work.

## What executing revealed that reading would not

- Only running with a private TMPDIR showed that macOS `mktemp` ignores it. The plan's own claim, the code comments (`${TMPDIR:-/tmp}`) and the `fleetrefplans.test.mjs:264` comment ("the scan honours `$TMPDIR`") all read as if it honours TMPDIR. That test filters only `plot-fleet-ref.*`, so it passes while the unnamed cache leaks: 11 entries with GNU `mktemp`, 12 in `/var/folders` on macOS.
- Swapping in `gmktemp` showed the CI-side consequence: slice 1's gate fails on slice 2's defect. Nothing in either slice's text reveals this.
- **The feared flakiness did not appear.** Across 11 files, including 3 with `detached: true` spawns, the count at exit equalled the count 40-45 s later, and no process referenced the root after exit. An empty-root gate looks stable on this sample. This is one run per file, not a proof.
- **Not run:** `test:e2e` and the full `test:contracts` suite (both out of scope), `scan.test.mjs`, the vitest and browser half of `test:board`, a SIGKILL-mid-suite run through `bounded.sh`, and any run on real Linux. The Linux behaviour is inferred from GNU `mktemp` on macOS.

**Cleanup.** I trashed the scratch root `.../scratchpad/j1083` and every private TMPDIR in it: `host`, `fleetrefplans`, `dispatch`, `budget`, `commitrecord`, `state-gate`, `restart`, `scan`, `mk`, `shim`, `b-registry`, `b-claim`, `d-workerstate`, `d-workerloop`, `d-lifetime`, `g-fleetrefplans`, `g-fleetderived`, `g-fleetclaimable`, `g-fleet` and `m-frp`. Outside the scratchpad I trashed 3 probe directories from `/var/folders/.../T` (`tmp.1JyBNYiAoy`, `x.M71vH939Aa`, and the scan-leaked `tmp.1OOKNe4H2H`) and the 12 `fleetrefplans` fixture caches that my run leaked there. I left in place the 4 `tmp.*` entries that hold real-estate branch names, because they are not mine.
