import { onCourse } from '../../../course/active';
import type { PuzzleFile } from '../../../course/pack';
import { byActs, puzzleMaybe } from '../../../course/puzzles';
import type { Crew } from './contract';

/**
 * Channel Routing's crews as they look (docs/specs/ISLAND-02-thousand-bough.md §5.2): the Flume
 * Terrace paints each gate's sign with them and the puzzle and its overlay name them, so they live
 * with the island's contract and the world's views don't import game code.
 */

/** The game's crews, by the colour of their water: a course binds each of its crews to one (`acts`). */
export const CREWS: readonly Crew[] = ['blue', 'green', 'teal'];

/** A crew as the course names it: what its water carries, and its icon (never colour alone). */
export interface CrewWords {
  name: string;
  float: string;
  icon: string;
  iconName: string;
}

/** The crews' part of `puzzles/channel-routing.json`: keyed by the course's crew ids. */
type CrewsFile = PuzzleFile & { crews: Readonly<Record<string, CrewWords & { acts: Crew }>> };

/** Each crew's water colour (the game's; colourblind-safe with the icon beside it). */
const CREW_COLOUR: Readonly<Record<Crew, string>> = {
  blue: '#3B82F6',
  green: '#3FA34D',
  teal: '#1EA7A7',
};

/** What each crew's water carries and its icon (colourblind-safe: never colour alone). */
export let CREW_LOOK: Readonly<Record<Crew, CrewWords & { colour: string }>> = {} as Record<
  Crew,
  CrewWords & { colour: string }
>;
onCourse(() => {
  const none = { name: '', float: '', icon: '', iconName: '' };
  const c = puzzleMaybe<CrewsFile>('channel-routing');
  const crews: Partial<Record<Crew, CrewWords>> = c ? byActs(c.crews) : {};
  CREW_LOOK = Object.fromEntries(
    CREWS.map((k) => {
      const { name, float, icon, iconName } = crews[k] ?? none;
      return [k, { name, float, icon, iconName, colour: CREW_COLOUR[k] }];
    }),
  ) as Record<Crew, CrewWords & { colour: string }>;
});
