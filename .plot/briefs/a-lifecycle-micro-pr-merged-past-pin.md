## Implementation brief — a-lifecycle-micro-pr-merged-past (wave 2: Pin)

- **Plan (canonical):** docs/plans/2026-10-15-a-lifecycle-micro-pr-merged-past.md on main
- **Approved:** 2026-10-15, Jan Wloka, plan-PR #1738 merged
- **Branch:** `bug/a-lifecycle-micro-pr-merged-past-pin` (base: `main`)
- **Ends as:** one PR to `main`
- **Review of the code:** per repo convention (one full review, CI green, no HIGH finding)

Wave 2 of 3. Wave 1 (`…-retry`) merged as #1795. `infra/…-identities` waits on this branch. Issue: #1737.

### What to build

`plot-host.sh pr-merge` (`skills/plot/scripts/plot-host.sh`, the `pr-merge)` case near line 3872) exits 1 on GitHub when it gets no `--match-head <sha>`, and every caller passes the head SHA its checks were read on.

The failure it fixes: #1730 merged four seconds after it opened because the ladder ran `plot-host.sh pr-merge <n> --delete-branch` with no pin. The pin makes GitHub refuse a merge whose head moved after the checks were read. The ladder call is gone since #1795, but the host script still accepts an unpinned merge, so the next caller to omit the pin repeats the failure.

Today's callers, read on main at `e30aa7db5`:

- `packages/board/src/server/entry/merge.ts:55` always pins (`write.sha` is required). No change.
- `packages/board/src/server/entry/approve.ts:1061-1062` pins only when `pr.headSha` is set: `const pin = pr.headSha ? ['--match-head', pr.headSha] : []`. This is the caller that merges unpinned. A host that named no head must now refuse with a `Refused` that names the PR and says nothing was merged, not merge as before. Update the comment above it, which promises the old behaviour.
- `skills/plot-sprint/SKILL.md:421` and `skills/ralph-plot-sprint/SKILL.md:204` already show `gh pr merge … --match-head-commit`. Check them and `skills/plot-sprint/SKILL_new.md:395`; change only a line that omits the pin.

Re-run `grep -rnE "pr-merge|pr merge" skills packages/*/src scripts` before you start. A caller added since this brief is yours to pin.

### Decisions the plan settles — do not re-derive them

- **Exit 1 on GitHub, exit 4 on Bitbucket.** The unpinned refusal on GitHub is exit 1 with a message that names `--match-head`. Bitbucket keeps its existing refusal when a pin is asked for (exit 4, line 3889), because its host cannot pin a merge. Do not make Bitbucket require a pin: that would refuse every Bitbucket merge, since none can carry one.
- **The pin is mandatory in the script, not only in the callers.** `plot-controller-gate` already refuses an unpinned `gh pr merge` and `plot-host.sh pr-merge` at an agent's Bash call (`rules/controller-gate.ts`, exempting Bitbucket). That gate sees a shell command; it does not see `ctx.scripts.host([...])` inside a controller. Only the script refuses there.
- **Do not weaken the gate rule or the pin to make a test pass.** If a test calls `pr-merge` with no pin, the test is wrong, not the script.
- **No credential work here.** Which account merges is the *Identities* wave. Do not add `--admin`, a token, or a Plot Config key.

### Done when

The plan's `## Slices` line for this branch is the specification. Beyond it, these assertions exist because a naive implementation passes without them:

- `test/reconcile/host.test.mjs`: GitHub `pr-merge <n>` with no `--match-head` exits 1, and the stub `gh` records **no call**. A check that only reads the exit code passes an implementation that merges first and fails later.
- The same test with `--match-head <sha>` still reaches `gh pr merge … --match-head-commit <sha>`. The 38 existing `pr-merge` references in that file show which cases exist; the ones with no pin on GitHub must gain one.
- Bitbucket: `pr-merge <n>` with no pin still merges, and with a pin still exits 4.
- `packages/board/test/unit/approve.test.ts`: a plan-PR whose reading carries no `headSha` refuses and calls no `pr-merge`. A test with a head SHA alone passes the old code.

Plus: a changeset (`@plot-pm/board` patch for `approve.ts`; `plot` patch with a `bumps:` block for any skill you touch, description first and `bumps:` last). Do not commit the board artifact (`scripts/check-no-bundle-diff.sh`). `scripts/check-shell-lines.sh` refuses growth in shipped shell against the merge base, so the new refusal in `plot-host.sh` pays for itself: remove at least as many shell lines as you add, or state the rule in the domain and ask it through a bundle. The gate stores no number and has no override. Run `node skills/plot/scripts/board/plot-local-checks.mjs` before each push and run what it prints; the suites in the `CI suites` key run in CI, and a failure there comes back as a correction. Do not run `test:e2e` locally.

### Bookkeeping

Open the PR with `../plot/scripts/plot-open-pr.sh` (never `gh pr create`), then append `→ #<number>` to this branch's line under `### Pin` in the plan. Push the first real commit as soon as it exists.

### Scope guard

This branch owns the `pr-merge` case in `plot-host.sh`, the pin in `approve.ts`, `test/reconcile/host.test.mjs`, `packages/board/test/unit/approve.test.ts`, and any doc line that shows an unpinned merge.

Not here: the ladder (`…-retry`, merged), App credentials, Plot Config keys and setup docs (`…-identities`). `…-identities` starts after this branch merges and touches no file listed above except to read the pin.

If you find something the plan did not anticipate, report it rather than improvising outside scope.
