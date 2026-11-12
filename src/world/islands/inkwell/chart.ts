import type { IslandChartTerrain } from '../../../islands/types';
import { inkwellHeight, inkwellMasks } from './height';

/**
 * Inkwell's terrain for its 3D chart miniature (loaded on demand by its registry entry). The chart
 * reads its coarse chart pack (`inkwell/chart`); these only fill in past that pack's edge.
 */
export const INKWELL_CHART_TERRAIN: IslandChartTerrain = {
  height: inkwellHeight,
  masks: inkwellMasks,
};
