// A SLICE COMPLETED BY A DIRECT PUSH SETTLES ITS WAVE.
//
// Repositories that take changes on the default branch directly end a slice as
// commits, not as a merged PR. A slice line may name them — `→ commit abc1234` —
// and the scan reads the slice as `merged` once every named commit is reachable
// from `origin/<default>`. Without it such a slice reads `open` for ever, so
// `--next` never offers the wave behind it.
//
// THE SCAN ONLY EVER MOVES A BRANCH FROM `open` TO `merged` ON THIS EVIDENCE, as
// it does on a merge subject: opening the next wave is reversible. A named
// commit the default branch lacks leaves the slice `open`, and so does a commit
// of another repository, which this repository cannot read.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// EVERY TEMP PATH REMOVED BY THE EXACT NAME `mkdtempSync` RETURNED.
const made = [];
process.on('exit', () => {
  for (const dir of made) fs.rmSync(dir, { recursive: true, force: true });
});

const here = path.dirname(fileURLToPath(import.meta.url));
const scan = path.join(here, '..', '..', 'skills', 'plot', 'scripts', 'plot-fleet-scan.sh');
const run = (cwd, ...args) => execFileSync('git', args, { encoding: 'utf8', cwd });

/** A sandbox repo with a bare-path origin and a host that refuses every question. */
function makeRepo() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'plot-fleet-commits-'));
  made.push(tmp);
  const origin = path.join(tmp, 'origin.git');
  const repo = path.join(tmp, 'repo');
  run(tmp, 'init', '--bare', '-q', '-b', 'main', origin);
  run(tmp, 'clone', '-q', origin, 'repo');
  run(repo, 'config', 'user.email', 'test@example.invalid');
  run(repo, 'config', 'user.name', 'Plot Test');
  run(repo, 'config', 'commit.gpgsign', 'false');
  fs.writeFileSync(path.join(repo, 'CLAUDE.md'), `# Fixture project

## Plot Config

- **Branch prefixes:** idea/, feature/, bug/, docs/, infra/
- **Plan directory:** docs/plans/
- **Active index:** docs/plans/active/
- **Delivered index:** docs/plans/delivered/
- **Git host:** github
`);
  const bin = path.join(tmp, 'bin');
  fs.mkdirSync(bin, { recursive: true });
  fs.writeFileSync(path.join(bin, 'plot-host.sh'), `#!/usr/bin/env bash
case "$1" in
  backend) echo github; exit 0 ;;
  default-branch) echo main; exit 0 ;;
esac
echo "API rate limit exceeded" >&2
exit 7
`, { mode: 0o755 });
  fs.mkdirSync(path.join(repo, 'docs', 'plans', 'active'), { recursive: true });
  fs.writeFileSync(path.join(repo, 'docs', 'plans', 'active', '.gitkeep'), '');
  run(repo, 'add', '-A');
  run(repo, 'commit', '-qm', 'fixture');
  run(repo, 'push', '-q', '-u', 'origin', 'main');
  return { repo, bin };
}

/** Commits a file straight onto main and pushes it; returns the short sha. */
function pushDirect(repo, name) {
  fs.writeFileSync(path.join(repo, name), 'work\n');
  run(repo, 'add', name);
  run(repo, 'commit', '-qm', `direct: ${name}`);
  run(repo, 'push', '-q', 'origin', 'main');
  return run(repo, 'rev-parse', '--short=9', 'HEAD').trim();
}

/** A commit that exists in this clone but is on no branch of origin. */
function unpushedCommit(repo) {
  run(repo, 'checkout', '-q', '-b', 'scratch');
  fs.writeFileSync(path.join(repo, 'unpushed.txt'), 'work\n');
  run(repo, 'add', 'unpushed.txt');
  run(repo, 'commit', '-qm', 'never pushed');
  const sha = run(repo, 'rev-parse', '--short=9', 'HEAD').trim();
  run(repo, 'checkout', '-q', 'main');
  return sha;
}

function addPlan(repo, body) {
  fs.writeFileSync(path.join(repo, 'docs', 'plans', '2026-10-14-direct.md'), body);
  run(repo, 'add', '-A');
  run(repo, 'commit', '-qm', 'plan');
  run(repo, 'push', '-q', 'origin', 'main');
}

const scanArgs = (fx, ...args) => ({
  encoding: 'utf8',
  cwd: fx.repo,
  env: { ...process.env, PATH: `${fx.bin}:${process.env.PATH}`, PLOT_HOST: 'github' },
});

function states(fx) {
  const doc = JSON.parse(execFileSync('bash', [scan, '--json'], scanArgs(fx)));
  const out = {};
  for (const plan of doc.plans) {
    for (const wave of plan.waves ?? []) for (const b of wave.branches ?? []) out[b.branch] = b.state;
  }
  return out;
}

const plan = (slices) => `# Direct pushes

## Status

- **Phase:** Approved
- **Type:** docs
- **Review:** pr
- **Impl:** own branches

## Slices

${slices}
`;

test('a slice whose named commits are on the default branch reads merged', () => {
  const fx = makeRepo();
  const one = pushDirect(fx.repo, 'one.txt');
  const two = pushDirect(fx.repo, 'two.txt');
  addPlan(fx.repo, plan(`- \`docs/one\` — pushed → commit ${one}, ${two}
- \`docs/untouched\` — nothing pushed for this one`));
  const s = states(fx);
  assert.equal(s['docs/one'], 'merged');
  assert.equal(s['docs/untouched'], 'open', 'a slice with no evidence stays open');
});

test('a named commit the default branch lacks keeps the slice open', () => {
  const fx = makeRepo();
  const landed = pushDirect(fx.repo, 'landed.txt');
  const lacking = unpushedCommit(fx.repo);
  addPlan(fx.repo, plan(`- \`docs/partial\` — one landed, one not → commit ${landed}, ${lacking}
- \`docs/absent\` — a hash no clone holds → commit 0123abc`));
  const s = states(fx);
  assert.equal(s['docs/partial'], 'open', 'every named commit must be reachable');
  assert.equal(s['docs/absent'], 'open', 'a commit nobody holds is never read as landed');
});

test('a commit of another repository does not settle the slice', () => {
  const fx = makeRepo();
  const here = pushDirect(fx.repo, 'here.txt');
  addPlan(fx.repo, plan(`- \`docs/foreign\` — acted on elsewhere → acme/other@${here}`));
  assert.equal(states(fx)['docs/foreign'], 'open',
    'the owner/repo@ prefix says the commit is not ours, whatever the hash matches here');
});

test('--next offers the wave behind a slice completed by a direct push', () => {
  const fx = makeRepo();
  const sha = pushDirect(fx.repo, 'first.txt');
  addPlan(fx.repo, plan(`### First

- \`docs/first\` — pushed → commit ${sha}

### Second

- \`docs/second\` — waits for the first wave`));
  const next = execFileSync('bash', [scan, '--next'], scanArgs(fx));
  assert.match(next, /docs\/second/, 'the second wave is eligible');
  assert.doesNotMatch(next, /docs\/first/, 'the settled slice is not offered again');
});

test('--next holds the wave behind a slice whose commit is missing', () => {
  const fx = makeRepo();
  const lacking = unpushedCommit(fx.repo);
  addPlan(fx.repo, plan(`### First

- \`docs/first\` — not pushed yet → commit ${lacking}

### Second

- \`docs/second\` — waits for the first wave`));
  const next = execFileSync('bash', [scan, '--next'], scanArgs(fx));
  assert.match(next, /docs\/first/, 'the open slice is still the one to do');
  assert.doesNotMatch(next, /docs\/second/, 'the wave behind it stays closed');
});
