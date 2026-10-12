---
title: The board is blank where it matters
author: jwloka
status: active
created: 2026-08-26
updated: 2026-10-12
---

# The board is blank where it matters

## Objective

A team on Bitbucket, Jenkins and Jira opens the board. Branches are there. Pull
requests are there. **The ticket inbox is empty and build status says nothing** —
not *failing*, not *unavailable*: nothing.

Nothing is a claim. The board is asserting that this team has no tickets and no
builds, when in fact it has both and Plot never asked. This story is about the
gap between *cannot ask* and *nothing to show*, at the one surface where a user
cannot tell them apart.

## Why Now

[[plot-in-a-customer-team]] — *The board sees one repository* — found that a
team's work spanned four repositories the board never queried. This is the same
population and the same surface, one axis over: the origins the board never
asks. That story's own scoping refused to fold into [[plot-board]] because *"the
cross-repo finding contradicts its frame rather than extending it"*; the same
argument makes this a sibling of both rather than a child of either.

Measured on `main` 2026-08-26, per operation in `plot-host.sh`:

```
                 github      bitbucket
pr-state           ✓            ✓
pr-list            ✓            ✓  (capped at 50/state — silently)
issue-list         ✓          exit 4
issue-view         ✓          exit 4
build status       ✓  (gh check rollup)   NOTHING
```

## Decisions Taken in Scoping

**Q: Is this not just "Bitbucket support"?**
No, and measuring first is what showed it. Five of seven PR operations already
work on Bitbucket. The gaps are three unrelated shapes — a backend that exits 4,
a backend that does not exist, and a config key with no consumer — and naming
them as one feature is how each stays two-thirds done.

**Q: `exit 4` is honest. Why is that a problem?**
`plot-host.sh` is right to exit 4 rather than return an empty list: *cannot be
asked* is not *empty*, and the adapter refuses to fabricate. The failure is at
the SURFACE. By the time the answer reaches a person it has become an empty
section, and an empty section reads as a fact about their work. The honesty is
lost in the last step, which is the only step the user sees.

**Q: Is Jenkins/Jira genuinely absent, or just untested?**
Absent, and the shape is worse than absent. `plot-board-probe.sh` detects the
`jen` CLI, a Jenkinsfile and its auth state; `plot-config.sh` documents
`Tracker: jira`, `CI: jenkins` and `Jenkins instance`. But `plot-host.sh`
contains **zero** references to `jen`, and nothing reads a Jenkins status. The
configuration is asked for, recorded, and never consumed — so the board reads as
configured while behaving as unconfigured.

**Q: Does the 50-PR cap belong here?**
Yes. `bb pr list` returns a fixed page of 50 per state; past that the join is
silently partial and a branch reads **no PR** when one exists. That is the same
failure as the empty inbox — a limit reaching the user as a fact about their
work — and it is issue #333, with a plan on PR #408.

**Q: What counts as evidence here?**
The operation that runs, not the key that is documented. `plot-config.sh`
describes `Tracker: jira` in a comment block; grepping for a consumer returns
nothing. This repo's comments read like specification, which is the trap
[[plot-in-a-customer-team]] recorded reversing two of its own verdicts.

## Current Plan

### Phase 1: Name the gaps from the operation, not the feature ✅

- ✅ Per-op measurement of `plot-host.sh` across both backends
- ✅ Confirm Jenkins/Jira are probed and configured but never consumed
- ✅ Sprint `the-board-serves-an-enterprise-stack` opened against these findings

### Phase 2: Plans, one per origin ✅

- ✅ Tickets from Jira — `tracker-jira.ts` shipped; `Tracker` is its own port with two connectors. Plan: [my-jira-tickets-are-in-the-inbox](../../plans/2026-08-26-my-jira-tickets-are-in-the-inbox.md), Released.
- ✅ Tickets from Bitbucket — smaller; the adapter already has the shape. Plan: [my-bitbucket-issues-are-in-the-inbox](../../plans/2026-08-26-my-bitbucket-issues-are-in-the-inbox.md), Released.
- ✅ **Build status from Jenkins** — the trail no longer ends before `plot-host.sh`, and that is the change: `jenkins_build_map()` reads a real instance, but only `pr-list --rich` can see it. The build port answers `buildNone()`, so every other reader is still blank. Re-opened 2026-09-08; [the-ci-connector-is-jenkins](../../plans/2026-09-08-the-ci-connector-is-jenkins.md) is the plan, Released 2026-09-11, v2.16.0. [a-jenkins-job-is-read-by-its-shape](../../plans/2026-09-15-a-jenkins-job-is-read-by-its-shape.md) and [setup-proves-the-jenkins-job-answers](../../plans/2026-09-15-setup-proves-the-jenkins-job-answers.md) follow, Released 2026-09-16, v2.18.0.
- ✅ The 50-PR cap (#333) — plan drafted on PR #408, unapproved, two open questions. [a-pr-list-reads-every-page](../../plans/2026-09-20-a-pr-list-reads-every-page.md) names #333 and is Released 2026-09-20, v2.19.0; it names no story.

### Why this was re-opened — 2026-09-08

**It was closed on 2026-09-04 with Phase 2 unstarted**, which the phase's own `⏸️` recorded. Phase 1 measured the gaps and opened a sprint; the story was archived as though that were the outcome.

**Its central measurement is now false in a way worth keeping.** The story reads *"`plot-host.sh` contains **zero** references to `jen`"*. Today it holds two `jen` calls, a budget-tracked wrapper, `jenkins_build_map()` with auth wording measured live against `jen 0.2.0`, and a `ci-limit` arm answering `predicted`. The trail no longer ends before `plot-host.sh` — **it ends at the port.**

**And the gap it named is exactly the one that shipped anyway.** 2.15.0 was released for a team on Bitbucket, Jenkins and Jira, and two of its slices merged carrying no work: PR #811 (zero files) and PR #821 (a `PLOT-BLOCKED.md`). A story that had stayed open would have been the place that noticed.

## Plans

| Plan | State |
|------|-------|
| [a-folded-row-still-says-what-matters](../../plans/2026-08-22-a-folded-row-still-says-what-matters.md) | Released 2026-08-28, v2.11.0 |
| [loose-checks-what-it-promises](../../plans/2026-08-23-loose-checks-what-it-promises.md) | Released 2026-08-28, v2.11.0 |
| [the-plan-the-board-holds](../../plans/2026-08-23-the-plan-the-board-holds.md) | Released 2026-08-28, v2.11.0 |
| [the-worktrees-live-in-one-place](../../plans/2026-08-23-the-worktrees-live-in-one-place.md) | Released 2026-08-28, v2.11.0 |
| [an-unreachable-host-is-not-an-answer](../../plans/2026-08-24-an-unreachable-host-is-not-an-answer.md) | Released 2026-08-28, v2.11.0 |
| [a-closed-sprint-says-what-it-achieved](../../plans/2026-08-26-a-closed-sprint-says-what-it-achieved.md) | Released |
| [a-dead-fetch-is-not-a-slow-one](../../plans/2026-08-26-a-dead-fetch-is-not-a-slow-one.md) | Released |
| [a-degraded-scan-says-why](../../plans/2026-08-26-a-degraded-scan-says-why.md) | Released 2026-08-29, v2.11.1 |
| [a-reaped-worktree-takes-its-manifest](../../plans/2026-08-26-a-reaped-worktree-takes-its-manifest.md) | Released |
| [i-can-see-whether-my-build-passed](../../plans/2026-08-26-i-can-see-whether-my-build-passed.md) | Released |
| [my-bitbucket-issues-are-in-the-inbox](../../plans/2026-08-26-my-bitbucket-issues-are-in-the-inbox.md) | Released |
| [my-jira-tickets-are-in-the-inbox](../../plans/2026-08-26-my-jira-tickets-are-in-the-inbox.md) | Released |
| [the-adapter-checks-the-cli-it-got](../../plans/2026-08-26-the-adapter-checks-the-cli-it-got.md) | Released 2026-08-29, v2.11.1 |
| [the-board-says-how-old-its-plans-are](../../plans/2026-08-26-the-board-says-how-old-its-plans-are.md) | Released |
| [the-header-names-the-branch-it-is-serving](../../plans/2026-08-26-the-header-names-the-branch-it-is-serving.md) | Released |
| [the-ci-connector-is-jenkins](../../plans/2026-09-08-the-ci-connector-is-jenkins.md) | Released 2026-09-11, v2.16.0 |
| [every-issue-renders-as-open-issue](../../plans/2026-09-09-every-issue-renders-as-open-issue.md) | Released 2026-09-11, v2.16.0 |
| [a-slice-shows-that-its-brief-was-asked-for](../../plans/2026-09-12-a-slice-shows-that-its-brief-was-asked-for.md) | Released 2026-09-14, v2.17.0 |
| [a-claimed-slice-does-not-say-nobody-took-it](../../plans/2026-09-13-a-claimed-slice-does-not-say-nobody-took-it.md) | Released 2026-09-14, v2.17.0 |
| [a-complete-page-is-not-truncated](../../plans/2026-09-15-a-complete-page-is-not-truncated.md) | Rejected 2026-09-15 |
| [a-jenkins-job-is-read-by-its-shape](../../plans/2026-09-15-a-jenkins-job-is-read-by-its-shape.md) | Released 2026-09-16, v2.18.0 |
| [setup-proves-the-jenkins-job-answers](../../plans/2026-09-15-setup-proves-the-jenkins-job-answers.md) | Released 2026-09-16, v2.18.0 |
| [the-board-asks-the-build-resolver](../../plans/2026-09-15-the-board-asks-the-build-resolver.md) | Rejected 2026-09-15 |
| [the-board-loop-reads-the-same-ceiling](../../plans/2026-09-15-the-board-loop-reads-the-same-ceiling.md) | Released 2026-09-16, v2.18.0 |
| [the-deploy-job-shows-on-main](../../plans/2026-09-15-the-deploy-job-shows-on-main.md) | Rejected 2026-09-15 |
| [the-tight-band-remembers-what-it-started](../../plans/2026-09-15-the-tight-band-remembers-what-it-started.md) | Rejected 2026-09-15 |

## Open Points

- ⏸️ **Does an empty section need to say why it is empty, independent of the
  backends?** A board that renders *tickets: not asked — no tracker configured*
  would be honest today, without any new backend. That may be a separate and
  much cheaper piece of work than any of the four.
- ⏸️ Has anyone on an enterprise stack actually opened this board? The gaps are
  measured from the code; the *inference* a user draws from a blank section is
  reasoned, not observed. [[plot-in-a-customer-team]] hit the same limit and
  recorded it rather than assuming.

## Session Log

### 2026-10-12

- The estate on `main` shows 26 plans that name this story: 22 Released, the last ones in v2.18.0 on 2026-09-16, and 4 Rejected. Every Phase 2 origin has a Released plan. The 50-PR cap (#333) closed through `a-pr-list-reads-every-page`, Released in v2.19.0, which names no story. The Plans table above lists all 26.
