import { COURSE } from '../course/catalog';
import { islandSign } from '../course/active';
import { ISLAND_IDS, type IslandId } from '../islands/registry';
import { ARCH_H, ARCH_W, archipelagoFor } from '../ui/chart/archipelago';
import { TIDEWHEEL_ANCHORS } from '../world/islands/tidewheel/anchors';
import type { TidewheelWorld } from '../world/islands/tidewheel/index';
import { LIGHTHOUSE, TERRACE, toWorld } from '../world/islands/tidewheel/layout';
import type { CameraShot } from './follow-camera';
import type { IslandContentHost } from './island-code';
import type { ScriptStep } from './script';

/**
 * The Long Light: the voyage's ending, played once after the Seal of Tidewheel
 * (docs/specs/ISLAND-07-tidewheel-caldera.md §10). Night falls over the caldera; a night chart of the
 * isles comes up and their lights turn on one by one in voyage order, while Juno says what you
 * practised at each (the pack's `ending.*` scripts: the course's own Course Complete table); the
 * kraken surfaces once in the bay, calm, and goes down; and Juno says the course's last word. No fail
 * state and no fight. Esc or Skip ends it at once; with reduced motion the nightfall is a cut.
 */

/** The night the ending runs the sky to (h), and how long the dusk takes (s). */
const NIGHT = 21.5;
const DUSK_SECONDS = 6;
/** How long the kraken shows (s), rise to gone. */
const KRAKEN_SECONDS = 14;
/** Where she rises (deep water off the berthed ship's bow) and where the camera watches from. */
const KRAKEN_AT = { u: -194, v: -16 } as const;
const QUAY_END = { u: -150, v: 6 } as const;
/**
 * Isles that light with the one before them and have no line of their own. Port Meridian lights with
 * Anchorage Cay: setup and the tour are the course's orientation, one row of its Course Complete table.
 */
const LIGHTS_WITH_LAST: ReadonlySet<IslandId> = new Set<IslandId>(['meridian']);
/** The chart's lights in voyage order, grouped by the line Juno says for them. */
const LIGHT_GROUPS: readonly (readonly IslandId[])[] = ISLAND_IDS.reduce<IslandId[][]>((groups, id) => {
  if (LIGHTS_WITH_LAST.has(id) && groups.length) groups[groups.length - 1]!.push(id);
  else groups.push([id]);
  return groups;
}, []);

const SVG = 'http://www.w3.org/2000/svg';
const svg = <K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>) => {
  const e = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  return e;
};

export interface LongLight {
  /** Plays the ending through (the `tw-ending` cue). */
  play(): Promise<void>;
  /** For the tests: whether it is playing, whether it has played, and how many lights are lit. */
  state(): { playing: boolean; played: boolean; lit: number };
  dispose(): void;
}

export function createLongLight(
  host: IslandContentHost,
  o: {
    world(): TidewheelWorld | null;
    /** A script of the island's by name (`ending.open`, `ending.light.<island>`, …). */
    script(name: string): readonly ScriptStep[];
    wait(ms: number): Promise<unknown>;
  },
): LongLight {
  let playing = false;
  let played = false;
  let skipped = false;
  let lit = 0;
  let overlay: HTMLDivElement | null = null;
  const reduced = () => host.reducedMotion();

  /** The voice lines of one of the ending's scripts. */
  const lines = (name: string) =>
    o.script(name).flatMap((s) => ('say' in s && typeof s.say === 'string' ? [s.say] : []));
  /** Says a script's lines (nothing once skipped). */
  const say = async (name: string) => {
    for (const id of lines(name)) {
      if (skipped || host.disposed()) return;
      await host.say([id]);
    }
  };
  const pause = async (ms: number) => {
    if (!skipped) await o.wait(reduced() ? Math.min(ms, 400) : ms);
  };
  /** A wait that reduced motion doesn't shorten (the kraken rises slowly either way). */
  const hold = async (ms: number) => {
    if (!skipped) await o.wait(ms);
  };

  /** The night chart: the isles in their chart places, the voyage's line, and a lamp for each. */
  function buildChart(): { root: HTMLDivElement; light(id: IslandId): void } {
    const root = document.createElement('div');
    root.className = 'hud-ending';
    const title = document.createElement('div');
    title.className = 'hud-ending-title';
    title.textContent = islandSign('tidewheel', 'lastLeverPlate');
    const isles = archipelagoFor(COURSE).filter((i) => (ISLAND_IDS as readonly string[]).includes(i.id));
    const pts = isles.map((i) => [i.x * ARCH_W, i.y * ARCH_H] as const);
    // The chart's frame is the isles' own box, so they fill the screen at any size.
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const x0 = Math.min(...xs) - 110;
    const y0 = Math.min(...ys) - 90;
    const viewBox = [x0, y0, Math.max(...xs) + 110 - x0, Math.max(...ys) + 100 - y0]
      .map(Math.round)
      .join(' ');
    const chart = svg('svg', { viewBox, class: 'hud-ending-chart', role: 'img' });
    chart.setAttribute('aria-label', title.textContent);
    // A lamp's glow: warm at the lamp, gone at its edge.
    const glow = svg('radialGradient', { id: 'hud-ending-glow' });
    for (const [offset, color, opacity] of [
      [0, '#fff1c4', 0.95],
      [0.22, '#ffcf7a', 0.5],
      [0.6, '#ff9d45', 0.12],
      [1, '#ff9d45', 0],
    ] as const)
      glow.append(svg('stop', { offset, 'stop-color': color, 'stop-opacity': opacity }));
    const defs = svg('defs', {});
    defs.append(glow);
    chart.append(defs);
    // The voyage's line, a leg at a time: a leg turns gold when the isle at its end lights.
    const legs = new Map<string, SVGLineElement>();
    for (let k = 1; k < isles.length; k++) {
      const [x1, y1] = pts[k - 1]!;
      const [x2, y2] = pts[k]!;
      const leg = svg('line', { class: 'hud-ending-leg', x1, y1, x2, y2 });
      legs.set(isles[k]!.id, leg);
      chart.append(leg);
    }
    const lamps = new Map<string, SVGGElement>();
    for (const [k, isle] of isles.entries()) {
      const [x, y] = pts[k]!;
      const g = svg('g', {
        class: 'hud-ending-isle',
        transform: `translate(${x.toFixed(1)} ${y.toFixed(1)})`,
      });
      // A low island under its light: two soft humps, each isle a little different.
      g.append(
        svg('circle', { class: 'glow', r: 78, fill: 'url(#hud-ending-glow)' }),
        svg('ellipse', { class: 'land', cx: -6 + (k % 3) * 5, cy: 14, rx: 34 + (k % 4) * 5, ry: 13 }),
        svg('ellipse', { class: 'land', cx: 12 - (k % 2) * 20, cy: 8, rx: 18 + (k % 3) * 4, ry: 10 }),
        svg('path', { class: 'tower', d: 'M-3 6 L-2 -12 L2 -12 L3 6 Z' }),
        svg('path', { class: 'rays', d: 'M0 -33 V-21 M0 -9 V3 M-18 -15 H-6 M6 -15 H18' }),
        svg('circle', { class: 'lamp', cy: -15, r: 4.5 }),
      );
      const name = svg('text', { class: 'name', y: 46, 'text-anchor': 'middle' });
      name.textContent = isle.name;
      g.append(name);
      chart.append(g);
      lamps.set(isle.id, g);
    }
    const skip = document.createElement('button');
    skip.type = 'button';
    skip.className = 'hud-ending-skip';
    skip.textContent = 'Skip';
    skip.addEventListener('click', () => {
      skipped = true;
    });
    root.append(title, chart, skip);
    return {
      root,
      light(id) {
        const g = lamps.get(id);
        if (!g || g.classList.contains('lit')) return;
        g.classList.add('lit');
        legs.get(id)?.classList.add('lit');
        lit++;
      },
    };
  }

  /** Runs the sky from the island's hour to the night's, over the dusk (a cut with reduced motion). */
  async function nightfall(): Promise<void> {
    const from = host.sky.hours();
    if (reduced() || skipped) {
      await host.fade(true, 240);
      host.sky.set(NIGHT);
      await host.fade(false, 240);
      return;
    }
    const t0 = performance.now();
    await new Promise<void>((done) => {
      const step = () => {
        const k = Math.min(1, (performance.now() - t0) / (DUSK_SECONDS * 1000));
        // Ease in and out: the light goes slowly at first, as a real dusk does.
        const e = k * k * (3 - 2 * k);
        host.sky.set(from + (NIGHT - from) * e);
        if (k >= 1 || skipped || host.disposed()) done();
        else requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
    host.sky.set(NIGHT);
  }

  const onKey = (e: KeyboardEvent) => {
    if (e.code === 'Escape' && playing) {
      skipped = true;
      e.stopPropagation();
    }
  };

  async function play(): Promise<void> {
    if (playing || played || host.disposed()) return;
    playing = true;
    skipped = false;
    lit = 0;
    const world = o.world();
    window.addEventListener('keydown', onKey, true);
    host.setModal(true);
    host.audio?.music.setIsland('ending', { fade: 2.5 });
    try {
      // On the terrace, looking past the tower's lamp and out through the breach, as the light goes.
      const e = toWorld(TERRACE.u + 9, TERRACE.v + 11);
      const t = toWorld(-420, -30);
      const dusk: CameraShot = { x: e.x, y: TERRACE.y + 5.5, z: e.z, tx: t.x, ty: 20, tz: t.z };
      host.cut(dusk);
      await nightfall();
      await say('ending.open');

      // The chart again: its lights turn on in voyage order.
      const chart = buildChart();
      overlay = chart.root;
      host.overlay.insertBefore(chart.root, host.overlay.firstChild);
      // (A frame, so the fade-in runs.)
      await new Promise((r) => requestAnimationFrame(r));
      chart.root.classList.add('show');
      await pause(1400);
      for (const group of LIGHT_GROUPS) {
        for (const id of group) {
          if (skipped) break;
          chart.light(id);
          host.audio?.sfx.oneShot('chime_solve', host.player, 0.35);
          await pause(700);
        }
        await say(`ending.light.${group[0]}`);
      }
      await pause(1800);
      chart.root.classList.remove('show');
      await pause(900);
      chart.root.remove();
      overlay = null;

      // The kraken: once more, off your ship's bow in the bay, calm; then down for good. (Lite has no
      // second kraken: Juno says her lines to the dark water.)
      if (!skipped) {
        const from = toWorld(QUAY_END.u, QUAY_END.v);
        const bay = toWorld(KRAKEN_AT.u, KRAKEN_AT.v);
        host.cut({ x: from.x, y: 9, z: from.z, tx: bay.x, ty: 9, tz: bay.z });
        const shown = performance.now();
        host.cove.sightings?.showAt(bay.x, bay.z, 0, KRAKEN_SECONDS);
        // Her arms take four seconds to rise; Juno speaks as the first one stands.
        await hold(3600);
        await say('ending.kraken');
        // Stay until she has started down, however fast the lines went.
        await hold(Math.max(1200, (KRAKEN_SECONDS - 2.5) * 1000 - (performance.now() - shown)));
      }

      // The last word, under the lit Lighthouse.
      if (!skipped) {
        const lamp = TIDEWHEEL_ANCHORS.light;
        const back = toWorld(TERRACE.u - 12, TERRACE.v + 4);
        host.cut({
          x: back.x,
          y: TERRACE.y + 2.4,
          z: back.z,
          tx: lamp.x,
          ty: LIGHTHOUSE.lamp - 4,
          tz: lamp.z,
        });
        await say('ending.last');
        await pause(1200);
      }
    } catch (err) {
      // The ending is the Seal's last cue: a fault in it must not stop the Seal's script.
      console.error('The Long Light stopped early', err);
    } finally {
      // Back to the island's own hour and its theme, through a fade.
      await host.fade(true, 320);
      overlay?.remove();
      overlay = null;
      host.cove.sightings?.clear();
      world?.setSealLit(true);
      host.sky.home();
      host.audio?.music.setIsland('tidewheel', { fade: 2.5 });
      host.backToTalk();
      await host.fade(false, 320);
      host.setModal(false);
      window.removeEventListener('keydown', onKey, true);
      playing = false;
      played = true;
    }
  }

  return {
    play,
    state: () => ({ playing, played, lit }),
    dispose() {
      window.removeEventListener('keydown', onKey, true);
      overlay?.remove();
      overlay = null;
    },
  };
}
