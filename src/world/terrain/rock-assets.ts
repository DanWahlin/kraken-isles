import { packs } from '../../engine/packs';
import { decodeRockPack, type RockAsset } from './rock-pack';

export type { RockAsset } from './rock-pack';

/** The rock pack (Quaternius Stylized Nature MegaKit, CC0), written by tools/terrain/fetch-rocks.ts. */
export const ROCK_PACK = 'packs/testcove/rocks/rocks.bin';

/**
 * The rocks in the pack, in order: code picks one by its index here (boulders 0-2, the two flat
 * path stones 3 and 4), so the pack must hold exactly these.
 */
export const ROCK_KEYS = [
  'Rock_Medium_1',
  'Rock_Medium_2',
  'Rock_Medium_3',
  'RockPath_Round_Wide',
  'RockPath_Round_Thin',
] as const;

/**
 * Each rock's height at scale 1 (its base is at y 0), by its index in `ROCK_KEYS`. Kept here as
 * numbers, so what only places rocks (stream stones, the bakes) needs no pack; a test holds them to
 * the pack's meshes.
 */
export const ROCK_HEIGHTS: readonly number[] = [0.70068, 0.62287, 0.66634, 0.053, 0.05281].map(Math.fround);

let assets: readonly RockAsset[] | null = null;
let loading: Promise<void> | null = null;

/**
 * The rock meshes. They load with the world (`loadRockAssets`), so anything that builds rocks runs
 * after that: asking before throws, where an empty list would have built nothing and said nothing.
 */
export function rockAssets(): readonly RockAsset[] {
  if (!assets) throw new Error('rock assets: not loaded yet (await loadRockAssets() before building rocks)');
  return assets;
}

/** Gives the rock meshes directly (tests and tools read the pack from disk). */
export function setRockAssets(list: readonly RockAsset[]): void {
  const keys = list.map((a) => a.key);
  if (keys.length !== ROCK_KEYS.length || keys.some((k, i) => k !== ROCK_KEYS[i]))
    throw new Error(
      `rock assets: the pack holds [${keys.join(', ')}], this build expects [${ROCK_KEYS.join(', ')}]`,
    );
  assets = list;
}

/**
 * Loads the rock pack once (later calls share it; a failed load can be tried again). It's in the
 * critical packs the flow prefetches, so in a voyage this reads the browser's cache. `priority: 'low'`
 * for a load nothing waits on yet (see PackLoader.prefetch).
 */
export function loadRockAssets(priority: RequestPriority = 'auto'): Promise<void> {
  if (assets) return Promise.resolve();
  loading ??= (async () => {
    // The manifest gives the file's hash, so this asks for the same URL the prefetch cached.
    await packs.loadManifest();
    const response = await fetch(packs.url(ROCK_PACK), { priority });
    if (!response.ok) throw new Error(`Failed to load the rock pack: ${response.status}`);
    setRockAssets(decodeRockPack(await response.arrayBuffer()));
  })().catch((error: unknown) => {
    loading = null;
    throw error;
  });
  return loading;
}
