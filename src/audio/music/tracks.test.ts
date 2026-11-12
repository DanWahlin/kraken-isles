import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ISLAND_LIST } from '../../islands/registry';
import { BATTLE_TRACK, ENDING_TRACK, MUSIC_TRACKS, SPARE_TRACKS, trackFor, type MusicTrack } from './tracks';

const ALL: readonly (readonly [string, MusicTrack])[] = [
  ...Object.entries(MUSIC_TRACKS),
  ['battle', BATTLE_TRACK],
  ['ending', ENDING_TRACK],
  ...Object.entries(SPARE_TRACKS),
];

describe('music tracks', () => {
  it('has both encodings of every track in public/audio', () => {
    for (const [name, track] of ALL)
      for (const ext of ['ogg', 'm4a'])
        expect(existsSync(`public/audio/${track.file}.${ext}`), `${name}: ${track.file}.${ext}`).toBe(true);
  });

  it('gives every island its theme, at a measured loudness', () => {
    for (const island of ISLAND_LIST) {
      expect(MUSIC_TRACKS[island.id], island.id).toBe(island.theme);
      expect(island.theme.lufs, island.id).toBeLessThan(-8);
      expect(island.theme.lufs, island.id).toBeGreaterThan(-24);
    }
  });

  it('plays its own theme on every island from Thousand-Bough on (no stand-in)', () => {
    const themes = ISLAND_LIST.slice(2).map((i) => i.theme.file);
    expect(new Set(themes).size).toBe(themes.length);
    expect(themes).not.toContain('music_bards_tale');
  });

  it('plays the ending once, and the battle and the islands in a loop', () => {
    expect(trackFor('ending')).toBe(ENDING_TRACK);
    expect(ENDING_TRACK.once).toBe(true);
    expect(trackFor('battle').once).toBeUndefined();
    for (const island of ISLAND_LIST) expect(trackFor(island.id).once, island.id).toBeUndefined();
  });
});
