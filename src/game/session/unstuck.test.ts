import { describe, expect, it, vi } from 'vitest';
import type { InputState } from '../../engine/input';
import type { Interactable } from '../interaction';
import type { SessionMode } from './types';
import { createUnstuck, type UnstuckHost } from './unstuck';

/** A session with a walker at the origin, a route point at (10, 2, 20) and open water at (100, 100). */
function session() {
  const s = {
    mode: 'walk' as SessionMode,
    modes: [] as SessionMode[],
    scripting: false,
    crewAtHelm: false,
    riding: false,
    battling: false,
    talking: false,
    berth: null as object | null,
    player: { x: 0, y: 0, z: 0, heading: 0.3, mode: 'walk', swimRoom: 10, tune: { swimSoft: 2 } },
    dyn: { pose: { x: 0, z: 0 }, forwardSpeed: 0, reset: vi.fn() },
    helm: { trim: 0 },
    aim: null as { x: number; y: number; z: number } | null,
    graph: {
      nearest: () => 3,
      point: (_i: number, out: { x: number; y: number; z: number }) =>
        Object.assign(out, { x: 10, y: 2, z: 20 }),
      route: (...a: unknown[]) => Object.assign(a[6] as object, { x: 20, y: 2, z: 20 }),
    } as object | null,
    toast: vi.fn(),
    fade: vi.fn<(on: boolean, ms?: number) => Promise<void>>(async () => {}),
    place: vi.fn(),
    snapBehind: vi.fn(),
    reset: vi.fn(),
    added: [] as Interactable[],
  };
  const host = {
    status: {
      get mode() {
        return s.mode;
      },
      island: 'anchorage',
      paused: false,
      get scripting() {
        return s.scripting;
      },
      get crewAtHelm() {
        return s.crewAtHelm;
      },
    },
    hud: { toast: s.toast, fade: s.fade, setPrompt: vi.fn() },
    input: { enabled: true },
    interactions: { add: (i: Interactable) => s.added.push(i) },
    player: s.player,
    dialogue: {
      get active() {
        return s.talking;
      },
    },
    wayfinder: {
      walk: () => s.graph,
      sea: {
        nearest: () => 0,
        point: () => ({ x: 100, z: 100 }),
        path: () => [{ x: 100, z: 200 }],
      },
    },
    dyn: s.dyn,
    helm: s.helm,
    cam: { snapBehind: s.snapBehind },
    compass: {
      get aim() {
        return s.aim;
      },
      reset: s.reset,
    },
    setMode: (m: SessionMode) => {
      s.mode = m;
      s.modes.push(m);
    },
    place: s.place,
    riding: () => s.riding,
    battling: () => s.battling,
    berthInRange: () => s.berth,
    sailTarget: () => ({ mooring: { x: 100, z: 500 } }),
  } as unknown as UnstuckHost;
  return { s, host, unstuck: createUnstuck(host) };
}
const push = { moveX: 0, moveY: 1 } as InputState;
const still = { moveX: 0, moveY: 0 } as InputState;
/** Runs the watch for `seconds` at 10 frames a second. */
const watch = (u: ReturnType<typeof createUnstuck>, seconds: number, input: InputState) => {
  for (let t = 0; t < seconds; t += 0.1) u.watch(0.1, input);
};

describe('Unstuck', () => {
  it('offers the hop after four seconds of pushing without getting anywhere, once', () => {
    const { s, unstuck } = session();
    watch(unstuck, 3.5, push);
    expect(unstuck.offered).toBe(false);
    watch(unstuck, 1, push);
    expect(unstuck.offered).toBe(true);
    expect(s.toast).toHaveBeenCalledTimes(1);
    expect(s.toast.mock.calls[0]![0]).toMatch(/^Stuck\? Press E/);
    watch(unstuck, 10, push);
    expect(s.toast).toHaveBeenCalledTimes(1);
  });

  it('does not count standing still, getting somewhere, a talk, a ride or the edge of the swim', () => {
    const { s, unstuck } = session();
    watch(unstuck, 10, still);
    expect(unstuck.offered).toBe(false);
    // Walking on: more than a stride or two from where the push began.
    for (let t = 0; t < 10; t += 0.1) {
      s.player.x += 0.3;
      unstuck.watch(0.1, push);
    }
    expect(unstuck.offered).toBe(false);
    s.talking = true;
    watch(unstuck, 10, push);
    s.talking = false;
    s.riding = true;
    watch(unstuck, 10, push);
    s.riding = false;
    // Held at the swim's soft edge: that's as far as you go.
    s.player.mode = 'swim';
    s.player.swimRoom = 1;
    watch(unstuck, 10, push);
    expect(unstuck.offered).toBe(false);
  });

  it('withdraws the offer once you have walked away from the spot', () => {
    const { s, unstuck } = session();
    watch(unstuck, 5, push);
    expect(unstuck.offered).toBe(true);
    s.player.x = 3;
    unstuck.watch(0.1, still);
    expect(unstuck.offered).toBe(true);
    s.player.x = 6;
    unstuck.watch(0.1, still);
    expect(unstuck.offered).toBe(false);
  });

  it('takes the E while the hop is on offer, and only then', () => {
    const { s, unstuck } = session();
    const it = s.added.find((i) => i.id === 'unstuck')!;
    expect(it.enabled!()).toBe(false);
    watch(unstuck, 5, push);
    expect(it.enabled!()).toBe(true);
    // Ahead of whatever you're pressed up against.
    expect(it.bias).toBeLessThan(0);
    s.scripting = true;
    expect(it.enabled!()).toBe(false);
  });

  it('hops the walker onto the nearest point of the routes, facing along the route to the task', async () => {
    const { s, host, unstuck } = session();
    watch(unstuck, 5, push);
    s.aim = { x: 40, y: 2, z: 20 };
    expect(await unstuck.run()).toBe(true);
    // A fade out and in, the walker frozen between.
    expect(s.modes).toEqual(['transition', 'walk']);
    expect(s.fade.mock.calls.map((c) => c[0])).toEqual([true, false]);
    expect(host.input.enabled).toBe(true);
    // Half a metre over the route point (the level where walks stack), facing +x toward the task.
    expect(s.place).toHaveBeenCalledWith(10, 20, Math.PI / 2, 2.5);
    expect(s.reset).toHaveBeenCalledWith();
    expect(unstuck.offered).toBe(false);
  });

  it('keeps your heading when the compass has nothing to point at', async () => {
    const { s, unstuck } = session();
    expect(await unstuck.run()).toBe(true);
    expect(s.place).toHaveBeenCalledWith(10, 20, 0.3, 2.5);
  });

  it('does nothing in a script, on a ride, or on an island with no routes', async () => {
    const { s, unstuck } = session();
    s.scripting = true;
    expect(await unstuck.run()).toBe(false);
    s.scripting = false;
    s.riding = true;
    expect(await unstuck.run()).toBe(false);
    s.riding = false;
    s.graph = null;
    expect(await unstuck.run()).toBe(false);
    expect(s.fade).not.toHaveBeenCalled();
    expect(s.modes).toEqual([]);
  });

  it('offers to warp a ship off after twelve seconds of trying to sail and not moving', () => {
    const { s, unstuck } = session();
    s.mode = 'sail';
    s.helm.trim = 0.8;
    watch(unstuck, 11, still);
    expect(unstuck.offered).toBe(false);
    watch(unstuck, 2, still);
    expect(unstuck.offered).toBe(true);
    expect(s.toast.mock.calls[0]![0]).toMatch(/^Stuck fast\?/);
    // Under way again: the offer goes.
    s.dyn.forwardSpeed = 3;
    unstuck.watch(0.1, still);
    expect(unstuck.offered).toBe(false);
  });

  it('never offers at a berth, with the crew at the helm, or in a battle', () => {
    const { s, unstuck } = session();
    s.mode = 'sail';
    s.helm.trim = 0.8;
    s.berth = {};
    watch(unstuck, 20, still);
    s.berth = null;
    s.crewAtHelm = true;
    watch(unstuck, 20, still);
    s.crewAtHelm = false;
    s.battling = true;
    watch(unstuck, 20, still);
    expect(unstuck.offered).toBe(false);
  });

  it('warps the ship to the nearest open water, heading along the lane to where she is bound', async () => {
    const { s, unstuck } = session();
    s.mode = 'sail';
    expect(await unstuck.run()).toBe(true);
    expect(s.modes).toEqual(['transition', 'sail']);
    expect(s.dyn.reset).toHaveBeenCalledWith(100, 100, 0);
    expect(s.snapBehind).toHaveBeenCalledWith(0);
    // Only the route to the berth is forgotten (there's no paler marker at sea).
    expect(s.reset).toHaveBeenCalledWith(false);
    s.crewAtHelm = true;
    expect(await unstuck.run()).toBe(false);
  });
});
