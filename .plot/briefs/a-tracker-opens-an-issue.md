## Implementation brief — the-fleet-verifies-what-it-delivered ("The run and the tracker write")

- **Plan (canonical):** [docs/plans/active/the-fleet-verifies-what-it-delivered.md](../../docs/plans/active/the-fleet-verifies-what-it-delivered.md) on `main`
- **Approved:** 2026-10-12, Jan Wloka, plan-PR #1608 merged
- **Branch:** `feature/a-tracker-opens-an-issue` (base: `main`)
- **Ends as:** one PR to `main`
- **Review of the code:** standard PR review

This slice is grouped under "The run and the tracker write" alongside `feature/the-fleet-verifies-a-delivered-plan` (a separate, unrelated branch building the verify run itself — don't pull its scope in here). Its `<!-- waits: feature/the-tracker-lists-closed-issues -->` annotation is satisfied: that branch merged as PR #1653, and the spike it itself depended on, `feature/the-fleet-indexes-issues`, merged as PR #1647. Both are confirmed on `main`. This branch is unclaimed, unblocked, and the only thing blocking it is gone. The next wave, "The issues" (`feature/a-refuted-claim-opens-an-issue`), builds directly on the `issueOpen` method this branch ships — so its shape (the `{ title, body, labels }` write and its `PortResult<...>` outcomes) is itself a contract another branch will consume, not an internal detail.

### What to build

The tracker port can read issues and write exactly one fact back (a PR's status, via `statusWrite`) — and nothing else, by design (`ports/tracker.ts:46-118`). This slice adds the second and last sanctioned write: `issueOpen({ title, body, labels })`, which the verify workflow's next slice will call once per refuted claim. Concretely:

1. **`Tracker.issueOpen(write: IssueOpen): Promise<PortResult<IssueOpenOutcome>>`** on the port (`packages/domain/src/ports/tracker.ts`). Define `IssueOpen` (`title: string`, `body: string`, `labels: readonly string[]`) and `IssueOpenOutcome` (most likely just `'opened'` carrying the new issue's number — follow the existing `StatusOutcome` pattern's shape, where the type documents what happened and the number travels in a value field; check whether `PortResult<T>`'s `T` should be `{ outcome: 'opened'; number: number }` or whether a plain number suffices, since no sibling write yet returns an identifier and this is the first).
2. **`trackerJira` and `trackerGithub`** (`adapters/tracker/tracker-jira.ts`, `tracker-github.ts`) implement `issueOpen` by calling a new `plot-host.sh issue-open` op, following `statusWrite`'s existing pattern exactly: Jira's `statusWrite` resolves a key and calls `runProcess('bash', [host, 'issue-status', key, write.status], run)`, treating exit 4 as `unaskable`; GitHub's `statusWrite` checks for a target and calls through `plot-host.sh` similarly. `issueOpen` has no "which PR" resolution step — it is a fresh write with its own payload — so the shell call is simpler, but the exit-code convention (0 = answered, 4 = unaskable, other = failed) carries over unchanged.
3. **`trackerGitHost`** (`adapters/tracker/tracker-resolve.ts:95-108`) gets an `issueOpen` arm mirroring its existing `statusWrite` arm exactly:
   ```typescript
   issueOpen: async (): Promise<PortResult<IssueOpenOutcome>> =>
     unaskable("no Tracker declared; the git host's issues are read-only to Plot"),
   ```
   This is the same sentence `statusWrite` already uses on this connector — reuse it verbatim, don't paraphrase a second one.
4. **`trackerNone`** (`adapters/tracker/tracker-none.ts:28-39`) gets an `issueOpen` arm identical in shape to its existing `statusWrite`/`issueList` arms: `async (): Promise<PortResult<IssueOpenOutcome>> => unaskable(reason)`.
5. **`plot-host.sh` gains an `issue-open` op** for `jira` and `github-issues` backends (Bitbucket is out of scope — nothing in this slice's Acceptance exercises it, and the plan's Motivation names only jira/github-issues for this write). Follow `issue-status`'s existing structure (`plot-host.sh:4978-5010` roughly — the op reads its args, resolves the backend, and either runs the host CLI or exits 4 with a stated reason). Add `issue-open` to the usage comment block (`:363` area, beside the existing `issue-status   THE ONE WRITE TO A TRACKER:` line — that comment needs to say there are now two) and to the dispatcher's unknown-op error message (`:5299`).
6. **The verify workflow's port resolution.** The *next* slice (`feature/a-refuted-claim-opens-an-issue`) is the one that actually calls `issueOpen` from a workflow — this slice does not build that call site. What this slice must confirm is that `trackerForIssues(declared, gitHost, context)` (`adapters/tracker/tracker-resolve.ts:149-155`, re-exported from `adapters/index.ts`) already resolves to a `Tracker` whose `issueOpen` now answers correctly for all three `issueSource` arms (`tracker` → the declared connector; `git-host` → `trackerGitHost`, `unaskable`; `nobody` → `trackerNone`, `unaskable` with the source's reason) — no new resolver is needed, only that the existing one's return type now satisfies the widened `Tracker` interface.
7. **The five sites that refuse any tracker write beyond `statusWrite`** must each gain a sentence naming `issueOpen` as the sanctioned second write — see the next section for their exact current text and why each matters.

Close by pointing at the plan: `## Design` → "Issues for refuted claims" and `## Motivation`'s five-sites bullet are canonical; this is orientation.

### Decisions already made — do not re-derive them

**The five sites, located and quoted, so you amend the real text rather than guessing at stale line numbers.** The plan's Motivation cites `tracker.ts:31-40`, `:84-88`, `:126-129` — those exact ranges have drifted since the plan was written (the file has grown with doc comments since). The current locations, verified 2026-10-13:

- `packages/domain/src/ports/tracker.ts:52` — the `StatusWrite` interface doc: *"Widening this to a body, a label or an assignee is the mirror this port exists to refuse."* This sentence is now wrong as written: `issueOpen` *is* a body and labels, sanctioned. Amend it to name `issueOpen` as the one exception, not contradict it.
- `packages/domain/src/ports/tracker.ts:114-118` — the `Tracker` interface's own doc: *"THE WRITE IS ONE FACT AND STAYS ONE. Plot writes a status to the tracker it was told about and writes nothing else — no ticket, no comment, no label, no transition it was not asked for."* This is the core claim that needs to become "one fact, and one issue-open" rather than "one fact, period."
- `packages/domain/src/ports/tracker.ts:171-187` — `statusWrite`'s own doc: *"THE ONE WRITE ON THIS PORT. It is allowed where creating and closing tickets is not, for the reason the read-only rule was written to protect…"* This sentence is the most directly falsified — `issueOpen` is now a second allowed write, created for a different, newly-argued reason (the verify workflow's own fact about a claim, not a mirror of tracker state). State both reasons side by side rather than deleting the old one — `statusWrite`'s reason (idempotent, Plot is the authority on a status it just caused) still holds and still differs from `issueOpen`'s (opening an issue is not idempotent on its own, which is exactly why the verify workflow tracks numbers in `.plot/state/verify/<slug>.json` rather than relying on the port to dedupe).
- `skills/plot/scripts/plot-host.sh:363` (usage comment) — *"issue-status <key> <status>   THE ONE WRITE TO A TRACKER: record one status"*. Add the `issue-open` line beside it and drop "THE ONE WRITE" phrasing (or amend it to name both).
- `skills/plot/scripts/plot-host.sh:5299` (the dispatcher's unknown-op death message, currently listing `backend|default-branch|pr-state|pr-create|pr-merge|pr-list|issue-list|issue-view|issue-status|pr-body|rate-limit|limit|ci-limit|spend-rate`) — add `issue-open` to the list.
- `skills/plot-deliver/SKILL.md:450` area — this file's `tracker=` field table documents **`statusWrite`'s** outcomes for `/plot-deliver`'s own status write, a different write on a different code path (delivery's status write, not verify's issue-open). Re-check whether the plan's citation of this file as one of the "five sites" is about this table specifically, or about a different sentence nearby that states the write-count claim in prose rather than a table; if you can't find a sentence here making the "one write" claim the other four sites make, say so in your PR description rather than silently skipping it — it's possible the plan's citation has drifted onto the wrong file section as the SKILL.md was edited since 2026-10-12.

**Why `issueOpen` doesn't dedupe itself.** Opening an issue is not idempotent the way `statusWrite` is (the same status written twice is the same status; the same issue opened twice is two issues). That's why the plan puts idempotency in the *caller* — the next slice's `.plot/state/verify/<slug>.json` tracking, written before the push — rather than asking this port to detect a duplicate. Don't add dedup logic to `issueOpen` itself; it answers exactly what it's asked, every time.

**Why `trackerGitHost` and `trackerNone` both answer `unaskable`, never `failed`, for `issueOpen`.** This is the established pattern from `statusWrite` and every read on `trackerGitHost`: a repository that declared no tracker was never asked to open anything, so there is nothing that broke — `unaskable` with a reason is the correct outcome, not `failed`. `PortResult`'s `reason` field (shipped by the dependency slice, confirmed live: `port-result.ts`'s `unaskable(reason?: string)`) is what carries the sentence; use it on both.

**Rules carried over unchanged, worth not re-breaking:**
- Absent is not false: `unaskable` is a real, permanent answer for a repository with no tracker to ask — never collapse it into an empty success.
- Exit 4 from `plot-host.sh` means "this host cannot be asked at all" — a config fact, not a failure to retry. `issue-open`'s shell op follows the same exit-code contract as every other op on this script.
- The adapter is the only place that reaches `plot-host.sh`; the port stays a pure interface with no runtime code of its own (`CLAUDE.md` *The Layering Rule*).

### Done when

The plan's `## Acceptance` → "The run and the tracker write" bullet is the exact specification for this slice's share:

> `issueOpen` through `trackerGitHost` and `trackerNone` answers `unaskable` with its reason sentence, and `plot-host.sh issue-open` opens one issue on a stubbed `github-issues` host.

Concretely: a unit test per `unaskable` arm (`trackerGitHost`, `trackerNone`) asserting both the `why` and the `reason` string; a contract test for `plot-host.sh issue-open` against a stubbed `gh` (or equivalent harness the existing `issue-status` contract tests use) proving it returns an issue number on success and exits 4 with a reason when the backend can't be asked (if Jira's `issue-open` needs its own stub, mirror whatever harness `issue-status`'s existing Jira test already uses — don't invent a new one).

Plus the repo's own gates: a changeset with `bumps: plot: patch` (or the matching skill bump if a skill doc changes), written description-first with the `bumps:` block last (`CLAUDE.md` *Versioning* — 11% of past changesets got this backwards and were refused). Run `node skills/plot/scripts/board/plot-local-checks.mjs` before each push and run what it prints — it resolves the related tests and typecheck for `packages/domain` (where most of this lands) plus the relevant `scripts/check-*.sh` gates. The suites under the `CI suites` config key run in CI on this PR — don't run them locally (`CLAUDE.md` *Testing*). A failure there comes back as a correction.

Name the shell gate explicitly since this slice touches `plot-host.sh`: `scripts/check-shell-lines.sh` refuses a PR that grows the shipped shell under `skills/` past its merge base. A new `issue-open` op adds real lines with nothing obvious to remove in the same file — if your diff lands positive, the fallback is the same one named in this plan's sibling briefs: move the op's logic (payload construction, the jira/github branch) into the TypeScript adapter and leave the shell call as thin as `issue-status`'s own `bash` invocation. The gate stores no number and grants no exemption.

### Bookkeeping

Open the PR through the controller, never `gh pr create`:

```bash
skills/plot/scripts/plot-open-pr.sh          # current branch
skills/plot/scripts/plot-open-pr.sh --draft  # while work is still moving
```

It reads which plan names this branch and opens the PR with the slice heading as title, the plan and this brief in the body. Push the first real commit as soon as it exists — a branch with no PR and no commits is invisible to the fleet. Once the PR exists, append `→ #<number>` to this branch's line in the plan's `## Slices` section (heading "The run and the tracker write", `feature/a-tracker-opens-an-issue` line).

### Scope guard

This branch owns:
- `packages/domain/src/ports/tracker.ts` — `issueOpen` on `Tracker`, the `IssueOpen`/`IssueOpenOutcome` types, and the five-sites doc amendments on this file (`:52`, `:114-118`, `:171-187`)
- `packages/domain/src/adapters/tracker/tracker-jira.ts`, `tracker-github.ts` — `issueOpen` implementations calling the new shell op
- `packages/domain/src/adapters/tracker/tracker-resolve.ts` — `issueOpen` on `trackerGitHost`
- `packages/domain/src/adapters/tracker/tracker-none.ts` — `issueOpen` on `trackerNone`
- `skills/plot/scripts/plot-host.sh` — the new `issue-open` op (jira, github-issues) and the two refusal-site amendments (`:363` area, `:5299`)
- `skills/plot-deliver/SKILL.md` — the fifth site's amendment (confirm exact location per the note above; report if it's not found where the plan expects)
- Contract/unit tests for the above
- A changeset file

**Do not build:** the verify workflow's actual call site that opens one issue per refuted claim, the `.plot/state/verify/<slug>.json` number-tracking, the idempotent re-verification-by-claim-text logic, or the `ai-generated` label application at the call site — all of that is the next wave's branch, `feature/a-refuted-claim-opens-an-issue`, which consumes this slice's `issueOpen` as a finished contract. Do not touch the verify run itself (`feature/the-fleet-verifies-a-delivered-plan`, a sibling in this same heading but a separate branch) or anything under `feature/the-tracker-lists-closed-issues`'s already-merged scope (`issueListClosed`, the Jira page loop, `closedAt`). If you find something the plan did not anticipate, report it rather than improvising outside scope.
