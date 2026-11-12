import { createIslandQuests } from './island-quests';

/**
 * Tidewheel Caldera's quest line (Chapter 07: Automations), in the course's order
 * (docs/specs/ISLAND-07-tidewheel-caldera.md §4): programming the sequencer (Lyra), the four parts and
 * a manual, local start (Agnes), the bounty board (Tobin), the Lever (Ansel), Gears & Bells (Greta),
 * the bells and the rock light (Nerys, optional), and the Trial and the last lever at the Lighthouse
 * (Silas). The words are the course pack's (`quests/tidewheel.json`).
 */
export const TIDEWHEEL_QUESTS = createIslandQuests('tidewheel', 'Tidewheel Caldera');
