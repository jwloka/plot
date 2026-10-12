Position: amend
Evidence: executed
Lens: refuter, round 1. Judged at origin/main 63a39bec, in a detached worktree inside the juror scratch dir. Node from PATH, zod 4.4.3 from the repo's pnpm store. No repository file edited.

## Findings

1. **The parser emits GitHub issues as JSON numbers and Jira keys as strings.** The plan's "each key as the ticket row prints it" requires a conversion that the plan does not name.

   Command: `plot-plan-meta.sh` on four fixture plans in the scratch dir, then `--tracker 'jira https://x.atlassian.net'` on the Jira one.

   ```
   a.md [1089]              # Issue: #1089
   b.md [1090,1091]         # Issue: #1090, #1091
   c.md []                  # Issue: EWZKUS-3430, no tracker
   d.md []                  # no Issue line
   -- jira
   c.md ["EWZKUS-3430"]
   a.md [1089]
   ```

   The tracker comes from `plot-config.sh get Tracker` (`plot-plan-meta.sh:311-316`). That script resolves the repo root from `PLOT_REPO_ROOT` first, which the board exports, so the board's own read of `Tracker: jira` works. A card field declared `z.array(z.string())` must be filled with `issues.map(String)`, which is what `entry/issue-status.ts:63` already does. `z.array(z.string()).safeParse({issues:[1089]})` returns `false`.

2. **`meta.issues` does not reach either builder. `PlanMetaSchema` has no `issues` field, and zod strips it.** The plan says the builders "copy it from the parsed plan" and "Nothing new is parsed". The first claim is false at the board boundary.

   `board.ts:1121-1130` `readPlanMeta` runs `PlanMetaSchema.parse(JSON.parse(l))` on every line. `packages/board/src/contract/schema.ts:61` declares `PlanMetaSchema` with `prs: z.array(z.number())` and no `issues`. Command: `grep -n issues packages/board/src/contract/schema.ts` shows no hit inside `PlanMetaSchema` (lines 61-175). Reproduction with the same zod:

   ```
   z.object({file:z.string(),prs:z.array(z.number()).default([])}).parse({file:'a',prs:[],issues:[1089]})
   -> {"file":"a","prs":[]}
   ```

   The two existing readers of `issues` avoid the schema. `fleet.ts:2336` and `idea.ts:432` both read the raw JSON. Both builders the plan names read the parsed `PlanMeta`: the card at `board.ts:2007` inside `buildBoard` (meta from `readPlanMeta` at `board.ts:1917`), and `draftPlanOf` at `board.ts:2278`, called from `planEstate` at `board.ts:2335-2339` and shipped to the client as `draftPlans` in `fleet.ts:7914`. The slice must add `issues: z.array(z.union([z.number(), z.string()])).default([])` to `PlanMetaSchema` (the schema the plan does not list). `tsc` would flag `meta.issues` as a missing property, so the gap cannot ship silently. It is still a third schema edit, and the plan's file list and its "nothing new is parsed" sentence omit it.

3. **`tupleFromPlan` has exactly the two production callers the plan names.** The label change reaches the accessible name, and no current test breaks.

   Command: `grep -rn tupleFromPlan packages/board/src packages/board/test`. Production callers: `rows.tsx:612` (the plan head, card in reach through `cardForPlanFile`, `rows.tsx:183`, which can be `null`, so `card?.issues ?? []`) and `draft-plan-row.tsx:24`. The remaining hits are unit and browser tests that call it with fixed facts. `name.label` feeds `linkLabel` (`TupleRow.tsx:272-277`), so the link's accessible name becomes `Plan 1089: <slug>`. `agents-tab.browser.test.ts:555` asserts `name: \`Plan ${plan}\`, exact: true`, but its fixture plans carry no `Issue:` (`grep -ril issue packages/board/test/fixtures/tiny-garden/docs` returns nothing), so it stays green. `data-plan-row` takes `group.plan`, not the label (`rows.tsx:631`), so sorting, grouping and the plan attribute are unaffected. The only other `name.label` reader is `title=` at `TupleRow.tsx:383`. The name cell truncates (`min-w-0 truncate`, `TupleRow.tsx:349`), so a long prefix clips rather than moves the tracks.

4. **The client casts the payload, so `.default([])` does not apply in the browser.** The plan's `?? []` at each read is therefore required and sufficient, and the plan states it. Nothing in the server parses the outgoing `Board`/`Fleet` except `mock-fleet.ts:434` (`FleetSchema.parse`), where `.default([])` fills a missing field for the catalogue harness.

5. **Done-when items are testable, but the Jira item names no test tier.** The browser harness (`test/catalogue`, e.g. `unplanned-issues.browser.test.ts:86-93`) serves a stated payload through `over: { fleet }`, and the `/api/board` payload is served the same way. A browser test with `issues: ['EWZKUS-3430']` in the payload never reads `Tracker:`, so it proves the render and not the Jira path. The path from `Tracker: jira` through `plot-plan-meta.sh`, `PlanMetaSchema` and the builders needs a server-tier test (`board.test.mjs` style) over a fixture repo whose `CLAUDE.md` holds `Tracker: jira …`, with `PLOT_REPO_ROOT` pointing at it. Finding 2 shows why that test matters: a browser-only proof passes with the schema gap still open.

## What the plan must change

- Add `PlanMetaSchema` (`packages/board/src/contract/schema.ts:61`) to the slice: `issues: z.array(z.union([z.number(), z.string()])).default([])`. Delete "Nothing new is parsed" or narrow it to the shell parser.
- State the conversion in the builders: `issues: meta.issues.map(String)` for both the card (`board.ts:2007`) and `draftPlanOf` (`board.ts:2278`).
- Split the Jira Done-when item: one server-tier test over a fixture repo with `Tracker: jira …` asserting the card and the draft entry carry `"EWZKUS-3430"`, and one browser test for the render. Add a server-tier assertion that `#1089` arrives as the string `"1089"`.
