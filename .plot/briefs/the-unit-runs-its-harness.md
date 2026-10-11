## Implementation brief — the-fleet-closes-its-review-findings (wave 11: The unit runs its harness)

- **Plan (canonical):** [docs/plans/2026-10-10-the-fleet-closes-its-review-findings.md](../../docs/plans/2026-10-10-the-fleet-closes-its-review-findings.md) on `main`
- **Approved:** 2026-10-10, Jan Wloka, plan-PR #1499 merged
- **Branch:** `bug/the-unit-runs-its-harness` (base: `main`)
- **Ends as:** one PR to `main`
- **Review of the code:** per repo convention (PR review)

All ten prior waves of this plan are merged (#1514, #1527, #1537, #1541, #1548, #1557, #1560, #1572, #1579, #1585). The only other open PR in the repo is the automated `changeset-release/main` release PR, which does not touch `plot-fleetctl.sh`. This branch can start clean, and is the last wave but one — only "The docs name fleetd" follows it.

### What to build

This slice answers #1487 — `--start`'s harness resolution and the two unit templates' `PATH`/`Environment=PATH=` fill, checked against `plot-fleetctl.sh` as it stands today:

**M1 / L3 — node's resolved directory can silently override the harness `--start` just resolved.** `harness_bin=$(command -v "$harness_name")` (`plot-fleetctl.sh:1039`) resolves the harness once, under whatever `PATH` the operator's shell has at `--start` time. If the pinned node's directory already sits ahead of the real harness directory on that `PATH` — or a directory holding a *different* `claude`/`PLOT_HARNESS` binary does — `command -v` can resolve a copy that is not the one the operator meant, and nothing downstream notices: the unit is filled and loaded with whatever directory `command -v` happened to pick, and the daemon runs that copy forever. Fix: refuse at `--start` when node's own directory and the resolved harness live in different places but `command -v harness_name` would (or does) answer something other than the file this run actually resolved — or, read literally, make `--start` refuse whenever it cannot be sure the harness directory it bakes into the unit is independent of a shadowing node directory. The existing dedupe at `:1130` (`[ "$harness_dir" = "$node_dir" ] && harness_dir=""`) already proves the two directories *can* coincide; M1/L3 is the case where they don't coincide but still interfere, because resolution happened before the check could run.

**L2 — `$node_dir` goes into `sed` unescaped.** The fill at `:1134` interpolates `$node_dir` directly into a `sed` script (`-e "/__NODE_DIR__/s|:$node_dir:|:|g" -e "s|__NODE_DIR__:__HARNESS_DIR__:|$node_dir:${harness_dir:+$harness_dir:}|g"`). A `node_dir` containing `|` (the script's own delimiter) or a `sed`-special character breaks the substitution or, worse, silently fills something other than the intended path — nvm installs commonly produce paths with no such characters, but the fill does not verify that in general. The systemd template compounds this: `Environment=PATH=__NODE_DIR__:__HARNESS_DIR__:...` (`plot-fleetd.service:47`) is unquoted, so a value containing a space or `:` breaks systemd's own parsing of the `Environment=` line, independent of the `sed` risk. Fix both: escape `node_dir`/`harness_dir` for the `sed` delimiter before interpolating (or switch the fill to a delimiter unlikely to collide, consistent with how `$repo_root` and `$fleetd` are already handled elsewhere in the same fill block), and quote the systemd `Environment=PATH=` value.

**L1 — the node-directory dedupe (`:1130`) has no direct test.** `fleetctl.test.mjs:727` ("names the pinned node directory once when the harness lives in it") covers the case where the harness *lives inside* the pinned node's own directory — a different case from deduping two independently-resolved paths that happen to be equal. Add a test that exercises `:1130`'s dedupe itself: a fixture where `harness_dir` is computed to literally equal `node_dir` through two separate resolution paths (not because the harness file lives inside the node directory), asserting the filled PATH lists the directory once.

**L4 — two text defects in the existing test file.** `fleetctl.test.mjs` names an indentation inconsistency around the `each unit template carries exactly its documented placeholders` test body (plan cites `:767`) and a comment/assertion mismatch nearby (plan cites `:745` saying "three placeholders" while the array at that point holds five) — re-grep for these on this branch's checkout before fixing, since line numbers drift between waves touching this file; search by the quoted text (`"carries exactly its documented placeholders"`, nearby `PLACEHOLDERS` literal) rather than trusting the plan's line numbers verbatim.

### The decisions this slice settles — do not re-derive them

**The dedupe at `:1130` is already correct for its one case — this slice extends the check, it does not replace the mechanism.** `[ "$harness_dir" = "$node_dir" ]` is a string-equality guard that removes a harness entry once it has been fully resolved and found identical to node's directory. M1/L3 is a *different* failure: the harness resolved to the wrong directory *before* that equality check ever ran, because `command -v` picked up a shadowed/wrong binary under the ambient `PATH`. Do not fold M1/L3 into the existing dedupe line — it needs its own refusal (or its own corrected resolution order), upstream of `:1130`.

**`--dry-run` already prints both resolved paths (`:1088`) — use that path to decide what "sure" means for M1's refusal.** The `--dry-run` printf already states `node: ... (major %s, pinned %s)` and `harness: ... (on the unit's PATH after node's directory: %s)`, so the information needed to detect a shadowing conflict is already computed before the fill; M1's refusal is a comparison using data this function already has, not a new round of resolution.

**L2's fix must not change `sed`'s existing delimiter convention in this fill block.** Every other substitution in the block (`:1131`–`:1135`) uses `|` as the `sed` delimiter because `$repo_root`/`$node_bin` can contain `/`. Escaping `$node_dir`/`$harness_dir` for `|` (and for `sed`'s regex metacharacters on the pattern side) keeps the same delimiter rather than switching the whole block to a different one — a delimiter change would touch lines this slice does not otherwise need to.

**L4's line numbers in the plan are already stale — the plan itself warns of this.** The plan was written against a snapshot of `fleetctl.test.mjs`; two merged waves ("A stop stays in its estate", "The label migration leaves shell") have already shifted it by tens of lines. Locate the two defects by the quoted test names/strings above, not by line number.

### Done when

The plan's `## Done when` list does not name this slice individually — other slices in this plan own those bullets. This slice's own completion is the issue's fix list (#1487 M1, L1, L2, L3, L4):

- `--start` refuses (or otherwise fails safe) when the harness it is about to bake into the unit cannot be shown independent of a node directory that would shadow it on `PATH` — covering the case the existing `:1130` string-equality dedupe does not: a wrong resolution upstream of that check, not merely a correct one that happens to coincide with node's directory.
- `$node_dir` and `$harness_dir` are safely escaped before they are interpolated into the `sed` fill script, and `plot-fleetd.service`'s `Environment=PATH=` line is quoted.
- A new test exercises the `:1130` dedupe directly — two independently-resolved paths that are equal — distinct from the existing "harness lives inside the pinned node directory" test.
- The two text defects in `fleetctl.test.mjs` (the indentation inconsistency and the stale "three placeholders" comment against a five-element array) are fixed.

Plus: the repo's gates — build artifacts, changeset, platform constraints. This slice edits `skills/plot/scripts/plot-fleetctl.sh` (shell), `skills/plot/units/plot-fleetd.service`, and `test/reconcile/fleetctl.test.mjs`. Add a changeset per [Versioning](../../CLAUDE.md#versioning): description first, `bumps:` block last, optionally naming this plan via a `plan:` line. For tests, run `node skills/plot/scripts/board/plot-local-checks.mjs` from the repo root before each push and run what it prints; the suites in the `CI suites` config key run in CI, and a failure there comes back as a correction. Do not run the full `test:e2e` suite locally — it is CI's gate, not a local one.

`scripts/check-shell-lines.sh` refuses a PR whose shell under `skills/` is longer than at its merge base. M1's refusal adds shell; L2's escaping adds a line or two. If the net change grows the shipped shell line count past this branch's merge base, remove shell elsewhere in the same change, or move part of the decision (e.g. the shadowing check itself) into a domain rule the shell only asks — the way the immediately preceding wave (`bug/the-label-migration-leaves-shell`) moved its own three-way branch into `packages/domain/src/rules/` for exactly this reason. The gate stores no number and has no override.

### Bookkeeping

Open the PR through the controller once the first real commit exists:

```bash
skills/plot/scripts/plot-open-pr.sh          # current branch, or
skills/plot/scripts/plot-open-pr.sh --draft  # while work is still moving
```

Do not run `gh pr create` directly. When the PR is created, append `→ #<number>` to this branch's line in the plan's `## Slices` section (the "The unit runs its harness" heading, `bug/the-unit-runs-its-harness` line). Push the first real commit as soon as it exists.

### Scope guard

This branch owns:
- `skills/plot/scripts/plot-fleetctl.sh` (the harness-resolution block around `:1015`–`:1041`, and the unit-fill block around `:1130`–`:1135`)
- `skills/plot/units/plot-fleetd.service` (the `Environment=PATH=` line)
- `test/reconcile/fleetctl.test.mjs` (a new dedupe test, plus the two text-defect fixes)
- optionally a new file under `packages/domain/src/rules/` if the shadowing check is moved there to pay for the shell-line gate

No other branch from this plan is currently open — all ten prior waves are merged, and only "The docs name fleetd" (text-only, no code) remains after this one. The only other open PR in the repo is the automated `changeset-release/main` release PR, which does not touch these files.

If you find something the plan did not anticipate, report it rather than improvising outside scope.
