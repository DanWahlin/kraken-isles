import type { FloraPalette } from '../../flora/types';
import { INKWELL as S } from './layout';

/**
 * Inkwell's flora (Ch06, a white-cliff island, spec I12): summer meadow on the bluff's top and in the
 * valley, with red poppies and chamomile in loose drifts; yellow broom on the skirts under the wall;
 * sea lavender on the beach's back. Species are rows of the shared table (no new material).
 */
export const INKWELL_FLORA_PALETTE: FloraPalette = {
  id: 'inkwell',
  bounds: { minX: S.bounds.minX, maxX: S.bounds.maxX, minZ: S.bounds.minZ, maxZ: S.bounds.maxZ },
  grass: { ramp: [0x4e7a38, 0x76984a, 0xa4b060, 0xd0c47c], straw: 0.28 },
  sward: { lush: 0x6e9a4e, dry: 0xa8a45e, moss: 0x55783c, cover: 0.6 },
  drifts: { coverage: 0.3, leadShare: 0.6, seed: 6.5 },
  species: [
    {
      id: 'red-poppy',
      form: 'bloom',
      colours: [0xd8402c, 0xe65a3a],
      eye: 0x2a2228,
      cup: 0.55,
      throat: 0.3,
      size: [0.035, 0.05],
      stem: [0.28, 0.46],
      habitats: ['meadow', 'village'],
      weight: 1.5,
      drifts: true,
    },
    {
      id: 'chamomile',
      form: 'bloom',
      colours: [0xf4f0e0, 0xfffaf0],
      eye: 0xe8c440,
      cup: 0.15,
      throat: 0.1,
      size: [0.022, 0.032],
      stem: [0.16, 0.3],
      habitats: ['meadow', 'village', 'bank'],
      weight: 1.6,
      drifts: true,
    },
    {
      id: 'yellow-broom',
      form: 'bloom',
      colours: [0xe8c440, 0xf2d458],
      eye: 0xc89a20,
      cup: 0.5,
      throat: 0.3,
      size: [0.025, 0.035],
      stem: [0.36, 0.6],
      habitats: ['bank'],
      weight: 1.0,
      drifts: true,
    },
    {
      id: 'sea-lavender',
      form: 'bloom',
      colours: [0x8e7cc3, 0xa694d6],
      eye: 0xe8e2f4,
      cup: 0.4,
      throat: 0.3,
      size: [0.02, 0.03],
      stem: [0.14, 0.26],
      habitats: ['dune'],
      weight: 1.2,
      drifts: false,
    },
  ],
};
