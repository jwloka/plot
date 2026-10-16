#!/usr/bin/env node
// Mints a `Merger app` GitHub App installation token for `plot-host.sh
// pr-merge`'s GitHub arm — the one caller of `gh pr merge` authenticates as
// this App's installation, never the ambient `gh` identity, so a merge shows
// as `<app>[bot]` and is provably the Merger App's rather than an operator's.
//
//   plot-merger-token.mjs <owner/repo>
//       Prints ONLY the installation token to stdout and exits 0. Exits 4,
//       naming the key, where `Merger app` is absent from `## Plot Config`,
//       its key file cannot be read, or it names the same App id as
//       `Writer app`. Exits 3 where minting the token fails. Every message
//       other than the token itself goes to stderr.
//
// THE TOKEN NEVER REACHES argv, a file, or a log. It leaves this process only
// on stdout, for its one caller to capture into a shell variable and set as
// `GH_TOKEN` in `gh`'s environment for one call — never passed as an
// argument, which `ps` would show every local user.
import { resolveAppKey } from './plot-app-key.mjs';
import { installationToken } from './plot-github-app-token.mjs';

const refuse = (code, message) => {
  process.stderr.write(`plot-merger-token: ${message}\n`);
  process.exit(code);
};

const repo = process.argv[2];
if (!repo) refuse(1, 'usage: plot-merger-token.mjs <owner/repo>');

let app;
try {
  app = resolveAppKey('Merger app', 'Writer app');
} catch (err) {
  refuse(err.code ?? 1, err.message);
}

try {
  process.stdout.write(await installationToken(app, repo));
} catch (err) {
  refuse(3, err.message);
}
