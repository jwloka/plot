// `plot-writer-push.mjs` — the authenticated half of `plot-push-main.sh`:
// every lifecycle push to a GitHub default branch runs as the `Writer app`
// GitHub App's installation, never the ambient git identity. Mirrors
// host-commit-status.test.mjs's sandbox/fake-API/argv-logging pattern.
//
// Tracer slice of docs/plans/2026-10-15-a-lifecycle-micro-pr-merged-past.md.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { generateKeyPairSync } from 'node:crypto';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const made = [];
const servers = [];
const scratch = (prefix) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  made.push(dir);
  return dir;
};
after(() => {
  for (const server of servers) server.close();
  for (const dir of made) fs.rmSync(dir, { recursive: true, force: true });
});

const here = path.dirname(fileURLToPath(import.meta.url));
const script = path.join(here, '..', '..', 'skills', 'plot', 'scripts', 'plot-writer-push.mjs');
const INSTALLATION_TOKEN = 'writer-installation-token-xyz';
// The real git's absolute path — a `git` stub on PATH must exec THIS, never
// the bare name `git`, which would re-invoke the stub itself forever.
const realGit = execFileSync('which', ['git'], { encoding: 'utf8' }).trim();

/** A stand-in for the GitHub App exchange; records every request. */
const fakeGitHub = async () => {
  const requests = [];
  const server = createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      requests.push({ method: req.method, url: req.url, auth: req.headers.authorization || '', body });
      const reply = (code, json) => {
        res.writeHead(code, { 'content-type': 'application/json' });
        res.end(JSON.stringify(json));
      };
      if (req.method === 'GET' && req.url === '/repos/octo/repo/installation') return reply(200, { id: 777 });
      if (req.method === 'POST' && req.url === '/app/installations/777/access_tokens') {
        return reply(201, { token: INSTALLATION_TOKEN });
      }
      return reply(404, { message: 'unexpected route' });
    });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  servers.push(server);
  return { url: `http://127.0.0.1:${server.address().port}`, requests };
};

/**
 * A scratch repo with a github.com origin remote pointed at a bare sibling
 * repo (so a real `git push` can land if the script reaches it), an RSA test
 * key, and a PATH stub dir. `git` and `node` log their argv to `calls` before
 * doing their real work, so a test can read every argv any child received.
 */
const sandbox = ({ withKey = true } = {}) => {
  const root = scratch('plot-host-writer-push-');
  const bare = path.join(root, 'bare.git');
  execFileSync('git', ['init', '-q', '--bare', bare]);
  execFileSync('git', ['init', '-q', root]);
  execFileSync('git', ['-C', root, '-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-q', '--allow-empty', '-m', 'base']);
  execFileSync('git', ['-C', root, 'branch', '-M', 'main']);
  execFileSync('git', ['-C', root, 'remote', 'add', 'origin', `file://${bare}`]);
  execFileSync('git', ['-C', root, 'push', '-q', 'origin', 'main']);

  const keyPath = path.join(root, 'writer-app-key.pem');
  const { privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  });
  if (withKey) fs.writeFileSync(keyPath, privateKey, { mode: 0o600 });
  const configLine = withKey ? `- **Writer app:** 654321 ${keyPath}\n` : '';
  fs.writeFileSync(path.join(root, 'CLAUDE.md'), `## Plot Config\n\n${configLine}`);

  const bin = path.join(root, 'bin');
  fs.mkdirSync(bin);
  const calls = path.join(root, 'calls');
  const stub = (name, tail) => {
    fs.writeFileSync(path.join(bin, name), `#!/bin/sh\necho "${name} $*" >> "${calls}"\n${tail}\n`);
    fs.chmodSync(path.join(bin, name), 0o755);
  };
  // `git` logs its argv and then runs for real — a `git push` still has to
  // land on the bare sibling repo for the happy-path assertions to hold.
  stub('git', `exec "${realGit}" "$@"`);
  stub('node', `exec "${process.execPath}" "$@"`);

  return { root, bare, bin, calls };
};

/**
 * Points `origin` at a URL that matches plot-writer-push.mjs's github.com
 * test. `pushInsteadOf` (not `insteadOf`) redirects only the push itself to
 * the local bare sibling — `insteadOf` would also rewrite `git remote
 * get-url`'s own answer, which is exactly the string the script matches on.
 */
const useGithubOrigin = (box) => {
  execFileSync('git', ['-C', box.root, 'remote', 'set-url', 'origin', 'git@github.com:octo/repo.git']);
  execFileSync('git', [
    '-C', box.root, 'config', `url.file://${box.bare}.pushInsteadOf`, 'git@github.com:octo/repo.git',
  ]);
};

const callLog = (box) => (fs.existsSync(box.calls) ? fs.readFileSync(box.calls, 'utf8') : '');

const writerPush = (box, branch, defaultBranch, api, extra = {}) =>
  new Promise((resolve) => {
    const child = spawn('node', [script, branch, defaultBranch], {
      cwd: box.root,
      env: {
        ...process.env,
        PATH: `${box.bin}:${process.env.PATH}`,
        GITHUB_API_URL: api,
        ...extra,
      },
    });
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => {
      out += d;
    });
    child.stderr.on('data', (d) => {
      err += d;
    });
    child.on('close', (code) => resolve({ code, out, err }));
  });

const git = (cwd, ...args) =>
  execFileSync('git', ['-C', cwd, '-c', 'user.email=t@t', '-c', 'user.name=t', ...args], { encoding: 'utf8' });

test('writer-push: a non-GitHub remote pushes unauthenticated, exactly as the Merger app does for Bitbucket', async () => {
  const box = sandbox({ withKey: false });
  git(box.root, 'checkout', '-q', '-b', 'plot/tmp');
  git(box.root, 'commit', '-q', '--allow-empty', '-m', 'bookkeeping');
  const api = await fakeGitHub();
  const got = await writerPush(box, 'plot/tmp', 'main', api.url);
  assert.equal(got.code, 0, got.err);
  assert.equal(api.requests.length, 0, 'no App exchange for a non-GitHub remote');
  const log = execFileSync('git', ['-C', box.bare, 'log', '--oneline', 'main'], { encoding: 'utf8' });
  assert.match(log, /bookkeeping/);
});

test('writer-push: no Writer app key on a GitHub remote refuses, and no push is attempted', async () => {
  const box = sandbox({ withKey: false });
  useGithubOrigin(box);
  git(box.root, 'checkout', '-q', '-b', 'plot/tmp');
  git(box.root, 'commit', '-q', '--allow-empty', '-m', 'bookkeeping');
  const api = await fakeGitHub();
  const got = await writerPush(box, 'plot/tmp', 'main', api.url);
  assert.notEqual(got.code, 0);
  assert.match(got.err, /Writer app/);
  assert.doesNotMatch(callLog(box), /^git push/m, 'no push was attempted before the refusal');
  assert.equal(api.requests.length, 0, 'no API call before the refusal');
  const log = execFileSync('git', ['-C', box.bare, 'log', '--oneline', 'main'], { encoding: 'utf8' });
  assert.doesNotMatch(log, /bookkeeping/, 'the commit must not have landed');
});

test('writer-push: a Writer app key that names the same App id as Merger app refuses, and no push is attempted', async () => {
  const box = sandbox();
  useGithubOrigin(box);
  fs.appendFileSync(path.join(box.root, 'CLAUDE.md'), `- **Merger app:** 654321 ${path.join(box.root, 'writer-app-key.pem')}\n`);
  git(box.root, 'checkout', '-q', '-b', 'plot/tmp');
  git(box.root, 'commit', '-q', '--allow-empty', '-m', 'bookkeeping');
  const api = await fakeGitHub();
  const got = await writerPush(box, 'plot/tmp', 'main', api.url);
  assert.notEqual(got.code, 0);
  assert.match(got.err, /Writer app.*Merger app|Merger app.*Writer app/);
  assert.doesNotMatch(callLog(box), /^git push/m, 'no push was attempted before the refusal');
  assert.equal(api.requests.length, 0, 'no API call before the refusal');
});

test('writer-push: a valid key on a GitHub remote mints a token and the push lands', async () => {
  const box = sandbox();
  useGithubOrigin(box);
  git(box.root, 'checkout', '-q', '-b', 'plot/tmp');
  git(box.root, 'commit', '-q', '--allow-empty', '-m', 'bookkeeping');
  const api = await fakeGitHub();
  const got = await writerPush(box, 'plot/tmp', 'main', api.url);
  assert.equal(got.code, 0, got.err);
  assert.equal(api.requests.length, 2, 'expected the installation lookup and the token mint');
  const log = execFileSync('git', ['-C', box.bare, 'log', '--oneline', 'main'], { encoding: 'utf8' });
  assert.match(log, /bookkeeping/);
});

test('writer-push: the installation token never appears in any child process argv, stdout, or stderr', async () => {
  const box = sandbox();
  useGithubOrigin(box);
  git(box.root, 'checkout', '-q', '-b', 'plot/tmp');
  git(box.root, 'commit', '-q', '--allow-empty', '-m', 'bookkeeping');
  const api = await fakeGitHub();
  const got = await writerPush(box, 'plot/tmp', 'main', api.url);
  assert.equal(got.code, 0, got.err);
  const log = callLog(box);
  assert.match(log, /^git push origin/m, 'the argv log did not record the push');
  assert.ok(!log.includes(INSTALLATION_TOKEN), 'the installation token appeared in a child argv');
  assert.ok(!got.out.includes(INSTALLATION_TOKEN), 'the token reached stdout');
  assert.ok(!got.err.includes(INSTALLATION_TOKEN), 'the token reached stderr');
});

test('writer-push: the token reaches the real git process only via PLOT_WRITER_TOKEN in its environment, never its argv', async () => {
  // The `git` stub dumps its own argv AND the presence/value of
  // PLOT_WRITER_TOKEN in ITS environment to a side file before exec'ing the
  // real git — proving the token crossed into git's process via the
  // environment (GIT_ASKPASS reads it from there) and never appeared on the
  // command line git itself received.
  const box = sandbox();
  useGithubOrigin(box);
  const envDump = path.join(box.root, 'git-env-dump');
  fs.writeFileSync(
    path.join(box.bin, 'git'),
    `#!/bin/sh\necho "git $*" >> "${box.calls}"\nprintf '%s\\n' "PLOT_WRITER_TOKEN=$PLOT_WRITER_TOKEN" >> "${envDump}"\nexec "${realGit}" "$@"\n`,
  );
  fs.chmodSync(path.join(box.bin, 'git'), 0o755);

  git(box.root, 'checkout', '-q', '-b', 'plot/tmp');
  git(box.root, 'commit', '-q', '--allow-empty', '-m', 'bookkeeping');

  const api = await fakeGitHub();
  const got = await writerPush(box, 'plot/tmp', 'main', api.url);
  assert.equal(got.code, 0, got.err);
  assert.ok(!callLog(box).includes(INSTALLATION_TOKEN), 'the token appeared in a git argv');
  const dump = fs.readFileSync(envDump, 'utf8');
  assert.ok(dump.includes(`PLOT_WRITER_TOKEN=${INSTALLATION_TOKEN}`), 'the token never reached the push via the environment');
});
