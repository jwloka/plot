## Implementation brief — the-gates-are-launchers (wave 3: The brief-name gate)

- **Plan (canonical):** docs/plans/2026-10-10-the-gates-are-launchers.md on main
- **Approved:** 2026-10-10, Jan Wloka, plan-PR #1494 merged
- **Branch:** `feature/the-brief-name-gate-is-a-launcher` (base: `main`)
- **Ends as:** one PR to `main`
- **Review of the code:** PR (per plan's `Review: pr`)

Wave 1 (`feature/one-entry-reads-the-hook`, PR #1507, merged) built
`packages/board/src/server/entry/gate.ts` / `board/plot-gate.mjs` with the
launcher and its `GATES` table. Wave 2 (`feature/the-bundle-gate-is-a-
launcher`, PR #1520, merged 2026-10-11) filled the first row,
`bundle-commit`, and along the way added `StagedPath`/`Refs.stagedPaths()`
to the domain. This slice fills the **second** row, per the plan's stated
order (smallest gate first, then "the brief-name gate adds command
parsing"). `check-decision-count.sh pr` reads 51 on `main` right now
(`f8638a442`) — this slice is the one that takes it to 50. Nothing here
waits on the state, controller or phase gate slices, which are unclaimed.

### What to build

`plot-brief-name-gate.sh` (185 raw / 109 code lines today) decides, in
shell, whether a commit adds or renames a hand-off brief to a name no
reader computes — `.plot/briefs/<prefix>-<slug>.md` instead of
`.plot/briefs/<slug>.md`. Move that decision into
`packages/domain/src/rules/` as a pure function and turn the `.sh` file
into a launcher of the `plot-bundle-commit-gate.sh` shape: resolve
`board/plot-gate.mjs` beside it, `exec node` it with `brief-name`, pass
the hook JSON through, pass the exit code through. A missing bundle
allows and says `UNVERIFIED` on stderr — the same fail-open every shipped
gate uses.

Register the gate in `gate.ts`'s `GATES` array, second row, right after
`bundleCommitGate`. `wants(command)` mirrors the shell `case` exactly:
`command.includes('git commit')`. `ask(command)` is where the adapters —
`Refs` for the staged index and the untracked listing, `Scripts` for the
`Branch prefixes` config read — get imported lazily.

### Decisions already settled — do not re-derive them

**The rule is `brief-path.ts`'s, and this gate exists to enforce it, not
to restate it.** `packages/fleet/src/shared/brief-path.ts` already names
the one true shape: `.plot/briefs/<slug>.md`, slug = branch name after its
LAST `/`. The new domain rule does not duplicate that computation — it
imports `briefPath`/the prefix-stripping logic conceptually, but since
`brief-path.ts` takes a *branch*, not a *candidate filename*, the rule you
write inverts it: given a staged path under `.plot/briefs/` and the
configured prefix list, decide whether the stem matches `<prefix>-<rest>`
for any configured prefix, and if so compute the corrected path
`.plot/briefs/<rest>.md`. This is exactly `computed_path()` in the shell
gate today (lines 85–107) — port its logic, not its syntax. Don't invent a
second brief-naming scheme; if you find yourself writing a regex that
disagrees with `briefPath`'s "split on last `/`" rule, the regex is wrong.

**The prefixes come from config, with a hard-coded fallback — and
"absent" is never "refuse nothing".** Read via `Scripts.config('Branch
prefixes', 'idea/, feature/, bug/, docs/, infra/')`, the same default the
shell gate hard-codes (`DEFAULT_PREFIXES` at line 65) and the same one
`adoption.ts:238` already carries as a adoption-time literal. A config
read that fails (bad helper, no script) is the gate's own machinery
failing — fail open via `onError: 'allow'`, never read as "no prefixes
configured". An **empty** config value (the key exists but is blank)
still falls back to the default — the shell gate's `[ -n
"${PREFIX_RAW// /}" ] || PREFIX_RAW="$DEFAULT_PREFIXES"` at line 70. Test
both: a missing key and a key present but empty.

**Only an ADD or a RENAME is judged, and a rename is judged by its
DESTINATION.** `Refs.stagedPaths()` (added by wave 2, already carries
exactly the right shape — `{ status: 'added' | 'modified' | 'renamed',
path }`, with a rename's path being the NEW path already) is the read.
You do not need a new `Refs` operation for the index side — wave 2's
`StagedPath` was deliberately designed to answer "what will the commit
contain", which is this gate's question too. A `modified` status is
**never** refused, even for a path that is already misnamed — a
repository holding a legacy `feature-x.md` can still edit its body on the
way to a future rename. Four of the shell test's twelve cases exist
exactly to catch "every staged path under `.plot/briefs/` was read"
implementations that forget this (`a modify of an existing misnamed brief
passes`, `a chained add of an already-committed misnamed brief is a
modify and passes`).

**The command can stage AFTER the hook runs, and this is the part
`stagedPaths()` alone cannot answer.** `git add x && git commit` is one
Bash call; the hook fires before the `add`. The shell gate's
`command_candidates()` (lines 122–142) parses the command text itself for
a chained `git add` (bare path, `-A`/`--all`/`.`, or no path at all) and a
chained `git mv`, and for the `git add` case reads **untracked files**
that add would stage: `git ls-files --others --exclude-standard
--full-name [-- pathspec]`. `Refs.workingChanges()` is close but not the
same question — it merges modified + staged + untracked together with no
status, so you cannot tell "a new file `git add` would pick up" apart
from "a tracked file already modified". Don't reach for
`workingChanges()` here; if the port needs a narrower "untracked only"
read to do this cleanly, that is a legitimate candidate for a small new
`Refs` operation — check whether `git ls-files --others
--exclude-standard` by itself (no existing op does this) is worth adding
before building the filter some other way. A path a chained `git mv`
targets is resolved against `git rev-parse --show-prefix` so a command
typed from a subdirectory lands on the right repo-relative path (shell
gate line 81, 139) — and a destination already in `HEAD` is a modify, not
an add, by the same rule as the index side (`in_head()`, line 144).

**The command parser is intentionally crude, matching the shell's own
scope.** `sed -E 's/&&|;|\|/\n/g'` split into segments, per-segment string
matching for `git add`/`git mv` substrings. This is not a shell parser and
is not meant to become one — the shell gate's comment block names the
chained case as the one gap `stagedPaths()` cannot see, nothing more
elaborate. Port the segment-split-and-match approach; don't upgrade it to
a real command AST unless a specific test demands it.

**Direct children only, `.md` only, and "prefix word without the dash"
must pass.** `computed_path()`'s `case` guards: the path must be directly
under `.plot/briefs/` (`*/*` inside the stem returns no match — a
subdirectory is not a misnamed brief), must end in `.md`, and the prefix
match requires the literal dash — `"$p"-?*` — so `bugfix-parser.md`,
`feature.md`, and `infrastructure-map.md` all pass untouched (a
`startswith(prefix)` that forgot the dash is exactly the bug one of the
twelve shell tests catches).

**Fail-open is the same split every shipped gate makes, and it is the
`onError: 'allow'` row, not special logic inside `ask`.** No git
repository, unreadable index, unreadable config, invalid hook JSON — all
of these are the gate's own machinery failing, and `onError: 'allow'`
already gives you this for free once `ask` throws or `wants` is false. A
misnamed add or rename the rule CAN read is the one case that refuses.

**This is NOT the slice that drops a `hooks.json` line for the OTHER
unconverted gates.** Wave 2 already made `hooks.json` hold `plot-gates.sh`
in place of its own converted gate's entry while leaving `plot-phase-
gate.sh`, `plot-state-gate.sh`, `plot-brief-name-gate.sh` and `plot-
controller-gate.sh` as their own separate PreToolUse entries. This slice
drops exactly `plot-brief-name-gate.sh`'s own `hooks.json` line — the
other three untouched gates (phase, state, controller) keep running as
separate hooks exactly as today.

### Done when

The plan carries no explicit `## Done when` heading — read the slice line
and the Design section's acceptance language as the specification:

- `plot-brief-name-gate.sh` is a launcher (the `plot-gates.sh`/`plot-
  bundle-commit-gate.sh` shape): resolves the bundle, `exec node`s it, no
  decision logic left in the `.sh` file.
- `briefNameRefusal` (or your chosen name) lives in
  `packages/domain/src/rules/` with unit tests covering at minimum the
  twelve behaviours `test/reconcile/brief-name-gate.test.mjs` already
  names: a misnamed add refused with the computed path and `git mv`; every
  default prefix refused; a `git mv` TO a misnamed path refused, read as a
  rename; a `git mv` that REPAIRS a misnamed brief passes; adding
  `<slug>.md` passes with no stderr; a brief for a branch that doesn't
  exist passes (no membership check); a modify of an existing misnamed
  brief passes; a prefix word with no dash passes (three names in one
  commit); a prefixed name outside the briefs directory, or with a
  non-`.md` extension, or one level deeper, passes; a chained `git add
  <path> && git commit` is refused; `git add -A && git commit` is refused;
  a chained `git mv ... && git commit` is refused; a chained add of an
  already-committed misnamed brief (a modify) passes; prefixes come from
  config and only the configured ones are judged; an absent config key
  falls back to the default; a non-commit command passes untouched.
- `test/reconcile/brief-name-gate.test.mjs` continues to pass, unmodified
  in its assertions, now driving the gate through the launcher path — if
  its drive-path needs edits because the launcher's exit-code passthrough
  changed something observable (not because the test was wrong), say so in
  the PR.
- `gate.ts`'s `GATES` array carries a second row for this gate, after
  `bundleCommitGate`; `wants` is pure and cheap (string test only); `ask`
  imports adapters lazily.
- `hooks/hooks.json` drops `plot-brief-name-gate.sh`'s own entry (already
  holding `plot-gates.sh` from wave 2 for the bundle gate's slot) — the
  phase, state and controller gates' entries are untouched.
- `skills/plot/scripts/README.md`'s `plot-brief-name-gate.sh` row changes
  `Kind` from `decision` to `launcher` and sets `Replaced by` to
  `board/plot-gate.mjs` — `scripts/check-decision-count.sh pr` must read
  50, down from 51 on `main` today (verify locally before pushing:
  `bash scripts/check-decision-count.sh pr`).
- `scripts/measure-gates.mjs` (built in wave 1) re-run and the PR records
  the figure: a non-commit Bash call through `plot-gates.sh` must cost no
  more CPU than the (now three, after this slice: phase, state,
  controller) remaining shell gates plus the one launcher cost at the same
  load — not a fixed millisecond number, load varies run to run.
- `plot-install-hooks.sh --verify`'s existing scratch-repo prober for the
  brief-name gate should still pass unmodified, now routed through
  `plot-gates.sh` → `plot-gate.mjs brief-name` instead of directly through
  the old `.sh` file; if it needs a change, that's a signal something in
  the launcher's exit-code passthrough is wrong, not a cue to edit the
  prober's fixture.

Plus the repo's standing gates: run
`node skills/plot/scripts/board/plot-local-checks.mjs` before each push
and run what it prints — the suites named under `CI suites` in this
repo's `## Plot Config` run in CI, not locally; a failure there comes
back as a correction, so don't run them as a matter of course. Name the
shell-lines gate in the same breath: `scripts/check-shell-lines.sh`
refuses a PR whose shell under `skills/` is longer than at its merge
base. This slice should net REDUCE shell (185→~7 launcher lines), so you
are not expected to pay anywhere else — but if the launcher ends up
longer than the `plot-bundle-commit-gate.sh` shape warrants, trim it
rather than letting the ratchet catch it. Run
`scripts/check-helper-table.sh` only if you add a new helper script (you
shouldn't need to — this slice converts an existing one).

### Bookkeeping

Open the PR through the controller, not `gh pr create`:

```bash
skills/plot/scripts/plot-open-pr.sh          # current branch
skills/plot/scripts/plot-open-pr.sh --draft  # while still moving
```

It reads the plan, titles the PR from this wave's heading, and refuses a
branch no plan names. Push the first real commit as soon as it exists so
the PR can open early. When it exists, append `→ #<number>` to this
branch's line under the plan's `## Slices` → `### The brief-name gate`
subheading, on `main`.

### Scope guard

This branch owns:

- `skills/plot/scripts/plot-brief-name-gate.sh` (becomes a launcher)
- `packages/board/src/server/entry/gate.ts` (adds the second gate row —
  every gate slice's row lands in this same file; expect your diff here to
  be small and additive, never touching `bundleCommitGate`'s row)
- A new rule file under `packages/domain/src/rules/` (e.g.
  `brief-name.ts`) and its test
- Possibly a small new `Refs` operation for an untracked-files listing, if
  you decide the chained-`git add` case needs one beyond what
  `stagedPaths()`/`workingChanges()` already answer — check both before
  adding a third
- `hooks/hooks.json` (drops the brief-name gate's own line only)
- `skills/plot/scripts/README.md`'s `plot-brief-name-gate.sh` row

It does **not** own: `plot-phase-gate.sh`, `plot-state-gate.sh`, `plot-
controller-gate.sh`, `plot-bundle-commit-gate.sh` (wave 2, merged — do not
touch its row or rule file), or `plot-install-hooks.sh`'s core expansion
logic (wave 1 built that; this slice should only need it to keep working,
not to change). The state, controller and phase gate branches
(`feature/the-state-gate-is-a-launcher`, `feature/the-controller-gate-is-
a-launcher`, `feature/the-phase-gate-is-a-launcher`) are unclaimed as of
this writing, so there is no live collision to check against — but
`gate.ts`'s `GATES` array is the one file every later wave also edits:
keep your addition to one row, and expect the merge order to matter
there.

If you find something the plan did not anticipate, report it rather than
improvising outside scope.
