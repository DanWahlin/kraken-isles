import { GUILDCREST_FLORA_PALETTE } from '../world/islands/guildcrest/flora-palette';
import { guildcrestTerrainRegions } from '../world/islands/guildcrest/terrain-regions';
import type { IslandInBuild } from './types';

/**
 * Guildcrest (Chapter 04, docs/specs/ISLAND-04-guildcrest.md) while its world is built: its terrain
 * regions and flora palette only, so the dev terrain page draws its bake with its looks
 * (`devpages/terrain.html?pack=guildcrest`). Its full registry entry replaces this in stage 3.
 */
export const GUILDCREST_IN_BUILD: IslandInBuild = {
  id: 'guildcrest',
  terrainRegions: guildcrestTerrainRegions,
  floraPalette: GUILDCREST_FLORA_PALETTE,
};
