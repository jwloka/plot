Position: amend
Evidence: executed

# Round 2: do the amendments hold, and is the plan buildable as written? (#1073)

The round-1 fixes for the compiler claim, `supervise` and the reachability of `prGate` all hold under measurement. The rewrite adds a new false claim in the reap half. The plan now calls three `reapable.ts` sites "real decision sites" that "do receive the new word". Measured: no producer on the estate can hand any of the three `not-asked`. The estate's actual reaper already answers the free-agent question with `merged`, on purpose, and the plan does not know this. The Done-when bullet written for those three sites is dead code if built. Worse, it makes a free agent's desk reapable by accident if built the obvious way. The producer's line citation is also stale: it was stale at the commit that wrote the plan, and it is stale on HEAD.

Tree: `main` at `6e54cc8b`. The plan was last written at `7a407b4a`. Scratch work ran in a detached worktree under the scratchpad with symlinked `node_modules`. The worktree is removed, and nothing was stashed. Node v24.21.0.

## What I ran and what it showed

### 1. The five-site table, line by line

| plan cites | on HEAD (and at plan commit `7a407b4a`) | verdict |
|---|---|---|
| `registryd-main.ts:342-350`, "the producer" | lines 335-349 are `mergeMemoOver`, the #1070 memo. The producer is **`:398-407`** (`prMerged: async (branch): Promise<MergeReading> => { tally.calls += 1; const answer = await merges.ask(branch); if (!answer.ok) return 'unreachable'; …`) | **wrong at the plan's own commit.** `git show 7a407b4a:…registryd-main.ts \| grep -n "prMerged: async"` → `398:`. The `:342` figure is round 1's, taken at `1a9c92be`, before `079ef078` inserted the memo |
| `gates.ts:104-110` (`prGate`) | exact; last arm is the bare `return` | holds |
| `reapable.ts:113` (`reapProblems`) | `if (readings.merge !== 'merged')` → `no-merged-pr` | line holds; its "decision site" status does not, see §4 |
| `reapable.ts:235` (`refDeletionProblems`) | same test | line holds; **no production caller at all**, see §4 |
| `reapable.ts:454` (`finishedWith`) | `noMergedPr: readings.merge === 'merged' ? 'false' : 'true'`, docstring `:446-450` | line holds; only caller feeds two values, see §4 |

### 2. A sixth site: grep for every read and every mint

```
$ grep -rnE "\.merge\b|MergeReading|prMerged|merge ===|merge !==|merge:" packages/domain/src packages/board/src  (non-test)
reapable.ts:113 / :235 / :454          the three reads above
gates.ts:105 / :106                    prGate
entities/worktree.ts:136               merge: evidence.hasMergedPr ? 'merged' : 'not-merged',   <- a SECOND minting site
supervisor.ts:186 / :332               world.merge(branch) / merge: (branch) => options.prMerged(branch)
registryd-main.ts:398                  the producer
```

No sixth TypeScript *read* exists. The plan's claim that the producer is "the only place a `MergeReading` is minted" is **false**. `entities/worktree.ts:136` mints one, and two shell scripts mint one and pass it into the TypeScript rule (§4).

### 3. The round-1 claims the rewrite now rests on, re-executed

```
# not-asked added to the union, nothing else
DOMAIN_TSC=0
BOARD_TSC=0
```
Holds: the compiler names nothing.

`supervise` on a free agent. I ran the probe with `supervise` imported from `src/rules/supervision.ts`:

```
DEAD FREE merge=unreachable decl=absent   -> defer/no-progress
   FAIL: The git host could not be asked whether a PR for `` merged. …
   FAIL: No changeset was added for ``. …
   FAIL: No plan names `` in its `## Branches` section. …
   FAIL: No declaration was written for ``. …
DEAD FREE merge=not-merged decl=absent    -> defer/no-progress
   FAIL: No merged PR for ``. The host holds no PR for this branch that has merged. Push the branch …
```

`supervision.ts:274` returns `leave/worker-alive` first. `isAgentFree` (`free.ts:65-67`) requires `state === 'running'`. So `prGate` is unreachable for a *live* free agent. It *is* reached for a dead branch-less agent, because `readTick` (`supervisor.ts:143-145`) filters no entry. **Both of the plan's reachability claims hold.**

### 4. The three `reapable.ts` sites: who can hand them `not-asked`?

Production callers, from `git grep` over `packages/*/src` and `skills/plot/scripts/*.sh`:

- `reapProblems`: `entities/worktree.ts:126`, which is two-valued (`hasMergedPr`). `transitions/worktree.ts:294` sits inside `observeWorktreeState`, which has **no caller outside its own module and `index.ts`**. `plot-reap.sh` imports `reapable.ts` directly (its comment: *"imported directly: node 24 strips the types"*) and passes a `merge` it builds in shell: `merge=not-merged` / `merge=merged`.
- `refDeletionProblems`: **no production caller.** `plot-release-refs.sh` now calls `finishedWith` (`:279-281`).
- `finishedWith`: `plot-release-refs.sh:281`, `merge: process.env.PLOT_MERGE`, where `:212-213` is `merge=not-merged; pr_merged "$br" && merge=merged`. The script loops behind `[ -n "$br" ] || continue` (`:199`).

The registryd producer's word flows to exactly one place: `DeskReadings.merge` → `gateFailures` → `prGate`. `git grep "desk\.merge"` finds only `supervision.ts:284`. **None of the three reap sites can receive `not-asked` from any producer on the estate.**

### 5. What the real reaper already does with a branch-less desk

`skills/plot/scripts/plot-reap.sh:641-659`, added in `6455c0e5` ("the reaper reaches a detached desk"):

```sh
  elif [ -z "$short" ] \
       && [ "$(git -C "$wt" rev-list --count "origin/$DEFAULT..HEAD" …)" = "0" ]; then
    # A DETACHED DESK HAS NOTHING TO LAND … `plot-dispatch.sh --start` cuts a free agent's
    # desk detached at `origin/<main>` because a free agent holds no slice … Reading it
    # through `no-merged-pr` would refuse every one of them forever …
    merge=merged; why="detached, nothing to land"
```

**The estate already answers "did a PR merge for a free agent's desk" by borrowing `merged`.** That is exactly the move the plan's rule forbids, *"a reading that was never taken says so"*. The answer is gated on a measurement (HEAD equals `origin/<main>`), and a detached desk with commits falls through to `not-merged` and is kept. The plan names neither this site nor this decision.

### 6. What the Done-when reap bullet does if built the obvious way

I ran the probe with `reapProblems` on a clean, dead, branch-less desk:

```
REAP free-desk merge=not-merged  -> ["no-merged-pr"]
REAP free-desk merge=unreachable -> ["no-merged-pr"]
REAP free-desk merge=not-asked   -> ["no-merged-pr"]
REAP free-desk merge=merged      -> []
```

`no-merged-pr` is the **only** refusal that holds such a desk. The bullet says the three sites must *"not answer `no-merged-pr` on `not-asked`"* and names no replacement. The literal build is therefore `refusals = []`, which makes the desk reapable. The rule would say this for any branch-less desk, including a detached desk that carries commits. The shell deliberately keeps that desk as `not-merged` (`:655-657`). The only other guard is `unpushed`, which is optional (`unpushed?:`, "absent means … nothing is refused on it"). The alternative is a new refusal word, which widens `ReapRefusalSchema`, a `z.enum` at `entities/worktree.ts:30`. That is a schema change the plan says it does not make.

The same bullet contradicts the plan's own "What this does NOT do": *"It does not change `reap`'s refusals. A free agent's desk is not reaped on this reading."*

### 7. The producer, and "it does not stop the call"

`registryd-main.ts:398-400` runs `tally.calls += 1`, then `merges.ask(branch)`. The producer can mint `not-asked` for `''` in only two ways:

- **before** `merges.ask`: the subprocess stops. This contradicts *"It does not stop the call"*, and it lowers `tally.calls`, the figure the supervisor's tick line prices (`8114f888`; `registryd-main.test.ts:1035` *"adds one per host call, answered or not"*).
- **after**: `answer.ok` is false for `''`, and the producer must re-test `branch === ''` to tell the result from an outage. The subprocess is then spent on purpose.

The plan picks neither option. Precedent for the first already exists in the same package: `queue-reading.ts:226` is `sliceHasMerged: entry.branch === '' ? false : await world.sliceHasMerged(entry.branch)`, and `supervision-report-reading.ts:109` skips `branch === ''`. The domain also has a word for this: `workflows/slice-spend.ts:69` → `refusal: 'no-branch'`.

### 8. The shell twin

```
$ bash -c '. skills/plot/scripts/plot-pr-merged.sh; pr_merged ""; echo $?'
pr_merged_empty_exit=0
$ … pr_open ""; echo $?
pr_open_empty_exit=0
$ gh pr list --head "" --state all --limit 3 --json number,headRefName,mergedAt
[{"headRefName":"plot/deliver-a-daemon-spends-within-its-means","mergedAt":"2026-09-29T19:11:48Z","number":1081}, …]
```

The mechanism: `_plot_merged_lookup` (`plot-pr-merged.sh:124-129`) runs `gh pr list --head "$br"`, and `--head ""` applies **no filter**. Any merged PR in the repository therefore answers `found`. `pr_open ""` has the same defect, and the plan does not mention it.

Every shell caller guards the empty string:

| caller | guard |
|---|---|
| `plot-reap.sh:639` | `[ -n "$short" ] && pr_merged "$short"` |
| `plot-reap.sh:921` (local branches loop) | `[ -n "$br" ] \|\| continue` |
| `plot-release-refs.sh:199` | `[ -n "$br" ] \|\| continue` |
| `plot-quiet-stretch.sh:157` | `[ -n "$br" ] \|\| continue` |
| `plot-dispatch.sh:3562` | branch comes from a plan's slice |

**So the disagreement is latent: no caller reaches it today.** The fix is not a corpus test. The *rule* is already shared: `pr_merged` asks `board/plot-landed.mjs` (`:105-115`). The two sides differ in their **lookup**: the shell sends `gh pr list --head ""` and the TypeScript side sends `plot-host.sh pr-merged ""`, which exits 1. CLAUDE.md's corpus tier is for *"a duplicated rule"*, and this is not one. A comparison would also need a live or stubbed `gh`. `test/reconcile/host.test.mjs` already stubs `gh`, and a contract test belongs there.

## What a measurement contradicts

1. **"The five REAL sites, each of which must be changed by hand."** Three of the five (`reapable.ts:113`, `:235`, `:454`) cannot receive `not-asked` from any producer on the estate (§4). `refDeletionProblems` has no production caller at all. The round-1 note says *"`reap`'s three refusal paths do receive the new word"*. That is true of the type and false of the program.

2. **"`registryd-main.ts:342-350` — the producer — the only place a `MergeReading` is minted."** The producer sits at `:398-407`, at the plan's own commit and on HEAD, and `:342-350` is the memo. The Done-when bullet repeats the stale line. `entities/worktree.ts:136`, `plot-reap.sh:636-659` and `plot-release-refs.sh:212-213` also mint a reading.

3. **Done when: "`reapProblems`, `refDeletionProblems` and `finishedWith` do not answer `no-merged-pr` on `not-asked`"** contradicts **"It does not change `reap`'s refusals. A free agent's desk is not reaped on this reading."** Built literally, the bullet leaves a clean, dead, branch-less desk with **zero** refusals (§6). A detached desk that carries commits would lose the `not-merged` hold the shell reaper gives it on purpose.

4. **The plan's rule against borrowing a word is already broken for the reap path, deliberately, and the plan does not say so.** `plot-reap.sh:659` answers `merged` for a free desk that is detached at main, and `6455c0e5` argues why. A plan that adds `not-asked` "so no reading borrows a word" must say whether the reaper keeps `merged` there. If the reaper switches to `not-asked` and `reapProblems` refuses on it, `6455c0e5` regresses: every free desk is refused forever.

5. **"It does not stop the call."** No producer implementation both mints `not-asked` and keeps the call without a redundant subprocess (§7). The plan must pick one, and the choice moves `tally.calls`.

6. **"The shell twin's disagreement … add the corpus test."** The corpus test is the wrong tier, because the rule is already one bundle and the lookups differ (§8). The disagreement is also latent, because every caller guards `""`. `pr_open ""` has the same defect.

## What it must say before someone builds it

1. **Change the producer citation** to `registryd-main.ts:398-407` (`worldForRepo`'s `prMerged`) in the table and in Done-when. Drop "the only place a `MergeReading` is minted", and list `entities/worktree.ts:136`, `plot-reap.sh:636-659` and `plot-release-refs.sh:212-213` as the other minting sites.

2. **Decide where the producer tests `branch === ''`, and write the decision down.** Before `tally.calls += 1` and `merges.ask`: the call stops, "it does not stop the call" is deleted, and the tick-line test gains a case where a free agent spends zero calls. `queue-reading.ts:226` is the precedent. After the call: say why a local refusal is kept on purpose. I recommend the first option.

3. **Scope the reap half down to what a producer can reach.** State that the only live consumer of the registryd word is `prGate`. Then either leave `reapable.ts:113/:235/:454` unchanged and say why, since no caller passes `not-asked`, or change them. A change must **refuse** on `not-asked`, with an existing or new refusal word, and never drop to `[]`. Any new word is a `ReapRefusalSchema` change and must be declared as one. Delete the bullet as worded: "do not answer `no-merged-pr`" without a replacement is the instruction that makes a desk reapable.

4. **Name `plot-reap.sh:641-659` and say what happens to it.** The recommended answer: the reaper keeps `merged` for a detached desk at main, because that answer rests on a measurement (HEAD equals `origin/<main>`), while `not-asked` only says that no branch exists. Otherwise the plan owes the regression argument against `6455c0e5`.

5. **Rewrite the shell-twin bullet** to name the lookup defect: `gh pr list --head ""` is unfiltered. Say that `pr_open ""` shares it and that all five callers guard `""`. The fix is a one-line empty guard in `_plot_merged_lookup` and `_plot_open_lookup`, answering `unaskable` or `none`, with a stubbed-`gh` contract test in `test/reconcile/`. A second option is to file it separately. Drop "add the corpus test".

6. **Mark which Done-when bullets are tests and which are review.**
   - Assertable: the producer case (the stubbed `plot-host.sh` pattern at `registryd-main.test.ts:1035-1055`), the `prGate` wording (`gates.test.ts`, including the dead-free-agent `supervise` case above), and "the three words behave unchanged".
   - **Not assertable:** "each [site] is named in the diff". It is a review criterion and should say so, per this repo's rule/gate distinction.
   - **Vacuous if built:** the reap bullet (item 3), because no production path can fail it.

## What executing revealed that reading would not

The rewrite reads as the careful response to round 1: it lists five sites, it warns that "a green build is not evidence", and it asks the builder to decide per site. Reading `reapable.ts` confirms each line says what the table claims. Only a trace from the *producer* forward, rather than from the *type* outward, shows that three of the five are islands. Their callers are a two-valued entity, a function with no caller, and two shell scripts that mint their own words. The one caller that matters, `plot-reap.sh`, solved the free-desk case a week ago by borrowing `merged` behind a measurement. No grep for `MergeReading` finds it, because the shell passes a string.

A four-line `reapProblems` probe showed the practical danger. On a clean, dead, branch-less desk, `no-merged-pr` is the only refusal present. A builder who follows the reap bullet faithfully writes a reap permit and the suite stays green.

The stale producer line was found by `git show 7a407b4a:… | grep -n "prMerged: async"`. The plan copied round 1's number from an older tree, and the memo, the very sibling this plan follows up, had moved it 56 lines.

**Amend, not reject.** The producer arm and the `prGate` arm are right, reachable (for a dead branch-less agent) and assertable. Those two, plus a decision on where the producer tests `''`, are a buildable slice. The reap half needs a scope-down or an explicit refusal word before anyone builds it.
