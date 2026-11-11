import { createIslandQuests } from './island-quests';

/**
 * Sunspire Sands' quest line (Chapter 05: MCP Servers and Plugins), in the course's order
 * (docs/specs/ISLAND-05-sunspire-sands.md §4): connecting the gear (Lyra), server or plugin and
 * packing light (Zahra), a tent of your own and the shared well (Idris), the signal towers and Mirror
 * Beams (Noor), sealed crates and the Sealed Crate (Samir), and the Trial at the Sunspire (Paloma).
 * The words are the course pack's (`quests/sunspire.json`).
 */
export const SUNSPIRE_QUESTS = createIslandQuests('sunspire', 'Sunspire Sands');
