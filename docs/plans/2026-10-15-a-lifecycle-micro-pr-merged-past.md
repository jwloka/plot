# A lifecycle micro-PR merged past the review gate

> The ladder's micro-PR fallback merged #1730 four seconds after it opened, with no `validate` run and no `plot/review` status on its head.

## Status

- **State:** Draft
- **Type:** bug
- **Issue:** #1737
- **Review:** pr
- **Impl:** own branches

## Changelog

- A lifecycle write that falls back to a micro-PR merges only after the required checks pass on the PR's head, and the merge pins that head.

<!-- Board impact: none expected. The plan format and the board's plan parsing do not change. -->

## Motivation

Main's ruleset 24412719 requires `validate` (integration 15368) and `plot/review` (integration 5317669) since 2026-10-15T02:17:59Z. The gate must hold against Plot's own tooling, not only against people.

`POST /api/release {"slug":"a-pr-cannot-merge-until-its","version":"2.27.0"}` lost a push race with nine other release records and took the micro-PR fallback in `packages/board/src/server/entry/ladder.ts:155-177`. #1730 opened at 03:36:31Z and merged at 03:36:35Z under the maintainer's account. Its head had no `validate` run and no `plot/review` status (`gh api repos/plot-pm/plot/commits/<head>/statuses` lists none).

The ladder writes the `plot/review` status itself through `commitStatus`, ignores the result (also listed in #1719), then runs `plot-host.sh pr-merge <n> --delete-branch`. That call runs `gh pr merge` without `--admin` and without `--match-head-commit`.

At 03:2xZ the same account ran `gh pr merge 1604 --squash --match-head-commit <sha>` without `--admin` while `validate` was not yet linked to the PR. GitHub refused it: "the base branch policy prohibits the merge". The ladder's merge passed four seconds after the PR opened. Some path lets a merge by this account pass the required checks. The admin role is on the bypass list with `bypass_mode: always`.

This is also the likeliest answer to the open question of who merged #1667, #1668, #1687 and #1726 under the maintainer's account: a Plot process merging with that account's token.

## Design

### Approach

The cause is not yet confirmed. The first slice reproduces the merge on a scratch PR and names which path passes the required checks: the missing `--match-head-commit`, the bypass mode, the status the ladder writes itself, or a combination. The later slices follow from that answer.

The micro-PR is a booking record with no code. Its review step is the status the ladder writes on its own PR, which makes the gate's author the gate's subject. A required status that the merging process can write for itself is not a gate.

### Open Questions

- [ ] Should the micro-PR fallback wait for `validate` and its own `plot/review`, or write no review status and refuse?
- [ ] Should the admin role's `bypass_mode` move from `always` to `pull_request`, so a bypass needs an explicit request?
- [ ] Should `pr-merge` always pin with `--match-head-commit`? On Bitbucket the host cannot pin a merge, so the pin applies where the host supports it.
- [ ] Should the ladder check the result of `commitStatus` (#1719)?

## Slices

### Reproduce

- `bug/a-lifecycle-micro-pr-merged-past-reproduce` — open a scratch PR as the maintainer account, merge it the way the ladder does, and record which rule the merge passes and why

### Fix

- `bug/a-lifecycle-micro-pr-merged-past-ladder` — the micro-PR fallback refuses to merge until the required checks pass on its head, and `pr-merge` always pins the head it saw <!-- waits: bug/a-lifecycle-micro-pr-merged-past-reproduce -->
- `infra/a-lifecycle-micro-pr-merged-past-bypass` — decide and record the ruleset's `bypass_mode`, and document it in the Plot Config docs <!-- waits: bug/a-lifecycle-micro-pr-merged-past-reproduce -->

## Notes

- Related: #1719 (the ladder ignores the `commitStatus` result), #1730 (the PR that merged), plan `a-pr-cannot-merge-until-its` (the gate this bug passes).
