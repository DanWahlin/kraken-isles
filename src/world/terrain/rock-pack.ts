/** One rock mesh from the pack: unit-sized (its longest side is 1, its base at y 0), indexed triangles. */
export interface RockAsset {
  key: string;
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint32Array;
}

/**
 * The rock pack's format (`public/packs/testcove/rocks/rocks.bin`, written by
 * tools/terrain/fetch-rocks.ts), little-endian, every part on a 4-byte boundary:
 *
 *   u32 magic 'ROCK', u32 version, u32 asset count, then for each asset:
 *   u32 key length, the key (UTF-8, padded), u32 vertex count, u32 index count,
 *   i32 × 3 × vertices positions, i32 × 3 × vertices normals, u16 × indices (padded)
 *
 * Positions and normals are the source's values at five decimals, stored as whole numbers of
 * `1 / ROCK_PACK_SCALE`: reading them back gives the same floats the old generated module held, so
 * nothing built from the rocks moved when they left the JavaScript bundle.
 */
const MAGIC = 0x4b434f52;
const VERSION = 1;
export const ROCK_PACK_SCALE = 1e5;

const pad4 = (n: number) => (n + 3) & ~3;

/** Packs rock meshes (tools and tests; the game only reads). Throws on a value the format can't hold. */
export function encodeRockPack(assets: readonly RockAsset[]): ArrayBuffer {
  const encoder = new TextEncoder();
  const keys = assets.map((a) => encoder.encode(a.key));
  let bytes = 12;
  assets.forEach((a, i) => {
    if (a.positions.length !== a.normals.length || a.positions.length % 3 !== 0)
      throw new Error(`rock pack: "${a.key}" needs a normal for every position`);
    if (a.positions.length / 3 > 0x10000) throw new Error(`rock pack: "${a.key}" has too many vertices`);
    bytes += 4 + pad4(keys[i]!.length) + 8 + a.positions.length * 8 + pad4(a.indices.length * 2);
  });
  const buffer = new ArrayBuffer(bytes);
  const view = new DataView(buffer);
  view.setUint32(0, MAGIC, true);
  view.setUint32(4, VERSION, true);
  view.setUint32(8, assets.length, true);
  let at = 12;
  assets.forEach((a, i) => {
    const key = keys[i]!;
    view.setUint32(at, key.length, true);
    new Uint8Array(buffer, at + 4, key.length).set(key);
    at += 4 + pad4(key.length);
    view.setUint32(at, a.positions.length / 3, true);
    view.setUint32(at + 4, a.indices.length, true);
    at += 8;
    for (const values of [a.positions, a.normals]) {
      for (let k = 0; k < values.length; k++) {
        const whole = Math.round(values[k]! * ROCK_PACK_SCALE);
        if (Math.fround(whole / ROCK_PACK_SCALE) !== values[k])
          throw new Error(`rock pack: "${a.key}" has a value finer than five decimals (${values[k]})`);
        view.setInt32(at, whole, true);
        at += 4;
      }
    }
    for (let k = 0; k < a.indices.length; k++) view.setUint16(at + k * 2, a.indices[k]!, true);
    at += pad4(a.indices.length * 2);
  });
  return buffer;
}

/** Reads a rock pack. Throws when the bytes aren't one (a 404 page, a newer format). */
export function decodeRockPack(buffer: ArrayBuffer): RockAsset[] {
  const view = new DataView(buffer);
  if (buffer.byteLength < 12 || view.getUint32(0, true) !== MAGIC)
    throw new Error('rock pack: not a rock pack');
  const version = view.getUint32(4, true);
  if (version !== VERSION) throw new Error(`rock pack: version ${version}, this build reads ${VERSION}`);
  const count = view.getUint32(8, true);
  const decoder = new TextDecoder();
  const assets: RockAsset[] = [];
  let at = 12;
  const floats = (n: number): Float32Array => {
    const out = new Float32Array(n);
    for (let k = 0; k < n; k++) out[k] = view.getInt32(at + k * 4, true) / ROCK_PACK_SCALE;
    at += n * 4;
    return out;
  };
  for (let i = 0; i < count; i++) {
    const keyLength = view.getUint32(at, true);
    const key = decoder.decode(new Uint8Array(buffer, at + 4, keyLength));
    at += 4 + pad4(keyLength);
    const vertices = view.getUint32(at, true);
    const indexCount = view.getUint32(at + 4, true);
    at += 8;
    const positions = floats(vertices * 3);
    const normals = floats(vertices * 3);
    const indices = new Uint32Array(indexCount);
    for (let k = 0; k < indexCount; k++) indices[k] = view.getUint16(at + k * 2, true);
    at += pad4(indexCount * 2);
    assets.push({ key, positions, normals, indices });
  }
  return assets;
}
