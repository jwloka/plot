## Implementation brief — a-pr-cannot-merge-until-its (wave Implementation)

- **Plan (canonical):** docs/plans/2026-10-14-a-pr-cannot-merge-until-its.md on main
- **Approved:** 2026-10-14, Jan Wloka, plan-PR #1703 merged
- **Branch:** `feature/a-pr-cannot-merge-until-its-review-command` (base: `main`)
- **Ends as:** one PR to `main`
- **Review of the code:** per repo convention (one full review, CI green, no HIGH finding)

This branch and its Implementation-wave sibling (`…-bitbucket`) both depend on
the Tracer wave's `commit-status` op, which merged as PR #1705
(`skills/plot/scripts/plot-commit-status.mjs` + `plot-host.sh commit-status`).
Nothing in this plan waits on this branch — `docs/a-pr-cannot-merge-until-its-
branch-rule` (Rollout wave) switches the branch rule on only after every PR
kind, including this command's own review, has a writer.

### What to build

A `plot-review` entry point — a JS bundle under `skills/plot/scripts/`, per
*A Shell Script Asks The Domain* (a command that runs once per invocation, not
once per agent per pass, so it calls into the domain rather than duplicating a
rule in shell) — that:

1. Takes a PR (number, or resolves the current branch's PR via the `Host`
   port's `prState`).
2. Resolves the PR's current head SHA.
3. Runs the reviewer agent on the `.plot/charters/reviewer.json` charter
   (model `opus`, effort `high`, `read-only` — already exists, created for
   this plan, not yet wired to any command).
4. Counts HIGH findings from the review output.
5. Where HIGH findings exist: files the follow-up issue through the `Tracker`
   port's `issueOpen` (title/body/labels — labels per `## Plot Config`'s
   `ai-generated` convention), then writes `plot/review` = `failure`, with the
   finding count in `description` and the new issue's URL as `target_url`.
6. Where none exist: writes `plot/review` = `success`, description
   `no HIGH findings`.
7. The status write goes through `plot-host.sh commit-status <sha> <state>
   plot/review <description> <url>` — never a second `gh api`/`curl` call
   (`scripts/check-host-cli-callers.sh` is the gate; this command is not on
   its exception list and must not need to be).

This is the command the plan's Motivation section is about: today a review is
"a prompt to a subagent", which makes the gate depend on one session
remembering to ask for it and write the status by hand. `plot-review` is what
a session (human or fleet) calls instead, so the write is load-bearing on the
command's own exit code rather than on a step a brief could skip.

### The decisions the plan settles — do not re-derive them

**One writer, and it is not this command's job to invent a second path.** The
Tracer slice already built `plot-host.sh commit-status` as the only place
that calls GitHub's statuses API. This branch calls that op; it does not
re-implement the App-token-minting dance, and it does not call the GitHub API
directly for any reason, including "just to check" something the op already
answers.

**The `Host` port's TypeScript side was deliberately left alone by the Tracer
slice.** `packages/domain/src/ports/host.ts` names no `commitStatus()` method
yet — the tracer brief recorded that as a Tracer-slice scope boundary, not a
plan-wide one, because no caller inside `packages/domain` needed it at Tracer
time. This command is that caller. Before deciding how `plot-review` reaches
`commit-status`, read whether this entry point lives as TypeScript calling
through the domain (in which case it now needs `Host.commitStatus()` and a
`host-shell.ts` implementation that shells to `plot-commit-status.mjs` — the
layering rule, controller → domain → port → adapter) or as a script that
calls `plot-host.sh commit-status` directly the way four other scripts already
call `plot-host.sh` for other ops. **Decide this one way, not both**: adding
the TypeScript method only to leave a shell path that bypasses it would mean
two ways to write the one status this plan is about enforcing.

**Full re-review per head, not a scoped re-check.** The plan's Decisions
section is explicit: a fix push moves the head and gets a full review, because
*"one full review per PR"* ([[one-full-review-per-pr]]) states that rule for
the final head, not for whatever changed since the last review. A scoped
re-check is named as a later optimisation only, contingent on measuring push
volume after rollout — do not build it now even though it looks like the
obvious efficiency win; the plan explicitly defers that measurement.

**The App is already live — do not create a second one.** `plot-review` GitHub
App (ID 5317669) exists on `plot-pm/plot`, installed, with the key at
`~/.config/plot/plot-review.5317669.private-key.pem`, and `## Plot Config`
already carries the `Review app: 5317669 <path>` line (landed with the Tracer
slice, 5213d14f1). This command reads that config key through
`plot-commit-status.mjs`'s existing `reviewApp()` lookup (indirectly, via
`plot-host.sh commit-status`) — it does not read App ID or key path itself,
and does not add a second config key.

**The branch rule is NOT turned on by this slice.** `main`'s ruleset does not
yet require `plot/review` from this App — that switch is the Rollout wave's
`docs/a-pr-cannot-merge-until-its-branch-rule` branch, and it is switched on
last, deliberately, after every PR kind (including this command, the plan
approval controller, the ladder, and the release step) has a writer. Until
that branch lands, a PR with no `plot/review` status still merges — this
command's correctness is proven by the status it writes, not by anything
blocking a merge yet.

**Break-glass is out of scope here.** The `review-bypass:` comment convention
and `/plot-reconcile`'s report of an unexplained bypass are the plan's answer
to a stuck or wrong review — they are not something `plot-review` writes or
checks. This command only ever writes `success` or `failure`; it never writes
a bypass marker.

**`gh pr create` is still never the way a PR gets opened**, and this command
is not a PR-opening command at all — it reads an existing PR's SHA, it never
creates one.

### Done when

The plan names no separate `## Done when` heading; the Implementation wave's
slice description carries its own proof: `plot-review` reviews a PR head,
files the follow-up issue on a HIGH finding, and writes the status — both the
`failure` and `success` paths need a passing proof, not just the one the
Tracer slice already covered on the status-write mechanics.

Add these assertions because a naive implementation passes without them:
- A test that a **second** call to `plot-review` against the same unchanged
  head does not file a second follow-up issue for the same findings (or, if
  the command is written to always re-review and re-file, that this is a
  stated choice, not an oversight — the plan does not resolve this and a
  naive implementation will pick one path by accident).
- A test that `plot/review` is written on the PR's **current** head SHA, not
  a SHA a caller passed in — a resolved-from-the-host SHA that could be stale
  for a page that fetched the PR earlier in the same process.
- A test that a `failure` write's `target_url` points at the filed issue, not
  an empty string or the PR itself — the plan requires "a link to the
  follow-up issue as the target URL", and a `commit-status` call that still
  works with the PR's own URL there would pass a naive check of "is a URL
  present" while not being the right URL.
- A test that zero HIGH findings never calls `issueOpen` at all — a reviewer
  that always "files the follow-up issue" regardless of findings count would
  pass a superficial "writes success" check while littering the tracker.

Plus the repo's standing gates: no raw `gh api`/`curl` call outside
`plot-host.sh` (`scripts/check-host-cli-callers.sh`), and
`scripts/check-shell-lines.sh`, which refuses a PR whose shell under
`skills/` grew past its merge base. If this command is written as a `.sh`
launcher around a JS bundle (per *A Shell Script Asks The Domain*'s target
shape), the launcher itself should add close to zero shell lines — most of
the growth belongs in the bundle, which the gate does not count.

Run `node skills/plot/scripts/board/plot-local-checks.mjs` before each push
and run what it prints — the related tests and typecheck for whatever this
slice touches. The full `CI suites` run in CI on every PR; don't run them
locally as a matter of course.

### Bookkeeping

Open the PR through the controller once the first real commit exists:

```bash
../plot/scripts/plot-open-pr.sh          # current branch
```

It resolves the branch's plan and wave heading automatically. Do not run
`gh pr create`. When the PR is created, append `→ #<number>` to this branch's
line under `### Implementation` in the plan's `## Slices` section.

### Scope guard

This branch owns: the new `plot-review` entry point (its bundle and any
launcher script under `skills/plot/scripts/`), whatever `packages/domain`
changes decided above (the `Host.commitStatus()` method and its
`host-shell.ts` wiring, if this entry point is built as a domain caller
rather than a direct shell caller of `plot-host.sh`), and its test coverage
under `test/reconcile/` or `packages/domain`'s own test tree.

It must NOT touch: `skills/plot/scripts/plot-host.sh`'s existing `commit-status`
op internals or `plot-commit-status.mjs` (Tracer-slice territory, merged and
proven — extend by calling it, not by editing its GitHub-only write path),
the Bitbucket arm of `commit-status` (that's the sibling
`feature/a-pr-cannot-merge-until-its-bitbucket` branch — if this command needs
to special-case Bitbucket to avoid breaking on that host, name that as a
finding rather than building the Bitbucket arm here), and the branch-rule /
ruleset configuration (`docs/a-pr-cannot-merge-until-its-branch-rule`,
Rollout wave).

If you find something the plan did not anticipate — in particular, if
`plot-review` cannot be written without first deciding the TypeScript-port
question above, or if the reviewer charter's `read-only` capability turns out
to conflict with filing an issue or writing a status (both are writes) —
report it rather than improvising outside scope.
