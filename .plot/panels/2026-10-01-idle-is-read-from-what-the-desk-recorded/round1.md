# Round 1 — moderation

Subject: `docs/plans/2026-10-01-idle-is-read-from-what-the-desk-recorded.md` at `3d88d90c`. Lenses: `round1-skeptic.md`, `round1-operator.md`, `round1-layering.md`. Gate: `committed skeptic amend`, `committed operator amend`, `committed layering amend`. Reconcile: `unanimous amend skeptic,operator,layering`.

## How the panel ran

One agent applied the three lenses in sequence; it ran as a fork and could not start separate juror agents. It is also the agent that wrote the plan, so this round is partly a self-review. The skeptic's measurements are executed evidence; the operator and layering positions are readings. A later round should use separate jurors.

## Evidence

- **Skeptic: executed.** Directory mtimes on macOS move on a rename and on a removal, and a renamed file keeps its own mtime, so the plan's tree reading is sound. It also checked 14 citations and found three false premises (below).
- **Operator: read.** `attention.ts:94-95`, `findings.ts:39-43`, the `gone` arm at `plot-worker-monitor.sh:583-589`.
- **Layering: read.** `rules/sample.ts`, `entry/monitor.ts`, `docs/shell-and-domain.md` §1.

## Agreed (each from one or two lenses, contested by none)

1. **The bundle premise is false.** `plot-monitor.mjs` is committed but no build emits it (`schema.ts:2116-2119`) and no script calls it; the shell holds its own copy of the rule (`plot-worker-monitor.sh:502-619`). The plan must either give `entry/monitor.ts` an `outfile` and state the per-pass `node` cost, or keep one shell function as a declared duplicate paired with `idleNow` by a corpus test. (skeptic, layering)
2. **The count is `1 + 3N`, not `1 + 2N`.** The wrapper starts three monitors (`plot-dispatch.sh:1451-1458`), and `DESIGN-process.md:115` states `1 + 4N`. (skeptic)
3. **`PLOT_MONITOR_ENDS_WORKER=0` must keep the watch.** The watcher runs whatever the flag says; only the signal to the loop is gated. (skeptic, operator)
4. **`gone` changes meaning.** Today it fires on any death of the watched pid; the plan fires it only after a non-zero `wait`. State both and test exit 0, 124 and SIGKILL. (operator)
5. **`idleNow`'s `gone` arm loses its caller after slice 2.** Drop it or name the caller. (layering)

## Disagreements

None on position or on any finding.

## Shared blind spot

All three lenses accepted the fourth option's core claim that the tree's age replaces the two-sample comparison. None tested it against the loop's own writes: the loop writes `.plot-worker.*` files into the desk, and `plot_worker_dirty_filter` excludes them from the dirty list, but their writes still move the desk root directory's mtime. If the root directory is ever a dirty path's parent, the loop's own bookkeeping would read as tree activity and `idle` would never fire. The amendment should state whether the root directory's mtime is read and test a desk where only `.plot-worker.*` files change.

## What an amendment changes

- The bundle or declared-duplicate choice, with its cost or its corpus test.
- `1 + 3N` throughout.
- The watcher runs under `PLOT_MONITOR_ENDS_WORKER=0`, with a test.
- `gone` before and after, tested for three exit kinds.
- The `gone` arm of `idleNow` dropped or given a caller.
- The root-directory mtime question answered, with a test.
