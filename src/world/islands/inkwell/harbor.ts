import { coveHarbor } from '../cove-harbour';
import { FRAME_KIT, LANDING, QUAY_LANE } from './layout';

/**
 * Inkwell's harbour for the game (spec I2): the shared cove harbour. You step ashore facing up the
 * lane toward the taverna; the first look is over the captain's shoulder to the white terraces, the
 * Plaza's rim and the Dome on the skyline. Plain data (no three.js).
 */
export const INKWELL_HARBOR = coveHarbor(FRAME_KIT, {
  landingLook: QUAY_LANE[2],
  landingShot: [LANDING.u - 9, 6.4, LANDING.v - 5, 40, 34, 110],
});
