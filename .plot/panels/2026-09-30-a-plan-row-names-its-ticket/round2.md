Position: proceed
Evidence: executed
Lens: refuter, round 2. Judged at origin/main 823edde8, in a detached worktree inside the juror scratch dir `juror-1104-r2.9rcBDg`, Node v24.21.0, the committed board artifact `skills/plot/scripts/board/board-server.mjs`. No repository file edited. Worktree removed with `git worktree remove`; scratch paths trashed: `fx/`, `stage/`, `run.mjs` (3 paths).

## Findings

1. **All three of round 1's required changes are answered.**

   Command: `git show origin/main:docs/plans/2026-09-30-a-plan-row-names-its-ticket.md`.

   - `PlanMetaSchema` is in the slice: "`PlanMetaSchema` gains `issues: z.array(z.union([z.number(), z.string()])).default([])`" (Design, "The board's parse keeps it"), and the slice's file list opens with `PlanMetaSchema`. "Nothing new is parsed" now sits under "The key comes from the parser", so it describes the shell parser only.
   - The conversion is stated: "The card builder (`board.ts:2007`) and `draftPlanOf` (`board.ts:2278`) copy it from the parsed plan with `.map(String)`".
   - The Jira item is split: a server-tier item with `Tracker: jira` and `PLOT_REPO_ROOT`, a server-tier item asserting `"1089"` as a string, and browser items for the render.

2. **Both builders receive the parsed meta, and no other `PlanMetaSchema` consumer breaks.**

   Command: `grep -rnE "PlanMetaSchema|\bPlanMeta\b" packages --include='*.ts' --include='*.tsx' | grep -v /test/`, then reading `board.ts:1121-1130`, `:1915-1917`, `:2278-2287`, `:2335-2339`.

   - The card builder reads `metas` from `readPlanMeta(opts, [...files, ...staged])` (`board.ts:1917`). `draftPlanOf` runs on each result of `readPlanMeta` inside `planEstate` (`board.ts:2335-2339`). Both paths pass through `PlanMetaSchema.parse` at `board.ts:1129`, so the new field reaches both.
   - `PlanMetaSchema` is `z.preprocess(readEitherSpelling, z.object({...}))` with no `.strict()` (`schema.ts:61`). The only `.strict()` in `packages/board/src` is `TokenCountsSchema` (`schema.ts:394`). The other parsers of `PlanMetaSchema` (`reslice.ts:182`, `transition.ts:141`, `deliver.ts:215`) read single fields and gain an unused defaulted one. `auto-deliver.ts:184` builds `{ file } as PlanMeta`, a cast, so the now-required output field cannot fail typecheck there. `fleet.ts:2336` and `idea.ts:432` read the raw JSON and never see the schema. The domain package does not import `PlanMetaSchema`; `packages/domain/corpus/production.ts:54` has its own `readPlanMeta`.
   - `tsc` covers `src` and `test/catalogue` only (`packages/board/tsconfig.json:18`). Unit tests build `PlanMeta` through `PlanMetaSchema.parse`, so the default fills the field.

3. **A server-tier harness exists, and the parser reads `Tracker:` from the fixture root the board is given.**

   - Harness: `packages/board/test/helpers.mjs:65` `startServer(cwd)` spawns the artifact with `cwd` and `PLOT_REPO_ROOT: cwd`, and `fetchBoard` (`helpers.mjs:375`) reads `/api/board`. `makeRepo` (`helpers.mjs:403`) writes plans but no `CLAUDE.md`; the test writes one into the returned dir. `board.test.mjs` is one of 20 files that start a server this way.
   - Spawn shape: `scriptsShell` runs `plot-plan-meta.sh` with `cwd: context.repoRoot` and the inherited env (`packages/domain/src/adapters/scripts/scripts-shell.ts:40-54`). `plot-plan-meta.sh:313-314` calls `plot-config.sh get Tracker`, which takes `PLOT_REPO_ROOT` first (`plot-config.sh:191-194`). The plan file itself is a staged copy under `os.tmpdir()` (`board.ts:2325-2333`), so the file path does not decide the tracker.
   - Executed with a fixture whose `CLAUDE.md` holds `- **Tracker:** jira https://x.atlassian.net`, the plan staged in a separate dir:

     ```
     board-shaped spawn (cwd=fixture, PLOT_REPO_ROOT=fixture):  draft ["EWZKUS-3430"]
     control (cwd=scratch, PLOT_REPO_ROOT unset):               draft []
     ```

   - Executed with the committed artifact through `startServer` against that non-git fixture:

     ```
     board cards: [ 'jira-plan Discovery issues=undefined' ]
     fleet draftPlans: [{"plan":"jira-plan","planFile":"2026-09-30-jira-plan.md","title":"Jira plan"}]
     ```

     One server run serves both the card (`/api/board`) and the draft entry (`/api/fleet` `draftPlans`), so both server-tier Done-when items have an endpoint to assert on. `issues` is absent today, which is the gap the slice closes.

4. **Every Done-when item is testable as written.**

   - Server tier: finding 3 shows the harness, both endpoints, and the `Tracker:` path. Note: the draft entry is on `/api/fleet`, not `/api/board`; the plan's wording ("yields a draft entry") does not name an endpoint and does not need to.
   - Browser: `draft-plan-row.browser.test.ts:25-36` already serves `draftPlans` through `cat.open(..., { over: { fleet } })`, and round 1 finding 5 showed the board payload is served the same way, so the prefix and the no-`issues` case can be stated as payloads.
   - One existing test changes with the slice, and this is in scope rather than a defect: `packages/board/test/unit/draft-plan-row.test.ts:27` asserts `toEqual({ plan, planFile, title, rounds: 2 })`, which fails once `draftPlanOf` adds `issues: []`. The implementer sees it on the first run.

## What the plan must change
