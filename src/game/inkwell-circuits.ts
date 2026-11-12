import { INKWELL_ANCHORS } from '../world/islands/inkwell/anchors';
import type { IwShow } from '../world/islands/inkwell/build';
import { CIRCUIT_SPOTS, RAIL, type IwCircuit } from '../world/islands/inkwell/circuit';
import type { InkwellWorld } from '../world/islands/inkwell/index';
import { DOME, KITE_WALK, TERRACE, toWorld } from '../world/islands/inkwell/layout';
import { RAIL_STAGES } from '../world/islands/inkwell/plaza';
import type { ChoiceAsk } from './choice-card';
import type { CameraShot } from './follow-camera';
import type { IslandContentHost } from './island-code';
import { createIslandCircuits, type IslandCircuits } from './island-circuits';
import type { CircuitHost } from './puzzles/circuit/puzzle';
import { INKWELL_QUESTS } from './inkwell-quests';

/**
 * Inkwell's three circuits in the session (docs/specs/ISLAND-06-inkwell-bluffs.md §5): the Borrowed
 * Board in the Loggia (`board`), Two Hands, One Chart on the Draughting Terrace (`slate`) and the
 * Shared Chart in the Chart Court (`chart`), on the shared stage (island-circuits.ts). Its own part:
 * the guild's card on its board, the slate's ticks, the Great Chart's rail (the `dial` station slides
 * its brass marker; a mark with no slate behind it washes off), the slates on the rack, and the Seal:
 * the Dome lights and the kites go up.
 */

type Kind = IwCircuit;

/**
 * What the Great Chart shows once a place's station has passed: the slates on the rack, the rail
 * lamps that are green, the one that is the current stage, and the post the marker stands at.
 */
const CHART_AFTER: Readonly<
  Record<string, { slates: number; green: number; current: number; marker: number }>
> = {
  quill: { slates: 1, green: 1, current: 1, marker: 0 },
  planDesk: { slates: 2, green: 2, current: -1, marker: 1 },
  rail: { slates: 2, green: 2, current: 2, marker: 2 },
  bells: { slates: 2, green: 2, current: 2, marker: 2 },
  rack: { slates: 3, green: 3, current: 3, marker: 3 },
  build: { slates: 4, green: 4, current: 4, marker: 4 },
  glass: { slates: 4, green: 4, current: 4, marker: 4 },
  soundings: { slates: 5, green: 5, current: -1, marker: 4 },
};

export type InkwellCircuits = IslandCircuits<InkwellWorld, Kind, IwShow> & {
  readonly debug: {
    /** The rail's marker (its post, and whether it has come to rest), the slates hung, and the guild's card. */
    chart(): { marker: number; settled: boolean; slates: number; card: string };
  };
};

/** The rail's own shot: from over the chart's middle, along the rail, the marker's post in the middle. */
function railShot(index: number): CameraShot {
  const s = CIRCUIT_SPOTS.chart.rail!;
  const u = RAIL.posts[Math.max(0, Math.min(RAIL.posts.length - 1, index))]!;
  const e = toWorld(u - 3.5, RAIL.v - 9.5);
  const t = toWorld(u, RAIL.v);
  return { x: e.x, y: s.y + 4.2, z: e.z, tx: t.x, ty: s.y + 1.1, tz: t.z };
}

/** Shows the Great Chart as it stands once `place`'s station has passed. */
function paintChart(world: InkwellWorld, place: string, snap: boolean): void {
  const a = CHART_AFTER[place];
  if (!a) return;
  world.slates(a.slates);
  RAIL_STAGES.forEach((stage, i) =>
    world.circuit.lamp(`rail:${stage}`, i < a.green ? 'ready' : i === a.current ? 'running' : 'dark'),
  );
  world.marker(a.marker, snap);
}

export function createInkwellCircuits(
  host: IslandContentHost,
  o: { ask(a: ChoiceAsk): Promise<string>; card: CircuitHost['card'] },
): InkwellCircuits {
  /** The guild's card comes back on Ready this many seconds from now (the Borrowed Board's last station). */
  let cardBack = -1;

  const circuits = createIslandCircuits<'inkwell', InkwellWorld, Kind, IwShow>(host, o, {
    island: 'inkwell',
    puzzles: [
      ['borrowed-board', 'board'],
      ['two-hands', 'slate'],
      ['shared-chart', 'chart'],
    ],
    spots: CIRCUIT_SPOTS,
    cams: {
      board: INKWELL_ANCHORS.boardCam,
      slate: INKWELL_ANCHORS.slateCam,
      chart: INKWELL_ANCHORS.chartCam,
    },
    toWorld,
    script: INKWELL_QUESTS.script,
    // The rail is watched along its length (the marker slides across the shot).
    shot: (kind, place) => (kind === 'chart' && place === 'rail' ? railShot(2) : null),
    station({ world, kind, at, event, seconds, where }, { reduced }) {
      if (kind === 'board') {
        if (at.place === 'bell' && event === 'pass') host.audio?.sfx.oneShot('gondola_bell', where, 0.8);
        if (at.place === 'card') {
          // You hang one card on Plan; then the runner brings it back on Ready.
          if (at.kind === 'choose' && event === 'pass') world.card('plan', reduced());
          if (at.kind === 'watch' && event === 'open') cardBack = Math.max(1.2, (seconds ?? 5) * 0.5);
          if (at.kind === 'watch' && event === 'pass') {
            cardBack = -1;
            world.card('ready', reduced());
            host.audio?.sfx.oneShot('chime_solve', where, 0.7);
          }
        }
        if (event === 'done') world.show('borrowed', true, !reduced());
      } else if (kind === 'slate') {
        // Your mark, then the mate's note beside it.
        if (at.place === 'slate' && event === 'pass') world.ticks(1, false);
        if (at.place === 'mate' && event === 'pass') {
          world.ticks(1, true);
          host.audio?.sfx.oneShot('lever', where, 0.6);
        }
        if (at.place === 'chest' && event === 'pass') host.audio?.sfx.oneShot('hatch_clank', where, 0.6);
        if (event === 'done') world.show('shared', true, !reduced());
      } else {
        if (event === 'pass') {
          paintChart(world, at.place, reduced());
          if (at.place === 'bells' || at.place === 'build' || at.place === 'glass')
            host.audio?.sfx.oneShot('gondola_bell', where, 0.8);
          if (at.place === 'rack' || at.place === 'soundings')
            host.audio?.sfx.oneShot('hatch_clank', where, 0.5);
          if (at.place === 'soundings') host.audio?.sfx.oneShot('chime_solve', where, 0.8);
        }
        // A mark with no slate behind it: the ink washes off the chart.
        if (at.place === 'rail' && event === 'fail') world.wash();
        if (event === 'done') world.show('inked', true, !reduced());
      }
    },
    dial(world, kind, at, index, { reduced }) {
      if (kind !== 'chart' || at.place !== 'rail') return;
      world.marker(index, reduced());
      host.frame(railShot(index));
    },
    // The card on Ready, the slate's marks, the inked chart, the Seal's banners and high kites.
    shows: [
      ['boardBorrowed', 'borrowed'],
      ['slateShared', 'shared'],
      ['chartInked', 'inked'],
    ],
    sealed: ['sealed', 'sealed'],
    light: (world) => world.setSealLit(true),
    /** The Seal's moment: the Dome lights, its banners unroll, and the kites go up over the cliff. */
    async playSeal(w, { reduced, wait, cutTo, sealLamps, backToTalk }) {
      const r = reduced();
      // From the terrace's west edge, up at the Dome's lamp and its quill.
      const e = toWorld(TERRACE.u - 14, TERRACE.v + 8);
      const t = toWorld(DOME.u, DOME.v);
      await cutTo({ x: e.x, y: TERRACE.y + 3.6, z: e.z, tx: t.x, ty: DOME.gallery - 2, tz: t.z });
      host.audio?.sfx.oneShot('chime_solve', { x: t.x, y: DOME.gallery, z: t.z }, 1);
      w.setSealLit(true);
      sealLamps();
      if (!r) w.show('sealed', false);
      w.show('sealed', true, !r);
      await wait(r ? 1200 : 3000);
      // Back along the Kite Walk: the cliff, the kites and the Dome's light over them.
      const k = KITE_WALK[1];
      const from = toWorld(k.u - 14, k.v - 6);
      await cutTo({ x: from.x, y: k.y + 7, z: from.z, tx: t.x, ty: DOME.gallery - 6, tz: t.z }, 220);
      host.audio?.sfx.oneShot('stinger_triumph', host.player, 0.7);
      await wait(r ? 1200 : 2800);
      await backToTalk();
    },
    update(world, dt) {
      // The runner's on the way back with the card.
      if (cardBack <= 0) return;
      cardBack -= dt;
      if (cardBack <= 0) world.card('ready');
    },
    reset() {
      cardBack = -1;
    },
  });

  return {
    ...circuits,
    debug: {
      ...circuits.debug,
      chart: () => {
        const w = circuits.world();
        return {
          marker: w?.markerAt() ?? -1,
          settled: w?.markerSettled() ?? true,
          slates: w?.slateCount() ?? 0,
          card: w?.cardAt() ?? 'backlog',
        };
      },
    },
  };
}
