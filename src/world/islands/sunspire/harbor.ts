import { coveHarbor } from '../cove-harbour';
import { FRAME_KIT, LANDING, CARAVANSERAI } from './layout';

/**
 * Sunspire's harbour for the game (spec S2): the shared cove harbour. You step ashore facing the
 * caravanserai's gate at the quay's head; the first look is over the captain's shoulder up the quay
 * lane to the caravanserai, the town's awnings and the Sunspire on its mesa. Plain data (no three.js).
 */
export const SUNSPIRE_HARBOR = coveHarbor(FRAME_KIT, {
  landingLook: CARAVANSERAI,
  landingShot: [LANDING.u - 9, 6.4, LANDING.v - 3, 60, 40, 70],
});
