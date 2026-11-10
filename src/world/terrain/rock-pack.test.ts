import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ROCK_HEIGHTS, ROCK_KEYS, ROCK_PACK, rockAssets } from './rock-assets';
import { decodeRockPack, encodeRockPack, type RockAsset } from './rock-pack';

const file = readFileSync(fileURLToPath(new URL(`../../../public/${ROCK_PACK}`, import.meta.url)));
const packBytes = (): ArrayBuffer => file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);

const tiny = (over: Partial<RockAsset> = {}): RockAsset => ({
  key: 'pebble',
  positions: new Float32Array([0, 0, 0, 0.5, 0.25, -0.5, 0.12345, 1, 0]),
  normals: new Float32Array([0, 1, 0, 0, 1, 0, 0.6, 0.8, 0]),
  indices: new Uint32Array([0, 1, 2]),
  ...over,
});

describe('the rock pack', () => {
  it('holds the rocks the game picks by index, in order', () => {
    const assets = decodeRockPack(packBytes());
    expect(assets.map((a) => a.key)).toEqual([...ROCK_KEYS]);
    for (const a of assets) {
      expect(a.positions.length % 3).toBe(0);
      expect(a.normals.length).toBe(a.positions.length);
      expect(a.indices.length % 3).toBe(0);
      expect(Math.max(...a.indices)).toBeLessThan(a.positions.length / 3);
    }
    // The tests' rocks are the pack's (rock-test-setup.ts).
    expect(rockAssets().map((a) => a.key)).toEqual([...ROCK_KEYS]);
  });

  it('packs to the same bytes again: nothing is lost either way', () => {
    const again = new Uint8Array(encodeRockPack(decodeRockPack(packBytes())));
    expect(again.length).toBe(file.length);
    expect(Buffer.from(again).equals(file)).toBe(true);
  });

  it("gives each rock's height as the code's table has it", () => {
    const tops = rockAssets().map((a) => {
      let top = -Infinity;
      for (let i = 1; i < a.positions.length; i += 3) top = Math.max(top, a.positions[i]!);
      return top;
    });
    expect(tops).toEqual([...ROCK_HEIGHTS]);
  });

  it('round-trips a mesh, with a key that needs padding', () => {
    const [back] = decodeRockPack(encodeRockPack([tiny()]));
    expect(back).toEqual(tiny());
  });

  it("refuses bytes that aren't a rock pack, and a newer format", () => {
    expect(() => decodeRockPack(new TextEncoder().encode('<!doctype html>').buffer)).toThrow(
      /not a rock pack/,
    );
    const newer = encodeRockPack([tiny()]);
    new DataView(newer).setUint32(4, 99, true);
    expect(() => decodeRockPack(newer)).toThrow(/version 99/);
  });

  it("refuses to pack what it can't hold exactly", () => {
    expect(() =>
      encodeRockPack([tiny({ positions: new Float32Array([0.123456, 0, 0, 0, 0, 0, 0, 0, 0]) })]),
    ).toThrow(/finer than five decimals/);
    expect(() => encodeRockPack([tiny({ normals: new Float32Array(3) })])).toThrow(
      /a normal for every position/,
    );
  });
});

describe('loading the rock pack', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  /** A fresh copy of the module (the tests' own is loaded by the setup), with `fetch` stubbed. */
  async function fresh(respond: (url: string) => Response) {
    vi.resetModules();
    const asked: string[] = [];
    vi.stubGlobal('fetch', async (url: string) => {
      asked.push(url);
      return respond(url);
    });
    return { rocks: await import('./rock-assets'), asked };
  }
  const manifest = () =>
    new Response(JSON.stringify({ version: 1, packs: {}, fileIndex: { [ROCK_PACK]: { sha256: 'abc123' } } }));

  it('says so when rocks are asked for before the pack is in', async () => {
    const { rocks } = await fresh(() => new Response(null, { status: 404 }));
    expect(() => rocks.rockAssets()).toThrow(/not loaded yet/);
  });

  it("asks once for the manifest's copy, however many wait on it", async () => {
    const { rocks, asked } = await fresh((url) =>
      url.includes('manifest.json') ? manifest() : new Response(packBytes()),
    );
    await Promise.all([rocks.loadRockAssets(), rocks.loadRockAssets('low')]);
    await rocks.loadRockAssets();
    expect(asked.filter((u) => u.includes('rocks.bin'))).toEqual([`/${ROCK_PACK}?v=abc123`]);
    expect(rocks.rockAssets().map((a) => a.key)).toEqual([...ROCK_KEYS]);
  });

  it('can be tried again after a load that failed', async () => {
    let online = false;
    const { rocks } = await fresh((url) =>
      url.includes('manifest.json')
        ? manifest()
        : online
          ? new Response(packBytes())
          : new Response(null, { status: 503 }),
    );
    await expect(rocks.loadRockAssets()).rejects.toThrow(/503/);
    expect(() => rocks.rockAssets()).toThrow(/not loaded yet/);
    online = true;
    await rocks.loadRockAssets();
    expect(rocks.rockAssets()).toHaveLength(ROCK_KEYS.length);
  });

  it('no module reads the rock meshes while it loads: the pack comes in after the code', async () => {
    // Each island's code is fetched while the home island builds (cove-scene.ts), before the pack is
    // in: a module that sized something from a mesh as it loaded would fail there, and only there.
    const src = fileURLToPath(new URL('../..', import.meta.url));
    const sources = (readdirSync(src, { recursive: true }) as string[])
      .filter((f) => /\.tsx?$/.test(f) && !/\.test\.|rock-test-setup|\/dev\/|^dev\//.test(f))
      .map((f) => join(src, f));
    const users = sources.filter((f) => /from '[^']*\/rock-assets'/.test(readFileSync(f, 'utf8')));
    const islandCode = sources.filter((f) => /\/game\/[a-z-]+-island\.ts$/.test(f));
    expect(users.length).toBeGreaterThan(8);
    expect(islandCode.length).toBeGreaterThan(4);

    vi.resetModules();
    const failed: string[] = [];
    for (const f of [...users, ...islandCode]) {
      await import(/* @vite-ignore */ f).catch((e: unknown) =>
        failed.push(`${f.slice(src.length)}: ${String(e)}`),
      );
    }
    expect(failed).toEqual([]);
  }, 60_000);
});
