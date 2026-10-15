## Implementation brief — a-lifecycle-micro-pr-merged-past (wave 1: Retry)

- **Plan (canonical):** docs/plans/2026-10-15-a-lifecycle-micro-pr-merged-past.md on main
- **Approved:** 2026-10-15, Jan Wloka, plan-PR #1738 merged
- **Branch:** `bug/a-lifecycle-micro-pr-merged-past-retry` (base: `main`)
- **Ends as:** one PR to `main`
- **Review of the code:** per repo convention (one full review, CI green, no HIGH finding)

Wave 1 of 3. The sibling `…-pin` is independent of this branch and may run beside it; `infra/…-identities` waits on both. Issue: #1737.

### What to build

`commitAndPush` in `packages/board/src/server/entry/ladder.ts` (the shared ladder for approve, deliver, release, verify and needs-design) stops opening a micro-PR when its push is rejected. It retries instead.

The failure it fixes: on 2026-10-15 nine release records were pushed at once. One lost the race, took the fallback at `ladder.ts:155-177`, and PR #1730 merged four seconds after it opened, with no `validate` run and no `plot/review` status on its head. The fallback wrote that `plot/review` status itself (`commitStatus`, result ignored) and then ran `plot-host.sh pr-merge <n> --delete-branch` with no pin.

After this branch, a rejected push does this, up to **five attempts** in total with a **jittered 2 to 10 second wait** between them (about 30 s worst case): fetch the default branch, re-cut the disposable branch from it, re-apply the same write, commit, push. After the last attempt the ladder returns `{ rejected: true }` with the attempt count in the message, and writes nothing else. Delete the micro-PR path, the self-written `plot/review` status, the `REVIEW_CONTEXT` constant in `ladder.ts` that only it uses, and `'micro-pr'` from the `pushed` outcome words. Update the docs that name it (`skills/plot-approve/SKILL.md:268`, `skills/plot-deliver/SKILL.md:432-456`, `skills/plot/SKILL.md:369`, the header comment of `plot-push-main.sh`, which promises the caller opens a micro-PR). The plan is canonical; this is orientation.

### Decisions the plan settles — do not re-derive them

- **No micro-PR, in any form.** A PR the ladder opens and merges itself is a review gate bypass, because the merge runs under an account on the bypass list. Do not keep it behind a flag or as a last resort after the retries.
- **The ladder writes no review status.** "A review status from a process that reviewed nothing is not a review." This also closes #1719 (the ignored `commitStatus` result), because the call is gone.
- **Five attempts, 2 to 10 s jitter** is the maintainer's number (issue #1737, 2026-10-15). Make the attempt count and the wait injectable so a test runs in milliseconds; do not sleep for real in a unit test.
- **Re-apply, not rebase.** The commit that lost the race was cut from a stale base. Re-cut from the freshly fetched default branch and apply the write again; a rebase of the old commit carries the stale plan text into the new tree. Callers stage their own paths before `commitAndPush` (see the docblock), so the ladder needs the staging step handed in as a function it can call again (for example a `reapply(tmpwt)` parameter). Design that seam once; the five callers (`approve.ts:1203`, `deliver.ts:413` and `:715`, `verify.ts:750`, `needs-design.ts:467`) all pass through it.
- **Bookkeeping lands one after another.** A caller whose write is already on the default branch after the fetch (`hasStagedChanges` false after re-apply) reports `nothing-to-commit`, not a failure. This is what makes a re-run idempotent.
- **Layering stays as it is.** Git goes through the `trees` port, scripts through `scripts`. The retry adds no new `spawn`/`execFile` site (CI ratchet: *One place reaches a process*, `allowed=28`).
- **Direct push to main still works for the maintainer's token today.** This branch does not change who may push; the *Identities* wave does. Do not touch credentials here.

### Done when

The plan's `## Slices` line for this branch is the specification. Beyond it, these assertions exist because a naive implementation passes without them:

- A test where the first N pushes are rejected and push N+1 lands, asserting the write was **re-applied** on a branch cut from the re-fetched base (a loop that only re-pushes the same stale commit would pass a "push called 5 times" test and still lose the race for good).
- A test where all five pushes are rejected, asserting `{ rejected: true }`, the attempt count in the output, and that **no `prCreate`, `commitStatus` or `pr-merge` call happened**. This replaces the existing `commitAndPush — micro-PR fallback status write` suite in `packages/board/test/unit/ladder.test.ts`, which pins the behaviour this branch removes.
- A grep-level check that `ladder.ts` no longer names `prCreate`, `commitStatus` or `pr-merge`.
- The caller that exhausts its attempts keeps the existing rejected-branch handling (`keepBranch`, the "committed on `<bookbr>` but could not reach" warning) so the committed write survives a refusal.

Plus: a changeset (`@plot-pm/board` patch for the ladder; `plot` patch with `bumps:` for the touched skills, description first and `bumps:` block last), the board artifact is not committed (`scripts/check-no-bundle-diff.sh`), and `scripts/check-shell-lines.sh` refuses growth in shipped shell, so editing `plot-push-main.sh`'s comment must not add lines. Run `node skills/plot/scripts/board/plot-local-checks.mjs` before each push and run what it prints; the suites in the `CI suites` key run in CI, and a failure there comes back as a correction. Do not run `test:e2e` locally.

### Bookkeeping

Open the PR with `../plot/scripts/plot-open-pr.sh` (never `gh pr create`), then append `→ #<number>` to this branch's line under `### Retry` in the plan. Push the first real commit as soon as it exists.

### Scope guard

This branch owns `packages/board/src/server/entry/ladder.ts`, its callers' call sites, `packages/board/test/unit/ladder.test.ts`, and the docs listed above.

Not here: `plot-host.sh pr-merge` and its callers (`…-pin`), and any App credential, Plot Config key or setup doc (`…-identities`). If the retry needs a change in `plot-push-main.sh` beyond its comment, report it rather than growing the script.

If you find something the plan did not anticipate, report it rather than improvising outside scope.
