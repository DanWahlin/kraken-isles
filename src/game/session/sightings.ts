import { ISLAND_LIST } from '../../islands/registry';
import type { CoveScene } from '../../world/cove-scene';
import type { Brigantine } from '../../world/ship';
import { ISLANDS } from '../islands';
import type { SessionStatus } from './types';

/** How close (m) to a berth counts as near its harbour. */
export const HARBOUR_REACH = 450;
/** Every island's berth (its harbour). */
const ALL_BERTHS = ISLAND_LIST.map((i) => ISLANDS[i.id].mooring);
/** Ashore, a sighting may show only from low ground by the sea (m over it): a beach or a quay's end. */
const SIGHTING_SHORE = 8;

/** Within a harbour's reach of any island's berth (the kraken's sightings keep out). */
const nearAnyHarbour = (x: number, z: number) =>
  ALL_BERTHS.some((b) => Math.hypot(x - b.x, z - b.z) < HARBOUR_REACH);

export interface SightingsHost {
  status: SessionStatus;
  gates: CoveScene['sightingGates'];
  ground: { heightAt(x: number, z: number): number };
  dyn: Brigantine['dynamics'];
  player: { readonly x: number; readonly z: number };
}

/**
 * When the kraken's distant sightings may show: under sail, or ashore low by the sea; never in a
 * harbour, a conversation, a script or a framed shot (battles and puzzle courses quiet the sea
 * themselves).
 */
export function createSightingGate(host: SightingsHost) {
  const { status, gates, ground, dyn, player } = host;
  let sightingsOk = false;
  const sightingPlayer = { x: 0, z: 0, heading: 0, speed: 0 };
  gates.allowed = () => sightingsOk;
  gates.player = sightingPlayer;
  return {
    get allowed(): boolean {
      return sightingsOk;
    },
    /** `quiet`: something has the screen (a talk, a script, a framed shot, Wingman's welcome). */
    update(quiet: boolean): void {
      const mode = status.mode;
      if (quiet) sightingsOk = false;
      else if (mode === 'sail') {
        sightingsOk = !nearAnyHarbour(dyn.pose.x, dyn.pose.z);
        sightingPlayer.x = dyn.pose.x;
        sightingPlayer.z = dyn.pose.z;
        sightingPlayer.heading = dyn.pose.heading;
        sightingPlayer.speed = dyn.pose.speed;
      } else if (mode === 'walk') {
        sightingsOk =
          ground.heightAt(player.x, player.z) < SIGHTING_SHORE && !nearAnyHarbour(player.x, player.z);
        sightingPlayer.x = player.x;
        sightingPlayer.z = player.z;
        sightingPlayer.speed = 0;
      } else sightingsOk = false;
    },
  };
}
