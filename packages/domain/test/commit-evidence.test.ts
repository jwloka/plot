import { describe, expect, it } from 'vitest';
import { commitVerdict, isForeignCommit } from '../src/rules/commit-evidence.js';

describe('commitVerdict', () => {
  it('reads landed only when every commit is contained', () => {
    expect(commitVerdict(['yes'])).toBe('landed');
    expect(commitVerdict(['yes', 'yes', 'yes'])).toBe('landed');
  });

  it('reads missing when any commit is absent from the default branch', () => {
    expect(commitVerdict(['yes', 'no'])).toBe('missing');
    expect(commitVerdict(['no'])).toBe('missing');
  });

  it('lets a missing commit outrank an unreadable one', () => {
    expect(commitVerdict(['unknown', 'no'])).toBe('missing');
  });

  it('reads unknown when nothing is missing and something could not be read', () => {
    expect(commitVerdict(['yes', 'unknown'])).toBe('unknown');
  });

  it('never reads an empty list as landed', () => {
    expect(commitVerdict([])).toBe('unknown');
  });
});

describe('isForeignCommit', () => {
  it('tells a commit of another repository by its owner/repo@ prefix', () => {
    expect(isForeignCommit('acme/other@abc1234')).toBe(true);
    expect(isForeignCommit('abc1234')).toBe(false);
  });
});
