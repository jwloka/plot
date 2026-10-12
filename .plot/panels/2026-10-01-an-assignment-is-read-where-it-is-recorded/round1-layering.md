# Round 1 — domain and layering

Subject: `docs/plans/2026-10-01-an-assignment-is-read-where-it-is-recorded.md` at `cff4c03f`.

Position: amend

## What I read

`packages/domain/src/rules/queue.ts` (`QueueHold` `:102-123`, `whyNotReady` `:205-210`, `QUEUE_HOLDS` `:138-144`), `refs-git.ts:149-156`, `docs/shell-and-domain.md` (the cost rule), CLAUDE.md "The Layering Rule".

## Findings

- `assignedTo`, the `assigned` hold and `claimAnswer` are pure rules taking readings as values. Correct shape.
- **The claim-only decision sits in two places outside the domain.** Slice 1 puts `claimOnly` in `refs-git.ts`, so the adapter decides whether a subject list is "only claims". Slice 2 has the loop derive `refTip` from `git log` subjects in shell. Both classify by the `plot: claim ` prefix. That is one decision with two shell-side copies and none in the domain. The port should return the subjects (`commitSubjects(range)`), and one rule (`claimTip(subjects)` beside `claimAnswer`) classifies them. The loop passes the subjects to the bundle on stdin.
- `orphanedClaims` lives in `queue.ts`; it reads claims, not the queue. Put it in `rules/claim.ts` with `claimAnswer`, so the claim vocabulary has one home.
- The new bundle is justified by the cost rule (once per operator command or rejected push). Name it in the CLAUDE.md helper-script table as the other bundles are.

## Required

1. `commitSubjects` on the refs port, `claimTip` in `rules/claim.ts`; no `plot: claim` prefix test outside the domain.
2. `orphanedClaims` moves to `rules/claim.ts`.
