import { coveHarbor } from '../cove-harbour';
import { FRAME_KIT, LANDING, LIGHTHOUSE, QUAY_LANE } from './layout';

/**
 * Tidewheel's harbour for the game (spec T2): the shared cove harbour, inside the ring. You step
 * ashore facing up the lane toward the Bandstand; the first look is over the captain's shoulder along
 * the quay to the lamp-lit terraces and the Clockwork Lighthouse on its spur. Plain data (no three.js).
 */
export const TIDEWHEEL_HARBOR = coveHarbor(FRAME_KIT, {
  landingLook: QUAY_LANE[2],
  landingShot: [LANDING.u - 10, 6.2, LANDING.v - 4, LIGHTHOUSE.u, 44, LIGHTHOUSE.v + 20],
});
