import { createIslandQuests } from './island-quests';

/**
 * Inkwell Bluffs' quest line (Chapter 06: Canvases), in the course's order
 * (docs/specs/ISLAND-06-inkwell-bluffs.md §4): the band's arrangement board (Lyra), a thread or a
 * board (Thea), the four desks and the baseline (Nikos), the Borrowed Board (Calla), Two Hands, One
 * Chart (Petra), the Great Chart and the Shared Chart (Doran), and the Trial at the Dome (Iris). The
 * words are the course pack's (`quests/inkwell.json`).
 */
export const INKWELL_QUESTS = createIslandQuests('inkwell', 'Inkwell Bluffs');
