## Implementation brief — a-pr-cannot-merge-until-its (wave: Implementation)

- **Plan (canonical):** `docs/plans/2026-10-14-a-pr-cannot-merge-until-its.md` on `main`
- **Approved:** 2026-10-14, Jan Wloka, plan-PR #1703 merged
- **Branch:** `feature/a-pr-cannot-merge-until-its-bitbucket` (base: `main`)
- **Ends as:** one PR to `main`
- **Review of the code:** PR review per repo convention

This branch is in the Implementation wave beside
`feature/a-pr-cannot-merge-until-its-review-command`. Neither depends on the
other's code: the review command calls `plot-host.sh commit-status` as a black
box, on whichever backend `plot-host.sh backend` reports, so this slice can
land before or after it. Both wait on the Tracer wave
(`feature/a-pr-cannot-merge-until-its-host-op`, merged as #1705), which built
the GitHub arm and the `commit-status` op's shape.

### What to build

`plot-host.sh commit-status <sha> <state> <context> <description> <url>`
today has exactly one backend. `skills/plot/scripts/plot-host.sh:5260` reads:

```sh
[ "$be" = "github" ] || { echo "plot-host: commit-status — backend is '$be', not github; this op is GitHub-only" >&2; exit 4; }
```

Replace that hard refusal with a Bitbucket arm that writes a **build status**
on the commit, or an explicit `unsupported` exit where this `bb`/Bitbucket
combination cannot do it — never a silent success. Bitbucket's equivalent of a
GitHub commit status is the build-status API:
`POST /2.0/repositories/{workspace}/{repo_slug}/commit/{revision}/statuses/build`,
body `{"state": "SUCCESSFUL"|"FAILED", "key": "<context>", "name": "<context>",
"description": "<description>", "url": "<url>"}`. GitHub's `state` vocabulary
(`success`/`failure`/`pending`/`error`) does not match Bitbucket's
(`SUCCESSFUL`/`FAILED`/`INPROGRESS`/`STOPPED`); map it rather than passing the
GitHub value through, and refuse — do not guess — a state this op does not
expect (today only `success`/`failure` are called).

### The decisions the plan settles — do not re-derive them

**A dedicated account, never the operator's `bb` identity.** The plan's
Decisions section is explicit: *"A GitHub App writes the status [so that] a
status written with the maintainer's token is indistinguishable from one
written by hand... stop accidents, not a person or tool that holds that
login."* The same reasoning carries to Bitbucket and the plan states it
directly: *"the Bitbucket arm writes the build status with a dedicated
account's app password... or answers `unsupported` by name."* **Do not shell
out through the already-authenticated `bb` CLI** (the way `bb_branch_query`
and `bb_window_listing` do for reads) — that writes as whoever is logged into
`bb` on this machine, which is exactly the indistinguishable-from-a-human
credential the GitHub arm was built to avoid. This status needs its own
identity and therefore its own HTTP call, not a `bb api` passthrough.

**Model the credential on Jira's, not on a new scheme.** `plot-host.sh` already
solved "a second identity read from the environment, with a `.env` fallback,
never argv-exposed" for Jira (`jira_load_env_file`, `jira_require_config`,
`jira_curl` at `plot-host.sh:2520-2591`), and `the-credential-is-read-where-a-
repo-keeps-it` (merged, `.plot/briefs/a-credential-is-read-where-a-repo-keeps-
it.md`) hardened exactly that pattern: environment wins, `.env` is read only
when both vars are unset, the source of the value is named in a log line, and
the value itself never reaches stdout, stderr, argv of a child process, or
`budget.tsv`. Reuse that shape for two new variables — name them
`BITBUCKET_REVIEW_USER` and `BITBUCKET_REVIEW_APP_PASSWORD` (Bitbucket App
passwords are Basic-auth, `curl --user "$USER:$PASSWORD"`, exactly like Jira's
Basic scheme) — rather than inventing a third credential-loading mechanism.
**Do not use `bb`'s own config or keychain for this account**: a second `bb`
identity is not how Bitbucket's CLI works, and the plan's whole point is that
this identity is distinct from whichever one is signed in.

**Missing credential is a config error, exit 4, never an empty/no-op success.**
Follow `jira_require_config`'s shape: no `BITBUCKET_REVIEW_USER` /
`BITBUCKET_REVIEW_APP_PASSWORD` (env or `.env`) means exit 4 naming both
variable names and where to create an App password
(`bitbucket.org/account/settings/app-passwords/`), the same way the GitHub arm
exits 4 naming the missing `Review app` key. A write that silently no-ops
because the credential was absent is indistinguishable from a passing review —
the exact failure mode #1667/#1668/#1687 already demonstrated with no gate at
all.

**`unsupported` is a named exit, not a guess.** The plan's open question asks
whether Bitbucket Server and Cloud expose the same merge-check shape. This
slice only needs to prove the Cloud build-status call; if the workspace/repo
addressing or the credential cannot be resolved (for example `bb repo view`
cannot report a workspace in this checkout), exit with a message naming
`unsupported` and why — never fall through to a 404 or an unexamined non-2xx
as if it were the generic write-failure path.

**One required check, not two.** The branch rule (Rollout slice) requires one
context, `plot/review`, from whichever backend wrote it. Use the same
`context`/`key` value Bitbucket's API calls `key` as the GitHub arm's
`context` argument — do not invent a second name for the same concept.

### Done when

The plan's `## Done when` is implicit in its Design and Decisions sections (no
literal `## Done when` heading exists in this plan — the Slices entry for this
branch is the specification: *"the Bitbucket arm of `commit-status`, or
`unsupported` by name, with the corpus test holding both backends' answers"*).
Concretely:

- `skills/plot/scripts/plot-host.sh commit-status` on a Bitbucket-backed
  checkout writes a Bitbucket build status (mapped state, matching key) using
  `BITBUCKET_REVIEW_USER`/`BITBUCKET_REVIEW_APP_PASSWORD`, or exits naming
  `unsupported` and the reason — never the GitHub-only refusal and never a
  silent 0.
- Missing credentials exit 4 naming both variable names, before any network
  call — mirror the existing GitHub test *"no Review app key exits 4... no
  gh call before the refusal"* in
  `test/reconcile/host-commit-status.test.mjs`.
- The credential value never appears in stdout, stderr, any child process's
  argv (`ps` visibility — the GitHub arm's test for this is explicit at
  `test/reconcile/host-commit-status.test.mjs:184-200`), or `budget.tsv`.
- **`test/reconcile/host-commit-status.test.mjs:202-209`, "commit-status:
  GitHub only — a non-GitHub backend exits 4", must change.** That test
  currently pins the old hard-refusal behaviour this slice removes — it is
  the one assertion a naive "just add Bitbucket" implementation would leave
  red, or would delete without replacing. Replace it with Bitbucket-specific
  tests covering: a successful write (mapped state, correct key/name/body),
  the missing-credential exit 4, and the `unsupported` exit where the
  write cannot be attempted. Follow the existing file's sandbox/stub
  conventions (`sandbox()`, PATH-stubbed `bb`/`node`/`curl`, a local HTTP
  server standing in for `api.bitbucket.org`) rather than introducing a new
  harness.
- **A corpus test holding both backends' answers**, per the Slices line.
  `packages/domain/corpus/` is the existing home for a declared-duplicate
  comparison (see CLAUDE.md, *A Shell Script Asks The Domain*); if the state
  mapping (GitHub vocabulary → Bitbucket vocabulary) or the "which exit code
  means what" table is expressed in more than one place, add the corpus test
  there rather than trusting the two to stay in sync by inspection.

Plus: no raw `curl`/`bb api` call to a Bitbucket endpoint from outside
`plot-host.sh` (`scripts/check-host-cli-callers.sh` gate — this op belongs
inside the existing `commit-status)` case, not a new caller). Run
`node skills/plot/scripts/board/plot-local-checks.mjs` before each push and run
what it prints; the `CI suites` config key's suites run in CI, and a failure
there comes back as a correction. List no full suite here.

Name the shell gate: `scripts/check-shell-lines.sh` refuses a pull request
whose shell under `skills/` is longer than at its merge base
(`712c864526ec383b4efe44f53bc2c7c9940a6011`, currently 1739 lines of
`plot-host.sh` alone by its own count). Adding the Bitbucket arm grows
`plot-host.sh`; pay for that growth in the same change — fold lines elsewhere
in the file, or move logic that does not need to be shell (for example the
state-vocabulary mapping table) into a small Node helper the op shells out to,
the way the GitHub arm already delegates to `plot-commit-status.mjs` instead
of writing the JWT/HTTP logic inline in bash. The gate stores no number and
has no override.

### Bookkeeping

Open the PR through the controller as soon as a first real commit exists:

```bash
skills/plot/scripts/plot-open-pr.sh          # or --draft while still moving
```

When it is created, append `→ #<number>` to this branch's line in the plan's
`## Slices` section (`docs/plans/2026-10-14-a-pr-cannot-merge-until-its.md`,
under `### Implementation`).

### Scope guard

This branch owns `skills/plot/scripts/plot-host.sh`'s `commit-status)` case,
any new Node helper it delegates to (parallel to
`skills/plot/scripts/plot-commit-status.mjs`, which is the GitHub arm's file
and is **not** this branch's to edit), and
`test/reconcile/host-commit-status.test.mjs`'s Bitbucket-facing tests.

Other branches in flight on this plan, verified at dispatch:

- `feature/a-pr-cannot-merge-until-its-host-op` — merged (#1705). Built the
  GitHub arm (`plot-commit-status.mjs`) and the `commit-status` op's argument
  shape and exit-code vocabulary (1/3/4) this slice must match for Bitbucket.
  Do not change its exit codes' meanings.
- `feature/a-pr-cannot-merge-until-its-review-command` — the `plot-review`
  entry point that calls `commit-status` as a consumer. It does not touch
  `plot-host.sh`'s backend dispatch; no file-level collision expected.

If you find something the plan did not anticipate — in particular, if
Bitbucket Cloud's build-status API turns out not to support what the plan
assumes — report it against the plan's own open question rather than
improvising a different mechanism silently.
