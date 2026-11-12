import type { IslandChartTerrain } from '../../../islands/types';
import { tidewheelHeight, tidewheelMasks } from './height';

/**
 * Tidewheel's terrain for its 3D chart miniature (loaded on demand by its registry entry). The chart
 * reads its coarse chart pack (`tidewheel/chart`); these only fill in past that pack's edge.
 */
export const TIDEWHEEL_CHART_TERRAIN: IslandChartTerrain = {
  height: tidewheelHeight,
  masks: tidewheelMasks,
};
