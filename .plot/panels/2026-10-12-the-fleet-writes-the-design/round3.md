# Panel round 3 — the-fleet-writes-the-design

Reconciliation: unanimous amend (estate, contradiction, deliverable, cost), read at main 1ad9a9f4f. Every juror confirms that the round-2 amendments and D34 are applied; D31–D33 do not concern this plan. Nearly every estate citation holds. The findings are about the order of the start rule, the restart under `Auto-design: false`, the shared row, and a second writer.

## What two or more jurors found

- **A host read on every pulse.** `specStart` checks `declined` and `host-unknown` before `halted`, `stopped`, `waiting` and the slot refusals, and the domain takes readings as values, so fleetd must read `prState` on every 60 s pulse for every waiting Design plan — about 1440 host calls a day for one stopped plan (cost, estate; contradiction notes the cost line omits it). Fix: the host read is the last check before the claim; add a zero-host-call Acceptance case.
- **A restart after a closed spec PR does not start a run.** The closed PR still answers `prState('idea/<slug>-spec')` (`plot-host.sh:3557` returns the newest PR), so the next pass writes `declined` again; plan lines 64 and 100 disagree on which wins, and no Acceptance case proves "closed PR → restart → next pass starts a run" (contradiction, deliverable). Fix: the restart mark wins over a PR that closed before the mark; test it.
- **No *Working* row exists.** The sibling builds its plan-level row for *Waiting on you* only, and its shape does not carry `specRow`'s per-row `fleetHalted` (cost, estate, deliverable, contradiction). Moderation: `the-board-has-three-tabs` builds the plan-level row for both sections with a shared shape (`kind`, `plan`, `reason`, `log`, `restart`, `stopped`, `halted`); this plan's rows slice renders through it.
- **Two writers on one store.** `plot-design.mjs restart` writes the machine-local store fleetd writes; `updateVerifyState`-style updates are atomic per process only, so an update can be lost (estate, contradiction). Fix: the restart writes a separate mark file fleetd consumes, or takes the same file lock.

## Raised by one juror

- **The restart cannot start under `Auto-design: false`.** `specStart` refuses `off` first and a restart mark does not pass `off`, so in this repository — which ships `Auto-design: false` — nothing can start a spec agent once *Commission design* is removed; Changelog 6 and Open Point 3 assume it can (contradiction). See the decision below.
- A `pr-not-opened` failure keeps the `work` ref, `designWork` then answers `none`, and the promised two retries never happen; the Changelog and cost line still promise them (cost).
- A `work` spec ref with no PR and no run record on this machine (another machine died after the push) shows nothing and counts no failure (contradiction).
- The removal slice waits behind the rows slice, which waits on the Draft sibling; move it ahead (deliverable).
- Wording: the cost line, Changelog 3 (`Impl: same branch`, `Review: NONE`), Changelog 5 "whole fleet" against Open Point 4 "per machine", stale story Open Points 9 and 10 and DESIGN-phases §6 and §8, `auto-verify.test.ts:249`, `trees.ts:419`.

## Decision for the person

- **A person's restart under `Auto-design: false`.** Either `restart` is a person's act that passes `off` once (recommended: the person decides, as D3 asks, and the verify run has its own hand route), or the repository must turn `Auto-design` on to get any spec run.

## Amendments for round 4 (or approval)

1. Move the host read last in `specStart`; zero-host-call Acceptance case.
2. The restart mark wins over a PR closed before it; test the closed → restart → run sequence.
3. Render through the sibling's shared plan-level row in *Working* and *Waiting on you*; drop the per-row `fleetHalted` in favour of the shared `halted`.
4. One writer: a separate mark file or a shared lock.
5. Record the decision above and apply it to `specStart`, Changelog 6 and Open Point 3.
6. Make `pr-not-opened` retryable (or stop promising retries), and show an orphan `work` ref.
7. Move the removal slice ahead of the rows slice; fix the wording list.
