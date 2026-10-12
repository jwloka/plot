# Round 3 — moderation

Subject: `docs/plans/2026-10-01-a-usage-limit-is-not-a-broken-prompt.md` at `773ce012`.

Gate: `committed skeptic amend`, `committed operator proceed`, `committed layering proceed`. Reconcile: `divided amend=skeptic proceed=operator,layering`.

## How this round ran

One agent wrote the round-2 amendment and then all three verdicts, in sequence; it could not start separate juror agents. This round is a self-review of an amendment by its author, and its `proceed` positions are weaker evidence than rounds 1 and 2, which used separate jurors.

## Evidence

- **Skeptic: executed.** Process-substitution capture on bash 3.2.57 and 5.3.15: the kill reaches the prompt, `wait` returns the prompt's status, and the limit line is the capture's last line after `wait` in 200 of 200 runs on each.
- **Operator: read.** `plot-fleetctl.sh:760-800`, `tuple-row.ts:930-950`, `findings.ts:39-43`, `rules/supervision.ts`.
- **Layering: read.** `entry/slice-spend.ts`, `docs/shell-and-domain.md` §1, the vendor gate at `ci.yml:299-306`.

## Round 2 answered

All three find every round-2 item answered: the capture construct and its bound test, the status-0 positional rule and its quoted-line test, the entry location, the fast and monthly-spend limits, the commit-only progress choice, the `--status` future-only line and its test, the `busy` clamp, the narrowed citation, the three decisions moved into the rule, epoch seconds, the `docs/shell-and-domain.md` §1 amendment, and the board's view of a waiting agent.

## Disagreement

**Whether one contradiction needs another round.** The plan says *"A reset up to 120 s in the past is now"*, while `wait` requires *"a known reset in the future"*. Read literally, a limit message read seconds after its reset answers `end-limited` — the case the grace window exists for. The slice-1 test *"a reset 60 s past is now"* names no answer.

- **Skeptic (amend):** a worker resolving the contradiction by guessing can ship the wrong branch, and no listed test catches it.
- **Operator and layering (proceed):** the correction is one sentence — `wait` needs a reset at or after now, and the test asserts `wait` with a sleep of the margin — and the approval pass can carry it.

The jurors agree on the fix and disagree only on where it is made.

## Notes from two lenses

- The base for *"commits since that wait"* is the desk's `HEAD` at the start of the wait; slice 2 should name it (skeptic, layering).
- On the board, a waiting agent reads `running · idle`, the same word as a frozen child. The plan states this and defers the label (operator).

## Shared blind spot

All three lenses read the amendment against the round-2 findings. None re-read the parts round 2 accepted for regressions introduced by moving the decisions into the rule — for example, that the bundle now needs the run time and the wait flag on every exit, including exits from prompts that never waited.

## What a correction changes

1. `wait` requires a reset at or after now; the slice-1 test for a reset 60 s past asserts `wait` with a sleep equal to the margin.
2. Slice 2 names the `HEAD` recorded at the start of a wait as the base of the commit count.
