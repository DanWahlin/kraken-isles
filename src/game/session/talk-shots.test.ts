import { describe, expect, it } from 'vitest';
import type { Npc } from '../npcs';
import { createTalkShots, localNpcPoint, localNpcShot } from './talk-shots';

const npc = (x: number, z: number, o: { heading?: number; spec?: object } = {}) =>
  ({ x, y: 0, z, heading: o.heading ?? 0, spec: { name: 'Nell', ...o.spec } }) as unknown as Npc;
/** Flat dry ground with nothing in the way. */
const open = { waterAt: () => -5, groundAt: () => 0, sightBlockedAt: () => false };
/** How far `p` is from the line of sight from a shot to an islander's face. */
const offSight = (shot: { x: number; z: number }, n: Npc, p: { x: number; z: number }) => {
  const fx = n.x - shot.x;
  const fz = n.z - shot.z;
  const t = Math.min(1, Math.max(0, ((p.x - shot.x) * fx + (p.z - shot.z) * fz) / (fx * fx + fz * fz)));
  return Math.hypot(shot.x + fx * t - p.x, shot.z + fz * t - p.z);
};

describe('the camera shots of a conversation', () => {
  it('looks at the islander from over your shoulder, clear of your head', () => {
    const player = { x: 0, y: 0, z: -3 };
    const n = npc(0, 0);
    const shot = createTalkShots(open, player).npcShot(n);
    expect([shot.tx, shot.ty, shot.tz]).toEqual([0, 1.52, 0]);
    // Behind you (farther from them than you are), off to one side, above your head.
    expect(Math.hypot(shot.x - n.x, shot.z - n.z)).toBeGreaterThan(3);
    expect(Math.abs(shot.x)).toBeCloseTo(1.4, 6);
    expect(shot.y).toBeCloseTo(2.4, 6);
    expect(Math.hypot(shot.x - player.x, shot.y - 1.5, shot.z - player.z)).toBeGreaterThan(1.2);
    expect(offSight(shot, n, player)).toBeGreaterThan(0.55);
  });

  it('aims lower at someone sitting', () => {
    const shot = createTalkShots(open, { x: 0, y: 0, z: -3 }).npcShot(npc(0, 0, { spec: { clip: 'sit' } }));
    expect(shot.ty).toBeCloseTo(0.98, 6);
    expect(shot.y).toBeCloseTo(2.1, 6);
  });

  it('takes the other shoulder when a wall is on the first side', () => {
    const player = { x: 0, y: 0, z: -3 };
    const first = createTalkShots(open, player).npcShot(npc(0, 0));
    // A wall all along the side the first shot stands on.
    const wall = { ...open, sightBlockedAt: (x: number) => Math.sign(x) === Math.sign(first.x) };
    const shot = createTalkShots(wall, player).npcShot(npc(0, 0));
    expect(Math.sign(shot.x)).toBe(-Math.sign(first.x));
    expect(shot.z).toBeCloseTo(first.z, 6);
  });

  it('keeps out of the sea and the ground', () => {
    const wet = { ...open, waterAt: () => 4 };
    expect(createTalkShots(wet, { x: 0, y: 0, z: -3 }).npcShot(npc(0, 0)).y).toBeCloseTo(4.7, 6);
    const hill = { ...open, groundAt: () => 6 };
    expect(createTalkShots(hill, { x: 0, y: 0, z: -3 }).npcShot(npc(0, 0)).y).toBeCloseTo(6.45, 6);
  });

  it('falls back to the first shot when nowhere is clear', () => {
    const player = { x: 0, y: 0, z: -3 };
    const first = createTalkShots(open, player).npcShot(npc(0, 0));
    const boxedIn = { ...open, sightBlockedAt: () => true };
    expect(createTalkShots(boxedIn, player).npcShot(npc(0, 0))).toEqual(first);
  });

  it("uses an islander's own shot when they have one (a stage, a counter)", () => {
    // Facing +x: their right is -z.
    const n = npc(10, 5, {
      heading: Math.PI / 2,
      spec: {
        talkShot: { shotLocal: [1, 2, 3], targetLocal: [0, 1.5, 0] },
      },
    });
    const shot = createTalkShots(open, { x: 0, y: 0, z: 0 }).npcShot(n);
    expect(shot.x).toBeCloseTo(13, 6);
    expect(shot.y).toBeCloseTo(2, 6);
    expect(shot.z).toBeCloseTo(4, 6);
    expect([shot.tx, shot.ty, shot.tz].map((v) => +v.toFixed(6))).toEqual([10, 1.5, 5]);
    expect(localNpcShot(n, [1, 2, 3], [0, 1.5, 0])).toEqual(shot);
  });

  it('frames two islanders side by side, with you out of the way of both faces', () => {
    const player = { x: 0, y: 0, z: -3 };
    const a = npc(-0.8, 0);
    const b = npc(0.8, 0);
    const shot = createTalkShots(open, player).pairShot(a, b)!;
    expect(shot).not.toBeNull();
    // On the middle of the pair, from your side of them.
    expect([shot.tx, shot.ty, shot.tz]).toEqual([0, 1.12, 0]);
    expect(shot.z).toBeLessThan(0);
    expect(offSight(shot, a, player)).toBeGreaterThan(0.55);
    expect(offSight(shot, b, player)).toBeGreaterThan(0.55);
  });

  it('has no two-shot of a pair too far apart, or standing on one spot', () => {
    const shots = createTalkShots(open, { x: 0, y: 0, z: -3 });
    expect(shots.pairShot(npc(-4, 0), npc(4, 0))).toBeNull();
    expect(shots.pairShot(npc(0, 0), npc(0.1, 0))).toBeNull();
    // Or with nowhere clear to stand.
    const boxedIn = { ...open, sightBlockedAt: () => true };
    expect(createTalkShots(boxedIn, { x: 0, y: 0, z: -3 }).pairShot(npc(-0.8, 0), npc(0.8, 0))).toBeNull();
  });

  it("places a point in an islander's own space: x to their right, z ahead", () => {
    // Facing +z: their right is +x.
    expect(localNpcPoint(npc(1, 2), [3, 4])).toEqual({ x: 4, z: 6 });
    const east = localNpcPoint(npc(1, 2, { heading: Math.PI / 2 }), [0, 5]);
    expect(east.x).toBeCloseTo(6, 6);
    expect(east.z).toBeCloseTo(2, 6);
  });
});
