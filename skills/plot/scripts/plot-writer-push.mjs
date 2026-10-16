#!/usr/bin/env node
// The authenticated half of `plot-push-main.sh`: every lifecycle push to a
// GitHub default branch runs as the `Writer app` GitHub App's installation,
// never as the ambient `gh`/git identity — the failure this closes is #1730,
// where a push's identity held `bypass_mode: always` and skipped every check.
//
//   plot-writer-push.mjs <branch> <default-branch>
//       Where `origin` is not a github.com remote (Bitbucket, or a local path
//       as this script's own tests use), runs a plain `git push` — a
//       `Writer app` key is a GitHub concern, exactly as `Merger app` is.
//       Where it IS a github.com remote: exits 4, naming the key, where
//       `Writer app` is absent from `## Plot Config`, its key file cannot be
//       read, or it names the same App id as `Merger app` (two jobs on one
//       credential is forbidden). Exits 3 where minting the installation
//       token fails. Otherwise runs `git push origin <branch>:<default-branch>`
//       authenticated as that installation. Either way the exit code and
//       stdout/stderr are `git push`'s own, verbatim, so
//       `plot-push-main.sh`'s classifier reads the same remote text it
//       always has.
//
// THE TOKEN NEVER REACHES argv, a file, or a log. `git push` is told to run
// `plot-writer-askpass.sh` as its askpass helper; that script answers git's
// username/password prompts by reading PLOT_WRITER_TOKEN from ITS OWN
// environment, which this process sets only for that one child. `ps` shows
// every local user the askpass script's argv (git's prompt text) and never
// the token, because the token travels through the environment, not argv.
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveAppKey } from './plot-app-key.mjs';
import { installationToken } from './plot-github-app-token.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));

const refuse = (code, message) => {
  process.stderr.write(`plot-writer-push: ${message}\n`);
  process.exit(code);
};

const pushWith = (branch, defaultBranch, env) => {
  try {
    const stdout = execFileSync('git', ['push', 'origin', `${branch}:${defaultBranch}`], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      env,
    });
    return { code: 0, stdout, stderr: '' };
  } catch (err) {
    return { code: err.status ?? 1, stdout: err.stdout ?? '', stderr: err.stderr ?? '' };
  }
};

const [branch, defaultBranch] = process.argv.slice(2);
if (!branch || !defaultBranch) {
  refuse(1, 'usage: plot-writer-push.mjs <branch> <default-branch>');
}

const originUrl = execFileSync('git', ['remote', 'get-url', 'origin'], { encoding: 'utf8' }).trim();
const match = originUrl.match(/github\.com[/:]([^/]+)\/(.+?)(\.git)?$/);

let result;
if (!match) {
  result = pushWith(branch, defaultBranch, process.env);
} else {
  const repo = `${match[1]}/${match[2]}`;

  let app;
  try {
    app = resolveAppKey('Writer app', 'Merger app');
  } catch (err) {
    refuse(err.code ?? 1, err.message);
  }

  let token;
  try {
    token = await installationToken(app, repo);
  } catch (err) {
    refuse(3, err.message);
  }

  result = pushWith(branch, defaultBranch, {
    ...process.env,
    GIT_ASKPASS: path.join(here, 'plot-writer-askpass.sh'),
    PLOT_WRITER_TOKEN: token,
  });
}

process.stdout.write(result.stdout);
process.stderr.write(result.stderr);
process.exit(result.code);
