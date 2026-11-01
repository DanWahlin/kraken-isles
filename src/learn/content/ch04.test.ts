import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseSections } from '../course/sections';
import type { ChapterContent, Quiz } from '../types';

/*
 * Chapter 04 (Guildcrest, docs/specs/ISLAND-04-guildcrest.md §1, §4–§6, §11). The island is in build,
 * so the game leaves this content out of its pack (src/course/split.ts withoutIslandsAhead): these
 * checks read the pack's files from disk.
 */
const PACK = join(__dirname, '../../../courses/copilot-app');
const json = <T>(p: string) => JSON.parse(readFileSync(join(PACK, p), 'utf8')) as T;
const README = readFileSync(join(PACK, 'public/course/ch04/README.md'), 'utf8');
const CH04 = json<ChapterContent>('chapters/04-skills-custom-agents.json');
type Step = Record<string, unknown>;
const QUESTS = json<{
  quests: { id: string; optional?: boolean; steps: Record<string, string> }[];
  targets: Record<string, unknown>;
  scripts: Record<string, Step[]>;
}>('quests/guildcrest.json');
type Option = { id: string; right?: boolean; reason?: string; backTo?: string; cite?: string };
type Station = { id: string; at: string; kind: string; options?: Option[]; tiles?: Option[]; cite: string };
type Circuit = {
  circuit: string;
  cites: Record<string, { anchor: string }>;
  places: Record<string, { acts: string; means: string }>;
  laps: { stations: Station[] }[];
};
const BOOK = json<Circuit>('puzzles/pattern-book.json');
const BELT = json<Circuit>('puzzles/toolbelt.json');
const LEARNING = json<{
  appTasks: {
    id: string;
    chapter: string;
    steps: string[];
    seen?: { explain: string };
    source: { anchor: string };
    check?: unknown;
  }[];
}>('learning.json');
const TASKS = LEARNING.appTasks.filter((t) => t.chapter === CH04.chapter);
const LINES = new Set(json<{ lines: { id: string }[] }>('voice/lines.json').lines.map((l) => l.id));

const bold = (s: string) => [...s.matchAll(/\*\*([^*]+)\*\*/g)].map((m) => m[1]!);
type Rect = readonly [number, number, number, number];
const overlaps = (a: Rect, b: Rect) =>
  a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3];

describe('Chapter 04 content', () => {
  it('cites sections that exist in the ch04 snapshot', () => {
    const anchors = new Set(parseSections(README).map((s) => s.anchor));
    const refs = [
      ...CH04.quizzes.map((q) => q.source),
      ...CH04.pages.map((p) => p.source),
      ...Object.values(CH04.voiced ?? {}),
      ...TASKS.map((t) => t.source),
      ...[BOOK, BELT].flatMap((p) => Object.values(p.cites)),
    ];
    for (const r of refs) expect(anchors.has(r.anchor), r.anchor).toBe(true);
  });

  it('keeps hotspots inside their images, and masks off the callout badges', () => {
    const hotspots = (CH04.quizzes as Quiz[]).filter((q) => q.type === 'hotspot');
    expect(hotspots.map((q) => q.id)).toEqual(['H4.1', 'H4.2']);
    for (const q of hotspots) {
      if (q.type !== 'hotspot') continue;
      expect(q.targets.filter((t) => t.correct)).toHaveLength(1);
      for (const t of q.targets) {
        expect(t.rect[0] + t.rect[2], `${q.id} ${t.id}`).toBeLessThanOrEqual(1);
        expect(t.rect[1] + t.rect[3], `${q.id} ${t.id}`).toBeLessThanOrEqual(1);
        for (const m of q.mask ?? []) expect(overlaps(t.rect, m as Rect), `${q.id} ${t.id}`).toBe(false);
      }
    }
    const h41 = hotspots.find((q) => q.id === 'H4.1');
    expect(h41 && 'mask' in h41 ? h41.mask : []).toHaveLength(4);
  });

  it('names only UI the chapter names, on its cards, pages, quizzes and circuits', () => {
    const texts = [
      ...TASKS.flatMap((t) => [...t.steps, t.seen?.explain ?? '']),
      ...[BOOK, BELT].flatMap((p) => Object.values(p.places).map((pl) => pl.means)),
      ...[BOOK, BELT].flatMap((p) =>
        p.laps.flatMap((l) =>
          l.stations.flatMap((s) => (s.options ?? []).map((o) => (o as { text?: string }).text ?? '')),
        ),
      ),
      ...CH04.pages.map((p) => p.caption),
      ...CH04.quizzes.flatMap((q) => ('options' in q ? q.options.map((o) => o.text) : [])),
    ];
    for (const name of new Set(texts.flatMap(bold))) expect(README, name).toContain(name);
  });

  it('has six app cards and no GitHub checks: Chapter 04 makes no branch, push or pull request', () => {
    expect(TASKS.map((t) => t.id)).toEqual(Array.from({ length: 6 }, (_, i) => `A4.${i + 1}`));
    for (const t of TASKS) expect(t.check, t.id).toBeUndefined();
  });

  it('runs a ten-item Toolbelt Trial over every key takeaway, with no answer hint', () => {
    const t = CH04.trials[0]!;
    expect(t.title).toBe('The Toolbelt Trial');
    expect(t.items).toHaveLength(10);
    const items = t.items.map((id) => CH04.quizzes.find((q) => q.id === id)!);
    for (const q of items) {
      expect(['mc', 'scenario'], q.id).toContain(q.type);
      expect(q.hints?.[2], q.id).toBe('');
    }
    const anchors = new Set(items.map((q) => q.source.anchor));
    for (const a of [
      'choose-the-feature-that-fits-the-task',
      'custom-agents-define-a-role-and-its-tools',
      'core-concepts',
      'key-takeaways',
      'the-custom-agent-cannot-run-tests',
    ])
      expect(anchors.has(a), a).toBe(true);
  });

  it('runs eight quests in the course’s order, with a compass target for every step', () => {
    const main = QUESTS.quests.filter((q) => !q.optional).map((q) => q.id);
    expect(main).toEqual(Array.from({ length: 8 }, (_, i) => `Q4.${i + 1}`));
    expect(QUESTS.quests.filter((q) => q.optional).map((q) => q.id)).toEqual(['Q4.A']);
    for (const q of QUESTS.quests)
      for (const step of Object.keys(q.steps))
        if (step !== 'done') expect(QUESTS.targets[`${q.id}:${step}`], `${q.id}:${step}`).toBeDefined();
  });

  it('says at most four lines at a stop before the player does something', () => {
    const talk = new Set(['say', 'show', 'hide', 'text']);
    for (const [name, steps] of Object.entries(QUESTS.scripts)) {
      let run = 0;
      for (const s of steps) {
        if (!Object.keys(s).some((k) => talk.has(k))) {
          run = 0;
          continue;
        }
        if ('say' in s) run++;
        expect(run, name).toBeLessThanOrEqual(4);
      }
    }
  });

  it('walks six lamps round the cloister and seven round the yard; every wrong pick goes back with a reason', () => {
    expect(BOOK.circuit).toBe('book');
    expect(BELT.circuit).toBe('belt');
    expect(BOOK.laps.map((l) => l.stations.length)).toEqual([6]);
    expect(BELT.laps.map((l) => l.stations.length)).toEqual([7]);
    for (const p of [BOOK, BELT])
      for (const s of p.laps.flatMap((l) => l.stations)) {
        expect(Object.hasOwn(p.cites, s.cite), s.id).toBe(true);
        if (s.options)
          expect(
            s.options.some((o) => o.right),
            s.id,
          ).toBe(true);
        for (const o of s.options ?? []) {
          if (o.right) continue;
          expect(o.reason, `${s.id} ${o.id}`).toBeTruthy();
          expect(Object.hasOwn(p.places, o.backTo!), `${s.id} ${o.id}`).toBe(true);
          expect(Object.hasOwn(p.cites, o.cite!), `${s.id} ${o.id}`).toBe(true);
        }
        for (const t of s.tiles ?? [])
          if (!(t as { sticks?: boolean }).sticks)
            expect(Object.hasOwn(p.cites, t.cite!), `${s.id} ${t.id}`).toBe(true);
      }
  });

  it('voices every teaching line it cites', () => {
    for (const id of Object.keys(CH04.voiced ?? {})) expect(LINES.has(id), id).toBe(true);
  });
});
