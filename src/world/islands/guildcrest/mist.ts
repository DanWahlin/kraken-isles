import type { TierSettings } from '../../../engine/quality';
import { createMistCards, type MistCard, type MistCards } from '../../mist/mist-cards';
import { guildcrestWater } from './height';
import { toWorld, WATER } from './layout';

/**
 * Guildcrest's mist cards (spec §10.7): the linn's spray at its foot, and the chimneys' smoke over the
 * town (a thin, tall card over a few stacks). None on Lite; on Low one spray card and one smoke card;
 * on Medium and up more of the town's chimneys.
 */
const SMOKE: Record<TierSettings['tier'], number> = { lite: 0, low: 1, medium: 4, high: 6, ultra: 6 };

const LOOK = {
  name: 'guildcrest-mist',
  shade: 0xd8dde2,
  sun: 0xfff6e8,
  top: 120,
  density: 0.42,
  aspect: 0.55,
  bright: 1.8,
  topLight: 0.4,
  spray: true,
  soft: 1,
};

/** Where the cards go: the linn's foot, then over the town's chimneys (`chimneys`, world). */
export function guildcrestMistCards(
  tier: TierSettings['tier'],
  chimneys: readonly { x: number; y: number; z: number }[],
): MistCard[] {
  if (tier === 'lite') return [];
  const out: MistCard[] = [];
  const pool = guildcrestWater().basins.linnPool;
  const foot = toWorld(WATER.linnPool.u + 4, WATER.linnPool.v + 2);
  out.push({ x: foot.x, y: pool.level + 3.5, z: foot.z, s: 9 });
  const n = Math.min(SMOKE[tier], chimneys.length);
  for (let i = 0; i < n; i++) {
    const c = chimneys[Math.floor((i * chimneys.length) / n)]!;
    out.push({ x: c.x + 1.2, y: c.y + 3.2, z: c.z - 0.8, s: 6 });
  }
  return out;
}

/** Guildcrest's mist (Low and up), or null. */
export function createGuildcrestMist(
  tier: TierSettings,
  chimneys: readonly { x: number; y: number; z: number }[],
): MistCards | null {
  const cards = guildcrestMistCards(tier.tier, chimneys);
  return cards.length > 0 ? createMistCards(cards, LOOK) : null;
}
