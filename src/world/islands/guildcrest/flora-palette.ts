import type { FloraPalette } from '../../flora/types';

/**
 * Guildcrest's flora (Ch04, a cool highland island, spec §2.3, G14): a short, cool-green sward in the
 * glen and the town's greens, and the moor's heather (purple spikes, in broad drifts the terrain
 * carries on as colour), gorse in yellow banks, harebells in the grass, and ferns under the pines and
 * by the burn. Species are rows of the shared table (no new material); it has 24 rows and the five
 * islands fill them (Guildcrest's four: the shingle by the loch keeps only its creeping blades).
 */
export const GUILDCREST_FLORA_PALETTE: FloraPalette = {
  id: 'guildcrest',
  bounds: { minX: 5280, maxX: 6540, minZ: -400, maxZ: 910 },
  grass: { ramp: [0x33452a, 0x52693a, 0x7a8a4c, 0xa49a62], straw: 0.08 },
  sward: { lush: 0x5c7440, dry: 0x76784a, moss: 0x4e6236, cover: 0.62 },
  drifts: { coverage: 0.5, leadShare: 0.72, seed: 4.4 },
  species: [
    {
      id: 'heather',
      form: 'spike',
      colours: [0x7a4a7e, 0x9a5c94],
      eye: 0xb784b0,
      cup: 0,
      throat: 0,
      size: [0.035, 0.05],
      stem: [0.22, 0.4],
      habitats: ['meadow'],
      weight: 2.6,
      // The moor's purple, carried on in the ground past the plants' reach.
      drifts: true,
    },
    {
      id: 'gorse',
      form: 'bloom',
      colours: [0xe2b83a, 0xf0cc4a],
      eye: 0xc89a20,
      cup: 0.25,
      throat: 0.1,
      size: [0.03, 0.045],
      stem: [0.4, 0.7],
      habitats: ['meadow', 'bank'],
      weight: 0.9,
      drifts: true,
    },
    {
      id: 'harebell',
      form: 'bloom',
      colours: [0x6f7fc2, 0x8a94d4],
      eye: 0xdedcf2,
      cup: 0.7,
      throat: 0.5,
      size: [0.025, 0.035],
      stem: [0.2, 0.34],
      habitats: ['meadow', 'village'],
      weight: 0.6,
      drifts: false,
    },
    {
      id: 'highland-fern',
      form: 'frond',
      colours: [0x3d5a2a, 0x5a7a34],
      eye: 0x7a9a48,
      cup: 0,
      throat: 0,
      size: [0.16, 0.24],
      stem: [0.3, 0.52],
      habitats: ['forest', 'bank', 'spray'],
      weight: 1.6,
      drifts: false,
    },
  ],
};
