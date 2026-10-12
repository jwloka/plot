# Round 3 — layering

Position: proceed
Evidence: read

Subject: the plan at `773ce012`. I read `packages/board/src/server/entry/slice-spend.ts`, `docs/shell-and-domain.md` §1, and the vendor gate at `.github/workflows/ci.yml:299-306`.

**How this round ran:** the agent that wrote the round-2 amendment also wrote this verdict. Weigh it as a self-review.

## Round 2 answered

- The three shell decisions — wait allowed, without progress, which ending — move into the rule's one answer (`wait`, `end-limited` with its cause, `unstarted`, `ran`), so all of them sit under the 100% branch gate: **yes**.
- Epoch seconds beside the ISO instant in the answer and in `.plot-worker.limited`: **yes**.
- Slice 1 amends `docs/shell-and-domain.md` §1: **yes**. The amendment does not contradict the document: §1 objects to a hop on every idle pass, and this call is made once per prompt exit, which the plan states.
- The adapter is a constant with no function; the entry picks the harness's entry and passes it to the rule, which is the shape `entry/slice-spend.ts` already has: **yes**.

## Checks

- The vendor gate's list is `github|bitbucket|gitlab|jenkins|jira|gitea|trello|linear`; the harness name and its strings live in `adapters/harness/`, which the gate excludes, so the rule stays clean.
- The rule takes readings as values (status, now, bound, run time, wait flag, commit count), the domain's stated shape.

## Note

The commit count is a reading the loop takes; the base it counts from (the `HEAD` at the start of the wait) should be named in slice 2 so the reading is reproducible. The skeptic's grace-window contradiction is a wording fix inside the rule's own test list.
