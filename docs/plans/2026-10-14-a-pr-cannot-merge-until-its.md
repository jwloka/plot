# A PR cannot merge until its review has passed

> The host refuses a merge unless a `plot/review` commit status passed on the PR's current head, so the one-full-review rule stops being a rule.

## Status

- **State:** Approved
- **Type:** feature
- **Issue:** #1702
- **Review:** pr
- **Impl:** own branches
- **Approved:** 2026-10-14, Jan Wloka, plan-PR #1703 merged
- **Started:** 2026-10-14, Jan Wloka, `feature/a-pr-cannot-merge-until-its-host-op`
- **Started:** 2026-10-14, Jan Wloka, `feature/a-pr-cannot-merge-until-its-review-command`
- **Started:** 2026-10-14, Jan Wloka, `feature/a-pr-cannot-merge-until-its-bitbucket`
- **Started:** 2026-10-14, Jan Wloka, `docs/a-pr-cannot-merge-until-its-branch-rule`

## Changelog

- A PR merges only when a review of its current head wrote a passing `plot/review` status; `plot-host.sh commit-status` is the one writer, and the repository's branch rule requires the context beside `validate` and `corpus`.

<!-- Board impact: none expected. The plan format and the board's plan parsing do not change. A slice may add the review status to the PR row later; that is a separate decision. -->

## Motivation

Every PR is meant to get one full review before it merges: CI green and no HIGH finding. That is a rule, and a rule can be skipped. On 2026-10-14 three PRs merged before their review or with HIGH findings open: #1667 and #1668 at 04:27Z, and #1687 at 12:31Z with two HIGH findings that reached `main` and were fixed by #1701. GitHub records all three under the maintainer's account, through no app and with no auto-merge set. No agent or script on the fleet's machine ran the merge, and nothing on the host refused it.

Plot's own principle applies (CLAUDE.md, *Gates Over Rules*): can you answer "did the review pass" without doing the review? Today yes, so today it is a rule. A required commit status on the host makes it a gate that holds whoever runs the merge.

## Design

### Approach

**The review status.** The review of a PR writes a commit status, context `plot/review`, on the head SHA it reviewed. `success` means no HIGH finding. `failure` means at least one, with the finding count in the description and a link to the follow-up issue as the target URL. A push moves the head, so the new head has no `plot/review` status and the host holds the merge. A review of an older head never admits a newer one, with no code to compare SHAs.

**The branch rule.** `main`'s protection requires `plot/review` beside `validate` and `corpus`. This is host configuration a person changes once. The plan's last slice documents the change, for this repository and for adopting repositories, in the Plot Config docs.

**One writer.** Only the review step writes the status, through a new `plot-host.sh` op `commit-status <sha> <state> <context> <description> <url>`. A raw `gh api` call is refused by `scripts/check-host-cli-callers.sh`. The op belongs to the `host` connector (layering rule): it has an account, a rate limit and a transport. The domain names the question on the `Host` port; the adapter shells to `plot-host.sh`.

**Backends.** GitHub: `POST /repos/{owner}/{repo}/statuses/{sha}`. Bitbucket: build status on the commit (`bb` build-status endpoint), with a merge check on the PR as the requirement. The op covers both, or answers `unsupported` by name for a backend or host version that cannot, never a silent success. `HostBackend` is already `string` in the port; `host-shell.ts`'s `DRIVES` list stays the place a new backend is added.

**Where the review runs.** Today the master agent's review is a prompt to a subagent, so the gate would depend on one session. The plan names a command that runs the review and writes the status: a `plot-review` entry point (JS bundle, per *A Shell Script Asks The Domain*) that takes a PR, resolves its head SHA, runs the reviewer agent on the `.plot/charters/reviewer.json` charter, counts HIGH findings, files the follow-up issue, and writes the status. A session that wants a review calls the command. It does not write the status itself.

**A fix after findings.** The fix's push moves the head, so the status for the new head is absent and the merge stays held. The command re-reviews the new head. A scoped re-check of only the findings the fix addressed is a later optimisation and not in this plan; the first version re-reviews in full, which is the stated rule ("one full review per PR" applies to the final head).

**Direct pushes.** The approve and deliver controllers push records straight to `main` and bypass protection (`push: bypassed`). The gate covers PR merges only. A direct push is a controller action that already has its own gates (`plot-state-gate.sh`, the controller receipt), and requiring a status there would need a commit status on a commit that no review reads. The plan states this boundary and does not widen it.

**PRs with no code review today.** Each gets the status from its own step, or an exemption the rule names, because a required check with no writer blocks the merge forever.

| PR kind | Proposal |
|---|---|
| Plan PR merged by the approve controller | The approval is a person's review: the controller writes `success` with description `approved by <who>` on the plan PR's head before it merges |
| Bookkeeping ladder micro-PRs (`entry/ladder.ts`) | The ladder step writes `success` with description `bookkeeping: <rung>` through the same op; it changes only plan and index files |
| Release PR (#1604) | Written by the release step after its changelog check, description `release` |
| Generated bundle commits | Not PRs: `main` builds its own bundles after merge and `check-no-bundle-diff.sh` refuses them in a PR. No status needed |

Open for the reader: whether these writes are exemptions a status states or a second required-check list. The proposal keeps one required context, so the rule has one place to check.

### Decisions

Decided by the person on 2026-10-14.

- **A GitHub App writes the status.** A status written with the maintainer's token is indistinguishable from one written by hand, so it would stop accidents and not a person or tool that holds that login. The status is therefore written by a dedicated GitHub App (permissions: *Commit statuses: write*, *Pull requests: read*, *Contents: read*), installed on the repository. Only the review command holds the App's private key: a key file outside the repository, named by a Plot Config key (for example `Review app: <app id> <key path>`). `plot-host.sh commit-status` mints a short-lived installation token from the App ID and key and writes the status with it. The branch rule requires `plot/review` **from that App** (a ruleset's required status check pinned to the App's integration ID), so a status written with any other token does not satisfy it. A person creates and installs the App once; the rollout slice documents the steps.
- **A second, narrow App, not `plot-board-builder`.** The repository already has the `plot-board-builder` App (`plot-build[bot]`), which pushes the built bundles from `.github/workflows/build-bundles.yml`. It sits on `main`'s ruleset bypass list, and its key lives only in the Actions secrets `PLOT_BUILD_APP_ID` and `PLOT_BUILD_APP_PRIVATE_KEY`. The review command runs outside CI, so reusing that App would put a key that bypasses `main`'s protection on a workstation. The review status is written by a separate App (for example `plot-review`) with only the permissions above, not on any bypass list; its key can write a review status and nothing else. Its setup follows `plot-board-builder`'s.
- **Every PR.** Every merge into `main` needs a passing `plot/review`, including a PR a person opens by hand.
- **Break-glass is an admin merge with a recorded reason.** The maintainer may merge past a stuck or wrong review as an admin, and records the reason on the PR as a comment starting `review-bypass:`. `/plot-reconcile` reports every PR merged into `main` with no passing `plot/review` and no such comment, so a bypass without a reason is visible.
- **Full re-review per head.** A fix push moves the head and gets a full review, as the rule "one full review per PR" states for the final head. Pushes per PR are measured after rollout; a scoped re-check is added only if the cost shows.
- **The Bitbucket arm uses its own identity.** A GitHub App does not exist on Bitbucket; the Bitbucket arm writes the build status with a dedicated account's app password named by the same config key, or answers `unsupported` by name.

### Open Questions

- [ ] Does Bitbucket Server and Cloud expose the same merge-check shape, or does one answer `unsupported`? Measure on both before the Bitbucket arm is written.

## Slices

### Tracer

- `feature/a-pr-cannot-merge-until-its-host-op` — `plot-host.sh commit-status` on GitHub, writing with an installation token minted from the review App's ID and key (the `Review app` config key), and the `Host` port question; proven by writing `plot/review` on a scratch PR head, and by a refusal naming the missing key when none is configured <!-- builds: commit-status, a plot-host.sh op that writes a commit status --> → #1705

### Implementation

- `feature/a-pr-cannot-merge-until-its-review-command` — the `plot-review` entry point that reviews a PR head, files the follow-up issue and writes the status → #1709 <!-- builds: plot-review, a command that reviews a PR and writes plot/review --> <!-- agent: reviewer -->
- `feature/a-pr-cannot-merge-until-its-bitbucket` — the Bitbucket arm of `commit-status`, or `unsupported` by name, with the corpus test holding both backends' answers → #1711

### Rollout

- `docs/a-pr-cannot-merge-until-its-branch-rule` — the controllers and the release step write their own status; `/plot-reconcile` reports a PR merged with no passing `plot/review` and no `review-bypass:` comment; the docs give the person's one-time steps (create and install the App, store its key, add the ruleset requiring `plot/review` from the App) for this repository and for adopting repositories → #1717 (the release step has no instrumentable call site found this slice — reported in `docs/review-status-rollout.md` rather than built; the bypass report's signal is `pr-state`'s folded `checks`, an approximation also named there; the ruleset rule itself is not yet flipped, per this plan's own sequencing)

## Notes

- Source: issue #1702. The rule it makes a gate is in CLAUDE.md under *Gates Over Rules*; the memory note *Merge green PRs; findings follow up* says a PR with no HIGH merges now, and this gate encodes exactly that threshold.
- Out of scope, from the issue: no change to how CI runs. The review status is one more required check.
- Rollout order matters: the branch rule is switched on last, after every PR kind has a writer, or it blocks the merges it was meant to admit.
