# Round 3 — layering juror

Position: amend
Evidence: executed

Read the plan at `5b62e9e1` and the seams it names on that commit.

## Round 2 asks from this lens

All six answered: the proof is per plan in both readers (`merged ∪ proven(plan)`), the scan lookup is keyed by plan and branch, the walk is batched and the ancestry call is enforced by `check-ancestry-decisions.sh` (`PATTERN` matches `merge-base … --is-ancestor`), the refs-port ops are named with adapters and failure answers, the import test is scoped and called a guard, and `subjectProven(plans, claimed)` drops claimed names with its test. The rules stay out of the barrel and are imported by subpath; the forms stay in `adapters/host/`, where the vendor words are allowed.

## New findings

**1. The auto-delivery decision is placed outside the domain (required).** The plan puts the skip in `planAutoDeliver` (`packages/board/src/server/auto-deliver.ts`): "skips a plan while any branch carries `evidence: \"subject\"`". Whether a plan's landing is confirmed enough to start an unattended delivery is a domain decision, and its sibling already lives there: `allSlicesMerged` is `packages/domain/src/rules/deliverable.ts:62`. Put the reading in that rule — for example an `allSlicesConfirmed` beside it, or a `confirmed` option that reads `evidence: "subject"` as `unknown` — with unit tests at the domain's 100% branch coverage, and have `planAutoDeliver` call it. CLAUDE.md, *The Layering Rule*: "No domain-specific code or behaviour lives outside the domain."

**2. The field is a domain property, so its schema is the entity.** `evidence` and `subjectIgnored` belong on `BranchSchema` (`entities/fleet.ts:174`). Without that, the parse strips them and finding 1's rule has nothing to read. The skeptic measured the same defect from the test side.

## Not blocking

- Two bundle calls per scan are two node starts, about 40 ms each by `docs/shell-and-domain.md`'s measurement, once per scan; within the cost rule.
- `contains` is a third ancestry reader with the `evidence` declaration; it answers `unknown` on failure and proves nothing then, which is the shape *One Answer To "Did This Land"* allows.

## What the plan must change

1. The confirmation reading lives in `rules/deliverable.ts` beside `allSlicesMerged`, tested there; `planAutoDeliver` calls it.
2. `evidence` and `subjectIgnored` are declared on `BranchSchema`.
