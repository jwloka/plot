# Round 2 — operator reading the board

Subject: `docs/plans/2026-10-01-an-open-board-follows-a-sprint-change.md` at `6e1ba683`.

Position: amend

## What I read

The amended Approach, `activeSprints` (`fleet.ts:7597-7606`) and its call at `:7764-7766`, `workingTreeSprints`, and the skeptic's round-2 output. I ran nothing of my own.

## Round 1 answered

My round-1 finding asked for a decision on a retained slug. The plan decides: prune. The off state stays truthful, and the new sprint is not auto-selected.

## Finding

1. **The prune turns a one-poll empty answer into a lost selection.** `workingTreeSprints` answers `[]` when `docs/sprints/active/` is missing or unreadable (`if (!fs.existsSync(dir)) return []`, `catch { return []; }`), and skips a link whose target does not resolve. The main checkout's tree changes under the board: today alone this session fast-forwarded it four times, and a checkout or a rebase there removes and recreates the active link. One poll that reads during that window carries `sprints: []`; the effect then empties the stored `Set`, and the next poll's correct answer cannot bring the selection back. The derivation alone recovers on the next poll. The plan must state this trade and choose: prune only when a payload carries at least one active sprint and the selected slug is absent from it, or prune only after the slug is absent on two consecutive polls, or keep the derivation and drop the prune, accepting re-engagement. Whatever it picks, one test drives a payload with `sprints: []` between two payloads carrying the selected sprint and asserts the outcome.

## Commitment

Amend: the prune needs a stated rule for an empty sprint list.
