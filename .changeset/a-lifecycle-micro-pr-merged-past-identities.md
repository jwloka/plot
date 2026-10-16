---
'plot': patch
---

`plot-host.sh pr-merge` on GitHub and `plot-push-main.sh` now authenticate through two single-purpose GitHub Apps — a Merger app (never on the ruleset bypass list, so its merges still clear `validate` and `plot/review`) and a Writer app — instead of the maintainer's own `gh`/`git` identity, which held `bypass_mode: always` and let a pinned merge land with no required check run. Both scripts refuse by name when their App key is absent or collides with the other App's id, before attempting any push or merge; the installation token reaches `git`/`gh` only through an environment variable, never an argument or a log line.

<!--
plan: docs/plans/2026-10-15-a-lifecycle-micro-pr-merged-past.md
bumps:
  skills:
    plot: patch
-->
