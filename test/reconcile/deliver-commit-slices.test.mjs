// A PLAN WHOSE SLICES WERE PUSHED DIRECTLY CAN BE DELIVERED.
//
// In a repository that takes changes on the default branch directly, a slice
// ends as commits and no PR ever exists. `plot-deliver.sh` counted a branch done
// only through a merged PR, so such a plan was refused for ever with
// `N branch(es) not merged`. A slice line may now name the commits that
// completed it (`→ commit abc1234`), and the gate reads them against
// `origin/<default>`.
//
// THE GATE IS DRIVEN THROUGH `plot-deliver.sh --dry-run`, as
// `deliver-headings.test.mjs` does: nothing here re-implements the parse, and
// `--dry-run` stops before any write. The sandbox has a real bare origin,
// because the gate fetches the default branch and asks git about `origin/main`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const script = path.resolve(here, '../../skills/plot/scripts/plot-deliver.sh');
const run = (cwd, ...args) => execFileSync('git', args, { encoding: 'utf8', cwd, stdio: ['ignore', 'pipe', 'pipe'] });

const made = [];
process.on('exit', () => {
  for (const dir of made) fs.rmSync(dir, { recursive: true, force: true });
});

/** A clone of a bare origin, with a Plot config and one commit on main. */
function sandbox() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'plot-deliver-commits-'));
  made.push(root);
  const origin = path.join(root, 'origin.git');
  const repo = path.join(root, 'repo');
  run(root, 'init', '--bare', '-q', '-b', 'main', origin);
  run(root, 'clone', '-q', origin, 'repo');
  run(repo, 'config', 'user.email', 'test@example.invalid');
  run(repo, 'config', 'user.name', 'Plot Test');
  run(repo, 'config', 'commit.gpgsign', 'false');
  fs.mkdirSync(path.join(repo, 'docs', 'plans'), { recursive: true });
  fs.writeFileSync(path.join(repo, 'CLAUDE.md'),
    '## Plot Config\n\n- **Plan directory:** docs/plans/\n'
    + '- **Branch prefixes:** idea/, feature/, bug/, docs/, infra/\n');
  run(repo, 'add', '-A');
  run(repo, 'commit', '-qm', 'fixture');
  run(repo, 'push', '-q', '-u', 'origin', 'main');
  return { repo };
}

/** Commits a file straight onto main, pushes it, and returns the short sha. */
function pushDirect(repo, name) {
  fs.writeFileSync(path.join(repo, name), 'work\n');
  run(repo, 'add', name);
  run(repo, 'commit', '-qm', `direct: ${name}`);
  run(repo, 'push', '-q', 'origin', 'main');
  return run(repo, 'rev-parse', '--short=9', 'HEAD').trim();
}

/** A commit this clone holds that is on no branch of origin. */
function unpushedCommit(repo) {
  run(repo, 'checkout', '-q', '-b', 'scratch');
  fs.writeFileSync(path.join(repo, 'unpushed.txt'), 'work\n');
  run(repo, 'add', 'unpushed.txt');
  run(repo, 'commit', '-qm', 'never pushed');
  const sha = run(repo, 'rev-parse', '--short=9', 'HEAD').trim();
  run(repo, 'checkout', '-q', 'main');
  return sha;
}

/** Writes the plan, commits and pushes it, then runs the gate; returns exit code and output. */
function deliverDryRun(repo, slices) {
  fs.writeFileSync(path.join(repo, 'docs', 'plans', '2026-10-14-direct.md'), `# Direct pushes

## Status

- **Phase:** Approved
- **Type:** docs

## Slices

${slices}
`);
  run(repo, 'add', '-A');
  run(repo, 'commit', '-qm', 'plan');
  run(repo, 'push', '-q', 'origin', 'main');
  try {
    const out = execFileSync('bash', [script, '--dry-run', 'direct'],
      { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status, out: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
}

test('a plan whose slices were all pushed directly is deliverable', () => {
  const { repo } = sandbox();
  const a = pushDirect(repo, 'a.txt');
  const b = pushDirect(repo, 'b.txt');
  const c = pushDirect(repo, 'c.txt');
  const { code, out } = deliverDryRun(repo, `- \`docs/release-process\` — written → commit ${a}
- \`docs/handover\` — two pushes → commit ${b}, ${c}
- \`docs/glossary\` — one more → commit ${c}`);
  assert.equal(code, 0, out);
  assert.match(out, /verified 3 branch\(es\) merged/);
});

test('a named commit that is not on the default branch refuses the delivery', () => {
  const { repo } = sandbox();
  const landed = pushDirect(repo, 'landed.txt');
  const lacking = unpushedCommit(repo);
  const { code, out } = deliverDryRun(repo, `- \`docs/done\` — pushed → commit ${landed}
- \`docs/partial\` — one landed, one not → commit ${landed}, ${lacking}`);
  assert.notEqual(code, 0, 'a commit the default branch lacks keeps the slice open');
  assert.match(out, /1 branch\(es\) not merged: docs\/partial/);
  assert.doesNotMatch(out, /docs\/done/, 'the landed slice is not named');
});

test('a commit that no clone holds is never read as landed', () => {
  const { repo } = sandbox();
  const { code, out } = deliverDryRun(repo, '- `docs/ghost` — claimed done → commit 0123abc');
  assert.notEqual(code, 0);
  assert.match(out, /docs\/ghost/);
});

test('a commit in another repository keeps the slice open and says why', () => {
  const { repo } = sandbox();
  const sha = pushDirect(repo, 'here.txt');
  const { code, out } = deliverDryRun(repo, `- \`docs/foreign\` — acted on elsewhere → acme/other@${sha}`);
  assert.notEqual(code, 0, 'the prefix says the commit is not ours, whatever the hash matches here');
  assert.match(out, /docs\/foreign/);
  assert.match(out, /another repository/);
});

test('a deferred commit-backed slice does not block the delivery', () => {
  const { repo } = sandbox();
  const landed = pushDirect(repo, 'landed.txt');
  const { code, out } = deliverDryRun(repo, `- \`docs/done\` — pushed → commit ${landed}
- \`docs/given-up\` — not built → commit 0123abc <!-- deferred: dropped -->`);
  assert.equal(code, 0, out);
  assert.match(out, /verified 1 branch\(es\) merged, 1 deferred/);
});
