## Implementation brief — a-pr-cannot-merge-until-its (wave Tracer: Tracer)

- **Plan (canonical):** docs/plans/2026-10-14-a-pr-cannot-merge-until-its.md on main
- **Approved:** 2026-10-14, Jan Wloka, plan-PR #1703 merged
- **Branch:** `feature/a-pr-cannot-merge-until-its-host-op` (base: `main`)
- **Ends as:** one PR to `main`
- **Review of the code:** per repo convention (one full review, CI green, no HIGH finding)

This is the only branch in the Tracer wave — nothing blocks it and nothing waits
on it directly, but both branches in the Implementation wave (`…-review-command`
and `…-bitbucket`) need `commit-status` to exist before they can write a status.

### What to build

`plot-host.sh commit-status <sha> <state> <context> <description> <url>` — a new
op on the existing host adapter (`skills/plot/scripts/plot-host.sh`) that writes a
commit status on GitHub. This slice is GitHub-only; Bitbucket is explicitly out
of scope (it's the next wave's branch).

The op must:
1. Mint a short-lived GitHub App installation token from an App ID and private
   key, rather than using the signed-in `gh` CLI user's own credentials.
2. `POST /repos/{owner}/{repo}/statuses/{sha}` with that token, setting `state`
   (`success`/`failure`/etc.), `context` (`plot/review`), `description`, and
   `target_url`.
3. Read the App ID and key path from a new `## Plot Config` key, `Review app:
   <app id> <key path>` — read via `plot-config.sh get "Review app"`, following
   the same grammar every other config key uses (see `plot-config.sh` header).
4. Refuse by name (exit 4, per the backend's existing convention — see the
   `backend` op's doc comment) when the config key is absent. No silent
   success, no default App.

Proof per the plan: writing `plot/review` on a scratch PR head, and a refusal
naming the missing key when `Review app` is not configured.

### The decisions the plan settles — do not re-derive them

**A dedicated GitHub App, not `plot-board-builder`.** The repo already runs a
bot App (`plot-build[bot]`, `.github/workflows/build-bundles.yml`) that pushes
built bundles and sits on `main`'s ruleset bypass list — its key lives only in
Actions secrets (`PLOT_BUILD_APP_ID`, `PLOT_BUILD_APP_PRIVATE_KEY`). This op
runs on a workstation, outside CI, so its key must never be that App's: a key
that can bypass branch protection has no business living on a laptop. Build a
second App (e.g. `plot-review`) with only *Commit statuses: write*, *Pull
requests: read*, *Contents: read* — not on the bypass list. Do not reuse the
build App's ID/key pair even though the minting mechanism looks identical.

**No existing JWT/installation-token minting to copy.** The repo's only App
precedent (`build-bundles.yml`) mints its token through the GitHub Action
`actions/create-github-app-token`, which only runs inside a workflow. This
script runs from a developer's or fleet agent's shell, so the token mint
(JWT signed with the App's private key via `POST
/app/installations/{id}/access_tokens`) is new code in this slice — there is
nothing in the repo today doing this from bash. Keep the JWT-signing and
token-exchange logic self-contained in `plot-host.sh`; do not add a new
script, since `plot-host.sh` is gated as the ONE place that may reach the host
CLI/API (`scripts/check-host-cli-callers.sh`).

**`HostBackend` stays a string; this op does not touch the TypeScript port
yet.** The plan's design section notes the `Host` port (`packages/domain/src/
ports/host.ts`) names six questions with no transport or account — `backend()`,
`account()`, `prState()`, `prMerged()`, `prMergeCommit()`, `prMergedHeads()`,
`prCreate()`, `prList()`, `limit()`. `commit-status` is a new host operation
the domain does not yet name. This slice adds only the shell op; wiring a
`commitStatus()` method onto the `Host` interface and its `host-shell.ts`
adapter implementation is not required by the Tracer slice's proof (writing a
status from the shell, and a named refusal) — only add it if a caller inside
`packages/domain` needs it, which none does yet (the review command, the next
wave's branch, is also a shell entry point per *A Shell Script Asks The
Domain*).

**Exit codes follow the adapter's existing vocabulary.** `plot-host.sh`
already uses exit 3 for "the call failed" and exit 4 for "this configuration
cannot answer at all" (see `backend`'s and `account`'s doc comments at the top
of the file). A missing `Review app` key is a configuration gap, not a
transient failure — use exit 4, matching how `backend` refuses an unrecognised
`Git host` word and how `account` exits 4 on Bitbucket's missing username.

**One writer, and this is it.** No other script may call the GitHub statuses
API directly — `check-host-cli-callers.sh` enforces "one place talks to the
host CLI" with a named exception list; this op does not add an exception,
it's the thing routing through the existing single entry point.

### Done when

The plan's `## Done when` is implicit in the Tracer slice's own proof line
(there's no separate `## Done when` heading in this plan — the slice
descriptions in `## Slices` carry it): writing `plot/review` on a scratch PR
head succeeds, and running the op with no `Review app` configured exits 4 and
names the missing key on stderr.

Add these assertions because a naive implementation passes without them:
- A test that the op reads the App ID/key from `## Plot Config` via
  `plot-config.sh`, not from an environment variable or hardcoded default —
  catches a shortcut that works on one machine and fails everywhere else.
- A test that the *installation* token is used for the status write, not a
  JWT directly (GitHub's statuses API rejects a bare App JWT) — catches a
  minting bug that only surfaces against the real API.
- A test/assertion that a missing key file (vs. a missing config line) is
  also refused by name, not a stack trace — the plan's refusal requirement
  covers "no key configured," and a key path that doesn't resolve is the
  same user-facing gap.

Plus the repo's standing gates: no raw `gh api`/`curl` call outside
`plot-host.sh` (`scripts/check-host-cli-callers.sh`), and `scripts/
check-shell-lines.sh`, which refuses a PR whose shell under `skills/` grew
past its merge base — this op adds shell, so if the growth isn't absorbed by
replacing something else, say so plainly and let the gate hold the number; it
grants no exemption.

Run `node skills/plot/scripts/board/plot-local-checks.mjs` before each push and
run what it prints — the related tests and typecheck for whatever this slice
touches. The full `CI suites` run in CI on every PR; don't run them locally as
a matter of course.

### Bookkeeping

Open the PR through the controller once the first real commit exists:

```bash
../plot/scripts/plot-open-pr.sh          # current branch
```

It resolves the branch's plan and wave heading automatically. Do not run
`gh pr create`. When the PR is created, append `→ #<number>` to this branch's
line under `### Tracer` in the plan's `## Slices` section.

### Scope guard

This branch owns: `skills/plot/scripts/plot-host.sh` (the new `commit-status`
op only — do not touch other ops), and whatever new test file covers it under
`test/reconcile/` (e.g. `host-commit-status.test.mjs`, following the existing
`host.test.mjs` / `host-account.test.mjs` naming).

It must NOT touch: `packages/domain/src/ports/host.ts` or `host-shell.ts`
(no caller needs the TypeScript port yet — see above), the branch rule /
required-status-check configuration (that's the Rollout wave's
`docs/a-pr-cannot-merge-until-its-branch-rule` branch), and no `plot-review`
entry point (that's the Implementation wave's `…-review-command` branch,
which depends on this one existing first).

If you find the TypeScript port genuinely needs `commitStatus()` to satisfy
this slice's proof, report that rather than silently expanding scope — it
would mean the plan's wave split was wrong, which is worth surfacing before
writing it.
