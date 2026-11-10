import { createPost } from '../engine/post';
import { FlyoverPath } from '../game/flyover';
import type { CameraShot } from '../game/follow-camera';
import { ISLAND_LIST, isIslandId, type IslandId } from '../islands/registry';
import type { IslandEntry } from '../islands/types';
import { footprintDistance } from '../world/islands/footprint';
import { createCovePage } from './cove-page';
import { bindSkyPanel, compileAndStart, engineStats, seaOrbitControls, showSkyReadouts } from './harness';
import { islandTour, islandViews, type IslandView } from './island-views';

/**
 * Island viewer dev page: every island in the registry on a tab. Opening a tab flies the camera
 * round the island (the tour) until you take hold of the view; each island also has its own views
 * (the whole island, its harbour, its quay, the stops of its arrival flight) and the arrival flight
 * itself, all in the island's own light. The world only: no cast, chests or puzzles (the play page
 * has those). `?island=<id>&view=<id>` opens on one; `?webgl`, `?tier=`, `?tm=` as on every dev page.
 */
const { h, cove, coveMs: buildMs } = await createCovePage();
const { q, renderer, engine, canvas, tier } = h;
const { scene, camera, clock } = engine;
const post = q.has('nopost')
  ? null
  : await createPost(renderer, scene, camera, tier, { temporal: !q.has('notaa') });
if (post) engine.renderFn = post.render;

const controls = seaOrbitControls(camera, canvas);
const setCam = (position: readonly number[], target: readonly number[]) => {
  camera.position.set(position[0]!, position[1]!, position[2]!);
  controls.target.set(target[0]!, target[1]!, target[2]!);
  controls.update();
};
const setTime = bindSkyPanel({ q, clock, invalidate: () => cove.sky.invalidate(), setView: () => {} });

const el = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const tabsEl = el('tabs');
const viewsEl = el('views');
const stopsEl = el('stops');
const flyEl = el<HTMLButtonElement>('fly');
const ownLightEl = el<HTMLInputElement>('ownLight');
const keepEl = el<HTMLInputElement>('keep');
const stateEl = el('state');
const stats = el('stats');

let current: IslandEntry = ISLAND_LIST[0]!;
let views: IslandView[] = [];
/** The view on show: one of the island's views, or 'tour' while the camera flies round it. */
let viewId = 'tour';
/** The tour moves the camera on its own: with reduced motion it waits to be asked for. */
const firstView = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'overview' : 'tour';

/**
 * The camera flying on its own: the island's tour (round and round) or its arrival flight (once), and
 * how far in (s). Taking hold of the view (a press or a scroll on the scene, a key) ends it, and the
 * camera stays where it was for you to carry on from.
 */
let flight: { tour: true; t: number } | { tour: false; t: number; path: FlyoverPath } | null = null;
const shot: CameraShot = { x: 0, y: 0, z: 0, tx: 0, ty: 0, tz: 0 };
const pressed = (id: string | null) => {
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-island-view]'))
    b.setAttribute('aria-pressed', String(b.dataset.islandView === id));
};
const endFlight = () => {
  if (!flight) return;
  const wasTour = flight.tour;
  flight = null;
  controls.enabled = true;
  flyEl.textContent = 'Fly the arrival';
  flyEl.setAttribute('aria-pressed', 'false');
  if (wasTour) pressed(null);
};
for (const type of ['pointerdown', 'wheel'] as const)
  canvas.addEventListener(type, endFlight, { passive: true });

function remember(): void {
  const url = new URL(location.href);
  url.searchParams.set('island', current.id);
  url.searchParams.set('view', viewId);
  history.replaceState(null, '', url);
}

function showView(id: string): void {
  endFlight();
  if (id === 'tour') {
    viewId = id;
    flight = { tour: true, t: 0 };
    controls.enabled = false;
  } else {
    const view = views.find((v) => v.id === id) ?? views[0]!;
    viewId = view.id;
    setCam(view.pose[0], view.pose[1]);
  }
  pressed(viewId);
  remember();
}

function viewButton(view: Pick<IslandView, 'id' | 'label'>): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = view.label;
  b.dataset.islandView = view.id;
  if (view.id === 'tour') b.title = 'Flies round the island until you take hold of the view';
  if (view.id.startsWith('stop-')) b.title = `Arrival flight, stop ${view.label}`;
  b.onclick = () => showView(view.id);
  return b;
}

function selectIsland(id: IslandId, view = firstView): void {
  current = ISLAND_LIST.find((e) => e.id === id)!;
  for (const tab of tabsEl.querySelectorAll<HTMLButtonElement>('[role=tab]')) {
    const on = tab.dataset.island === id;
    tab.setAttribute('aria-selected', String(on));
    tab.tabIndex = on ? 0 : -1;
  }
  // A streamed island comes in now (the home island is built with the world).
  const stream = cove.islands[id];
  if (stream && stream.state !== 'resident' && stream.state !== 'loading')
    void stream.load('auto', true).catch((error: unknown) => console.warn('[islands] load failed', error));
  if (ownLightEl.checked) setTime(current.sky.hours, current.sky.azimuth);

  views = islandViews(current, (x, z) => cove.heightField.heightAt(x, z));
  viewsEl.replaceChildren(
    viewButton({ id: 'tour', label: 'Tour' }),
    ...views.filter((v) => !v.id.startsWith('stop-')).map(viewButton),
  );
  stopsEl.replaceChildren(...views.filter((v) => v.id.startsWith('stop-')).map(viewButton));
  flyEl.title = `${current.arrival.seconds} s: in from the sea, across ${current.name}, down to the quay`;
  showView(view);
}

flyEl.onclick = () => {
  const flying = flight && !flight.tour;
  endFlight();
  if (flying) return;
  pressed(null);
  flight = { tour: false, path: new FlyoverPath(current.arrival.keys, current.arrival.seconds), t: 0 };
  controls.enabled = false;
  flyEl.textContent = 'Stop the flight';
  flyEl.setAttribute('aria-pressed', 'true');
};
ownLightEl.onchange = () => {
  if (ownLightEl.checked) setTime(current.sky.hours, current.sky.azimuth);
};

// One tab an island, in voyage order.
ISLAND_LIST.forEach((island, i) => {
  const tab = document.createElement('button');
  tab.type = 'button';
  tab.role = 'tab';
  tab.dataset.island = island.id;
  tab.title = `${island.name} (key ${i + 1})`;
  const dot = document.createElement('span');
  dot.className = 'dot';
  dot.setAttribute('aria-hidden', 'true');
  const name = document.createElement('span');
  name.textContent = island.name;
  tab.append(dot, name);
  tab.onclick = () => selectIsland(island.id);
  tabsEl.append(tab);
});
// Arrow keys move along the tabs, 1-9 jump to one.
tabsEl.addEventListener('keydown', (e) => {
  const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
  if (!step) return;
  const i = ISLAND_LIST.indexOf(current);
  const next = ISLAND_LIST[(i + step + ISLAND_LIST.length) % ISLAND_LIST.length]!;
  selectIsland(next.id);
  tabsEl.querySelector<HTMLButtonElement>(`[data-island="${next.id}"]`)?.focus();
  e.preventDefault();
});
addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey || e.altKey) return;
  const island = ISLAND_LIST[Number(e.key) - 1];
  if (island) selectIsland(island.id);
  else if (e.key === 'Escape') endFlight();
});

const STATE_WORDS = {
  absent: 'not in memory',
  loading: 'streaming in…',
  resident: 'in memory',
  unloading: 'being freed…',
  failed: 'failed to load',
} as const;

let n = 0;
engine.add({
  frame(dt) {
    if (flight) {
      flight.t += dt;
      let done = false;
      if (flight.tour) islandTour(current, flight.t, shot);
      else done = flight.path.sample(flight.t, shot);
      camera.position.set(shot.x, shot.y, shot.z);
      controls.target.set(shot.tx, shot.ty, shot.tz);
      camera.lookAt(controls.target);
      if (done) endFlight();
    } else controls.update();
    if (++n % 20 !== 0) return;

    // An island you've left is freed once the camera is past its range (as the game's residency does),
    // unless you keep them: all five together hold a lot of memory.
    for (const island of ISLAND_LIST) {
      const stream = cove.islands[island.id];
      const state = cove.residents[island.id].state;
      tabsEl.querySelector<HTMLElement>(`[data-island="${island.id}"]`)!.dataset.state = state;
      if (!stream || island === current || keepEl.checked || state !== 'resident') continue;
      const off = footprintDistance(island.footprint, camera.position.x, camera.position.z);
      if (off > island.ranges.unload) void stream.unload();
    }
    stateEl.textContent = `${current.name}: ${STATE_WORDS[cove.residents[current.id].state]}`;
    const c = engine.counters.last;
    cove.mirror?.finalizeFrame(c.drawCalls, c.triangles);
    stats.textContent =
      `${engineStats(h).join('\n')}\n` +
      `scale ${engine.adaptive.scale.toFixed(2)} · ${clock.hours.toFixed(2)}h · build ${buildMs.toFixed(0)} ms`;
    showSkyReadouts(clock);
  },
});

const asked = q.get('island') ?? '';
selectIsland(isIslandId(asked) ? asked : ISLAND_LIST[0]!.id, q.get('view') ?? firstView);

await compileAndStart(renderer, engine, scene, camera, post ? () => post.compile() : undefined);

(window as unknown as { __dev: object }).__dev = {
  ready: true,
  camera,
  setCam,
  setTime,
  /** Opens an island's tab (and one of its views). */
  island: (id: string, view?: string) => (isIslandId(id) ? (selectIsland(id, view), true) : false),
  /** The island on show, its view, and where every island's world is (absent, loading, resident…). */
  state: () => ({
    island: current.id,
    view: viewId,
    flying: flight ? (flight.tour ? 'tour' : 'arrival') : null,
    islands: Object.fromEntries(ISLAND_LIST.map((e) => [e.id, cove.residents[e.id].state])),
  }),
};
