## Implementation brief — the-fleet-closes-its-review-findings (wave 9: The label migration leaves shell)

- **Plan (canonical):** [docs/plans/2026-10-10-the-fleet-closes-its-review-findings.md](../../docs/plans/2026-10-10-the-fleet-closes-its-review-findings.md) on `main`
- **Approved:** 2026-10-10, Jan Wloka, plan-PR #1499 merged
- **Branch:** `bug/the-label-migration-leaves-shell` (base: `main`)
- **Ends as:** one PR to `main`
- **Review of the code:** per repo convention (PR review)

Waves 1–8 of this plan are all merged (#1514, #1527, #1537, #1541, #1548, #1557, #1560, #1572, #1579). Nothing ahead of this branch is open, and no other open PR touches `plot-fleetctl.sh` — the only other open PR is the automated `changeset-release/main` release PR (#1502), which does not. This slice can start clean.

### What to build

This slice answers #1438 M1, M2, L4, L5 — four review findings on the `com.plot-pm.registryd` → `com.plot-pm.fleetd` label rename, all still holding on `main` today:

**M1 — the old-label migration is a shell decision, and it should be a domain rule.** `old_label_checkout()` (`skills/plot/scripts/plot-fleetctl.sh:597-601`) and `retire_old_label()` (`:610-626`) decide, in shell, whether a loaded old-label unit serves this checkout, another checkout, or is unreadable, and what to do in each case (leave it, refuse, or unload-and-remove). That three-way branch — `this \*` / `unknown` / anything else — is exactly the shape `supervisor_checkout()` (`:253-264`) already returns as a tagged string (`"this <path>"`, `"another <path>"`, `"unknown"`), so the decision *has* a clean input already; what is missing is a domain rule that takes that reading and returns what to do, instead of the shell doing both the reading and the judging inline.

**M2 — the `'"'"'` quoting makes messages hard to read.** 11 `printf` lines in `plot-fleetctl.sh` escape a literal single quote inside a single-quoted `printf` format string as `'"'"'` — e.g. `retire_old_label`'s refusal at `:616`: `printf 'plot-fleetctl: '"'"'%s'"'"' (the old default label) is loaded, …'`. This is correct POSIX shell (close the quote, insert a double-quoted literal `'`, reopen the quote) but unreadable on sight. Grep for the lines (`grep -n "printf.*'\"'\"'" skills/plot/scripts/plot-fleetctl.sh`) — as of this writing there are 11, not just the 2 inside `retire_old_label`: `:986`, `:998`, `:1012`, `:1017`, `:1043`, `:1073`, `:1076`, `:1079`, `:1086` are the others, scattered across the node-pin check, the harness-resolution refusal, and the `--start` already-loaded refusals. Fix all 11, not just the two in the migration functions — the issue's M2 names the pattern, not a single call site.

**L4 — `unit_name()`'s fallback branch names `plot-registryd-<label>` for anything that isn't an exact match on the two known defaults.** `unit_name()` (`:107-115`) is a `case` with four arms: exact `com.plot-pm.fleetd`, exact `com.plot-pm.registryd`, a `com.plot-pm.fleetd.*` prefix match, and `*` (everything else) — and that catch-all `*` arm sets `prefix=plot-registryd`, so a custom label that happens not to start with either known prefix (e.g. an operator's own `com.quatico.ewz.fleetd`) is filed under the *old* name's unit-file prefix even though its own text says `fleetd`. Fix: the fallback arm should default to the current name (`plot-fleetd`), not the retired one — a label that matches neither known prefix is new territory, and new territory gets the current name.

**L5 — `supervisor_bundle_path()`'s awk prints `$1` where it means the whole matched token, printed as a hardcoded field reference rather than an intention-named variable.** `:236`: `awk '/^\targuments = \{/{f=1; next} f && /\.mjs$/{print $1; exit} /^\t\}/{f=0}'`. `$1` here happens to work because launchd's `arguments = { ... }` block prints one token per line with no leading whitespace to split on, but `print $1` reads as "print the first field" to anyone skimming it, when what it means is "print this whole line, which is one bundle-path token." Rename for clarity — e.g. assign to a named variable or use `$0` with a comment, whichever reads most plainly in context — without changing behavior.

### The decisions this slice settles — do not re-derive them

**M1's domain rule takes `supervisor_checkout`'s existing three-way answer as its input — it does not re-read launchd/systemd itself.** The domain package can do no I/O (`ports/` only, the Layering Rule in `CLAUDE.md`), and `supervisor_checkout()` already produces exactly the tagged union a rule needs (`this <path>` / `another <path>` / `unknown`, parsed into a `{kind, path?}` shape by the shell before calling into the bundle, the same way other fleetctl call sites hand already-read state to domain rules through a Node one-liner — see how `deskLoopAlive` and `endingAction` are invoked from shell elsewhere in this file for the calling convention to match). Write the rule as a plain function over that reading: `{kind: 'this', path} → unload-and-remove`, `{kind: 'another', path} → leave`, `{kind: 'unknown'} → refuse`. Name it for what it decides, not for the shell functions it replaces — follow the `desk-loop-alive.ts` style (readings-as-values, full TSDoc with the measured rationale, no I/O) rather than inventing a new shape. `scripts/check-shell-lines.sh` is why this is worth doing at all: this slice's only sanctioned way to touch `plot-fleetctl.sh` without a net-zero-or-better line change elsewhere is to move the decision into TypeScript and leave the shell thinner.

**M2 is 11 call sites, not 2.** Re-grep before declaring this done — the plan's own issue list only walks through `retire_old_label`'s two, but the pattern repeats at 9 other sites this slice must also fix. Rewriting all 11 in one pass (rather than fixing a couple and calling the finding "mostly addressed") is what closes #1438 M2; a partial fix reads the same as the L3 case elsewhere in this plan where "partly" meant a person had to come back.

**L4's fix is a one-line default change, not a new case arm.** The fallback already has the right structure (`prefix=…`, `rest=…`, compute a sanitized filename) — only the *value* assigned to `prefix` in the `*` arm is wrong. Do not add a fifth arm or restructure the `case`; change `plot-registryd` to `plot-fleetd` in that one assignment and update/add the test that exercises an unmatched-prefix custom label.

**L5 is a readability fix with no behavior change.** Do not "fix" the awk logic itself — `print $1` on a single-token line is not a bug, it is a name that misleads. Confirm the existing bundle-path tests (`test/reconcile/fleetctl.test.mjs` around `:1416`–`:1510`, which already exercise `supervisor_bundle_path`) still pass unchanged; a passing-but-renamed test is the signal this was done right.

### Done when

The plan's `## Done when` list does not name this slice individually — other slices in this plan own those bullets. This slice's own completion is the issue's fix list (#1438 M1, M2, L4, L5):

- The old-label-migration decision (what to do with a loaded old-default-label unit: unload-and-remove, leave, or refuse) is a domain rule under `packages/domain/src/rules/`, taking `supervisor_checkout`'s reading as input and doing no I/O; `old_label_checkout` and `retire_old_label` in `plot-fleetctl.sh` collect the reading and call the rule rather than branching on it themselves.
- All 11 `'"'"'`-quoted `printf` lines in `plot-fleetctl.sh` are rewritten to read plainly (e.g. with `%s` placeholders substituting a pre-escaped quote variable, or any other construction a reader does not have to decode).
- `unit_name()`'s catch-all fallback arm names `plot-fleetd`, not `plot-registryd`, for a custom label matching neither known prefix.
- `supervisor_bundle_path()`'s awk no longer prints a bare `$1`/field reference where it means "the whole matched line" — renamed for clarity, same output.
- A test covers the fallback case L4 changes (a custom label under neither `com.plot-pm.fleetd` nor `com.plot-pm.registryd` gets a `plot-fleetd-*` unit name, not `plot-registryd-*`).
- A test covers the new domain rule directly (its three input shapes → its three outputs), independent of shell.

Plus: the repo's gates — build artifacts, changeset, platform constraints. This slice adds a new file under `packages/domain/src/rules/` (TypeScript, rebuilt into the board bundle by main after merge — do not commit a rebuilt bundle yourself) and edits `skills/plot/scripts/plot-fleetctl.sh` (shell) plus `test/reconcile/fleetctl.test.mjs`. Add a changeset per [Versioning](../../CLAUDE.md#versioning): description first, `bumps:` block last, optionally naming this plan via a `plan:` line. For tests, run `node skills/plot/scripts/board/plot-local-checks.mjs` from the repo root before each push and run what it prints; the suites in the `CI suites` config key run in CI, and a failure there comes back as a correction. Do not run the full `test:e2e` suite locally — it is CI's gate, not a local one.

`scripts/check-shell-lines.sh` refuses a PR whose shell under `skills/` is longer than at its merge base. This slice both adds and removes shell: the 11 `printf` rewrites and the `unit_name`/`supervisor_bundle_path` readability fixes are likely close to line-neutral, but moving the M1 decision out of `old_label_checkout`/`retire_old_label` into a domain rule is what gives this slice headroom if the rewrites net positive — collapse the shell side down to collecting the reading and calling the bundle, and use the saved lines to pay for anything the printf/awk cleanups add. The gate stores no number and has no override.

### Bookkeeping

Open the PR through the controller once the first real commit exists:

```bash
skills/plot/scripts/plot-open-pr.sh          # current branch, or
skills/plot/scripts/plot-open-pr.sh --draft  # while work is still moving
```

Do not run `gh pr create` directly. When the PR is created, append `→ #<number>` to this branch's line in the plan's `## Slices` section (the "The label migration leaves shell" heading, `bug/the-label-migration-leaves-shell` line). Push the first real commit as soon as it exists.

### Scope guard

This branch owns:
- `skills/plot/scripts/plot-fleetctl.sh` (`old_label_checkout`, `retire_old_label`, `unit_name`, `supervisor_bundle_path`, and all 11 `'"'"'`-quoted `printf` call sites)
- a new file under `packages/domain/src/rules/` for the old-label-migration decision
- `test/reconcile/fleetctl.test.mjs` (tests for the new rule, the `unit_name` fallback, and anything the `printf`/awk rewrites need re-asserted against)

No other branch from this plan is currently open (all 8 prior-wave branches are merged: #1514, #1527, #1537, #1541, #1548, #1557, #1560, #1572, #1579). The only other open PR in the repo is the automated `changeset-release/main` release PR (#1502), which does not touch these files.

Two further waves in this plan (`bug/a-stop-stays-in-its-estate`, `bug/the-unit-runs-its-harness`) also touch `plot-fleetctl.sh` but run as later waves, after this one merges — do not start them from this brief.

If you find something the plan did not anticipate, report it rather than improvising outside scope.
