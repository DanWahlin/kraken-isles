import { Vector3, type Camera } from 'three/webgpu';
import type { Brigantine } from '../../world/ship';
import { bearingOf, type CompassTarget } from '../compass';
import type { CompassGoals } from '../compass-goals';
import type { Hud } from '../hud';
import type { Interactable, Interactions } from '../interaction';
import type { IslandBerth } from '../islands';
import type { PlayerController } from '../player-controller';
import { CompassRoute, type CompassLeg, type Wayfinder } from '../wayfinding/compass-route';
import type { SessionStatus } from './types';

export interface CompassHost {
  status: SessionStatus;
  hud: Hud;
  camera: Camera;
  interactions: Interactions;
  wayfinder: Wayfinder;
  player: PlayerController;
  dyn: Brigantine['dynamics'];
  /** Past this (m) from the berth you're bound for, the compass points at it; inside, the dock prompt does. */
  dockRange: number;
  /** A conversation, a script, a battle or an overlay has the top of the screen. */
  hidden(): boolean;
  /** Where the compass points on this island for the quest state (asked again after `stale`). */
  goals(): CompassGoals;
  /** A puzzle's mark out on the water (the Three Helms' next buoy), if one has one. */
  sailMark(): { x: number; z: number; label: string } | null;
  /** The berth the voyage sends you to. */
  sailTarget(): IslandBerth;
}

/**
 * The compass, top centre: where the camera looks, a gold marker on the current task ashore (the
 * nearest usable part of it; your ship once the island's done) and a paler one on an optional
 * quest you've started, or on the berth or a puzzle's mark while you're sailing. Each marker aims at
 * the next waypoint of the route there (src/game/wayfinding/), and its distance is the route's.
 * Hidden in conversations.
 */
export type SessionCompass = ReturnType<typeof createSessionCompass>;

export function createSessionCompass(host: CompassHost) {
  const { status, hud, camera, interactions, wayfinder, player, dyn } = host;
  let goals: CompassGoals = { main: null, optional: [] };
  let goalsStale = true;
  const compassDir = new Vector3();
  const mainRoute = new CompassRoute();
  const optionalRoute = new CompassRoute();
  const mainLeg: CompassLeg = { x: 0, z: 0, length: 0, level: null };
  const optionalLeg: CompassLeg = { x: 0, z: 0, length: 0, level: null };
  const mainMarker: CompassTarget = { bearing: 0, label: '', distance: 0, level: null };
  const optionalMarker: CompassTarget = { bearing: 0, label: '', distance: 0, level: null };
  /** What the gold marker's on ashore (for Unstuck's facing and Wingman's nudge), or null. */
  let compassAim: Interactable | null = null;
  function updateCompass(): void {
    const ashore = status.mode === 'walk';
    const afloat = status.mode === 'sail' || status.mode === 'docking';
    compassAim = null;
    // In a sea battle the battle's own HUD has the top of the screen.
    if ((!ashore && !afloat) || host.hidden()) {
      hud.setCompass(null);
      return;
    }
    camera.getWorldDirection(compassDir);
    let target: CompassTarget | null = null;
    let optional: CompassTarget | null = null;
    if (ashore) {
      if (goalsStale) {
        goals = host.goals();
        goalsStale = false;
      }
      const goal = goals.main;
      const it = goal ? interactions.nearest(goal.ids, player.x, player.z) : null;
      if (goal && it) {
        compassAim = it;
        mainRoute.ashore(
          wayfinder,
          status.island,
          it.id,
          player.x,
          player.y,
          player.z,
          it.x,
          it.y,
          it.z,
          mainLeg,
        );
        mainMarker.bearing = bearingOf(mainLeg.x - player.x, mainLeg.z - player.z);
        mainMarker.label = goal.labels?.[it.id] ?? goal.label;
        mainMarker.distance = mainLeg.length;
        mainMarker.level = mainLeg.level;
        target = mainMarker;
      }
      // The nearest optional quest you've started (not the same spot as the gold marker).
      let best: Interactable | null = null;
      let bestLabel = '';
      for (let i = 0; i < goals.optional.length; i++) {
        const g = goals.optional[i]!;
        const o = interactions.nearest(g.ids, player.x, player.z);
        if (!o || o === it) continue;
        if (
          !best ||
          Math.hypot(o.x - player.x, o.z - player.z) < Math.hypot(best.x - player.x, best.z - player.z)
        ) {
          best = o;
          bestLabel = g.labels?.[o.id] ?? g.label;
        }
      }
      if (best) {
        optionalRoute.ashore(
          wayfinder,
          status.island,
          best.id,
          player.x,
          player.y,
          player.z,
          best.x,
          best.y,
          best.z,
          optionalLeg,
        );
        optionalMarker.bearing = bearingOf(optionalLeg.x - player.x, optionalLeg.z - player.z);
        optionalMarker.label = bestLabel;
        optionalMarker.distance = optionalLeg.length;
        optionalMarker.level = optionalLeg.level;
        optional = optionalMarker;
      }
    } else {
      // A puzzle out on the water first (the Three Helms' next buoy or mark), else the berth you're
      // bound for once out past docking range (inside it, the dock prompt takes over). The route
      // keeps to the sea lanes: round headlands and in through a harbour's mouth.
      const mark = host.sailMark();
      const goal = host.sailTarget();
      const tx = mark ? mark.x : goal.mooring.x;
      const tz = mark ? mark.z : goal.mooring.z;
      const straight = Math.hypot(tx - dyn.pose.x, tz - dyn.pose.z);
      if (mark || (!status.crewAtHelm && straight > host.dockRange)) {
        mainRoute.afloat(wayfinder, mark ? mark.label : goal.id, dyn.pose.x, dyn.pose.z, tx, tz, mainLeg);
        mainMarker.bearing = bearingOf(mainLeg.x - dyn.pose.x, mainLeg.z - dyn.pose.z);
        mainMarker.label = mark ? mark.label : goal.berthLabel;
        mainMarker.distance = mainLeg.length;
        mainMarker.level = null;
        target = mainMarker;
      }
    }
    hud.setCompass(bearingOf(compassDir.x, compassDir.z), target, optional);
  }

  return {
    update: updateCompass,
    /** The quest state or the island changed: the goals are asked for again. */
    stale(): void {
      goalsStale = true;
    },
    /** Forgets the routes (you were moved): the gold marker's, and the paler one's unless told not to. */
    reset(optional = true): void {
      mainRoute.reset();
      if (optional) optionalRoute.reset();
    },
    /** What the gold marker's on ashore (for Unstuck's facing and Wingman's nudge), or null. */
    get aim(): Interactable | null {
      return compassAim;
    },
    /** The length (m) of the route to the gold marker. */
    get mainLength(): number {
      return mainLeg.length;
    },
  };
}
