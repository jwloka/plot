# Round 3 check — the-fleet-writes-the-design

Position: proceed

Read at `origin/main` 112b29cb9 (plan) and 64a699821 (sibling). The local `main` checkout stands at `c9dba748e`, 2 commits behind, so every read used `git show origin/main:<path>`.

## Amendments

| Amendment | Status | Plan line |
|---|---|---|
| M1. Host read last in `specStart`; zero-host-call case (cost A1, estate A1) | applied | `:52` (`specStart` refuses on local readings, answers `ask-host`), `:53` (`specDeclined` after `ask-host`), `:66` (pass order), `:107` (cost line), `:151` (zero host calls for `stopped`, `halted`, `waiting`, `no-free-agent`) |
| M2. Restart wins over a PR closed before it; closed → restart → run test (contradiction A2, deliverable A3) | applied | `:53` (`answeredPr`), `:59`, `:96`, `:105`, `:153` (closed → restart → one run; declined, restarted, `no-commit`, retried, not declined again) |
| M3. Render through the shared row in *Working* and *Waiting on you*; drop `fleetHalted` (contradiction A3, deliverable A1, estate A2) | applied | `:25`, `:54` (no per-row `fleetHalted`), `:142` (`specRows`, `kind: 'spec'`), `:156` (`spec-row.test.ts` and browser test) |
| M4. One writer of the store (estate A3, contradiction A4) | applied | `:59` (shared and design-only fields), `:88` (mark file, reason over a lock), `:152` (a mark written during a pass folds on the next pass) |
| M5. D36 in `specStart`, Changelog 6 and Open Point 3 (contradiction A1) | applied | `:21`, `:42`, `:52`, `:105`, `:113`, `:119`, `:153` |
| M6. `pr-not-opened` retryable; orphan `work` ref shown (cost A2, contradiction A5) | applied | `:20`, `:51` (`open-pr`), `:80`, `:86`, `:92`, `:107`, `:149`, `:151` |
| M7. Removal slice ahead of rows slice; wording list (deliverable A2) | applied | `:136-142` (slice order), `:18` (`Review: NONE`, `Impl: same branch`), `:20` (on each machine), `:67` (`trees.ts:419`), `:151` (`auto-verify.test.ts:247-252`), `:130` and `:134` (DESIGN §8, §6, story Open Points 9 and 10) |
| Estate A4. Open spec PR in the Delivery tab | declined, with reason | `:25` (label `<slug>-spec`), `:166` (a mapping adds a special case for one branch shape) |
| Deliverable A1. "the stubbed-test counts" | applied (removed) | no match in the plan text |

## Checks

- (1) Each round-3 amendment is applied or declined with a reason: pass.
- (2) D34 and D36: pass. Restart passes `off`, `declined`, `halted`, `stopped` and `waiting` once and not `running` or a slot refusal (`:52`); `specStart` order is `off`, `running`, `declined`, `halted`, `stopped`, `waiting`, `queue-unread`, `no-free-agent`, `starved`; Changelog 6 names D36 (`:21`); Open Point 3 names the hand route (`:119`); D34 holds at `:18`, `:44`, `:117`.
- (3) Host read last and zero-host-call case: pass (`:52`, `:66`, `:151`).
- (4) Shared row: pass. Both plans name `{ kind, plan, reason, log, restart, stopped, halted }`, `kind: 'spec'`, and both sections (sibling `:24`, `:53`, `:55`, `:57`, `:129`; this plan `:25`, `:54`, `:142`). This plan's `waits:` names `feature/waiting-on-you-shows-a-failed-verification`, and the sibling's slice *The plan-level row* (`:129`) holds that branch.
- (5) `plot-plan-meta.sh` with `env -u PLOT_REPO_ROOT`: pass. Format `canonical`, 5 slices with one branch each, the one wait read as `waits_on`, `unread_branch_headings`, `unread_waits` and `long_wave_names` empty.
- (6) Changelog to Acceptance: pass. Items 1 to 8 each have at least one Acceptance line (`:146` to `:157`).

## Note for the sibling

- The sibling's `:57` still says that this plan's `specRow` "carries `fleetHalted` per row (`the-fleet-writes-the-design.md:53`), which maps to `halted`". This plan now has no `fleetHalted` (`:54`), and its `specRow` is at `:54`. The shape agrees, so no slice is unbuildable; the sibling's next edit can drop that clause.
