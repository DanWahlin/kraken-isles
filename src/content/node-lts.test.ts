import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROOT } from '../../tools/course-pack/read';
import { checkPack, ltsClaims, meetsEngines, newestLts, trackedChecks } from '../../tools/course/node-lts';

const pack = join(ROOT, 'courses', 'copilot-app');
const engines = new Map([['samples/book-app-web/package.json', '>=24.15.0']]);
// The rack's own LTS sample, so these tests follow it when nodejs.org marks a new major.
const rackOutput = trackedChecks(pack)[0].output;
const rackMajor = Number(/^v(\d+)\./.exec(rackOutput)![1]);
const rackLts = { version: rackOutput, major: rackMajor, name: 'Current', date: '2026-11-10' };

describe('the Node.js LTS check (issue 279)', () => {
  it('reads the newest LTS from nodejs.org’s index', () => {
    const lts = newestLts([
      { version: 'v26.12.1', date: '2026-10-21', lts: false },
      { version: 'v24.22.1', date: '2026-10-20', lts: 'Krypton' },
      { version: 'v22.20.0', date: '2026-10-01', lts: 'Jod' },
    ]);
    expect(lts).toEqual({ version: 'v24.22.1', major: 24, name: 'Krypton', date: '2026-10-20' });
    expect(() => newestLts([{ version: 'v26.0.0', date: '', lts: false }])).toThrow();
  });

  it('compares a version with a sample’s engines.node', () => {
    expect(meetsEngines('v24.22.1', '>=24.15.0')).toBe(true);
    expect(meetsEngines('v24.15.0', '>=24.15.0')).toBe(true);
    expect(meetsEngines('v24.14.9', '>=24.15.0')).toBe(false);
    expect(meetsEngines('v26.0.0', '>=24.15')).toBe(true);
    expect(meetsEngines('v20.19.5', '>= 22')).toBe(false);
  });

  it('finds what a line says about the LTS', () => {
    expect(ltsClaims('No version here.')).toBeNull();
    expect(ltsClaims('`node -v` prints `v20.19.5`. The download page marks v24 as **LTS**.')).toEqual({
      lts: [24],
      lower: [],
      versions: ['v20.19.5'],
    });
    expect(ltsClaims('compares the first number with the LTS. 20 is lower than 24.')).toEqual({
      lts: [24],
      lower: [20],
      versions: [],
    });
  });

  it('passes the gear rack while nodejs.org marks its major LTS', () => {
    expect(trackedChecks(pack).map((c) => c.id)).toEqual(['lantern']);
    expect(checkPack(pack, rackLts, engines)).toEqual([]);
  });

  it('lists the rack and every line that names the LTS when a new major becomes LTS', () => {
    const next = rackMajor + 2;
    const problems = checkPack(
      pack,
      { version: `v${next}.0.0`, major: next, name: 'Next', date: '2027-10-28' },
      engines,
    );
    expect(problems.some((p) => p.includes('gear-rack.json → lantern'))).toBe(true);
    for (const id of ['S0.4', 'N0.3']) expect(problems.some((p) => p.includes(`quizzes[${id}]`))).toBe(true);
    expect(problems.some((p) => p.includes('gear.rack.lantern'))).toBe(true);
  });

  it('fails when the sample needs more than the rack prints', () => {
    const more = new Map([['samples/book-app-web/package.json', `>=${rackMajor}.999.0`]]);
    expect(checkPack(pack, rackLts, more)).toEqual([expect.stringContaining("doesn't meet")]);
  });
});
