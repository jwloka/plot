# Round 2 — skeptic (reproduces against origin/main)

Subject: `docs/plans/2026-10-01-an-open-board-follows-a-sprint-change.md` at `6e1ba683`, amended after round 1.

Position: amend

## What I ran

A scratch browser test (never committed, removed after the run) against the artifact on `origin/main` at `6e1ba683`, built on the catalogue's `route` option with a mutable flag, as the amended slice names. Payload A: `sprint-a` active, row `bug/a` (plan-a). Payload B: `sprint-b` active, rows `bug/a` and `bug/b`. The test checks `sprint-a`, switches to B, then back to A.

Measured: after the switch `toggleB=false`, `data-sprint-hidden=2`, rows shown `[]`. After the switch back `toggleA=true`, `data-sprint-hidden=0`, rows shown `[bug/a]`.

## Round 1 answered

- Every plan row hidden, the closed sprint's member included: in Motivation, measured again here.
- `sanitizeSelection` instead of a new rule, the `builds:` annotation and the order clause gone: done.
- The `route` mechanism named, `data-sprint-hidden` absent asserted: done; the attribute renders only while a report exists (`SprintFilter.tsx:209-212`), so absent is the right assertion.
- Re-engagement: confirmed on `origin/main`. After the switch back the box reads checked again although the reader never touched it in that state.

## Finding

1. **The switch-back assertion does not discriminate as written.** The slice says the test "flips the flag back so A is active again and asserts A's box is unchecked and both rows stay visible". If the flag returns to the first payload, it carries `bug/a` only, so "both rows" cannot hold, and the visible-rows half passes with or without the prune (measured: `hidden=0`). The switch-back payload must carry A active with `bug/a` and a row outside A (`bug/b`), so that a re-engaged filter hides `bug/b` and the assertion fails on `origin/main`. Name that payload in the slice.

## Commitment

Amend: one Done-when assertion needs a named third payload to fail on `origin/main`.
