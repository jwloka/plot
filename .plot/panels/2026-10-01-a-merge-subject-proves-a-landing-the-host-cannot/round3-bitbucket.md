# Round 3 — Bitbucket operator

Position: amend
Evidence: executed

Lens: Bitbucket Cloud estate, `develop`, GitFlow, Jira-keyed names, frequent HTTP 429. Read the plan at `5b62e9e1`; read-only `git log` on `ewz-kus-portal`; no `bb` call.

## Round 2 asks from this lens

| Ask | Status |
|---|---|
| Define the plan file: dated, on `origin/<main>`, not the symlink | Answered, with the measured 4-of-4 against 0-of-4 reason |
| Batched walk with its cost | Answered: 0.10 s here, 0.02 s on `ewz-kus-portal` for the adding commits, under 0.01 s for the merges walk, 4 ms per ancestry call. I re-ran the adding-commit walk on `origin/develop`: 35 dated plan files, 35 with an `A` entry |
| Refs-port op for the adding commit, adapters, failure answer | Answered: `planAdditions`, `mergeSubjects`, `contains`, each failure answer stated |
| Import gate scoped to `packages/*/src/` | Answered |
| Rename and side-branch limits stated | Answered; the side-branch window is the case on my estate (all 35 plans added on a side branch), and the tracer subject stays proven |

## New finding, required

**The delivery-candidate host question runs during the throttle.** For an Approved plan whose every branch reads `merged`, the scan now asks `merged_by_host` about each subject-only branch on every scan, and the board scans every 5 s. Under 429 each of those calls is refused and the next scan asks again. On a throttled Bitbucket account that is new spend in exactly the condition #1139 reports, and it can lengthen the throttle. The scan already knows the host's state for this pass: `HOST_VERDICT` is `ok`, `partial`, `throttled`, `secondary`, `failed` or `unasked` (`plot-fleet-scan.sh:100-128`, set from the listing at `:770`). Ask the delivery-candidate question only when `HOST_VERDICT` is `ok` or `partial`; with any other word, keep `evidence: "subject"` and ask nothing. Add a fixture: listing refused with 429, a delivery candidate proven by subject, and the host log holds no `pr-state` for it.

## Not blocking

- The footer counter `subject_predates_plan` is the right signal for my operators; reused Jira keys are common here (87 names).
- `merge_detect=truncated` on my estate (2289 merges against a cap of 2000) is unchanged and stated.

## What the plan must change

1. Gate the delivery-candidate host question on `HOST_VERDICT` in `ok|partial`, with the fixture above.
