// The shared GitHub App credential exchange: RS256 JWT, then an installation
// token. `plot-commit-status.mjs` (`Review app`), `plot-push-main.sh`'s Node
// half (`Writer app`) and `plot-host.sh pr-merge`'s Node half (`Merger app`)
// each read one `## Plot Config` key through this file and call it once —
// the exchange GitHub documents for an App is extracted here rather than
// copied three times.
//
// NO CREDENTIAL LEAVES THIS PROCESS except in a request header. The JWT and
// the installation token travel through `fetch`, never through a child's
// argv (which `ps` shows every local user), a file, stderr or a log. A
// caller that needs the token outside this process (a `git push`, a `gh`
// call) must pass it through the environment or an askpass helper that
// reads it from there — never a command-line argument.
//
// `GITHUB_API_URL` sets the API base, as it does on Actions and for GitHub
// Enterprise Server; it defaults to https://api.github.com.
import { createSign } from 'node:crypto';
import fs from 'node:fs';

const api = (process.env.GITHUB_API_URL || 'https://api.github.com').replace(/\/+$/, '');

const b64url = (text) => Buffer.from(text).toString('base64url');

/** An App JWT: `iat` 60 s back for clock drift, `exp` under GitHub's 10-minute ceiling. */
export const appJwt = ({ appId, keyPath }) => {
  const now = Math.floor(Date.now() / 1000);
  const input = `${b64url('{"alg":"RS256","typ":"JWT"}')}.${b64url(JSON.stringify({ iat: now - 60, exp: now + 540, iss: appId }))}`;
  try {
    return `${input}.${createSign('RSA-SHA256').update(input).sign(fs.readFileSync(keyPath)).toString('base64url')}`;
  } catch {
    throw new Error(`could not sign a JWT for App ${appId}`);
  }
};

/** One GitHub API call; resolves to `{ status, body }`, status 0 where the request never completed. */
export const call = async (credential, method, route, body) => {
  try {
    const res = await fetch(`${api}/${route}`, {
      method,
      headers: {
        Authorization: `Bearer ${credential}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: res.status, body: await res.json().catch(() => ({})) };
  } catch {
    return { status: 0, body: {} };
  }
};

/**
 * Buys an installation token for `app` (`{ appId, keyPath }`) on `repo`
 * (`owner/repo`). Throws an `Error` whose message names the HTTP status on
 * either leg of the exchange; the App JWT itself is never returned.
 */
export const installationToken = async (app, repo) => {
  const jwt = appJwt(app);
  const installation = await call(jwt, 'GET', `repos/${repo}/installation`);
  if (!installation.body.id) throw new Error(`App ${app.appId} has no installation on ${repo} (HTTP ${installation.status})`);

  const minted = await call(jwt, 'POST', `app/installations/${installation.body.id}/access_tokens`);
  if (!minted.body.token) throw new Error(`could not mint an installation token for App ${app.appId} (HTTP ${minted.status})`);

  return minted.body.token;
};
