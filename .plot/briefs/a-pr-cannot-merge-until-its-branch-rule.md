## Implementation brief — a-pr-cannot-merge-until-its (wave Rollout)

- **Plan (canonical):** docs/plans/2026-10-14-a-pr-cannot-merge-until-its.md on main
- **Approved:** 2026-10-14, Jan Wloka, plan-PR #1703 merged
- **Branch:** `docs/a-pr-cannot-merge-until-its-branch-rule` (base: `main`)
- **Ends as:** one PR to `main`
- **Review of the code:** per repo convention (one full review, CI green, no HIGH finding)

This is the plan's last wave and its only branch. It waits on both Implementation
branches (`…-review-command` #1709, `…-bitbucket` #1711) — not because it imports
their code, but because turning the branch rule on before every PR kind has a
writer blocks the merges it was meant to admit (the plan's own closing line).
Confirm both are merged before flipping the ruleset, even though nothing here
fails to compile without them.

### What to build

Three things, in the order the plan's rollout-order warning implies (writers
first, rule last):

1. **Writers for the PR kinds that today merge with no review step**, per the
   plan's table (Design § "PRs with no code review today"):
   - **Plan PR merged by the approve controller** — `plot-approve.mjs` merges
     the plan PR itself at `packages/board/src/server/entry/approve.ts:1016-1034`
     (via `pr-ready` then `ctx.scripts.host(['pr-merge', ...])`). Before that
     merge call, write `plot/review` = `success`, description `approved by
     <who>`, on `pr.headSha` — the same head the merge is pinned to
     (`--match-head ${pr.headSha}` two lines below). `who` is already resolved
     in scope (`const who = ...` above, line 973).
   - **Bookkeeping ladder micro-PRs** — the shared fallback in
     `packages/board/src/server/entry/ladder.ts`'s `commitAndPush` (lines
     153–162): when the direct push to main is rejected, it opens a micro-PR
     via `ctx.host.prCreate` and immediately merges it via
     `ctx.scripts.host(['pr-merge', num, '--delete-branch'])`. Write
     `plot/review` = `success`, description `bookkeeping: <noun>` (the function
     already takes a `noun` parameter — `'approval' | 'delivery' | 'release' |
     'verification' | 'design move'` — reuse it as `<rung>`), on the created
     PR's head before that merge call. `commitAndPush` is shared by both
     `approve.ts` and `deliver.ts`'s two call sites (lines 406, 708) — one
     write site covers all of them, which is the point of it being one ladder.
   - **Release PR (#1604)** — written by the release step after its changelog
     check, description `release`. `release-gate.ts` only decides the gate (go/
     no-go); it opens and merges no PR itself. Find where the release PR
     actually gets opened and merged before assuming a location — it is not in
     `release-gate.ts`, and the plan's own precedent (#1604) is a real PR
     number to anchor the search on, not a placeholder.
   - **Generated bundle commits** are explicitly named "not PRs" in the plan's
     table — they need no status. Do not add one.

2. **`/plot-reconcile`'s bypass report.** `plot-reconcile-scan.sh` is read-only
   (prints remediating commands, runs nothing) — add a new reported category:
   a PR merged into `main` with no passing `plot/review` status and no
   `review-bypass:` PR comment. This is evidence for a person to read, not a
   gate that blocks anything; `/plot-reconcile` never gates.

3. **The rollout docs.** The plan's `## Plot Config` additions — the `Review
   app` key (already landed, Tracer slice, 5213d14f1) is precedent for the
   shape — plus the one-time human steps: create and install the GitHub App,
   store its private key outside the repo, add the ruleset requiring
   `plot/review` **from that App** (pinned to its integration ID, not just the
   context name) beside `validate` and `corpus`. Document this twice: for this
   repository (where you actually flip the switch) and as adoption guidance
   for a repository installing Plot fresh.

**Flipping the ruleset is the last action in this branch**, after 1 and 2 are
merged and proven, not merely written.

### The decisions the plan settles — do not re-derive them

**One required context, not per-PR-kind exemption lists.** The Design section
asks this as an open question and the Decisions section answers it: "Every
PR... including a PR a person opens by hand." There is one required check,
`plot/review`, and every PR kind gets a writer rather than the rule growing a
second required-check list or a per-kind allowlist on the ruleset. If a PR kind
genuinely cannot get a writer, that is a finding to report, not a reason to add
a bypass list here.

**Break-glass is a comment convention already decided, not a mechanism you
build.** "The maintainer may merge past a stuck or wrong review as an admin,
and records the reason on the PR as a comment starting `review-bypass:`."
There is no new tooling for break-glass itself — an admin merge on GitHub
already bypasses required checks for a repo admin. Your job is only the
**detection** half: `/plot-reconcile` reporting a bypass with no
`review-bypass:` comment. Do not build a bypass-request flow, a bypass label,
or anything that writes the comment on someone's behalf.

**The App is pinned by integration ID, not by status context name alone.** A
required status check on a branch ruleset can be scoped to a specific GitHub
App; the plan says the rule "requires `plot/review` **from that App**" so that
a status written with the maintainer's personal token — indistinguishable by
context name alone — does not satisfy it. If the ruleset UI/API you use only
lets you require a context with no app scoping, that is a gap to report against
the plan's stated requirement, not something to silently drop.

**Direct pushes stay out of scope, and the plan states why.** `approve` and
`deliver` push records straight to `main` under their own existing gates
(`plot-state-gate.sh`, the controller receipt) when nothing is rejected — that
is a direct push, not a PR merge, and the plan explicitly declines to widen the
gate to cover it: "requiring a status there would need a commit status on a
commit that no review reads." Only the **micro-PR fallback** (item 1 above)
needs a writer, because that path is a PR merge.

**Full re-review per head is already built (Implementation wave), not
something this branch re-litigates.** This wave does not touch `plot-review`'s
re-review behavior; it only adds writers for paths that never called
`plot-review` at all.

**The op this branch calls already exists and is GitHub-only.** `plot-host.sh
commit-status <sha> <state> <context> <description> <url>` is built (Tracer
wave, #1705) and refuses with exit 4 on any backend but GitHub
(`plot-host.sh:5260`). The sibling Implementation branch
(`…-bitbucket`, #1711) adds the Bitbucket arm. Every writer this branch adds
calls through that one op — never a second `gh api`/`curl` call
(`scripts/check-host-cli-callers.sh` is the gate, and none of
`approve.ts`/`ladder.ts`/the release path are on its exception list, nor should
they need to be: they already route host calls through `ctx.scripts.host(...)`
or the `Host` port).

### Done when

The plan names no separate `## Done when` heading for this wave; its slice
description is the spec: "the controllers and the release step write their own
status; `/plot-reconcile` reports a PR merged with no passing `plot/review` and
no `review-bypass:` comment; the docs give the person's one-time steps."

Add these assertions because a naive implementation passes without them:
- A test that the approve controller's plan-PR merge writes `plot/review` on
  `pr.headSha` **before** the `pr-merge` call, not after — a write issued after
  the merge already pinned to that head is provably too late once the ruleset
  requires it, and a naive ordering would pass a "does it write a status"
  check while being useless once the rule is on.
- A test that the ladder's micro-PR fallback writes a status on the PR it
  itself created and is about to merge, not on some other open PR — the
  function already resolves `created.value`'s PR number; use that, not a
  lookup that could resolve a different PR.
- A test that `/plot-reconcile`'s new report does NOT flag a PR carrying a
  `review-bypass:` comment, even with no passing `plot/review` — a check that
  flags every unreviewed merge regardless of the comment would make the
  documented escape hatch itself look like an unexplained bypass every time
  it's used.
- A test that `/plot-reconcile`'s report still runs (and reports nothing
  wrong) for a PR that never needed review under the plan's own table —
  i.e., don't flag a generated-bundle "merge" that was never a PR, and don't
  flag the release PR once it has its own writer.

Plus the repo's standing gates: `scripts/check-host-cli-callers.sh` (no new
`gh`/`bb` call outside `plot-host.sh`), and `scripts/check-shell-lines.sh`,
which refuses a PR whose shell under `skills/` grew past its merge base — this
wave is mostly TypeScript edits to existing entry points plus prose docs, so it
should add close to zero shell lines; if `plot-reconcile-scan.sh` itself grows,
pay for it by removing shell elsewhere or moving the new rule into the domain.

Run `node skills/plot/scripts/board/plot-local-checks.mjs` before each push and
run what it prints. The suites in the `CI suites` config key run in CI on every
PR; don't run them locally as a matter of course.

### Bookkeeping

Open the PR through the controller once the first real commit exists:

```bash
../plot/scripts/plot-open-pr.sh          # current branch
```

It resolves the branch's plan and wave heading automatically. Do not run
`gh pr create`. When the PR is created, append `→ #<number>` to this branch's
line under `### Rollout` in the plan's `## Slices` section.

### Scope guard

This branch owns: the new `plot/review` write call sites inside
`approve.ts` (plan-PR merge), `ladder.ts`'s `commitAndPush` (micro-PR
fallback, shared by `approve.ts` and `deliver.ts`), wherever the release PR is
actually opened/merged, `plot-reconcile-scan.sh`'s new bypass-detection
report, and the `## Plot Config` / adoption docs for the App and ruleset setup.
Its test coverage lives under `packages/board`'s own test tree (for the
TypeScript writers) and `test/reconcile/` (for the reconcile report).

It must NOT touch: `plot-commit-status.mjs` or `plot-host.sh`'s `commit-status`
op internals (Tracer-slice territory, merged and proven — call it, don't
re-implement it), the Bitbucket arm of `commit-status` (sibling
`feature/a-pr-cannot-merge-until-its-bitbucket` branch — if this wave's writers
need Bitbucket-aware behavior to avoid breaking on that host, name that as a
finding rather than building it here), and `plot-review` itself (Implementation
wave, merged territory — this wave calls nothing in it; it only reacts to the
status it already writes).

If you find something the plan did not anticipate — in particular, exactly
where the release PR (#1604) is opened and merged if it is not in
`release-gate.ts`, or whether the ruleset mechanism available to you can pin a
required check to a specific App's integration ID — report it rather than
improvising scope.
