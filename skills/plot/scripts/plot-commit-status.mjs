#!/usr/bin/env node
// The GitHub App half of `plot-host.sh commit-status`. plot-host.sh checks the
// backend, resolves owner/repo through `gh`, and runs this file twice:
//
//   plot-commit-status.mjs --check <sha> <state> <context> <description> <url>
//       Exits 1 where an argument is missing or empty, 4, naming the key,
//       where `Review app` is absent from `## Plot Config` or its key file
//       cannot be read, and 0 otherwise. It makes no network call.
//   plot-commit-status.mjs --repo <owner/repo> <sha> <state> <context> <description> <url>
//       Checks as `--check` does, then writes one commit status as the App's
//       installation. Exits 3 where owner/repo is empty or a GitHub call
//       fails, 0 on a 2xx write.
//
// `Review app` is `<app id> <key path>`. A relative key path resolves against
// the repository root, so an agent in a worktree reads the operator's key. It
// names a SECOND App, with no branch-protection bypass: the build App's key
// lives only in Actions secrets.
//
// The exchange GitHub documents for an App — an RS256 JWT with `iss` = the App
// id authenticates GET /repos/{owner}/{repo}/installation and POST
// /app/installations/{id}/access_tokens; the installation token from the
// second call authenticates POST /repos/{owner}/{repo}/statuses/{sha} (the
// statuses API rejects a bare App JWT) — lives in `plot-github-app-token.mjs`,
// shared with the writer and merger Apps' exchanges.
//
// NO CREDENTIAL LEAVES THIS PROCESS except in a request header. The JWT and the
// installation token travel through `fetch`, never through a child's argv
// (which `ps` shows every local user), a file, stderr or a log.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { call, installationToken } from './plot-github-app-token.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));

const refuse = (code, message) => {
  process.stderr.write(`plot-host: commit-status — ${message}\n`);
  process.exit(code);
};

const run = (cmd, args) => {
  try {
    return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
};

/** The `Review app` key as `{ appId, keyPath }`, or exit 4 naming what is missing. */
const reviewApp = () => {
  const [appId, key] = run('bash', [path.join(here, 'plot-config.sh'), 'get', 'Review app', '']).split(/\s+/);
  if (!appId || !key) {
    refuse(4, "needs a 'Review app' key in ## Plot Config (format: Review app: <app id> <key path>)");
  }
  const keyPath = path.isAbsolute(key) ? key : path.join(run('git', ['rev-parse', '--show-toplevel']) || '.', key);
  try {
    fs.accessSync(keyPath, fs.constants.R_OK);
  } catch {
    refuse(4, `'Review app' names a key file that cannot be read: ${keyPath}`);
  }
  return { appId, keyPath };
};

const [mode, ...rest] = process.argv.slice(2);
const repo = mode === '--repo' ? rest.shift() : undefined;
const [sha, state, context, description, targetUrl] = rest;
if ((mode !== '--check' && mode !== '--repo') || rest.length !== 5 || rest.some((a) => !a)) {
  refuse(1, 'usage: commit-status <sha> <state> <context> <description> <url>, none empty');
}
const app = reviewApp();
if (mode === '--check') process.exit(0);
if (!repo) refuse(3, 'could not resolve owner/repo from the current checkout');

let token;
try {
  token = await installationToken(app, repo);
} catch (err) {
  refuse(3, err.message);
}

const write = await call(token, 'POST', `repos/${repo}/statuses/${sha}`, {
  state,
  context,
  description,
  target_url: targetUrl,
});
if (write.status < 200 || write.status >= 300) refuse(3, `HTTP ${write.status} writing ${context} on ${sha}`);
