import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ROCK_PACK, setRockAssets } from './rock-assets';
import { decodeRockPack } from './rock-pack';

// Vitest: every test runs with the rock pack in, as the world does once it has loaded it. Read from
// disk (there's no server to fetch from).
const file = readFileSync(fileURLToPath(new URL(`../../../public/${ROCK_PACK}`, import.meta.url)));
setRockAssets(decodeRockPack(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength)));
