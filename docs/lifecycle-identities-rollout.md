# Rolling out the Writer App and the Merger App

`docs/plans/2026-10-15-a-lifecycle-micro-pr-merged-past.md` closes #1730: a
pinned merge still ran as the maintainer's own `gh` identity, which holds
`bypass_mode: always` on this repository's ruleset, so a merge could land
with no `validate` run and no `plot/review` status. This page is the
one-time human setup for the two GitHub Apps that remove that identity from
the lifecycle's write paths — creating each App, storing its key, and
recording it in `## Plot Config`. It follows the same shape as
`docs/review-status-rollout.md`'s setup for the `Review app`, which the
token exchange these two reuse.

## What each App does

| App | Job | Bypass list | Permissions | Caller |
|---|---|---|---|---|
| Writer app | authenticates every lifecycle push to the default branch | **Yes** | `Contents: write` | `skills/plot/scripts/plot-push-main.sh` via `plot-writer-push.mjs`, called from `/plot-approve`, `/plot-deliver`, and `packages/board/src/server/entry/ladder.ts` |
| Merger app | authenticates every `plot-host.sh pr-merge` on GitHub | **No** | `Contents: write`, `Pull requests: write` | `skills/plot/scripts/plot-host.sh`'s `pr-merge` subcommand via `plot-merger-token.mjs` |

**The bypass-list split is the point.** A lifecycle push writes bookkeeping
straight to the default branch and is meant to step over branch protection —
that is what the Writer app is for. A merge is not: `pr-merge` already
refuses an unpinned merge (#1809), and keeping the Merger app off the bypass
list means its merge is still held to `validate` and `plot/review` on the
pinned head, exactly as a human's PR merge would be. Putting the Merger app
on the bypass list would silently re-open #1730 with a different identity
attached to it.

**Two Apps, never one.** A single credential authorized for both jobs would
have to sit on the bypass list to write bookkeeping, and that same bypass
status would let it merge past the required checks. `plot-app-key.mjs`
refuses a configuration that names the same App id for both `Writer app` and
`Merger app` — two jobs on one credential is forbidden, not merely
discouraged, because the whole reason two Apps exist is that one of them
bypasses and the other must not.

## One-time setup

Both Apps reuse the RS256-JWT-then-installation-token exchange already
built for the `Review app` (`skills/plot/scripts/plot-github-app-token.mjs`,
extracted from `plot-commit-status.mjs`). Repeat these steps once per App.

1. **Create a narrow GitHub App** — `plot-writer` for the Writer app,
   `plot-merger` for the Merger app. Not `plot-review` (that App only writes
   commit statuses) and not `plot-board-builder` (its key lives in Actions
   secrets and is already on the bypass list for a different reason — reusing
   it here would make an audit of "what can bypass review" need to check two
   unrelated purposes instead of one). Grant exactly:
   - **Writer app:** *Contents:* write. No other permission, no webhook.
   - **Merger app:** *Contents:* write, *Pull requests:* write. No webhook.

   Install each on this repository only.

2. **Put the Writer app, and only the Writer app, on the ruleset bypass
   list.** On the default branch's ruleset, add the Writer app's integration
   ID to the bypass actors. Do **not** add the Merger app — its merges must
   clear `validate` and `plot/review` like any other merge, which is the
   entire reason #1730 is closed by this change rather than reopened under a
   new name.

3. **Store each key outside the repository.** Generate a private key per
   App and save it where the repository's `.gitignore` does not need to
   protect it — for example `~/.config/plot/plot-writer.<app-id>.private-key.pem`
   and `~/.config/plot/plot-merger.<app-id>.private-key.pem`, mode `600`.
   Neither key is ever committed.

4. **Record each App in `## Plot Config`:**

   ```
   - **Writer app:** <writer app id> <writer key path>
   - **Merger app:** <merger app id> <merger key path>
   ```

   Write both key paths as absolute paths — the resolver does not expand
   `~`, so `~/.config/plot/…` is refused with exit 4, the same refusal
   `Review app` already documents.

5. **Prove each write path before relying on it.** With no key recorded,
   `plot-push-main.sh` and `plot-host.sh pr-merge` on GitHub both refuse by
   name (exit 4) and attempt no push and no merge — confirm this first, so
   an absent key is never mistaken for "no Writer/Merger app needed here."
   With the key recorded, push a disposable branch at the default branch and
   confirm the commit's push shows the App's bot identity; merge a scratch PR
   through `plot-host.sh pr-merge` and confirm the merge shows
   `<app-slug>[bot]`, not the signed-in maintainer.

## For this repository

Neither App exists yet. This branch ships the code and this document; it
does not create the Writer app or the Merger app, and it does not add
`Writer app` / `Merger app` lines to this repository's own `## Plot Config`
— those lines name App ids and key paths that do not exist until a person
completes the steps above. Until they do, `plot-push-main.sh` and
`plot-host.sh pr-merge` on GitHub refuse by name rather than falling back to
the signed-in identity, which is the same posture `Review app` held before
its own rollout reached step 4 above.
