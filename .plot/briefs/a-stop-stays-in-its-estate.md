## Implementation brief — the-fleet-closes-its-review-findings (wave 10: A stop stays in its estate)

- **Plan (canonical):** [docs/plans/2026-10-10-the-fleet-closes-its-review-findings.md](../../docs/plans/2026-10-10-the-fleet-closes-its-review-findings.md) on `main`
- **Approved:** 2026-10-10, Jan Wloka, plan-PR #1499 merged
- **Branch:** `bug/a-stop-stays-in-its-estate` (base: `main`)
- **Ends as:** one PR to `main`
- **Review of the code:** per repo convention (PR review)

Waves 1–9 of this plan are all merged (#1514, #1527, #1537, #1541, #1548, #1557, #1560, #1572, #1579, #1583 — the last closed `bug/the-label-migration-leaves-shell`, which also touched `plot-fleetctl.sh`). This slice can start clean. One wave remains after it in this plan (`bug/the-unit-runs-its-harness`), also touching `plot-fleetctl.sh`, which runs after this one merges — do not start it from this brief.

### What to build

This slice answers #1439: `plot-fleetctl.sh --stop`, run from a linked worktree, stops the agents of the **main checkout's** estate instead of its own.

**The measured failure.** A reviewer ran `--stop` from a scratch worktree with `launchctl` stubbed and `HOME` pointed at a scratch directory. `resolve_wt_root` (`plot-fleetctl.sh:713-719`) called `plot_desk_root "$(plot_repo_root)"`, and `plot_repo_root` (`plot-desk-root.sh:38-45`) resolved `/Users/jwloka/Quatico/Agentic-Tools/plot/.worktrees` — the *operator's real desk root* — because the parent of `--git-common-dir` is the main checkout from any linked worktree. `--stop` then ran `plot-dispatch.sh --stop` on a live agent in that real estate (`feature/approval-becomes-a-command`), which exited 143. The sandboxing (`HOME`, a stubbed `launchctl`) did nothing to contain it, because the desk root resolution never looked at `HOME` or the launchd stub — it looked at git.

`--status` shares the same path: both verbs call `resolve_wt_root` (`plot-fleetctl.sh:893`, `:1215`), the one function this slice edits.

### The decision this slice settles — do not re-derive it

**Resolving the main checkout is correct for `plot-dispatch.sh` and wrong for `--stop`/`--status` run from elsewhere, and both facts come from the same design choice.** The comment directly above `resolve_wt_root` (`plot-fleetctl.sh:702-709`) states the reasoning this slice must not undo: `plot-dispatch.sh` and `plot-fleetctl.sh` ask the *same* rule, for the *same* reason — a stop that missed a desk another dispatch wrote would report a fleet stopped while a worker kept writing to it. That reasoning holds when `--stop` runs from the main checkout itself, or from a desk `plot-dispatch.sh` cut under that checkout's own `.worktrees`. It breaks only when `--stop`/`--status` is invoked from a **linked worktree that is not itself one of this estate's desks** — a scratch worktree a reviewer or test created some other way, whose own git-common-dir points at a *different* repository's `.git` than the one the operator's fleet uses.

**The signal is already available and costs no new I/O.** `git rev-parse --show-toplevel` (physically resolved, `pwd -P`, the same way `plot_repo_root` already resolves) answers the *invoking* worktree's own root. `plot_repo_root` answers the *main checkout's* root (parent of `--git-common-dir`). When a script is run from inside the main checkout, or from a desk under that checkout's own desk root, these names describe the one estate consistently. When they diverge in a way that is not simply "I am inside my own desk" — i.e. `--show-toplevel`'s answer is not the main-checkout path and is not a path under `plot_desk_root`'s answer for that main checkout — the invocation is reaching into an estate it does not belong to, and that is exactly the #1439 failure.

**Resolve that worktree's own estate, or refuse and name it — the issue accepts either, and this slice should pick the one with less shell.** The plan's own slice heading phrases both outcomes; the open question in the plan (`## Open Questions`, "Slice 12 (#1439)") leaves the choice to the implementer. Refusing and naming both paths (the estate `--stop`/`--status` is *about to* reach, and the one the invoking worktree actually belongs to) is the smaller change: it adds a comparison and an error message, not a second desk-root resolution path for a foreign repository `plot_desk_root` was never asked to describe. Resolving the invoking worktree's own estate requires asking `plot_desk_root` with *that* worktree's own repo root and its own `Worktree root` config — which is more correct in the case where a linked worktree is deliberately a separate, intentional checkout with its own Plot config, but is unverified territory this plan does not measure. Given `scripts/check-shell-lines.sh` ratchets added shell against removed, prefer the refusal unless the resolve path turns out comparably small once attempted.

**Do not change `plot_repo_root` or `plot_desk_root` themselves.** Both are shared by `plot-dispatch.sh` and every other caller in the table at `skills/plot/scripts/README.md`'s `plot-desk-root.sh` row — "No caller keeps a fallback default" is the settled rule there, and `plot_repo_root`'s job (name the main checkout from anywhere) is correct and used correctly by every other caller. The fix belongs in `resolve_wt_root`, the one function unique to the two verbs that enumerate desks.

**A rule carried over unchanged: absence is not failure, read the exit code.** `plot_desk_root` returns 3 and prints its own reason on `stderr` when it cannot answer — `resolve_wt_root` already exits 3 on that path (`plot-fleetctl.sh:715-717`). Whatever this slice adds, keep that shape: a refusal is a named, bounded exit, not a silent empty answer that `for wt in "$wt_root"/"$wt_prefix"*` would iterate over as "no desks."

### Done when

The plan names no `## Done when` bullet for this slice individually — other slices own those bullets. This slice's own completion is the issue's expectation:

- `--stop` and `--status`, run from a linked worktree whose own `--git-common-dir` does not resolve to the estate they are about to act on, either act on that worktree's own estate or refuse, naming the estate they would otherwise have reached.
- `--stop` and `--status`, run from the main checkout or from a desk under its own desk root, behave exactly as before — this is the common case and it must not regress.
- A test points the desk root at a sandbox distinct from the real one (per the issue's own suggestion: an explicit override a test can set) and proves a `--stop`/`--status` invocation from a foreign linked worktree does not enumerate or signal the sandbox's desks.

Plus: the repo's gates — build artifacts, changeset, platform constraints. This slice edits `skills/plot/scripts/plot-fleetctl.sh` (shell) and `test/reconcile/fleetctl.test.mjs`. Add a changeset per [Versioning](../../CLAUDE.md#versioning): description first, `bumps:` block last, optionally naming this plan via a `plan:` line. For tests, run `node skills/plot/scripts/board/plot-local-checks.mjs` from the repo root before each push and run what it prints; the suites in the `CI suites` config key run in CI, and a failure there comes back as a correction. Do not run the full `test:e2e` suite locally — it is CI's gate, not a local one.

`scripts/check-shell-lines.sh` refuses a PR whose shell under `skills/` is longer than at its merge base. This slice only adds shell (a comparison plus a refusal message, or a second desk-root resolution) — if the net is positive, remove shell elsewhere in the same change or write the rule in the domain and ask it through a bundle, per [A Shell Script Asks The Domain](../../docs/shell-and-domain.md). The gate stores no number and has no override.

### Bookkeeping

Open the PR through the controller once the first real commit exists:

```bash
skills/plot/scripts/plot-open-pr.sh          # current branch, or
skills/plot/scripts/plot-open-pr.sh --draft  # while work is still moving
```

Do not run `gh pr create` directly. When the PR is created, append `→ #<number>` to this branch's line in the plan's `## Slices` section (the "A stop stays in its estate" heading, `bug/a-stop-stays-in-its-estate` line). Push the first real commit as soon as it exists.

### Scope guard

This branch owns:
- `skills/plot/scripts/plot-fleetctl.sh` (`resolve_wt_root`, and nothing else in this file unless a fix above requires it)
- `test/reconcile/fleetctl.test.mjs` (a sandbox fixture for the foreign-worktree case)

Do not touch `plot_repo_root` or `plot_desk_root` in `plot-desk-root.sh` — they are shared by every other caller in this repo and are correct as they stand; this slice's fix is local to `resolve_wt_root`.

No other open PR touches `plot-fleetctl.sh` at the time this brief was written (all 9 prior-wave branches of this plan are merged). One later wave of this plan, `bug/the-unit-runs-its-harness`, also edits `plot-fleetctl.sh` but has not started — it runs after this slice merges.

If you find something the plan did not anticipate, report it rather than improvising outside scope.
