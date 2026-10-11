## Implementation brief — the-tests-and-gates-close-their-review-findings (wave: Gate exit wording)

- **Plan (canonical):** `docs/plans/2026-10-10-the-tests-and-gates-close-their-review-findings.md` on main
- **Approved:** 2026-10-10, Jan Wloka, plan-PR #1495 merged
- **Branch:** `bug/a-gate-exit-names-its-code` (base: `main`)
- **Ends as:** one PR to main
- **Review of the code:** PR

This is the last wave in the plan. All seven waves above it have merged
into `main`, including "Bundle declaration pairing" (the other slice
that also touched `scripts/check-decision-count.sh`). Nothing else in
this plan is still in flight; this branch owns `plot-install-hooks.sh`
alone.

### What to build

Issue #1485, two findings against `skills/plot/scripts/plot-install-hooks.sh`:

1. **L1 — the retry collapses two different exit codes into one generic
   sentence.** `drive_gate()` (`:279-283`) already reduces any exit ≥128
   to a single tri-state return of `3` ("ended by a signal"), discarding
   the real `$rc`. The retry site at `:413` repeats that: `"$prober"
   "$gp"; rc=$?; [ "$rc" = 3 ] && { "$prober" "$gp"; rc=$?; }` runs the
   prober twice on a signal-like exit and keeps only the second
   tri-state code, not the second run's actual process exit. The report
   line for case `3` (`:421-423`) then prints a fixed sentence — "a
   signal ended the gate twice" — for every such outcome, including a
   gate that called `exit 255` on itself deliberately (not killed by a
   signal at all: 255 is `128 + 127`, which `drive_gate`'s `[ "$rc" -lt
   128 ]` test cannot tell apart from a real signal's `128 + n`). Change
   the report line to give the raw exit code of the *second* probe run,
   for example `"a signal ended the gate twice (exit 255)"` or, for a
   true signal, `"... (exit 137)"`. That means threading the real `$rc`
   of the second run through to the report string — `drive_gate` can
   keep its tri-state return for the `case` dispatch, but the retry site
   needs the actual number too, not just whether it was ≥128.
2. **L2 — no test proves a crash-then-recover retry, and `signalStub`
   cannot produce one.** The two existing signal-path tests
   (`:595-608`, `:610-624`) only ever make `signalStub` kill the stub
   process with a real signal (`process.kill(process.pid, 'SIGKILL')`
   etc.) — it has no mode that calls `process.exit(255)` or any other
   self-chosen non-2 exit. Add a `signalStub` variant (or a second
   helper) that exits 0 on its *second* run after a signal on its first
   — the "it ended once, then answered cleanly" recovery path the
   comment at `:409-412` describes but no test exercises — and a case
   where the second run exits with a plain non-signal, non-zero code
   (e.g. `process.exit(255)`) so the report's new exit-code wording is
   asserted against a case that is NOT a real signal. `signalStub` also
   records no working directory today (`:579-593`); extend its log line
   to capture `process.cwd()` per run so a test can assert the retry
   actually executed in a second, distinct scratch repo (`new_scratch_repo`
   at `:262-269` makes a fresh `$scratch/r$RANDOM$$` per probe call) and
   not the same one twice.

### The decisions the plan settles — do not re-derive them

**Give the raw code; do not invent a signal-name table.** A plausible
alternative is mapping 139→SEGV, 134→ABRT, 137→KILL in the report
string, the way the commit that introduced this wording (`cf9aa79ed`,
"A gate that crashes twice fails --verify", #1484) talks about these
exits in its own message and comments. The plan's Design section rejects
that shape for this finding specifically: ≥128 is NOT always a signal.
`exit 255` from a gate's own `exit` builtin collides with `128 + 127`
and has no signal name to show, so a name-table would have to either
guess wrong or fall back to "unknown" for exactly the case this finding
is about. The fix the plan commits to is strictly weaker and strictly
more honest: print the number `drive_gate`'s second probe actually
returned, and let the reader do what the comment at `:409-412` already
does in prose — "one is an unknown, two are a crash" — without
pretending every such number names a `SIG*`.

**`drive_gate`'s tri-state return stays; only the retry site and the
report string change.** `drive_gate`'s contract (`:279`, "`0` refused,
`1` permitted, `3` ended by a signal") is read by every prober and the
whole `case` dispatch at `:414-427` keys off it. Widening `drive_gate`
itself to return the raw code would ripple into every prober's own
return contract for no benefit — the `case` only ever needed to know
"refused / permitted / crash-class", and that three-way split is still
correct. What was missing is that the *caller* at `:413` throws the
second run's real `$?` away after computing the tri-state from it. Save
that raw number in a sibling variable at the retry site and pass only it
— not `drive_gate`'s tri-state — into the `3)` branch's report string.

**Carried over, unchanged: a signal ending a probe once proves nothing;
twice is the verdict.** The surrounding retry logic (`:409-412`,
`:595-608`) is the fix for #1478/#1477 and is not in scope here — this
slice touches only what the second run's exit code says in the report,
never whether a retry happens or how many times.

### Done when

The plan's `## Done when` equivalent is its Design section's own
paragraph for this wave: *"The `unverified` line gives the raw exit
code, for example 'exited 255 twice (128 or more)'. `signalStub` gets a
variant that exits 0 on its second run, and records `pwd` so a test
asserts that the two runs used different directories."* Lift these
assertions — a fix that only changes the English without threading the
real exit code would pass today's suite without them:

- A test where the stub exits via a real signal on run 1 and
  `process.exit(255)` (not a signal) on run 2 — asserts the report names
  `255`, not a signal name, and that `255` is distinguishable in the
  output from a true-signal case like `137`.
- A test where the stub signals on run 1 and exits `0` on run 2 — this
  is the existing "reads as verified" case (`:595-608`); confirm it
  still passes unchanged, since the raw-code change must not alter the
  already-correct non-crash path.
- A test asserting the two probe runs executed in two different working
  directories (via the extended `signalStub` log), proving the retry's
  `new_scratch_repo` call actually produced a fresh scratch repo on the
  second attempt and not a reused one.

Plus: a `plot` patch changeset (description first, `bumps:` block last —
see root `CLAUDE.md` § Versioning), since this changes shipped code
(`plot-install-hooks.sh` ships as-is under `skills/`, not through a
bundle). Run `node skills/plot/scripts/board/plot-local-checks.mjs` from
the repo root before each push and run what it prints — it resolves the
related tests, typecheck and gate scripts for whatever this branch
actually touches. The suites under the `CI suites` config key run in CI
on every PR; don't run them locally, and don't list them as a gate here.

Name the shell gate explicitly: `scripts/check-shell-lines.sh` refuses a
PR whose shell under `skills/` is longer, at merge base, than at HEAD.
`plot-install-hooks.sh` (549 lines today) **is** under `skills/plot/scripts/`,
so any net growth here — the new exit-code interpolation in the report
string, the retry site threading the raw `$rc` through — is paid for in
the same change: trim equivalent lines elsewhere in this file, or move
logic into the domain and call it through a bundle, before the PR goes
up. The gate stores no number and grants no exemption for a declared
duplicate.

### Bookkeeping

Open the PR through the controller once the branch has its first real
commit:

```bash
skills/plot/scripts/plot-open-pr.sh          # current branch, or
skills/plot/scripts/plot-open-pr.sh --draft  # while work is still moving
```

It reads this plan, titles the PR from this wave's heading ("Gate exit
wording"), and puts the plan + this brief in the body. Do not run `gh pr
create` directly. Once the PR number is known, append `→ #<number>` to
this branch's line under the plan's `## Slices` → "Gate exit wording"
heading (currently line 164, no `→ #N` yet) in the same commit or a
follow-up to the plan file.

### Scope guard

This branch owns `skills/plot/scripts/plot-install-hooks.sh` and
`test/reconcile/install-hooks.test.mjs`. It does not touch
`check-decision-count.sh`, `check-shell-lines.sh`, any
`plot-*-gate.sh` file, or `plot-pr-merged.sh`/`plot-host.sh` — all of
those belong to waves that have already merged, or to the sibling plan
`the-gates-are-launchers` per this plan's "Off-limits files" note.

No other branch in this plan is still open — every prior wave has
merged, so there is no live sibling to collide with on this file. If you
find a change this plan did not anticipate (for example, a third finding
against `drive_gate` the issue doesn't name), report it rather than
expanding this slice's scope to cover it.
