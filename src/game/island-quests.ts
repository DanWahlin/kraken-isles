import { courseScript, hasIslandQuests, islandQuests, onCourse } from '../course/active';
import { COURSE, islandHooks, onCourseSelected, welcomeLines } from '../course/catalog';
import { PUZZLE_ISLANDS, puzzleMaybe, voiceLinesOf } from '../course/puzzles';
import type { QuestDef, QuestTarget } from '../course/pack';
import { beatSteps, pickBeat, type Beat } from './beats';
import { firstOpenQuest, islandTasks, optionalTargets, startedQuests, type QuestTracker } from './quest-list';
import type { ScriptStep } from './script';
import type { QuestState } from './story';

/**
 * A streamed island's quest line, made once for the island: the logic (which beat each NPC offers,
 * the tracker, the compass). The quests' text, the compass labels and every script are the course
 * pack's (`courses/<id>/quests/<island>.json`, docs/specs/COURSE-PACKS.md). Every island's quest line
 * has this one shape, so an island's own module is `createIslandQuests(id, name)` and nothing more
 * (Guildcrest's and the islands before it hold older copies of the same code).
 */
export interface IslandQuests {
  /** The tracker's header: the island's name (the game's) and the course's chapter, goal and next. */
  readonly header: { name: string; chapter: string; goal: string; next: string; nextSail?: string };
  /** The island's quests, in story order (the course pack's). */
  readonly quests: readonly QuestDef[];
  /** Juno and Wingman on the first landfall, once the flyover lands behind the captain. */
  readonly welcome: readonly string[];
  /** Every voice line the island's scripts and set pieces play (tests check each is voiced). */
  readonly lines: readonly string[];
  /** The step you're on: the first unfinished main quest in order. */
  current(q: QuestState): { id: string; task: string; step: string } | null;
  target(q: QuestState): QuestTarget | null;
  /** The optional quests you've started: where the compass's dimmer marker points for each. */
  optionalTargets(q: QuestState): QuestTarget[];
  /** The task list: the chapter's steps in order (the optional ones once started). */
  tracker(q: QuestState): QuestTracker;
  /** The island's quests for the Logbook's quest tab, once started. */
  log(q: QuestState): { id: string; title: string; detail: string; done: boolean }[];
  /** The beat an NPC offers right now: the first of the island's beats that fits. */
  npcScript(npc: string, q: QuestState): { steps: readonly ScriptStep[] } | null;
  /** A script of the island's by name (a circuit's close, the Seal's beat). */
  script(name: string): readonly ScriptStep[];
}

export function createIslandQuests(island: string, name: string): IslandQuests {
  let header: IslandQuests['header'] = { name, chapter: '', goal: '', next: '' };
  let quests: readonly QuestDef[] = [];
  let targets: Readonly<Record<string, QuestTarget>> = {};
  let main: readonly QuestDef[] = [];
  let beats: readonly Beat[] = [];
  let welcome: readonly string[] = [];
  let lines: readonly string[] = [];
  const script = (n: string) => courseScript(island, n);
  const current = (q: QuestState) => firstOpenQuest(main, q);

  onCourseSelected(() => {
    welcome = [...(islandHooks(island).landing ?? []), ...welcomeLines(island, false)];
  });
  onCourse(() => {
    // A course without the island: nothing to do there (the island isn't open in it).
    if (!hasIslandQuests(island)) {
      quests = [];
      main = [];
      beats = [];
      targets = {};
      lines = [];
      return;
    }
    const q = islandQuests(island);
    header = { name, ...q.tracker };
    quests = q.quests;
    main = quests.filter((d) => !d.optional);
    beats = q.beats;
    targets = q.targets;
    const hooks = islandHooks(island);
    const puzzles = Object.entries(PUZZLE_ISLANDS).flatMap(([puzzle, on]) => {
      const p = on === island ? puzzleMaybe(puzzle) : null;
      return p && !p.disabled ? voiceLinesOf(p) : [];
    });
    lines = [
      ...new Set([
        ...welcome,
        hooks.tips.nav,
        hooks.tips.starfish,
        ...Object.values(COURSE.hooks.setPieces),
        ...beats.flatMap((b) => (b.say ? [b.say] : [])),
        ...puzzles,
        ...Object.values(q.scripts).flatMap((steps) =>
          steps.flatMap((step) => ('say' in step ? [step.say] : [])),
        ),
      ]),
    ].filter(Boolean);
  });

  return {
    get header() {
      return header;
    },
    get quests() {
      return quests;
    },
    get welcome() {
      return welcome;
    },
    get lines() {
      return lines;
    },
    current,
    target(q) {
      const c = current(q);
      return c ? (targets[`${c.id}:${c.step}`] ?? null) : null;
    },
    optionalTargets: (q) => optionalTargets(quests, targets, q),
    tracker(q) {
      return {
        island: header.name,
        chapter: header.chapter,
        goal: header.goal,
        next: header.next,
        tasks: islandTasks(quests, q, current(q)),
      };
    },
    log: (q) => startedQuests(quests, q),
    npcScript: (npc, q) => beatSteps(pickBeat(beats, npc, q), script),
    script,
  };
}
