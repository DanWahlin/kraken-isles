import type { FloraPalette } from '../../flora/types';
import { SUNSPIRE as S } from './layout';

/**
 * Sunspire's flora (Ch05, a red desert island, spec S11): dry bunchgrass in sparse tufts on the
 * desert floor, with desert marigold and globe mallow in loose drifts after the rains; sand verbena
 * on the dunes' feet; and at the oasis a short green sward with ferns by the water. Species are rows
 * of the shared table (no new material).
 */
export const SUNSPIRE_FLORA_PALETTE: FloraPalette = {
  id: 'sunspire',
  bounds: { minX: S.bounds.minX, maxX: S.bounds.maxX, minZ: S.bounds.minZ, maxZ: S.bounds.maxZ },
  grass: { ramp: [0x5a6a36, 0x8a8a4a, 0xb8a65c, 0xd9c47c], straw: 0.4 },
  sward: { lush: 0x5e8a44, dry: 0xb09a5e, moss: 0x4e6e38, cover: 0.3 },
  drifts: { coverage: 0.22, leadShare: 0.6, seed: 5.5 },
  species: [
    {
      id: 'desert-marigold',
      form: 'bloom',
      colours: [0xe8b830, 0xf2cc48],
      eye: 0xc8901c,
      cup: 0.2,
      throat: 0.1,
      size: [0.03, 0.045],
      stem: [0.18, 0.32],
      habitats: ['meadow', 'village'],
      weight: 1.6,
      drifts: true,
    },
    {
      id: 'globe-mallow',
      form: 'bloom',
      colours: [0xe0763a, 0xec8c4c],
      eye: 0xf2d27a,
      cup: 0.6,
      throat: 0.35,
      size: [0.025, 0.04],
      stem: [0.3, 0.52],
      habitats: ['meadow', 'bank'],
      weight: 1.0,
      drifts: true,
    },
    {
      id: 'sand-verbena',
      form: 'bloom',
      colours: [0xb46aae, 0xc884c0],
      eye: 0xf0e2ee,
      cup: 0.4,
      throat: 0.3,
      size: [0.03, 0.04],
      stem: [0.08, 0.16],
      habitats: ['dune'],
      weight: 1.2,
      drifts: false,
    },
    {
      id: 'oasis-fern',
      form: 'frond',
      colours: [0x3f6a2c, 0x5e8a3a],
      eye: 0x82a84c,
      cup: 0,
      throat: 0,
      size: [0.16, 0.24],
      stem: [0.3, 0.5],
      habitats: ['bank', 'spray'],
      weight: 1.6,
      drifts: false,
    },
  ],
};
