import type { FloraPalette } from '../../flora/types';
import { TIDEWHEEL as S } from './layout';

/**
 * Tidewheel's flora (Ch07, a caldera, spec T13): thin summer turf on black ground, with fireweed and
 * white yarrow in loose drifts; yellow broom on the talus under the wall; sea thrift on the black
 * beach's back. Species are rows of the shared table (no new material).
 */
export const TIDEWHEEL_FLORA_PALETTE: FloraPalette = {
  id: 'tidewheel',
  bounds: { minX: S.bounds.minX, maxX: S.bounds.maxX, minZ: S.bounds.minZ, maxZ: S.bounds.maxZ },
  grass: { ramp: [0x3f6a34, 0x64883f, 0x93a252, 0xc2b86c], straw: 0.34 },
  sward: { lush: 0x5e8a44, dry: 0x9a9654, moss: 0x4c7038, cover: 0.26 },
  drifts: { coverage: 0.16, leadShare: 0.7, seed: 7.5 },
  species: [
    {
      id: 'fireweed',
      form: 'bloom',
      colours: [0xc2337a, 0xd6559a],
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
      id: 'yarrow',
      form: 'bloom',
      colours: [0xf0eee2, 0xfffaf0],
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
      id: 'cinder-broom',
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
      id: 'sea-thrift',
      form: 'bloom',
      colours: [0xe8a6b8, 0xf0bcc8],
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
