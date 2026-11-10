import { describe, expect, it } from 'vitest';
import { ISLANDS } from '../islands';
import { createSightingGate, HARBOUR_REACH, type SightingsHost } from './sightings';
import type { SessionMode } from './types';

/** A walker and a ship far from every harbour, on a beach 2 m over the sea. */
function session() {
  const s = {
    mode: 'walk' as SessionMode,
    height: 2,
    player: { x: 1e5, z: 1e5 },
    pose: { x: -1e5, z: 1e5, heading: 1.2, speed: 4 },
  };
  const gates = { allowed: () => false, player: null } as unknown as SightingsHost['gates'];
  const gate = createSightingGate({
    status: {
      get mode() {
        return s.mode;
      },
    },
    gates,
    ground: { heightAt: () => s.height },
    dyn: { pose: s.pose },
    player: s.player,
  } as unknown as SightingsHost);
  return { s, gates, gate };
}

describe("when the kraken's distant sightings may show", () => {
  it('ashore, only from low ground by the sea and away from every harbour', () => {
    const { s, gates, gate } = session();
    gate.update(false);
    expect(gate.allowed).toBe(true);
    // The world's sightings ask the same gate, and keep the walker's spot clear.
    expect(gates.allowed!()).toBe(true);
    expect(gates.player).toEqual({ x: 1e5, z: 1e5, heading: 0, speed: 0 });
    s.height = 12;
    gate.update(false);
    expect(gate.allowed).toBe(false);
    s.height = 2;
    const berth = ISLANDS.anchorage.mooring;
    s.player.x = berth.x + HARBOUR_REACH - 5;
    s.player.z = berth.z;
    gate.update(false);
    expect(gate.allowed).toBe(false);
    s.player.x = berth.x + HARBOUR_REACH + 5;
    gate.update(false);
    expect(gate.allowed).toBe(true);
  });

  it('under sail, out of every harbour, with the ship as the one to keep clear of', () => {
    const { s, gates, gate } = session();
    s.mode = 'sail';
    gate.update(false);
    expect(gate.allowed).toBe(true);
    expect(gates.player).toEqual({ x: -1e5, z: 1e5, heading: 1.2, speed: 4 });
    const berth = ISLANDS.meridian.mooring;
    s.pose.x = berth.x;
    s.pose.z = berth.z + 100;
    gate.update(false);
    expect(gate.allowed).toBe(false);
  });

  it('never while something has the screen, or between the walker and the helm', () => {
    const { s, gates, gate } = session();
    gate.update(true);
    expect(gate.allowed).toBe(false);
    expect(gates.allowed!()).toBe(false);
    gate.update(false);
    expect(gate.allowed).toBe(true);
    for (const mode of ['docking', 'transition'] as const) {
      s.mode = mode;
      gate.update(false);
      expect(gate.allowed).toBe(false);
    }
  });
});
