# Round 1 — domain and layering

Position: amend

## Read

`rules/sample.ts`, `entry/monitor.ts`, `docs/shell-and-domain.md` §1, the CLAUDE.md sections *A Shell Script Asks The Domain* and *The Layering Rule*.

## Findings

- **The decision placement is right.** `idleNow` as a pure function of one reading in `rules/sample.ts`, vendor-free, with the window as a parameter, is the shape the domain wants, and moving the silence/window comparison out of the shell into the rule is a gain: today the shell decides `quiet` and the rule only sees `activity`.
- **The duplicate is undeclared.** The shell holds the two-sample rule today and the TypeScript holds another; no corpus test pairs them (`packages/domain/corpus/` has none for `sample`). The plan inherits that and adds a third reader (the loop's watcher). Per *A Shell Script Asks The Domain*, a per-pass caller duplicates the rule and a corpus test holds the pair; *"duplication is allowed and undeclared duplication is not"*. The plan must name the shell function that holds the one-sample rule (one function, sourced by the loop) and add `corpus/sample.corpus.test.ts`.
- **`idleNow` answering `gone`** mixes the process fact into the idle rule; acceptable, since `sample` already does, but slice 2 moves `gone` to the wrapper, so after slice 2 the `gone` arm of `idleNow` has no caller. Either drop it in slice 2 or say who calls it.

## Required

1. One shell function holds the one-sample rule; a corpus test pairs it with `idleNow`.
2. Say who calls `idleNow`'s `gone` arm after slice 2, or drop it.
