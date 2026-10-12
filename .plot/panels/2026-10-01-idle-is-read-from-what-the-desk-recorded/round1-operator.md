# Round 1 — fleet operator (reads what the operator sees and acts on)

Position: amend

## Read

`attention.ts:94-95` turns `gone` into *"restart it"* on the agent list, and `idle` into *"look at the worker, it is not moving"*. The board reads both from `.plot-worker.monitor.worker.jsonl` (`findings.ts:39-43`).

## Findings

- **`gone` changes meaning and the plan does not say it changes.** Today `gone` fires on any death of the watched pid, one sample (`plot-worker-monitor.sh:583-589`), which includes a loop that exits at `Worker bound` (exit 124 measured in `DESIGN-machine.md`) and a loop that ends its run normally. The plan publishes it only after a non-zero `wait`. That is arguably better (a normal end is not "restart it"), but it is a change an operator will see, and the plan must state today's behaviour, the new behaviour, and the test for each exit kind (0, 124, SIGKILL 137).
- **The flag `PLOT_MONITOR_ENDS_WORKER=0` is an operator setting**, and after slice 2 it would silently turn the finding off as well as the kill. An operator who set it to watch rather than kill loses the watch.
- **The cadence is unchanged for the operator.** The plan keeps `PLOT_MONITOR_INTERVAL` (30 s) for the judgement and the 5 s poll is gone; that is the same latency an operator sees today. Good.

## Required

1. State and test `gone` for exit 0, exit 124 and SIGKILL.
2. Keep the watch under `PLOT_MONITOR_ENDS_WORKER=0` (the skeptic's item 2).
