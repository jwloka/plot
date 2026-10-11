## Implementation brief — the-tests-and-gates-close-their-review-findings (wave Board test signals)

- **Plan (canonical):** `docs/plans/2026-10-10-the-tests-and-gates-close-their-review-findings.md` on main
- **Approved:** 2026-10-10, Jan Wloka, plan-PR #1495 merged
- **Branch:** `bug/the-board-tests-signal-only-their-own-process` (base: `main`)
- **Ends as:** one PR to main
- **Review of the code:** repo convention (CI green + review)

Second wave of eight. It depends on wave "Group signal after exit"
(`bug/a-gone-leader-still-ends-its-group`, PR #1511), merged 2026-10-10 —
the `signalOwn`/`record`/`readPid` helpers this slice imports already carry
that wave's fix for a gone leader's group. No wave depends on this one.

### What to build

Closes issue #1473's L1–L2 against `packages/board/test/unit/continue-route.test.ts`,
and issue #1489's L4 against five more board/e2e test files. Every site is a
test fixture that signals a process it believes it started, by a pid read
from a file or held in a variable — none is shipped code, so no changeset.

**#1473 L1 — `settle` leaks a desk on ENOENT.** `continue-route.test.ts:197`:

```ts
const pid = Number(fs.readFileSync(path.join(dir, '.plot-worker.pid'), 'utf8').trim());
```

has no guard. When the worker never wrote the pid file (a test that exercises
a path where no worker starts), `readFileSync` throws `ENOENT`, `settle`
never returns, and the root `afterEach` (`:220-226`) — which calls
`await settle(dir)` and only then `rmTree(dir)`, with no `try/finally` between
them — never reaches `rmTree`. The fixture directory leaks into the next
test. Guard the read and fail by name: a test whose `settle` cannot find the
pid file should assert that fact (`dir` in the message), not throw an opaque
ENOENT three frames down in a hook.

**#1473 L2 — a non-numeric pid is silently skipped.** `:198`,
`Number.isInteger(pid)` — the plan's finding, `NaN`, already fails this check
and `settle` returns having waited for nothing. The fix is the same guard as
L1: name the failure (`${pid-as-read} is not a pid` or similar) instead of
returning as if there were nothing to settle.

**`afterEach` needs a `finally`.** Per the memory
[[returned-promise-in-try-finally-deletes-the-fixture]] and
[[a-destructured-test-helper-swallows-its-input]], wrap the body so `rmTree`
runs whether or not `settle` throws:

```ts
afterEach(async () => {
  while (dirs.length) {
    const dir = dirs.pop()!;
    try {
      await settle(dir);
    } finally {
      rmTree(dir);
    }
  }
});
```

**#1489 L4 — six more sites kill by a pid read from a file or a hand-held
variable, with no identity check.** Each currently does
`process.kill(<pid>, 'SIGKILL'|'SIGTERM')` straight from a value it read or
captured, trusting that the pid still names the process it started. Move
each to `test/reconcile/own-process.mjs`'s `signalOwn`/`record`/`readPid`,
the helper wave "Group signal after exit" just hardened:

- `packages/board/test/unit/board-run.test.ts:239` — `process.kill(Number(fs.readFileSync(pidFile, 'utf8').trim()), 'SIGKILL')`.
- `packages/board/test/unit/interrogate-route.test.ts:307` — same pattern, different pid file.
- `packages/board/test/unit/continue-route.test.ts:209` (`killAndAwait`, used by several tests in the file) and `:1367` (inline `process.kill(Number(pid), 'SIGKILL')` inside a `stopLoop` callback, where `pid` is a worker pid the test itself stamped via `livePid`).
- `packages/board/test/lifetime.test.mjs:111` (`reap(pid)` helper).
- `test/e2e/monitors-end.test.mjs:289-321` (`run.subject`, signalled with SIGTERM then SIGKILL across two tests) and `:384` (`agentPid`, read from `run.pidFile`).
- `test/e2e/worker-loop-manifest.test.mjs:228` — the `finally` block's `process.kill(promptPid, 'SIGKILL')`, where `promptPid` is read from a stub-written file. (`loop.kill('SIGKILL')` at line 215 in the same test signals a live `ChildProcess` handle, not a pid read back from disk — that call is not in scope; only the `finally` block's file-sourced kill is.)

**Why this is the fix, not a style preference.** Every one of these sites
runs inside the contract/e2e suites, which `test/reconcile/dispatch.test.mjs`
and `workerloop.test.mjs` already measured as racy under concurrent runs: a
pid read back from a file can have been reused by an unrelated process once
the original exits, and `kill` succeeds against the wrong target with no
error. `signalOwn` closes that gap by checking `ps`'s reported start time and
command line against a stamp (`record`, at launch, or `readPid`'s mtime) before
it signals — exactly the check these six sites lack. This is the same
defect class `own-process.mjs`'s own header names (`stamps`, `SKEW_MS`), just
not yet applied outside `test/reconcile/`.

**This is the first cross-package import of `own-process.mjs`.** Every
current importer (`dispatch.test.mjs`, `workerloop.test.mjs`, `restart.test.mjs`,
`workerstate.test.mjs`) lives under `test/reconcile/`. `packages/board/test/`
and `test/e2e/` have never imported it — `git grep` for `own-process` under
`packages/` returns nothing before this slice. The relative path from
`packages/board/test/unit/*.test.ts` is `../../../../test/reconcile/own-process.mjs`;
confirm the depth per file rather than copying one import line across all six
sites, since `test/e2e/*.test.mjs` sits at a different depth than
`packages/board/test/unit/*.test.ts`. This is a new reach across a package
boundary for test-only code, not a duplicate — `own-process.mjs` is already
the one shared answer to "is this still my process," per
[[reduce-shell-grow-the-domain]]'s spirit even though this is JS-to-JS, not
shell-to-domain.

**Match signal semantics, don't just swap the call.** A straight
`signalOwn(pid, 'SIGKILL', { recordedAt })` needs a `recordedAt` stamp to
check against — call `record(pid)` at the point the test currently captures
the pid (or use `readPid(file)` where the pid comes from a file, since its
mtime already serves as the stamp). A site with no stamp available is a site
where `signalOwn` cannot tell a reused pid from the original one — if that
happens, say so rather than passing an empty `expect` that defeats the check.

**Do not run `test:e2e` locally.** Per `CLAUDE.md`'s Testing section and the
plan's own note: CI runs it on the PR. Read the two e2e files above and edit
them with the same care as the board unit tests, but do not execute the
suite on this machine — it dispatches real workers into sandbox repos and
starves concurrent work ([[rapid-pushes-starve-ci]] names the same cost
class for a different mechanism).

### Done when

The plan's `## Done when` is: issue #1473's L1–L2 closed, issue #1489's L4
closed, `settle`'s ENOENT and non-numeric-pid cases each fail by name instead
of hanging or silently passing, and the root `afterEach` cannot leak a
fixture directory when `settle` throws.

Lift these assertions specifically, because a naive pass would skip them:

- A test for `settle` against a directory with no pid file must assert the
  *failure message names the directory* — not just that the test suite
  doesn't hang. A silent early return defeats the point of the guard.
- A test for the `afterEach`/`finally` fix must prove `rmTree` runs even when
  `settle` throws — e.g. stub `settle` to throw and assert the directory is
  gone afterward. Without that assertion, the `finally` keyword compiles but
  nothing proves it does anything.
- For each of the six L4 sites, when there's a reasonable way to fixture it,
  prefer a test that proves the OLD code would have signalled a pid that no
  longer belongs to the process (reuse it is prevented) — per
  [[mutation-test-fixtures-must-make-arms-disagree]] and
  [[an-a-b-over-code-proves-nothing-when-a-fixture-varies]], a test that
  passes identically whether or not `signalOwn` replaced `process.kill` is
  not evidence of anything. Where no such fixture is practical (e.g. the e2e
  files, which CI alone runs), say so in the PR description rather than
  skipping silently.

Plus: no changeset (test-only, no shipped code changes). Run
`node skills/plot/scripts/board/plot-local-checks.mjs` before each push and
run what it prints — it resolves the tests touching your changed files, the
related-package tests, and the `scripts/check-*.sh` gates. The suites in the
plan's `CI suites` config key (including `pnpm run test:e2e`) run in CI on
the PR; a failure there comes back as a correction, not a local run you owe.

`scripts/check-shell-lines.sh` does not apply — this slice touches no `.sh`
file under `skills/`.

### Bookkeeping

Open the PR through the controller once the branch is claimed and pushed:
`../plot/scripts/plot-open-pr.sh` (or `--draft` while still moving). Do not
run `gh pr create`. When the PR exists, append `→ #<number>` to this
branch's line in the plan's `## Slices` section under "Board test signals".
Push the first real commit as soon as it exists — a claimed branch with no
commits for a long stretch reads as idle.

### Scope guard

This branch owns: `packages/board/test/unit/continue-route.test.ts`,
`packages/board/test/unit/board-run.test.ts`,
`packages/board/test/unit/interrogate-route.test.ts`,
`packages/board/test/lifetime.test.mjs`, `test/e2e/monitors-end.test.mjs`,
`test/e2e/worker-loop-manifest.test.mjs`. It reads but does not modify
`test/reconcile/own-process.mjs`.

No other branch in this plan's slice list touches any of these files — each
slice's file group is disjoint by design (plan's Design section). The slice
before this one (`bug/a-gone-leader-still-ends-its-group`, merged) changed
only `test/reconcile/own-process.mjs`, `workerloop.test.mjs`,
`restart.test.mjs` and `workerstate.test.mjs`, none of which this branch
edits — it only imports from the first.

If you find a seventh site that signals a process by a raw pid with no
identity check, report it rather than fixing it here — the plan names six
and this slice closes exactly those.
