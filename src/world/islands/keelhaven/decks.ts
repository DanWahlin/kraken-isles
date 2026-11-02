import { DeckIndex as WalkDeckIndex, type WalkDeck } from '../../village/walk-decks';
import { toFrame } from './layout';

/**
 * Keelhaven's walk surfaces (the quay, the chambers' copings, the caissons, the lock gates' walkways,
 * the steps, the footbridge, the verandas and the stair up the North Head): the shared decks
 * (village/walk-decks.ts) in the cove frame.
 */
export { facingDeck, lineDeck, uvDeck, type WalkDeck } from '../../village/walk-decks';

/** The decks in a grid of 4 m cells, read through the cove frame. */
export class DeckIndex extends WalkDeckIndex {
  constructor(decks: readonly WalkDeck[]) {
    super(decks, toFrame);
  }
}
