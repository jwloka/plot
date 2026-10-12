# Round 3 — skeptic

Position: amend
Evidence: executed

Subject: `docs/plans/2026-10-01-a-usage-limit-is-not-a-broken-prompt.md` at `773ce012`. Scratch dir `scratchpad/j1141r3`; no real harness run, no usage spent.

**How this round ran:** the agent that wrote the round-2 amendment also wrote this verdict, because it could not start separate juror agents. Weigh it as a self-review.

## Executed

- **Capture with process substitution keeps the kill path.** `bash -c '…; sleep 30; exit 7' > >(tee -a "$out") 2>&1 &`, then a kill of `$!` and its children: no `sleep 30` survived on bash 3.2.57 or 5.3.15, and a plain run returned status 7 through `wait` on both.
- **The capture is complete after `wait`.** A prompt that prints five lines and then the #1141 line, captured the same way: the last line of `$out` was the limit line in 200 of 200 runs on bash 3.2.57 and 200 of 200 on 5.3.15. The status-0 positional rule therefore does not depend on luck in the flush.

## Round 2 answered

1. Capture construct named, `_prompt_child` stays the prompt, bound test added: **yes**.
2. Status-0 positional rule, with a quoted-line test answering `ran`: **yes**.
3. Entry in `packages/board/src/server/entry/`, listing-paging precedent dropped: **yes** (`entry/slice-spend.ts` imports domain rules and adapters the same way).
4. `fast limit` and `monthly spend limit` named and decided: **yes**, they read as limits and end with `no-reset` when the reset cannot be read.
5. Progress counts commits only, stated as a choice with its reason: **yes**.

## New defect

**The 120 s grace contradicts the `wait` condition.** The reset reading says *"A reset up to 120 s in the past is now"*, and the answer table says `wait` needs *"a known reset in the future"*; *"When a wait is allowed"* repeats *"a known reset no more than `Worker bound` seconds away"*. A reset that resolves to now is not in the future, so a literal implementation answers `end-limited` for the exact case the grace exists for: a limit message read seconds after its reset time. The slice-1 test *"a reset 60 s past is now"* names no answer, so it cannot catch it. The fix is one sentence: `wait` needs a reset at or after now, and the test asserts `wait` with a sleep of the margin.

## Note

The loop must remember the desk's `HEAD` at the start of a wait to count *"commits since that wait"*; the plan names the count and not where its base comes from. An implementer resolves it, so it does not block.
