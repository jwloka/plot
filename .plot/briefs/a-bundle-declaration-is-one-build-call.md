## Implementation brief — the-tests-and-gates-close-their-review-findings (wave: Bundle declaration pairing)

- **Plan (canonical):** `docs/plans/2026-10-10-the-tests-and-gates-close-their-review-findings.md` on main
- **Approved:** 2026-10-10, Jan Wloka, plan-PR #1495 merged
- **Branch:** `bug/a-bundle-declaration-is-one-build-call` (base: `main`)
- **Ends as:** one PR to main
- **Review of the code:** PR

All six waves above this one have merged into `main` — the last,
"Decision table reading", as PR #1566. One wave remains after this one,
"Gate exit wording" (`plot-install-hooks.sh`, a disjoint file). This is
the second of two slices touching `scripts/check-decision-count.sh`;
after this merges, the file is done for this plan.

### What to build

Issue #1415, three findings against `read_declared()` in
`scripts/check-decision-count.sh` (currently `:106-129`):

1. **`entry` carries forward across separate `esbuild.build` calls.** The
   awk script in `read_declared()` sets `entry` when it matches `entry_re`
   and clears it only when it matches `out_re` immediately after — but it
   never scopes either match to a single `esbuild.build({ … })` block. Two
   consecutive calls where the first has an `entryPoints` line and the
   second has an `outfile` line (and nothing in between resets `entry`)
   pair the first call's entry with the second call's outfile. Rewrite the
   parser to track whether it is inside an `esbuild.build({` block —
   opened by a line matching that literal, closed by the matching `});`
   — and only read `entryPoints:`/`outfile:` lines while inside one block.
   Reset `entry` (and any other per-call state) both when a block opens
   and when it closes, so a block that never sets `outfile` cannot leak
   its `entry` into the next block.
2. **No check that `build.mjs` actually copies the bundle.** A
   `shippedX` const (matching `shipped_re`), a `distY` const (matching
   `dist_re`), and an entry/outfile pair inside one call are accepted as
   a full declaration with no check that the two paths are ever
   connected — `build.mjs` could declare `distY` and never copy it
   anywhere, and today's gate still reads the bundle as built. The real
   file always follows every `esbuild.build` call with
   `fs.copyFileSync(<distConst>, <shippedConst>)` on its own line (see
   `packages/board/build.mjs:160`, `:188`, `:214`, … — twenty-odd call
   sites, every one followed by exactly that shape). Extend the parser
   to also require a line matching
   `fs\.copyFileSync\(<distvar>, *<shippedvar>\)` for the specific pair
   of const names the block declared, and drop any bundle from the
   output whose declared consts are never passed to `copyFileSync`
   together.
3. **The three regexes match by line shape, not by block membership,**
   so a line that merely looks like a declaration — for example inside a
   template literal or a comment — is read as one. This is the same gap
   as finding 1 from a different angle: once the parser tracks
   `esbuild.build({ … })` block boundaries (finding 1) and only scans
   `entryPoints:`/`outfile:` lines inside an open block, a matching
   line outside any block (including inside a template literal, which
   opens no block) is already excluded. No separate mechanism is needed
   — write the test that proves it, per finding 3's own ask, but the
   fix is finding 1's block tracking, not an additional guard.

Add the tests the issue names: a non-declaration line containing
`dist/x.mjs` (asserts it contributes nothing), entry/outfile pairing
tested across two separate `esbuild.build` calls (asserts the first
call's dangling `entryPoints` does not pair with the second call's
`outfile`), and a matching line inside a template literal (asserts it is
ignored). `test/reconcile/decision-count.test.mjs`'s existing `BUILD_TEXT`
fixture (`:47-60`) already has the two-calls shape but both calls there
are complete and well-formed — it will not catch a parser that leaks
`entry` across calls, which is exactly why the issue asks for a dedicated
case.

### The decisions the plan settles — do not re-derive them

**Block-scope the parser; don't patch the two symptoms (findings 1 and
3) separately.** It would be possible to fix finding 1 by resetting
`entry` on every `out_re` match (already attempted) plus adding a
separate "am I inside a string/comment" guard for finding 3. The plan's
Design section commits to one mechanism — "opens a call on a line that
matches `esbuild.build({` and closes it on the matching `});`" — because
both symptoms are the same root cause: the parser has no notion of which
call it is inside. A single block-tracking state variable, checked
before every `entry_re`/`out_re`/`shipped_re`/`dist_re` match, removes
both failure modes at once and removes the dangling-`entry` bug that a
separate per-symptom fix would still leave for a third call shape nobody
has tried yet.

**The `copyFileSync` requirement reads the real file's shape, not an
invented one.** `packages/board/build.mjs` never declares a bundle
without immediately copying it — grep `copyFileSync` in that file
(20 matches) and every one sits one or two lines after its paired
`esbuild.build` call. So the new check is not a hypothetical safeguard;
it closes the exact gap the issue names (`:58`): "the gate does not read
that line, so a dead declaration passes." Match the dist/shipped pair by
the specific const *names* the block declared, not by position or by
"any copyFileSync line exists somewhere in the file" — a file with ten
bundles and nine copyFileSync lines should fail to find evidence for
the tenth bundle specifically, not pass because nine others have theirs.

**This slice does not touch `check-shell-lines.sh`'s accounting rule
itself** — only the shape of what `read_declared()` accepts as a
declaration in `check-decision-count.sh`. The gate's own line-count
ratchet (below) is a constraint on this PR's diff, not a target to
implement.

**Carried over from the sibling slice, unchanged: absent is not false.**
`read_declared()` already fails loudly when `build.mjs` is absent or
when nothing parses (`fail "... declares no bundle this gate can
parse..."`), rather than returning an empty success. The stricter
parsing in this slice must keep that shape: a `build.mjs` where every
declaration now fails the new `copyFileSync` check is a hard failure
naming what did not pair, not a silent "zero bundles" that reads as
"nothing changed."

### Done when

The plan's `## Done when` equivalent here is the Design section's own
paragraph for this slice (there is no separate `## Done when` list in
this plan — the Design section's per-slice paragraphs are the
specification). Lift these assertions, because a parser that merely
"looks right" on the existing fixture would pass without them:

- A test with two `esbuild.build` calls back-to-back, where only the
  **first** has `entryPoints` and only the **second** has `outfile` (the
  dangling-entry shape finding 1 names) — asserts the second call's
  bundle is reported as having **no** entry source, not the first call's.
- A test where `build.mjs` declares `shippedX`/`distX` and an
  `esbuild.build` call pairing them, but **no** `copyFileSync(distX,
  shippedX)` line anywhere — asserts that bundle does not count as
  declared evidence.
- A test with a line like `` const s = `dist/x.mjs still not a
  declaration` `` outside any `esbuild.build` block — asserts it
  contributes nothing (the non-declaration-line-containing-`dist/x.mjs`
  case named in the issue).
- A test with an `entryPoints:`/`outfile:`-shaped pair of lines inside a
  JS template literal (not inside a real `esbuild.build({` call) —
  asserts it is not read as a declaration.

Plus: a `plot` patch changeset (description first, `bumps:` block last —
see root `CLAUDE.md` § Versioning) since this changes shipped code
(`scripts/check-decision-count.sh` ships as-is, not through a bundle).
Run `node skills/plot/scripts/board/plot-local-checks.mjs` from the repo
root before each push and run what it prints — it resolves the related
tests, typecheck and gate scripts for whatever this branch actually
touches. The suites under the `CI suites` config key run in CI on every
PR; don't run them locally, and don't list them as a gate here.

`scripts/check-shell-lines.sh` refuses a PR whose shell under `skills/`
is longer, at merge base, than at HEAD. This slice's target file is
`scripts/check-decision-count.sh`, which is **not** under `skills/` and
is not counted by that gate — the new parsing logic and its awk can grow
freely. If any edit also touches a file under `skills/plot/scripts/`,
only then does growth there need to be paid for elsewhere in the same
diff; nothing in this slice's own scope should require that.

### Bookkeeping

Open the PR through the controller once the branch has its first real
commit:

```bash
skills/plot/scripts/plot-open-pr.sh          # current branch, or
skills/plot/scripts/plot-open-pr.sh --draft  # while work is still moving
```

It reads this plan, titles the PR from this wave's heading ("Bundle
declaration pairing"), and puts the plan + this brief in the body. Do
not run `gh pr create` directly. Once the PR number is known, append
`→ #<number>` to this branch's line under the plan's `## Slices` →
"Bundle declaration pairing" heading (currently line 159, no `→ #N` yet)
in the same commit or a follow-up to the plan file.

### Scope guard

This branch owns `scripts/check-decision-count.sh` and
`test/reconcile/decision-count.test.mjs`. It does not touch
`check-shell-lines.sh`, `plot-install-hooks.sh`,
`test/reconcile/install-hooks.test.mjs`, or any `plot-*-gate.sh` file —
those belong to the next wave ("Gate exit wording") or to the sibling
plan `the-gates-are-launchers`, per this plan's "Off-limits files" note.

The one other branch that touched this same file in this plan,
`bug/the-decision-gate-reads-its-table-strictly` (PR #1566), has already
merged — there is no live sibling branch to collide with on this file.
If you find a change this plan did not anticipate (for example, a fourth
parsing gap in `read_declared()` the issue doesn't name), report it
rather than expanding this slice's scope to cover it.
