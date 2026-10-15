## Implementation brief — follow-ups-from-the-review-of (wave 1: Wave 1)

- **Plan (canonical):** `docs/plans/2026-10-15-follow-ups-from-the-review-of.md` on `main`
- **Approved:** 2026-10-15, Jan Wloka, plan-PR #1749 merged
- **Branch:** `feature/review-diff-limit-in-bytes` (base: `main`)
- **Ends as:** one PR to `main`
- **Review of the code:** PR review per repo convention; CI must pass

Wave 1 holds a sibling, `feature/review-judges-the-pr-base`, which is **not yours**. It edits `packages/board/src/server/entry/review.ts` and the `Pr` entity. Wave 2 (`feature/review-refuses-a-tracked-dir`) waits on that sibling, not on this branch.

### What to build

`plot-review` limits the inline diff in UTF-16 code units, and the limit must be in bytes. `reviewRequestBlock` (`packages/domain/src/rules/review-verdict.ts`) inlines the diff when `request.diff.length <= REVIEW_INLINE_DIFF_LIMIT` (200,000). The prompt reaches `bash -c` as one argument (`agent-run-command.ts`, `['-u', 'PLOT_REPO_ROOT', 'bash', '-c', …, request.prompt]`), and Linux caps one argument at 131,072 bytes (`MAX_ARG_STRLEN`). A diff of about 128K to 200K characters therefore fails at exec, no status is written, and the PR cannot merge. Non-ASCII text widens the gap, because one code unit can be up to three bytes.

The change: compare `Buffer.byteLength(diff, 'utf8')` against a limit in bytes, and set that limit to 128 KiB minus a reserve for everything else in the prompt. A diff above the limit stays out of the prompt, as today, and the reviewer reads `diffPath`. Update the "not inline" sentence to state bytes. The plan is canonical; this brief is orientation.

### Decisions the plan settles — do not re-derive them

**Bytes, not characters.** `String.length` counts UTF-16 code units. The kernel counts bytes. Only `Buffer.byteLength(…, 'utf8')` answers the question the kernel asks.

**The limit lives in the domain.** `REVIEW_INLINE_DIFF_LIMIT` and `reviewRequestBlock` stay in `packages/domain/src/rules/review-verdict.ts`. Do not move the comparison into `review.ts`; `review.ts` only assembles `${charter.charter.prompt}\n\n${request}`. Functions you write are arrows.

**Open question the plan leaves to you: the reserve.** Measured 2026-10-15: `.plot/worker-prompt.sh` is 13,563 bytes and `.plot/worker-prompt.md` is 3,006 bytes; `.plot/charters/reviewer.json` names `.plot/worker-prompt.sh` as the prompt. Confirm which file the reviewer charter actually prompts with before you size the reserve. The fixed request block is about 1.5 KB. The **changed-file list is unbounded** and also rides in the argument, so a constant reserve is wrong for a PR touching thousands of paths. Measure the fixed block (render `reviewRequestBlock` with an empty diff and count its bytes) and either (a) pick a reserve that covers the charter plus the fixed block with room, and state the number and its derivation in the TSDoc, or (b) apply the limit to the byte length of the whole assembled prompt. Pick one, and say why in the commit message, where `git log -S` finds it.

**Rules carried over:** a TSDoc block states what the export does, its parameters, its return and how it fails; it does not narrate history. The measurement goes in the commit message and the plan.

### Done when

The plan's slice line is the specification: the inline diff is limited in bytes below the argument cap, with a reserve for the prompt. The assertions that exist because a naive implementation would pass without them:

- **A diff of multi-byte text.** A diff of 100,000 `é` characters is 100,000 code units and 200,000 bytes. It must be left out of the prompt. A test that uses only ASCII passes against the old code.
- **The boundary, in bytes.** One test at exactly the limit (inline) and one a byte above (not inline). The existing pair at `packages/domain/test/review-verdict.test.ts:88` and `:95` counts characters; rewrite it in bytes.
- **The whole prompt fits.** Assert that charter prompt + request block with a diff at the limit stays under 131,072 bytes. This catches a reserve set too small, which is the exact defect the issue reports.
- **The not-inline sentence names bytes**, and the number it prints equals `Buffer.byteLength(diff)`.
- `packages/board/test/unit/review.test.ts:313` builds an oversize diff from `REVIEW_INLINE_DIFF_LIMIT`; keep it passing against the renamed or re-based constant.

Plus: add a changeset (description first, `bumps:` block last; package `plot` or `@plot-pm/board`). Run `node skills/plot/scripts/board/plot-local-checks.mjs` before each push and run what it prints. The suites in the `CI suites` config key run in CI, and a failure there comes back as a correction. List no full suite. Do not run `pnpm run test:e2e` locally.

This slice touches no `.sh` file, so `scripts/check-shell-lines.sh` has nothing to count. If that changes, growth is paid for in the same change.

### Bookkeeping

Open the PR through the controller: `skills/plot/scripts/plot-open-pr.sh` (add `--draft` while the work moves). Never `gh pr create`. When the PR exists, append `→ #<number>` to this branch's line in the plan's `## Slices` section. Push the first real commit as soon as it exists.

### Scope guard

This branch owns `packages/domain/src/rules/review-verdict.ts`, `packages/domain/test/review-verdict.test.ts`, the constant's use in `packages/board/test/unit/review.test.ts`, and the changeset.

Do not touch `packages/board/src/server/entry/review.ts` beyond a one-line call-site change, if one proves unavoidable. `feature/review-judges-the-pr-base` edits that file (`readChange`, `deps.base`) and the `Pr` entity and host connectors. `feature/review-refuses-a-tracked-dir` edits the `mkdirSync` site in the same file after that.

If you find something the plan did not anticipate, report it rather than improvising outside scope.
