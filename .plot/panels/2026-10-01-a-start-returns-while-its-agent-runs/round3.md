# Panel round 3: a-start-returns-while-its-agent-runs

**Subject:** `docs/plans/2026-10-01-a-start-returns-while-its-agent-runs.md` (Draft, `07a1d883`)
**Commitment:** `Position: proceed | amend | reject`
**Mechanism:** `unanimous proceed skeptic,operator,process`

## How the panel ran

One agent applied the three lenses in sequence; the session that ran it could not start separate juror agents. The three files share one reader, so their agreement is weaker evidence than three independent jurors.

| Juror | Position | What it looked at |
|---|---|---|
| skeptic | proceed | The round 3 citations against `origin/main`: `runDetached` `:3350-3382`, `--stop`'s fallback `:1795-1798`, `killGroup` `run-script.ts:63-70`, and the spawn shape of all 93 dispatcher calls in `dispatch.test.mjs`. It did not re-run the script; round 2 measured the mechanism on the real script. |
| operator | proceed | The Ctrl-C and SIGINT sentences, and a search for any Plot code that sends SIGINT (none). |
| process | proceed | The guard, the rewritten comments and the macOS scope of the SIGINT sentence against the round 2 measurements. |

## Round 2 carried

Every item in round 2's "What an amendment changes" is in the text: the sibling test spawns `--start 2` detached and runs `--stop` from the test's group, with the condition in Done-when; the forced kill reads `ESRCH` as an empty group; the brief stand-in writes its own `$$`; the claim-return assertion moved to slice 1; the Ctrl-C paragraph states today's measured behaviour and the SIGINT disposition change; the own-group guard stays and the comments at `:786-789` and `:1783-1789` are rewritten; "What this does NOT do" names agents already running in their starter's group; Motivation cites `:3350-3382`. Systemd's cgroup kill stays out of scope as #1148 (open).

## Disagreements

None. Round 2's open disagreement, whether the remaining defects needed another round, is closed: the defects were Done-when and wording changes, and the amendment carries them.

## Shared blind spot

Round 3 measured nothing new. Every lens checked that round 2's measured findings were written down, and none re-ran the real script against the amended tests. The tests themselves are the first run of that check, so a slice 2 worker meets any gap in CI. The Linux claim still rests on one Docker run of a copy, which the Open Point states.
