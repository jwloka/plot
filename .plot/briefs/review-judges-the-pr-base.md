## Implementation brief — follow-ups-from-the-review-of (wave 1: review-judges-the-pr-base)

- **Plan (canonical):** [docs/plans/2026-10-15-follow-ups-from-the-review-of.md](../../docs/plans/2026-10-15-follow-ups-from-the-review-of.md) on `main`
- **Approved:** 2026-10-15, Jan Wloka, plan-PR #1749 merged
- **Branch:** `feature/review-judges-the-pr-base` (base: `main`)
- **Ends as:** one PR to `main`
- **Review of the code:** `plot-review` runs on the PR per repo convention

Wave 1's sibling, `feature/review-diff-limit-in-bytes`, is already Started and touches the same file (`packages/domain/src/rules/review-verdict.ts`) at a different function — no shared lines, but merge this branch after checking that sibling's PR status so the two don't fight over the same hunk at merge time. Wave 2's `feature/review-refuses-a-tracked-dir` waits on this branch.

### What to build

`plot-review` currently reads the base branch ONCE PER PROCESS, not once per PR. `review.ts:419` sets `ReviewDeps.base` at startup by reading `origin/HEAD` in the local checkout (falling back to `'main'` if that fails), and every PR this process ever reviews — regardless of what it actually targets — gets diffed against that one fixed name (`review.ts:258`, `:264`). A PR opened against a release branch, or a stacked PR whose base is another feature branch, is silently judged against the wrong diff.

The fix: give `Pr` a `base` field, fill it from the host in all four `pr-state` code paths (GitHub GraphQL, GitHub REST, Bitbucket by-number, Bitbucket by-branch), and have `reviewPr` in `review.ts` read `pr.base` — the field already on the `Pr` object it fetches at line 221 — instead of the process-wide `deps.base`.

### The decisions this plan settles — do not re-derive them

**`ReviewDeps.base` and `readChange`'s `base` parameter are not being removed, and that is not an oversight.** The plan's wording ("add the base ref to `Pr`... `review.ts` passes that name to `readChange` in place of `deps.base`") means `deps.base` stops being READ at the one call site that matters (`reviewPr`), not that the field or the `readChange` signature change. `readChange(tree, base, sha)` still takes a `base` string — just pass `pr.base` instead of `deps.base` there. Leave `ReviewDeps.base` itself alone unless you find it has no other reader; a scope check (`grep -rn 'deps\.base\|\.base\b' packages/board/src/server/entry/review.ts`) is worth doing before touching the interface, since narrowing it is not this slice's job.

**`Pr.base` has no default inside the entity.** `prOf` in `host-shell.ts:82-98` maps every other field with `?? ''` or an `oneOf(...)` fallback — follow that pattern (`base: raw.base ?? ''`) rather than defaulting at the call site in `review.ts`. An empty string base is a real, nameable failure state (`readChange` already refuses when `git fetch` of that ref fails), so `reviewPr` should refuse explicitly when `pr.base === ''` rather than silently falling back to `main` the way `review.ts:419`'s process-wide default does today — that fallback is exactly the imprecision this slice removes, and reintroducing it at the new call site defeats the fix.

**Open Question 2 in the plan ("required or optional with fallback") resolves here as: required on the wire, but the TS field stays `string` and the mapping decides.** `RawPr` (`host-shell.ts:31-48`) is already all-optional, matching every shell JSON payload — add `base?: string;` there, not a required field. The judgment call is only about what `reviewPr` does when the shell answers with no `base` key (empty string in, per `?? ''`): refuse, naming the PR number, rather than guess a branch.

**Open Question 3 (does Bitbucket's `pr-state` report the destination branch through the same call) — yes, for both Bitbucket arms, at no extra cost.** The `bb pr view --json` and `bb pr list --json` payloads this adapter already fetches carry `destination.branch.name` (Bitbucket's equivalent of GitHub's `base.ref`/`baseRefName`) — confirmed by reading the existing jq filters at `plot-host.sh:3587` (by-number) and `:3627` (by-branch list walk): both already parse sibling fields (`source.branch.name`, `merge_commit.hash`) off the same payload shape, so `destination.branch.name` is sitting in the same JSON these calls already pay for. No new `bb` call is needed — only a `base: (.destination.branch.name // "")` key added to the two existing `jq` object literals.

**The four `pr-state` fetch paths are NOT one code path — each maps its own JSON shape**, so each needs its own one-line addition, named here so none is missed:
- GitHub GraphQL (`plot-host.sh:3557`, the `gh pr view --json ...` call): add `baseRefName` to the `--json` field list, and `base:.baseRefName` to the `jq` object.
- GitHub REST (`rest_pr_to_state`, `plot-host.sh:2057-2066`): add `base: (.base.ref // "")` to the object literal — the REST single-PR and list-PR payloads both carry `.base.ref` (confirmed against GitHub's REST schema; this function already handles both shapes per its header comment).
- Bitbucket by-number (`plot-host.sh:3587`): add `base:(.destination.branch.name // "")`.
- Bitbucket by-branch / list walk (`plot-host.sh:3627`): same key, same source field, on the row already selected out of the state-walk array.

**This is shell growth, and it is paid for in the same change** — see Done when.

### Done when

The plan's `## Done when` is this plan file's `## Design › Approach` item 2 (there is no separate `## Done when` heading in this plan; treat "`Pr` gains `base`, filled by the host connectors, and `review.ts` diffs against it instead of `deps.base`" as the specification). Lift these assertions because a naive implementation passes without them:

- A test asserting `reviewPr` reads `pr.base`, not `deps.base`, for the `readChange` call and the `reviewRequestBlock` request — e.g. supply a mock `host.prState` returning a `Pr` with `base: 'release/1.0'` while `deps.base` is `'main'`, and assert `readChange` was called with `'release/1.0'`. Without this, a fix that adds the field but forgets to change the read site passes every existing test (none of them vary `base` from `deps.base` today).
- A test for `prOf`/`RawPr` mapping `base` through all four shapes is out of scope for THIS slice per the plan's wave split (readChange's own tests are Wave 2's `review-refuses-a-tracked-dir`) — but a minimal assertion that `prOf({...raw, base: 'x'}).base === 'x'` and `prOf({...raw}).base === ''` belongs here since you're the one adding the field.
- A case for `pr.base === ''` in `reviewPr`: assert it refuses by name (`EXIT.refused`) rather than falling back to a guessed branch.
- Run the four shell-side JSON transformations by hand against a real `gh pr view --json number,state,isDraft,url,mergeCommit,headRefOid,statusCheckRollup,baseRefName <pr>` and a real `bb pr view <pr> --json` on this repo to confirm the field names before trusting the plan's claim about `.base.ref` / `destination.branch.name` — this repo is GitHub-backed, so the Bitbucket shapes can only be checked against Bitbucket's own API docs or a Bitbucket fixture, not a live call here.

Plus: `pnpm --filter @plot-pm/domain exec vitest related --run` the changed domain files, `pnpm --filter @plot-pm/domain exec tsc --noEmit -p .`, and `pnpm --filter @plot-pm/board exec vitest related --run` plus `pnpm run typecheck` for the `review.ts` change. A changeset is required (`plot` package, patch — this is a bug fix). Run `node skills/plot/scripts/board/plot-local-checks.mjs` before each push and run what it prints; the suites in `CI suites` run in CI and a failure there comes back as a correction — don't run the full suite list yourself.

Name the shell gate explicitly: this slice adds roughly 5-8 lines of `jq`/`--json` arguments to `skills/plot/scripts/plot-host.sh`, all under `pr-state`. `scripts/check-shell-lines.sh` refuses a PR whose shell under `skills/` is longer than at its merge base — this growth must be paid for in the same change, either by removing an equal number of shell lines elsewhere or by writing the addition in the domain and reaching it through a bundle instead. Given the addition is four one-line `jq` field additions plus one `--json` flag extension, the cheapest path is almost certainly trimming a comment or dead branch elsewhere in `plot-host.sh` rather than restructuring — but that trade is yours to make, and the gate has no override.

### Bookkeeping

Open the PR through the controller once there is a first real commit — do not run `gh pr create`:

```bash
../plot/scripts/plot-open-pr.sh          # non-draft, once ready for review
../plot/scripts/plot-open-pr.sh --draft  # while still moving
```

Push the first real commit as soon as it exists — don't wait for the slice to be finished. When the PR is created, append `→ #<number>` to this branch's line in the plan's `## Slices` section (`docs/plans/2026-10-15-follow-ups-from-the-review-of.md`, the `feature/review-judges-the-pr-base` line under `### Wave 1`).

### Scope guard

This branch owns:
- `packages/domain/src/entities/pr.ts` — add the `base` field to the `Pr` interface
- `packages/domain/src/adapters/host/host-shell.ts` — `RawPr`, `prOf`
- `packages/board/src/server/entry/review.ts` — `reviewPr`'s read of `pr.base` vs `deps.base`
- `skills/plot/scripts/plot-host.sh` — the `pr-state` op, all four backend arms

Known concurrent work: `feature/review-diff-limit-in-bytes` (Wave 1, already Started) touches `packages/domain/src/rules/review-verdict.ts` — a different file from everything this branch owns, so no file-level collision is expected, but re-check `git diff` against `origin/main` before opening the PR in case that branch's own scope grew. No other branch is currently claimed against this plan (verified via `git ls-remote --heads origin` at brief-writing time: neither branch has a remote ref yet).

If you find something the plan did not anticipate — e.g. the Bitbucket field names not matching `destination.branch.name` once checked against a live fixture — report it rather than improvising outside scope.
