# Round 1 — moderation

Subject: `docs/plans/2026-10-01-an-assignment-is-read-where-it-is-recorded.md` at `cff4c03f`. Jurors: `round1-skeptic.md`, `round1-operator.md`, `round1-layering.md`. Gate: `committed skeptic amend`, `committed operator proceed`, `committed layering amend`. Reconcile: `divided amend=skeptic,layering proceed=operator`.

## How the panel ran

One agent applied the three lenses in sequence; it ran as a fork that may not start subagents. The lenses share one reader, so their agreement is weaker evidence than three independent jurors.

## Evidence

- **Skeptic: executed in part.** Read `readQueue`, `refs-git.ts`, the loop's rejection path and `sliceHasMerged` on `origin/main`, and the supervisor log lines the plan cites.
- **Operator: read.** The tick-line format, the `--release` refusals and the log of the incident.
- **Layering: read.** `rules/queue.ts`, `refs-git.ts`, `docs/shell-and-domain.md`.

## Agreed

- The queue reads no manifest, and `assigned` for a live manifest is the right hold. A dead manifest must not hold a slice.
- The `--release` refusal on a live holder and the `stale-claim` message fix #1152 as reported.

## Disagreement, named

**Whether the plan explains its own strongest evidence.** The skeptic shows the second hand-over to `8111e3ec` needed its manifest branch to be empty (`free.ts:64-67`; `sliceHasMerged` answered `false`), and the rejected-push path writes no manifest (`plot-worker-loop.sh:2290-2292`). No slice names the writer that emptied it. The operator proceeds because both slices close the paths an operator meets. The layering lens does not weigh this; it amends for a different reason.

## Changes required by one lens, opposed by none

- **Layering:** the `plot: claim` prefix test sits in the refs adapter (slice 1) and in the loop (slice 2). The port returns subjects (`commitSubjects`); one rule (`claimTip`) classifies them; `orphanedClaims` moves to `rules/claim.ts` with `claimAnswer`.
- **Operator:** cite #1150 for the board's view; exclude a claim younger than one tick from `orphaned-claims`, or say why not.

## Blind spot

All three lenses read today's single incident and #1039's comments. None measured how often a manifest write and a claim push are more than one tick apart under normal load, which is the quantity #1039 says decides whether the gap is reachable without a stale ref in the way.

## What an amendment changes

1. Name the writer that emptied the manifest of `8111e3ec` between the two ticks, and either fix it in a slice or prove slice 2's refusal prevents it, with a test.
2. `commitSubjects` on the refs port, `claimTip` and `orphanedClaims` in `rules/claim.ts`; no prefix test outside the domain.
3. Cite #1150; age-bound the orphaned-claim report.
