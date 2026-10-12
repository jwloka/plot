---
title: Plot works in five phases
author: jwloka
status: active
created: 2026-10-12
updated: 2026-10-12
---

# Plot works in five phases

## Objective

The board shows the five phases of the agentic workflow, Discovery, Design, Development, Testing and Released, and the phases come from a `## Plot Config` declaration instead of the domain. Discovery holds stories and tickets, plans move through Design, Development, Testing and Released, and the board's three tabs, Discovery, Planning and Delivery, follow that split. The fleet writes the design spec of a plan in Design, dispatches an approved spike, and verifies every delivered plan against the merged work. Approval and release stay a person's act.

The design spec is [DESIGN-phases.md](DESIGN-phases.md).

## Why Now

`packages/domain/src/entities/workflow.ts:35` hard-codes five phases, and `rules/phase.ts` maps every plan state and story status onto them. The phases are the operator's workflow, not a fact Plot owns, so a repository with a different workflow cannot declare its own. The mapping also puts a Draft plan in Discovery, the phase D1 gives to stories. `storyPhase` maps the six story statuses over all five phases, but no production code calls it: its only callers are `packages/domain/test/phase.test.ts` and `packages/domain/test/workflow.test.ts` (grep, 2026-10-12), and the Stories tab groups stories in its own columns (`StoriesTab.tsx:31` `COLUMN_OF`). No command writes `State: Design` today, so the Design phase holds no plan that a controller put there.

## Decisions Taken in Scoping

Decisions D1 to D12 in the Decisions table were taken in one brainstorming session on 2026-10-12. The decomposition into six plans was taken in the same session. Decisions D13 to D22 were taken on 2026-10-12 after panel round 1, and answer the operator decisions that the revised plans listed. Decisions D23 and D24 were taken on 2026-10-12 after panel round 2 of `tickets-and-stories-have-lanes`.

## Current Plan

### Phase 1: The phases are declared ⏸️

- ⏸️ [`the-phases-are-declared`](../../plans/2026-10-12-the-phases-are-declared.md) — the `Workflow phases` key, the shipped default, a domain rule over the declared map in place of `toBoardPhase` and `storyPhase`, the board's columns and auto-bump against the map, `/plot-idea`'s design question, the *Needs design* action, and the phase prose. Unblocks every other plan.

### Phase 2: Design work proves the path ⏸️

- ⏸️ [`design-work-proves-the-path`](../../plans/2026-10-12-design-work-proves-the-path.md) — the spike marker, approving the spike alone, confirming the slices after the spike, and tracer-bullet plans. Waits on Phase 1.

### Phase 3: The board has three tabs ⏸️

- ⏸️ [`the-board-has-three-tabs`](../../plans/2026-10-12-the-board-has-three-tabs.md) — Discovery, Planning and Delivery, the redirects from the old tab names, the Planning tab's *Show released*, and the Delivery tab's ticket, sprint and owner filters. Waits on Phase 1. Runs in parallel with Phase 2.

### Phase 4: Tickets and stories have lanes ⏸️

- ⏸️ [`tickets-and-stories-have-lanes`](../../plans/2026-10-12-tickets-and-stories-have-lanes.md) — closed issues through the index, the ticket and story lane rules, the Discovery tab with its tag cloud and archived toggle, and the project-wide Jira read (D20, D23). Waits on Phase 3; the Jira slice waits on Phase 3's assignee filter.

### Phase 5: The fleet writes the design ⏸️

- ⏸️ [`the-fleet-writes-the-design`](../../plans/2026-10-12-the-fleet-writes-the-design.md) — the fleet commissions a spec for a Design plan with an empty spec, and dispatches an approved spike. Waits on Phases 1 and 2.

### Phase 6: The fleet verifies what it delivered ⏸️

- ⏸️ [`the-fleet-verifies-what-it-delivered`](../../plans/2026-10-12-the-fleet-verifies-what-it-delivered.md) — a verification panel per Delivered plan, a verification record, an issue per refuted claim, and a manual release checklist. Waits on Phase 1; its issue-write slice waits on Phase 4's `feature/the-tracker-lists-closed-issues`.

## Open Points

- ⏸️ **1. The key and its grammar.** DESIGN-phases.md §2 proposes the key name `Workflow phases` and the value `Discovery = story:*; Design = plan:draft, plan:design; …`. D12 names the key only as an example. Confirm at the review of `the-phases-are-declared`.
- ⏸️ **2. Leadership for a declared phase.** `PHASE_LEADERSHIP` is keyed by the five default names. The spec proposes no leadership badge for a phase name outside them. An alternative is a leadership part in the key's grammar.
- ⏸️ **3. A story in a plan phase.** A custom map can put a story status into a phase that also holds plan states. The spec's default: the Discovery tab lists every story whatever phase holds it, and the Planning tab lists plans only. No decision covers a custom map of this shape.
- ✅ **4. Where a `Review: pr` plan lives while its spike runs.** Decided by D13: approving the spike merges the plan PR with `State: Design`, and a person records the later approval in-session.
- ✅ **5. Delivering and releasing a tracer plan.** Decided by D14 and D5: automatic delivery carries a proven tracer plan with its first dependent, and a person may deliver a tracer plan with no dependent alone; it stays in the Design column until released.
- ✅ **6. How a tracer plan is marked.** Decided by D15: a separate `Tracer: yes` Status line, and `Type:` keeps `feature`, `bug`, `docs` or `infra`.
- ✅ **7. The current user in a tracker.** Decided by D21 and D22: the `People` key names each person's tracker account, the reader is the host login, and an unmatched reader sees every ticket with a sentence naming the missing match. D23 keeps today's Jira inbox read for an unmatched reader on a Jira source.
- ✅ **8. How many closed tickets the index holds.** Decided by D19: open tickets plus closed tickets of the last 14 days; the Discovery tab's archived toggle reads every closed ticket from the host on demand, capped at 1000. D24 draws the 20 most recently closed in the Done lane.
- ⏸️ **9. Where the fleet's spec commit goes.** The plan default in `the-fleet-writes-the-design`: onto the plan PR's head branch when one is open, otherwise onto a new `idea/<slug>-spec` branch with a PR that a person merges.
- ⏸️ **10. The command a spec agent runs.** *Commission design* reuses the `Idea command` key today (`packages/fleet/src/shared/implement-run.ts:29`). The plan default keeps it; a `Design command` key is the alternative.
- ⏸️ **11. The checklist's file name before a version exists.** D11 builds on `docs/releases/v<version>-checklist.md`, which `/plot-release rc` names after it chooses the version. The plan default in `the-fleet-verifies-what-it-delivered`: the fleet writes `docs/releases/vnext-checklist.md`, which sorts after every `v<digit>` name so the Testing badge (`board.ts:423`) reads it. `/plot-release rc` adds its RC line to `vnext-checklist.md` in place and keeps the name, the fleet leaves a file with an `RC:` line alone, and the final `/plot-release` renames it to `v<version>-checklist.md`.
- ⏸️ **12. More than one Active sprint.** `SprintStateSchema` admits several `Active` sprints. The plan default for the *Active sprint* toggle: the union of every Active sprint.
- ⏸️ **13. A manual trigger for a spec run.** D10 has the fleet run today's *Commission design*. The plan default in `the-fleet-writes-the-design` removes the board button, because *Needs design* and the fleet cover its two halves. A *Write the spec now* button is the alternative.
- ⏸️ **14. Which plans the first verification run covers.** D11 covers each Delivered plan. The plan default in `the-fleet-verifies-what-it-delivered`: every plan that reads `State: Delivered` while `Auto-verify` is on, selected by state, not by date; Released plans and tracer plans are not run.
- ✅ **15. The spike's changeset in a release cut while its plan is in Design.** Decided by D16: the changeset ships, and the release cross-check lists it as a spike of a Design plan.
- ✅ **16. The spike's code when its plan is dropped.** Decided by D17: the code stays, and a revert is a slice of a new plan.
- ✅ **17. A plan that `/plot-deliver` already panelled at delivery.** Decided by D18: the fleet verifies it again in Testing.
- ✅ **18. Which Jira tickets the Discovery lanes show.** Decided by D20: every ticket of the declared projects, not only the current user's. D21 and D22 settle the Delivery inbox's filter.

## Decisions

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-10-12 | D1. Five phases: Discovery, Design, Development, Testing, Released. Discovery holds only stories, and every story status maps to Discovery. Plans move through Design, Development, Testing and Released. | jwloka. A story and a plan are different subjects, and one column set that mixes them answers neither. |
| 2026-10-12 | D2. Plan files keep their state words, and only the mapping changes: Draft and Design to Design, Approved to Development, Delivered to Testing, Released to Released. Rejected and Superseded stay off the board. | jwloka. No plan file changes. |
| 2026-10-12 | D3. The Design phase is optional. Only a plan with significant design decisions gets design work: a design spec, and a spike slice before the remaining slices are confirmed. `/plot-idea` asks "does this plan carry significant design decisions?" and writes `State: Design` on yes. A person can move a Draft plan to Design later with a new *Needs design* controller action. The fleet never decides it. A Draft plan with no design work sits in the Design column, awaiting approval. | jwloka. |
| 2026-10-12 | D4. A plan in Design names one slice as `spike`. A person approves the spike alone, the fleet dispatches it like any slice, and its PR is real code that lands. After the merge the plan stays in Design until a person confirms or rewrites the remaining slices and approves the plan into Development. | jwloka. |
| 2026-10-12 | D5. A tracer-bullet plan (an equivalent marker; D15 names it `Tracer: yes`) is a full plan that lives only in Design and is prerequisite work for other plans, which wait on it through the existing `waits:` mechanism. It is approved and dispatched like any plan but stays in the Design column. When all its slices merge it reads `proven` and its dependents unblock. It is released with the first dependent that ships, so it never shows in Development or Testing. | jwloka. |
| 2026-10-12 | D6. The board tabs Stories, Plans and Agents become Discovery, Planning and Delivery. The tab names are fixed in the board. | jwloka. |
| 2026-10-12 | D7. The Discovery tab shows the tag cloud, a tickets lane group and a stories lane group. Ticket lanes Open, In progress and Done follow the tracker's category first; with no category, open and unnamed is Open, open and named by a plan's `Issue:` is In progress, closed is Done. Done shows tickets closed in the last 14 days. Story lanes: Draft (draft, ready, paused), Active (active, in-review), Done (done, not archived). One tab-wide toggle shows every archived story in an Archived lane and every closed ticket. The tracker port lists closed issues, read through the index. | jwloka. |
| 2026-10-12 | D8. The Planning tab keeps the story and sprint filters, the story-lanes toggle and *Only my work*, and shows plans in Design, Development and Testing. A *Show released* checkbox, off by default, adds Released plans. | jwloka. |
| 2026-10-12 | D9. The Delivery tab is today's Agents tab. *Waiting on you* keeps its content, and by default its ticket rows show only tickets assigned to the current user. An *Active sprint* toggle shows only the active sprint's plans and their PRs, branches, builds and agents. *Only my work* filters tickets, branches, PRs, plans and builds of the current user. | jwloka. |
| 2026-10-12 | D10. For a plan in `State: Design` with an empty spec, the fleet commissions an agent to write it. After a person approves a spike, the fleet dispatches it. Approval stays a person's act. | jwloka. |
| 2026-10-12 | D11. For each Delivered plan the fleet runs a verification panel against the merged work on the default branch: each Changelog and acceptance claim judged supported or refuted, a verification record in the plan, one `ai-generated` issue per refuted claim, and a flag on a refuted plan. The fleet also produces a manual release checklist for the endgame round, building on `/plot-release rc`'s `docs/releases/v<version>-checklist.md`. Release stays a person's act. | jwloka. |
| 2026-10-12 | D12. The phases are configuration, not domain. A `## Plot Config` key maps each phase name to the plan states and story statuses it holds. Plot ships the five phases of D1 and D2 as the default, and this repository declares them explicitly. The hard-coded mappings move behind the declaration as a domain rule that takes the parsed map as a value. The board builds its columns and tab groupings from the map. The fleet reads states and markers only, never phase names. | jwloka. The phases come from the operator's agentic workflow, not from Plot (CLAUDE.md, *Project-Agnostic Design*). |
| 2026-10-12 | D13. A `Review: pr` plan's PR merges when a person approves its spike, with `State: Design` on the default branch. The later approval of the plan is recorded in-session by a person. | jwloka. The fleet reads plans on the default branch only. Answers Open Point 4. |
| 2026-10-12 | D14. A person may deliver a tracer-bullet plan with no dependent alone. It stays in the Design column until it is released. | jwloka. Answers the remaining half of Open Point 5. |
| 2026-10-12 | D15. A tracer bullet is marked by a separate `Tracer: yes` line in the `## Status` block. `Type:` keeps `feature`, `bug`, `docs` or `infra`. | jwloka. The readers of the type word and the release notes' feature and bug split stay unchanged. Answers Open Point 6 and names D5's marker. |
| 2026-10-12 | D16. A spike's changeset ships in a release cut while its plan is in Design. The release cross-check lists it as a spike of a Design plan. | jwloka. The spike's code is in the tag whatever the notes say. |
| 2026-10-12 | D17. When a plan in Design is dropped after its spike merged, the spike's code stays. A revert is a slice of a new plan. | jwloka. D4 makes the spike real code, and a revert needs its own review. |
| 2026-10-12 | D18. The fleet verifies every Delivered plan in Testing, including a plan that `/plot-deliver` already panelled at delivery. | jwloka. D11 reads "each Delivered plan" as written. |
| 2026-10-12 | D19. The ticket index holds open tickets and the tickets closed in the last 14 days. The Discovery tab's released/archived toggle reads every closed ticket from the host on demand, capped at 1000. | jwloka. Bounds the index file, the pass and the payload. Answers Open Point 8. |
| 2026-10-12 | D20. The Discovery lanes show the Jira tickets of the whole project, not only the current user's. D9's default for the Delivery tab then becomes a filter on the ticket's assignee, which D21 matches. | jwloka. |
| 2026-10-12 | D21. A ticket's assignee is matched to the reader through the existing `People` key, extended with a tracker account per person as one more spelling, for example `jwloka = Jan Wloka, jira:jan.wloka@quatico.com`. Every existing `login = Name` entry stays valid. The reader is the host login. | jwloka. One place for identity. Answers Open Point 7. |
| 2026-10-12 | D22. When the reader's account cannot be matched, *Waiting on you* shows every ticket, as today, and a sentence that names the missing match. | jwloka. Nothing is hidden silently. |
| 2026-10-12 | D23. The Delivery tab's *Waiting on you* keeps today's Jira read, `assignee = currentUser()`, until `People` matches the reader (D21). D22's "an unmatched reader sees every ticket and a notice" applies only to sources other than Jira. The Discovery lanes still read the Jira project's tickets (D20). | jwloka. D20 with D22 widened every Jira adopter's inbox at upgrade, because no `People` entry carries a `jira:` spelling today (panel round 2). |
| 2026-10-12 | D24. The issue index keeps the tickets closed in the last 14 days (D19 unchanged). The Done lane shows the 20 most recently closed tickets and a *show all done* link. | jwloka. 154 of the 194 closed issues on this repository (79 %) fall inside 14 days, so the window alone does not bound the lane (panel round 2). |

## Excluded from Scope

| Item | Reason | Revisit If |
|------|--------|------------|
| Renaming plan states | D2: plan files keep their state words | a declared map cannot express a workflow |
| Configurable tab names | D6: the tab names are fixed | a second adopter needs other names |
| A fleet that moves a plan into Design or approves it | D3, D10 | — |
| A fleet that releases | D11 | — |

## Session Log

### 2026-10-12 — Brainstorming session

jwloka designed the change in one brainstorming session and took decisions D1 to D12 and the decomposition into six plans. An unattended `/plot-idea` batch run then wrote this story, the design spec and six Draft plans on the branch `idea/batch-plot-works-in-five-phases`.

**Key outcomes:**

- The phases move from the domain into a `## Plot Config` declaration, with the agentic workflow's five phases as the default.
- Discovery holds stories and tickets only; plans start in Design.
- Design work (a spec and a spike) is optional and a person's decision; tracer-bullet plans prove a path and stay in Design.
- The fleet writes specs and dispatches approved spikes in Design, and verifies delivered plans in Testing.
- Six plans, in the order of the Current Plan above.

### 2026-10-12 — Panel round 1 and decisions D13 to D20

Panel round 1 questioned four plans, `the-phases-are-declared`, `design-work-proves-the-path`, `tickets-and-stories-have-lanes` and `the-fleet-verifies-what-it-delivered`, and each panel answered `amend` unanimously. The four plans were revised. jwloka then took decisions D13 to D20 on the operator decisions the revisions listed, and D21 and D22 on the assignee match, and the story, the spec and all six plans were aligned with them.

### 2026-10-12 — Panel round 2 and decisions D23 and D24

Panel round 2 questioned `tickets-and-stories-have-lanes` and answered `amend` unanimously. jwloka took D23 (the Jira inbox keeps `assignee = currentUser()` until `People` matches the reader) and D24 (a 20-row Done lane). The plan, this story and `DESIGN-phases.md` §5 were revised; the plan lists the changes `the-board-has-three-tabs` needs.

### 2026-10-12 — Round-2 revisions and cross-plan alignment

Round-2 revisions and cross-plan alignment. The changes that the round-2 revisions of `the-phases-are-declared`, `design-work-proves-the-path`, `tickets-and-stories-have-lanes` and `the-fleet-verifies-what-it-delivered` listed for other files were applied to `DESIGN-phases.md` §4, §5, §6 and §8, to Open Points 11 and 14, and to the six plans. No decision, slice branch or `Rounds:` value changed.

---
