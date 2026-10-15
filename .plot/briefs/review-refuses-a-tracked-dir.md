## Implementation brief — follow-ups-from-the-review-of (wave 2: review-refuses-a-tracked-dir)

- **Plan (canonical):** docs/plans/active/follow-ups-from-the-review-of.md on `main`
- **Approved:** 2026-10-15, Jan Wloka, plan-PR #1749 merged
- **Branch:** `feature/review-refuses-a-tracked-dir` (base: `main`)
- **Ends as:** one PR to `main`
- **Review of the code:** per repo convention (`plot-review` on the opened PR)

This is Wave 2, and it waits on `feature/review-judges-the-pr-base` (Wave 1).
That branch's PR #1804 is merged, so this wave is eligible now.

### What to build

The reviewer run on PR #1722 at `5a0043588` crashed on a tracked `.plot-review`
regular file instead of refusing by name. `machineDeps`'s `writeText` closure
in `packages/board/src/server/entry/review.ts` (today at lines 430–434) does:

```ts
writeText: (file, text) => {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(`${file}.tmp`, text);
  renameSync(`${file}.tmp`, file);
},
```

`writeText` is called for `verdictFile`, `issueFile` and `diffFile`, all under
`path.join(deps.commonDir, 'plot', 'state', 'reviews')` (`reviewPr`, around
line 240). If any path segment on that route is a tracked regular file instead
of a directory, `mkdirSync(..., { recursive: true })` throws — Node's own
behavior, not a bug in this file — and the exception propagates out of
`reviewPr` uncaught. The run ends with a stack trace: no commit status, no
named reason, nothing a caller can act on.

Fix it where `writeText` is called, not inside the closure: wrap the call (or
the step that calls it) so the thrown error becomes a `refuse(...)` outcome —
the same `{ code: EXIT.refused, lines: [...] }` shape every other failure in
`reviewPr` already returns. `EXIT.refused` is already `3` (`review.ts:77`);
the plan's "exit 3" is this existing code, not a new one — there is no new
exit code to add.

### The decisions the plan settles — do not re-derive them

**This is a refusal, not a recoverable retry.** A tracked file at a path
`mkdirSync` needs as a directory will not resolve itself between runs; the fix
names the blocking path and stops, the same as every other `refuse(...)` call
in this function (missing base, unreadable charter, unavailable commit).
Do not add a workaround that deletes or moves the tracked file — that is a
decision for whoever committed it, not for the reviewer.

**Catch at the call site, not inside `ReviewDeps.writeText`.** `writeText` is
part of the `ReviewDeps` port (`machineDeps`'s return value) and other
`ReviewDeps` implementations — notably the test rig in
`packages/board/test/unit/review.test.ts` — supply their own `writeText` that
never throws this way. Pushing a try/catch into the production `writeText`
closure would only guard the real filesystem path and leave `reviewPr` itself
still assuming every `writeText` call is safe; wrapping the *call* in
`reviewPr` keeps the guard where the risk actually is and keeps the port
uniform across adapters.

**The existing `.plot-review` symlink tests are not this bug, and do not
extend them.** `review.test.ts` already has two cases named "a `.plot-review`
symlink" and "a `.plot-review/change.diff.tmp` symlink" (`it.each`, around
line 348) — they plant a symlink inside the reviewed **worktree** (`TREE`) and
assert the run is unaffected (`EXIT.ok`, nothing written inside `TREE`). That
is a different concern: files the PR's own tree carries, left untouched. The
bug here is a **tracked regular file in this repository's own working tree**,
on the path `writeText` constructs under `commonDir/plot/state/reviews` — not
inside the reviewed PR's worktree at all. Write a new test; do not fold this
into the symlink `it.each`.

**`readChange`'s missing tests are this slice's second half, and they are
independent of the refusal fix.** `readChange` (`review.ts`, next to
`REVIEW_DIFF_MAX_BYTES`) is a free function taking `(tree, base, sha)` — it
needs no `ReviewDeps` mocking, only a real git repository. Build a sandbox
with a divergent base branch and assert: the fetch refspec pulls the named
base into `refs/remotes/origin/<base>`, the merge-base step runs before the
diff, `--no-ext-diff` is passed, a diff over `REVIEW_DIFF_MAX_BYTES` fails the
step rather than truncating silently, and `--name-only`'s output splits on
newlines with the trailing empty entry filtered (`.filter((line) => line !== '')`
already in the source — the test should prove that filter, not re-decide it).

### Done when

The plan's `## Done when` is implicit in its Design section; this slice's
scope is items 3 and 4 of the Motivation:

- A tracked regular file blocking `writeText`'s `mkdirSync` produces a
  `refuse(...)` outcome (`EXIT.refused`, a line naming the blocking path) —
  never an uncaught exception. Assert no commit status is written and no
  follow-up issue is opened, matching every other refusal in `reviewPr`.
- `readChange` has a test covering the refspec, the merge-base step,
  `--no-ext-diff`, `REVIEW_DIFF_MAX_BYTES`, and the `--name-only` split,
  against a real sandbox repo with its own base branch (not `ReviewDeps`
  mocks — `readChange` takes no deps).

Plus the repo's gates: no generated board bundle in the diff
(`scripts/check-no-bundle-diff.sh`), a changeset if `@plot-pm/board`'s
published surface changes (it likely does not — this is an internal fix).
Before each push, run `node skills/plot/scripts/board/plot-local-checks.mjs`
from the repo root and run what it prints; the suites under the `CI suites`
config key run in CI, not here.

`scripts/check-shell-lines.sh` ratchets the shipped shell under `skills/`
against its merge base — this slice touches no `.sh` file, so it should pass
with no offsetting removal needed. If a later change to this slice does touch
shell, growth there must be paid for in the same change.

### Bookkeeping

Open the PR through the controller once the branch has a real commit:

```bash
skills/plot/scripts/plot-open-pr.sh          # or --draft while still moving
```

Push the first real commit as soon as it exists — do not wait for the whole
slice to accumulate locally. When the PR is created, append `→ #<number>` to
this branch's line in the plan's `## Slices` → `### Wave 2` section.

### Scope guard

This branch owns:
- `packages/board/src/server/entry/review.ts` — the `writeText` call site in
  `reviewPr`, or an equivalent guard around it
- `packages/board/test/unit/review.test.ts` — the new refusal test
- a new or existing test file for `readChange` (no `ReviewDeps` needed)

Wave 1 (`feature/review-judges-the-pr-base`, merged via PR #1804) already
landed `Pr.base` and `readChange(tree, base, sha)` taking that base — this
slice does not touch base-resolution logic, only the refusal path and the
missing tests. No other branch is in flight on this plan.

If you find something the plan did not anticipate, report it rather than
improvising outside scope.
