# Juror r2 — the fleet and supervisor operator

Position: proceed

## Verdict

The amendment carries every round 1 request, and every line number and caller it cites is true on `origin/main` (19fcf482). The fix reaches each operator-facing caller in the right order. Two sentences are imprecise and one test sits in the wrong slice. None of them changes the design or a Done-when item, so they can be fixed in the approval pass without a round 3.

## 1. Round 1 requests

All carried, including `exec` with its reason, the forced group kill, the sibling `--stop` test, the four Motivation citations and #1148 (`gh issue view 1148`: OPEN). My round 1 ask for a pipe test through `/plot-fleet --start` or `--start 1` directly is met by the `--start 1` test.

## 2. Claims checked

True on `origin/main`: the launch sites `:1472-1536` and `:801-806`; the comments `:1283-1287` and `:1783-1789`; `--stop` at `:1783-1806`; `start_worker` callers `:1914` and `:2455`; `performer-shell.ts:93` with `START_TIMEOUT_MS` 60 000; `claim.ts:54` and `:163-164` (no `--no-brief`); `request_brief` at `:3995` not gated by `no_start`; `plot-fleetctl.sh:1065-1067`; `runDetached` at `dispatch.test.mjs:3350-3381`, quoted word for word.

## 3. What an operator sees, per caller

- **Supervisor (`performer-shell.ts`).** Today a tick waits 60 s, then the group kill ends the agent it started. Slice 1 fixes the wait; slice 2 covers any later group kill.
- **`/plot-fleet --start` from a Bash tool.** Today the tool call hangs for the agents' life. Slice 1 fixes it; `plot-fleetctl.sh` needs no change.
- **`/plot-fleet --stop`.** It calls `--stop <branch>` per agent with output hidden (`:1142`). Today the first call can end every sibling from the same `--start N`. After slice 2 each call ends one agent.
- **Board dispatch button and auto-dispatch** (`dispatch.ts:468`, `auto-dispatch.ts:956`). `scripts.start` writes to a log fd with no timeout, and plan dispatch reaches only the brief launch. No visible change.
- **`/api/claim`.** Today a claim on a slice with no brief waits up to 60 s and the group kill ends the brief. Slice 1 fixes the wait; slice 2 fixes the kill.
- **`ps`.** After slice 1 no dispatcher-named process with PPID 1 remains.
- **#1148 boundary.** Stated correctly.

## 4. Done-when

Every item fails today and passes after its slice, with one exception. Slice 2's "a claim … returns before the timeout" passes after slice 1 already. Slice 1 has the same brief-return test, so in slice 2 it is a duplicate. Only "the brief process leads its own group" discriminates slice 2.

## 5. New imprecisions

**The Ctrl-C sentence misstates today.** I measured copies of both launch forms (macOS, bash 5.3) and sent SIGINT to processes I started. Today's form: the wrapper and a `sleep` agent survived, because a non-interactive bash sets SIGINT and SIGQUIT to ignored for `&` jobs. A node stand-in that installs a SIGINT handler exited 130. So today Ctrl-C ends `claude`-like programs and leaves the wrapper and loop running. It does not end "the agents already started" as a whole.

**`set -m` changes the wrapper's SIGINT disposition.** With job control on, the wrapper no longer inherits SIGINT as ignored. In the slice 2 form, a SIGINT to the wrapper ended it, and its `sleep` child survived. No current code sends SIGINT (`--stop` sends TERM, `killGroup` sends KILL), so this has no effect today, but the plan should say so.

**The forced-kill test must tolerate ESRCH.** After slice 2 the dispatcher's group is often empty when the summary is read, and `process.kill(-pid)` throws. `killGroup` catches it (`run-script.ts:65-69`); the test needs the same.

## Recommended edits (non-blocking)

1. Replace the Ctrl-C paragraph: "Today a terminal `Ctrl-C` during `--start N` reaches the agents already started. The wrapper, its monitors and the loop ignore it, because a non-interactive `&` sets SIGINT to ignored, but `claude` installs its own handler and exits. After slice 2 the agents sit in a background group, and `Ctrl-C` reaches none of them."
2. Add: "Under `set -m` the wrapper no longer ignores SIGINT and SIGQUIT. Nothing sends either to it; `--stop` sends SIGTERM."
3. Move the claim-return assertion to slice 1, or drop it from slice 2.
4. Slice 2's forced-kill test: "an ESRCH from the group kill counts as an empty group".
