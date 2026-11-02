import { courseScript, hasIslandQuests, islandQuests, onCourse } from '../course/active';
import { COURSE, islandHooks, onCourseSelected, welcomeLines } from '../course/catalog';
import { PUZZLE_ISLANDS, puzzleMaybe, voiceLinesOf } from '../course/puzzles';
import type { QuestDef, QuestTarget } from '../course/pack';
import { beatSteps, pickBeat, type Beat } from './beats';
import { firstOpenQuest, islandTasks, optionalTargets, startedQuests, type QuestTracker } from './quest-list';
import type { ScriptStep } from './script';
import type { QuestState } from './story';

/**
 * Guildcrest's quest line: the logic (which beat each NPC offers, the tracker, the compass). The
 * quests' text, the compass labels and every script are the course pack's
 * (`courses/<id>/quests/guildcrest.json`, docs/specs/COURSE-PACKS.md). For the Copilot app course
 * (Chapter 04: Skills and Custom Agents), in the course's order
 * (docs/specs/ISLAND-04-guildcrest.md §4): the song chart (Lyra), the Charter Stone (Elspeth), a
 * carrel of your own (Aidan), the Pattern Book (Brigid), the chained library (Ewan), the specialist and
 * the Journeyman's Toolbelt (Fergus and Rory), and the Toolbelt Trial (Seren).
 */
const ISLAND = 'guildcrest';

/**
 * The tracker's header: the island's name (the game's) and the course's chapter, goal and next.
 * `nextSail` replaces `next` once the island after it is open (src/game/guildcrest-island.ts).
 */
export let GUILDCREST_TRACKER: {
  name: string;
  chapter: string;
  goal: string;
  next: string;
  nextSail?: string;
} = {
  name: 'Guildcrest',
  chapter: '',
  goal: '',
  next: '',
};

/** The island's quests, in story order (the course pack's). */
export let GUILDCREST_QUESTS: readonly QuestDef[] = [];

/** Where the compass points for each step (interaction ids; the nearest usable wins). */
let TARGETS: Readonly<Record<string, QuestTarget>> = {};
let MAIN: readonly QuestDef[] = [];
let BEATS: readonly Beat[] = [];

const script = (name: string) => courseScript(ISLAND, name);

/** The step you're on: the first unfinished main quest in order. */
export function guildcrestCurrent(q: QuestState): { id: string; task: string; step: string } | null {
  return firstOpenQuest(MAIN, q);
}

export function guildcrestTarget(q: QuestState): QuestTarget | null {
  const c = guildcrestCurrent(q);
  return c ? (TARGETS[`${c.id}:${c.step}`] ?? null) : null;
}

/** The optional quests you've started: where the compass's dimmer marker points for each. */
export function guildcrestOptionalTargets(q: QuestState): QuestTarget[] {
  return optionalTargets(GUILDCREST_QUESTS, TARGETS, q);
}

/** The task list: the chapter's steps in order (the optional ones once started). */
export function guildcrestTracker(q: QuestState): QuestTracker {
  const current = guildcrestCurrent(q);
  return {
    island: GUILDCREST_TRACKER.name,
    chapter: GUILDCREST_TRACKER.chapter,
    goal: GUILDCREST_TRACKER.goal,
    next: GUILDCREST_TRACKER.next,
    tasks: islandTasks(GUILDCREST_QUESTS, q, current),
  };
}

/** The island's quests for the Logbook's quest tab, once started. */
export function guildcrestLog(q: QuestState): { id: string; title: string; detail: string; done: boolean }[] {
  return startedQuests(GUILDCREST_QUESTS, q);
}

/** Juno and Wingman on the first landfall, once the flyover lands behind the captain. */
export let GUILDCREST_WELCOME: readonly string[] = [];
onCourseSelected(() => {
  GUILDCREST_WELCOME = [...(islandHooks(ISLAND).landing ?? []), ...welcomeLines(ISLAND, false)];
});

/**
 * The beat a Guildcrest NPC offers right now: the first of the island's beats
 * (`quests/guildcrest.json` → `beats`) that fits.
 */
export function guildcrestNpcScript(npc: string, q: QuestState): { steps: readonly ScriptStep[] } | null {
  return beatSteps(pickBeat(BEATS, npc, q), script);
}

/** A script of the island's by name (a circuit's close, the Seal's beat). */
export function guildcrestScript(name: string): readonly ScriptStep[] {
  return script(name);
}

/** Every voice line the island's scripts and set pieces play (tests check each is voiced). */
export let GUILDCREST_LINES: readonly string[] = [];

onCourse(() => {
  // A course without Guildcrest: nothing to do there (the island isn't open in it).
  if (!hasIslandQuests(ISLAND)) {
    GUILDCREST_QUESTS = [];
    MAIN = [];
    BEATS = [];
    TARGETS = {};
    GUILDCREST_LINES = [];
    return;
  }
  const q = islandQuests(ISLAND);
  GUILDCREST_TRACKER = { name: 'Guildcrest', ...q.tracker };
  GUILDCREST_QUESTS = q.quests;
  MAIN = GUILDCREST_QUESTS.filter((d) => !d.optional);
  BEATS = q.beats;
  TARGETS = q.targets;
  const hooks = islandHooks(ISLAND);
  const puzzles = Object.entries(PUZZLE_ISLANDS).flatMap(([name, island]) => {
    const p = island === ISLAND ? puzzleMaybe(name) : null;
    return p && !p.disabled ? voiceLinesOf(p) : [];
  });
  GUILDCREST_LINES = [
    ...new Set([
      ...GUILDCREST_WELCOME,
      hooks.tips.nav,
      hooks.tips.starfish,
      ...Object.values(COURSE.hooks.setPieces),
      ...BEATS.flatMap((b) => (b.say ? [b.say] : [])),
      ...puzzles,
      ...Object.values(q.scripts).flatMap((steps) =>
        steps.flatMap((step) => ('say' in step ? [step.say] : [])),
      ),
    ]),
  ].filter(Boolean);
});
