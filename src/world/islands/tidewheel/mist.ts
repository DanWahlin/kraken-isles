import type { TierSettings } from '../../../engine/quality';
import { createMistCards, type MistCard, type MistCards } from '../../mist/mist-cards';
import { tidewheelHeight } from './height';
import { FUMAROLES, SPRINGS, SQUARE, toWorld } from './layout';
import { SQUARE_PROPS } from './town';

/**
 * Tidewheel's steam and smoke (spec T15): steam over the hot springs' pools, the basin on Gear Square
 * and the fumaroles on the wall, and smoke over a few of the town's chimneys. None on Lite; on Low the
 * fumaroles and the largest pool; on Medium and up all of the steam and more of the chimneys.
 */
const SMOKE: Record<TierSettings['tier'], number> = { lite: 0, low: 0, medium: 3, high: 5, ultra: 5 };

const LOOK = {
  name: 'tidewheel-mist',
  // Warm at last light: the steam catches the sun through the breach.
  shade: 0xc8c2c6,
  sun: 0xffe2c4,
  top: 120,
  density: 0.4,
  aspect: 0.55,
  bright: 1.7,
  topLight: 0.45,
  spray: true,
  soft: 1,
};

/** Where the cards go: the fumaroles, the pools, the basin, then the town's chimneys (`chimneys`, world). */
export function tidewheelMistCards(
  tier: TierSettings['tier'],
  chimneys: readonly { x: number; y: number; z: number }[],
): MistCard[] {
  if (tier === 'lite') return [];
  const out: MistCard[] = [];
  for (const f of FUMAROLES) {
    const p = toWorld(f.u, f.v);
    out.push({ x: p.x + 1.5, y: tidewheelHeight(p.x, p.z) + 6, z: p.z - 1, s: 11 });
  }
  const pools = tier === 'low' ? SPRINGS.slice(0, 1) : SPRINGS;
  for (const s of pools) {
    const p = toWorld(s.u, s.v);
    out.push({ x: p.x + 0.8, y: s.y + s.r * 0.55 + 0.6, z: p.z - 0.5, s: s.r * 1.5 });
  }
  if (tier === 'low') return out;
  const basin = toWorld(SQUARE_PROPS.basin.u, SQUARE_PROPS.basin.v);
  out.push({ x: basin.x + 0.3, y: SQUARE.y + 2.1, z: basin.z - 0.2, s: 3 });
  const n = Math.min(SMOKE[tier], chimneys.length);
  for (let i = 0; i < n; i++) {
    const c = chimneys[Math.floor((i * chimneys.length) / n)]!;
    out.push({ x: c.x + 1.2, y: c.y + 3.2, z: c.z - 0.8, s: 6 });
  }
  return out;
}

/** Tidewheel's steam and smoke (Low and up), or null. */
export function createTidewheelMist(
  tier: TierSettings,
  chimneys: readonly { x: number; y: number; z: number }[],
): MistCards | null {
  const cards = tidewheelMistCards(tier.tier, chimneys);
  return cards.length > 0 ? createMistCards(cards, LOOK) : null;
}
