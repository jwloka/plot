// Resolves one named GitHub App credential from `## Plot Config`, the same
// `<app id> <key path>` grammar `Review app` uses (plot-commit-status.mjs).
// Shared by the writer and merger exchanges so the one refusal that spans
// both keys — the plan forbids a single App holding both jobs — is written
// once rather than copied into each caller.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

const run = (cmd, args) => {
  try {
    return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
};

/** `<app id> <key path>` for `keyName` out of `## Plot Config`, or `{}` where either half is absent. */
const configuredApp = (keyName) => {
  const [appId, key] = run('bash', [path.join(here, 'plot-config.sh'), 'get', keyName, '']).split(/\s+/);
  return appId && key ? { appId, key } : {};
};

/**
 * Resolves `keyName` (`'Writer app'` or `'Merger app'`) as `{ appId, keyPath }`,
 * refusing by throwing an `Error` whose `.code` is the exit code to use:
 *
 *   4  `keyName` is absent, or names a key file that cannot be read.
 *   4  `keyName` and the OTHER of the two App keys name the same App id —
 *      two jobs on one credential is the case the plan forbids, checked
 *      whenever either key is read so neither caller can be routed past it.
 *
 * `siblingKeyName` is the other of the two config keys (`'Merger app'` when
 * resolving `'Writer app'`, and vice versa); passing the wrong pair, or
 * omitting it, would silently stop enforcing that refusal.
 */
export const resolveAppKey = (keyName, siblingKeyName) => {
  const refuse = (message) => {
    const err = new Error(message);
    err.code = 4;
    throw err;
  };

  const { appId, key } = configuredApp(keyName);
  if (!appId || !key) {
    refuse(`needs a '${keyName}' key in ## Plot Config (format: ${keyName}: <app id> <key path>)`);
  }

  const sibling = configuredApp(siblingKeyName);
  if (sibling.appId && sibling.appId === appId) {
    refuse(`'${keyName}' and '${siblingKeyName}' name the same App (${appId}) — each needs its own App id`);
  }

  const keyPath = path.isAbsolute(key) ? key : path.join(run('git', ['rev-parse', '--show-toplevel']) || '.', key);
  try {
    fs.accessSync(keyPath, fs.constants.R_OK);
  } catch {
    refuse(`'${keyName}' names a key file that cannot be read: ${keyPath}`);
  }
  return { appId, keyPath };
};
