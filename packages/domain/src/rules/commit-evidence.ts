import type { Containment } from '../ports/refs.js';

/**
 * What a slice's named commits say about whether the slice is done.
 *
 * `landed`   every named commit is reachable from the default branch.
 * `missing`  at least one named commit is not on the default branch.
 * `unknown`  no commit is missing, and at least one could not be read.
 */
export type CommitVerdict = 'landed' | 'missing' | 'unknown';

/**
 * Whether a commit reference names a commit in another repository.
 *
 * A slice line spells the two kinds `→ commit abc1234` (this repository) and
 * `→ owner/repo@abc1234` (another one); the parser keeps the `owner/repo@`
 * prefix on the second so this rule can tell them apart.
 *
 * @param ref - a commit reference as `plot-plan-meta.sh` emits it.
 * @returns true where the reference carries a repository prefix.
 */
export const isForeignCommit = (ref: string): boolean => ref.includes('@');

/**
 * Decides a slice from its named commits.
 *
 * A COMMIT THE DEFAULT BRANCH LACKS KEEPS THE SLICE OPEN, whatever else is
 * known. `missing` outranks `unknown`: one commit that is provably absent is
 * enough, and an unreadable sibling cannot make the slice done. Only a full set
 * of `yes` answers reads `landed`. An empty list is `unknown`, never `landed` —
 * a slice naming no commit has no commit evidence, and the caller must not call
 * this for it.
 *
 * ANCESTRY IS THE RIGHT QUESTION HERE, where it is the wrong one for a branch.
 * A squash merge rewrites a branch's commits, so "is the branch an ancestor of
 * the default branch" answers wrongly every time. A plan that names a commit by
 * hash names the exact object a direct push put on the default branch, and
 * nothing rewrites it.
 *
 * @param reads - per named commit, whether the default branch contains it; a
 *   commit in another repository reads `unknown`, because only this repository
 *   is readable.
 * @returns the verdict for the slice.
 */
export const commitVerdict = (reads: readonly Containment[]): CommitVerdict => {
  if (reads.some((r) => r === 'no')) return 'missing';
  if (reads.length === 0 || reads.some((r) => r === 'unknown')) return 'unknown';
  return 'landed';
};
