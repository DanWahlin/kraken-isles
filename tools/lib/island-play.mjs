// The play-through engine the cove islands' end-to-end tests share (tools/sunspiretest.mjs,
// inkwelltest.mjs, tidewheeltest.mjs): it opens the play page with the earlier chapters done, sails
// to the island by the chart, watches the arrival, and gives the test the moves a player has: walk up
// to someone and press E, drive a talk with its quizzes, cards and set pieces, play a circuit's lap
// station by station (a wrong pick first where there is one), take the Trial twice, watch the Seal,
// and find the chests, bottles and starfish. A test is its island's facts and its stops in order.
// It fails on any console error, a missing beat, a quest out of order, a cast member off the ground
// or a hitch after warm-up.
import { mkdirSync } from 'node:fs';
import { collectLogs, launchChrome, parseFlags, watchPage } from './browser.mjs';
import { answerCard, cardOpen, cardState } from './learning-cards.mjs';

/**
 * Starts a play-through of island `cfg.id` (its registry id, which is also its URL flag):
 * - `name`: the island's name on the tracker; `tool`: this test's name in its failures.
 * - `chapter`: the chapter's number (its ids are `Q<n>.x`, `T<n>.x`, `C<n>.x`, `B<n>.x`).
 * - `prior`: the islands whose quests are done before it, and `priorCount`, how many quests that is.
 * - `wrongFirst`: [right, wrong] option ids of the circuits' choice cards, a wrong pick first.
 * - `dial`: the island's dial station: `read` (the debug hook that says where it stands), `done(m)`,
 *   `what` (for failures), `turnMs`, `max` turns, and `shots` (`wrong`, `done`, `turn`: names).
 * - `cardLater`: app cards put off with Later; `wrongOnce`: quizzes answered wrong once.
 * - `seated`, `onBoards` and `cast`: the sitters, who stands on a booth's boards (and how high), and
 *   how many the cast is. `lyra`: the first stop's NPC id.
 */
export async function islandPlay(cfg) {
  const opt = parseFlags();
  const base = opt.base || 'http://localhost:5301';
  const out = opt.out || `tmp/shots/${cfg.id}`;
  mkdirSync(out, { recursive: true });
  const tag = `${opt.tier || 'auto'}-${opt.webgl ? 'gl' : 'gpu'}`;
  const url =
    `${base}/devpages/play.html?auto&quiet&${cfg.id}&shot` +
    `${opt.webgl ? '&webgl' : ''}${opt.tier ? `&tier=${opt.tier}` : ''}`;
  const n = cfg.chapter;

  const browser = await launchChrome({ autoplay: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  if (opt.reduced) await page.emulateMedia({ reducedMotion: 'reduce' });
  const logs = collectLogs(page, { types: ['error'] });
  // `--watch[=port]`: the run shows live at http://localhost:5390 (or the port given).
  const stopWatch = opt.watch ? await watchPage(page, opt.watch === true ? 5390 : Number(opt.watch)) : null;
  if (opt.watch) console.log(`watch: http://localhost:${opt.watch === true ? 5390 : opt.watch}`);
  const fail = (m) => {
    logs.push(`[${cfg.tool}] ${m}`);
    if (opt.verbose) console.log(`FAIL ${m}`);
  };
  const note = (m) => opt.verbose && console.log(`${new Date().toISOString().slice(11, 19)} ${m}`);
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__dev?.ready === true && window.__dev.session(), null, {
    timeout: 180000,
  });
  await page.waitForTimeout(1500);

  const shots = [];
  const shot = async (name) => {
    const path = `${out}/${tag}-${String(shots.length).padStart(2, '0')}-${name}.png`;
    await page.screenshot({ path });
    shots.push(path);
  };
  const S = (f, a) => page.evaluate(f, a);
  /** The session's debug hooks, by an expression on `d` (`window.__dev.session().debug`). */
  const D = (js) => page.evaluate(`(() => { const d = window.__dev.session().debug; return ${js}; })()`);
  const tap = (code) => S((c) => window.__dev.tap(c), code);
  /** One of the island's own debug hooks (`card`, `showing`, `lamp`, `sealing`, …). */
  const isle = (fn, ...args) =>
    S(
      ([id, fn, args]) => {
        const d = window.__dev.session().debug.island(id);
        const v = d?.[fn];
        return typeof v === 'function' ? v(...args) : v;
      },
      [cfg.id, fn, args],
    );
  const learnState = () =>
    S(() => {
      const l = window.__dev.learn.getState();
      const st = window.__dev.state();
      return {
        quiz: l.quiz
          ? { id: l.quiz.quiz.id, type: l.quiz.quiz.type, correct: l.quiz.last?.correct ?? null }
          : null,
        reveal: l.reveal?.page.id ?? null,
        banner: l.banner?.title ?? null,
        dialogue: st.dialogue,
        welcome: st.welcome,
        mode: st.mode,
        quests: window.__dev.learn.progress.data.quests,
        pages: l.pages.length,
        doubloons: l.doubloons,
      };
    });
  async function clickHotspot() {
    const box = await S(() => {
      const quiz = window.__dev.learn.getState().quiz.quiz;
      const t = quiz.targets.find((x) => x.correct);
      const frame = document.querySelector('.ci-hotspot-frame').getBoundingClientRect();
      return {
        x: frame.left + frame.width * (t.rect[0] + t.rect[2] / 2),
        y: frame.top + frame.height * (t.rect[1] + t.rect[3] / 2),
      };
    });
    await page.mouse.click(box.x, box.y);
  }
  const cardTried = new Set();
  /** Each choice card's options, in the order shown, and where the right one was (the shuffle's check). */
  const cardOrders = [];
  /** The dial was held on a wrong position once before it was turned to the right one. */
  let dialWrong = false;
  let dialTurns = 0;
  const seen = new Set();
  /**
   * A circuit station's choice card: a wrong pick first where there is one, so each way back is
   * played too. The options show shuffled, so picks go by id (keys 1-9 as shown).
   */
  async function answerChoice() {
    const v = await isle('card');
    if (!v?.open || v.busy) return false;
    const ids = v.options.map((o) => o.id);
    const key = `${v.title}|${[...ids].sort().join(',')}`;
    if (!seen.has(`card-${key}`)) {
      seen.add(`card-${key}`);
      await page.waitForTimeout(400);
      await shot(`card-${v.title.replace(/[^\w]+/g, '_').slice(0, 24)}`);
      const right = cfg.wrongFirst.find(([r, w]) => ids.includes(r) && ids.includes(w))?.[0];
      if (right) cardOrders.push(ids.indexOf(right));
    }
    // The dial: held where it starts once (a wrong position), then turned on until it's right.
    if (ids.includes('·set') && cfg.dial) {
      const dial = cfg.dial;
      const m = await isle(dial.read);
      let pick = '·turn-on';
      if (dial.done(m)) {
        await page.waitForTimeout(dial.settleMs ?? 600);
        await shot(dial.shots.done);
        pick = '·set';
      } else if (!dialWrong) {
        dialWrong = true;
        pick = '·set';
        if (dial.shots.wrong) setTimeout(() => void shot(dial.shots.wrong), 700);
      } else if (++dialTurns > (dial.max ?? 8)) {
        fail(`${dial.what} in ${dial.max ?? 8} turns`);
        pick = '·leave';
      }
      await tap(`Digit${ids.indexOf(pick) + 1}`);
      await page.waitForTimeout(pick === '·turn-on' ? (dial.turnMs ?? 1300) : 300);
      if (pick === '·turn-on' && dial.shots.turn) await shot(`${dial.shots.turn}-${dialTurns}`);
      return true;
    }
    // Never the circuit's own Leave or Skip (a demo plays out by itself).
    const free = ids.filter((id) => !id.startsWith('·leave') && !id.startsWith('·skip'));
    if (!free.length) return false;
    let pick = free.find((id) => !v.options.find((o) => o.id === id).tried) ?? free[0];
    const pair = cfg.wrongFirst.find(([r, w]) => ids.includes(r) && ids.includes(w));
    if (pair) pick = cardTried.has(`${key}|${pair[1]}`) ? pair[0] : pair[1];
    else {
      const r = cfg.wrongFirst.find(([r]) => ids.includes(r));
      if (r) pick = r[0];
    }
    cardTried.add(`${key}|${pick}`);
    // Through the card's own keys (1-9), as a player would.
    await tap(`Digit${ids.indexOf(pick) + 1}`);
    return true;
  }

  /** Where each one-answer quiz's right answer showed (the answers shuffle per quiz and voyage). */
  const quizOrders = [];
  const cardPlan = { later: cfg.cardLater ?? [] };
  /** Quizzes answered wrong once before the right answer. */
  const WRONG_ONCE = new Set(cfg.wrongOnce ?? []);
  const wrongDone = new Set();
  /** The Trial's round (1: three wrong answers, so it's failed and retried; 2: passed). */
  let trialRound = 0;
  let lastQuiz = null;
  const trialWrong = new RegExp(`^T${n}\\.[123]$`);
  const wrongFirst = (id) => WRONG_ONCE.has(id) || (trialRound === 1 && trialWrong.test(id));
  /** Drives dialogue, quizzes, reveals, cards and set pieces until `done(state)`. */
  async function drive(label, done, ms = 180000) {
    const t0 = Date.now();
    note(`drive ${label}`);
    while (Date.now() - t0 < ms) {
      const card = await page.evaluate(cardState);
      if (cardOpen(card)) {
        await answerCard(page, card, { shot, fail, seen, plan: cardPlan });
        await page.waitForTimeout(300);
        continue;
      }
      if (await answerChoice()) {
        await page.waitForTimeout(450);
        continue;
      }
      const s = await learnState();
      if (done(s)) return s;
      if (s.quiz) {
        if (s.quiz.id === `T${n}.1` && lastQuiz !== `T${n}.1`) trialRound++;
        lastQuiz = s.quiz.id;
        // The first try: three wrong answers, then step away from the Trial (it's offered again).
        if (trialRound === 1 && s.quiz.id === `T${n}.4`) {
          await shot('trial-leave');
          await page.keyboard.press('Escape');
          await page.waitForTimeout(800);
          continue;
        }
        if (!seen.has(s.quiz.id)) {
          seen.add(s.quiz.id);
          await page.waitForTimeout(600);
          await shot(`quiz-${s.quiz.id}`);
          if (s.quiz.type === 'mc' || s.quiz.type === 'scenario') {
            const at = await S(async () => {
              const q = window.__dev.learn.getState().quiz.quiz;
              const { quizOptions } = await import('/src/learn/option-order.ts');
              const shown = [...document.querySelectorAll('.ci-quiz .ci-options .ci-option span')].map((e) =>
                e.textContent.trim(),
              );
              const order = quizOptions(q);
              const right = order.findIndex((o) => o.id === q.answer);
              return { right, agrees: shown.length === order.length };
            });
            if (!at.agrees) fail(`quiz ${s.quiz.id}: the panel's options don't match the shuffled order`);
            quizOrders.push(at.right);
          }
        }
        if (s.quiz.correct) await tap('KeyE');
        else if (s.quiz.type === 'hotspot') await clickHotspot();
        else if (
          wrongFirst(s.quiz.id) &&
          !wrongDone.has(`${s.quiz.id}@${trialRound}`) &&
          (s.quiz.type === 'mc' || s.quiz.type === 'scenario')
        ) {
          // One wrong pick first: a wrong option, by its button.
          wrongDone.add(`${s.quiz.id}@${trialRound}`);
          const clicked = await S(async () => {
            const q = window.__dev.learn.getState().quiz.quiz;
            const { quizOptions } = await import('/src/learn/option-order.ts');
            const i = quizOptions(q).findIndex((o) => o.id !== q.answer);
            const b = document.querySelectorAll('.ci-quiz .ci-options .ci-option')[i];
            b?.click();
            return !!b;
          });
          if (!clicked) await S(() => window.__dev.answer());
          await page.waitForTimeout(900);
          await shot(`quiz-${s.quiz.id}-wrong`);
        } else await S(() => window.__dev.answer());
      } else if (s.reveal || s.banner) {
        const key = `reveal-${s.reveal ?? s.banner}`;
        if (!seen.has(key)) {
          seen.add(key);
          await page.waitForTimeout(600);
          await shot(key.replace(/[^\w.-]+/g, '_'));
        }
        await tap('KeyE');
      } else if (s.dialogue) await tap('KeyE');
      await page.waitForTimeout(350);
    }
    fail(`${label}: timed out`);
    return learnState();
  }
  /** Walks up to an NPC from wherever there's room, checks the prompt, and presses E. */
  async function talk(id) {
    await page
      .waitForFunction(() => !window.__dev.state().dialogue && !window.__dev.state().welcome, null, {
        timeout: 30000,
      })
      .catch(() => fail(`still talking before ${id}`));
    const n = await S(
      (id) =>
        window.__dev
          .session()
          .debug.cast()
          .find((v) => v.id === id) ?? null,
      id,
    );
    if (!n) return fail(`no NPC ${id}`);
    if (Math.abs(n.y - n.ground) > 0.15) fail(`${id} stands ${(n.y - n.ground).toFixed(2)} m off the ground`);
    let ok = false;
    for (const reach of [2.0, 2.8]) {
      if (ok) break;
      for (const k of [0, 1, -1, 2, -2, 3, -3, 4]) {
        const a = n.h + (k * Math.PI) / 4;
        const at = await S(
          ([x, z, h, y]) => {
            window.__dev.session().debug.teleport(x, z, h, y);
            return window.__dev.state();
          },
          [n.x + Math.sin(a) * reach, n.z + Math.cos(a) * reach, a + Math.PI, n.y + 0.3],
        );
        await page.waitForTimeout(250);
        const prompt = await S(() => document.querySelector('.hud-prompt.show')?.textContent ?? null);
        const short = n.name.split(' ').at(-2) ?? n.name.split(' ')[0];
        if (
          Math.abs(at.y - n.y) < 1 &&
          prompt?.includes('Talk to') &&
          (prompt.includes(n.name.split(' ')[0]) || prompt.includes(short))
        ) {
          ok = true;
          break;
        }
      }
    }
    await S((a) => window.__dev.look(a, 0.16), n.h + Math.PI + 0.35);
    await page.waitForTimeout(700);
    await shot(`talk-${id}`);
    if (ok) await tap('KeyE');
    else {
      fail(`can't get a talk prompt at ${id} from any side`);
      await S((id) => window.__dev.session().debug.talk(id), id);
    }
    const started = await page
      .waitForFunction(() => window.__dev.state().dialogue || window.__dev.learn.getState().quiz, null, {
        timeout: 4000,
      })
      .then(() => true)
      .catch(() => false);
    if (!started) {
      fail(`E at ${id} didn't start a conversation`);
      await S((id) => window.__dev.session().debug.talk(id), id);
    }
    await page.waitForTimeout(1300);
    await shot(`stop-${id}`);
  }
  /** The compass's gold marker label (its next stop). */
  const compassLabel = () => S(() => document.querySelector('.hud-compass-label')?.textContent ?? null);

  /**
   * Plays a circuit's lap whose quest is `quest`: walks to the station that waits (the compass points
   * at it), presses E, answers its card (a wrong pick first where there is one), and goes on until the
   * lap's closing script is through and its quest is done.
   */
  async function circuit(name, quest) {
    const P = (k) => S(([n, k]) => window.__dev.session().debug.puzzle(n)?.[k]?.() ?? null, [name, k]);
    for (let guard = 0; guard < 40; guard++) {
      const st = await P('station');
      if (!st) break;
      const c = await compassLabel();
      if (!c) fail(`${name} ${st.at}: no compass target`);
      // A line still playing holds the next station back a moment.
      let spot = null;
      for (let w = 0; w < 30 && !spot; w++) {
        spot = (await P('spots')).find((x) => x.id.endsWith(`:${st.at}`) && x.on);
        if (!spot) {
          if ((await learnState()).dialogue) await tap('KeyE');
          await page.waitForTimeout(400);
        }
      }
      if (!spot) {
        fail(`${name} ${st.at}: no usable station`);
        break;
      }
      await S(
        ([x, z, y]) => window.__dev.session().debug.teleport(x, z, undefined, y + 0.3),
        [spot.x, spot.z, spot.y],
      );
      const prompt = await page
        .waitForFunction(() => document.querySelector('.hud-prompt.show')?.textContent ?? null, null, {
          timeout: 8000,
        })
        .then((h) => h.jsonValue())
        .catch(() => null);
      if (!prompt) fail(`${name} ${st.at}: no prompt at the station`);
      await tap('KeyE');
      await page.waitForTimeout(600);
      const key = `${name}-${st.at}-${st.kind}`;
      if (!seen.has(key)) {
        seen.add(key);
        await page.waitForTimeout(900);
        await shot(key);
      }
      for (let k = 0; k < 200 && (await P('open')); k++) {
        if (!(await answerChoice())) await page.waitForTimeout(300);
        else await page.waitForTimeout(500);
      }
    }
    await drive(
      `${name} close`,
      (st) => st.quests[quest] === 'done' && !st.dialogue && !st.quiz && !st.reveal,
    );
    await page.waitForTimeout(1200);
    await shot(`${name}-${quest}-done`);
  }
  /** Lets the welcome or any talk play out (E through it). */
  async function calm(label, ms = 60000) {
    await drive(label, (s) => !s.dialogue && !s.welcome, ms);
  }
  const quiet = (st) => !st.dialogue && !st.quiz && !st.reveal;
  const after = async (npc, next) => {
    await page.waitForTimeout(1200);
    await shot(`after-${npc}`);
    const c = await compassLabel();
    if (next && !c?.includes(next)) fail(`after ${npc} the compass points at ${c}, not ${next}`);
  };

  return {
    opt,
    page,
    S,
    D,
    tap,
    isle,
    shot,
    fail,
    note,
    learnState,
    drive,
    talk,
    circuit,
    calm,
    after,
    compassLabel,
    quiet,
    /** Whether the dial was held on a wrong position once. */
    dialWrong: () => dialWrong,
    chestOpen: (id) => S((id) => window.__dev.learn.isChestOpen(id), id),

    /** The earlier chapters done, by the chart to the quay, the arrival flyover, the welcome, and the cast's footing. */
    async arrive() {
      const PRIOR = await S(async (islands) => {
        const { islandQuestList } = await import('/src/course/active.ts');
        return islands.flatMap((i) => islandQuestList(i).map((q) => q.id));
      }, cfg.prior);
      if (PRIOR.length < cfg.priorCount) fail(`only ${PRIOR.length} quests before ${cfg.name}`);
      await S((ids) => {
        const d = window.__dev.session().debug;
        for (const id of ids) d.quest(id, 'done');
      }, PRIOR);
      await page.waitForTimeout(800);
      const quay = await S((id) => window.__dev.session().islandQuay(id), cfg.id);
      if (!quay) fail(`${cfg.name} isn’t open after the Seal before it`);
      else {
        await S((q) => window.__dev.session().travel(q.x, q.z, q.heading), quay);
        await page.waitForFunction((id) => window.__dev.session().island === id, cfg.id, { timeout: 120000 });
        await page.waitForTimeout(2500);
      }
      for (const t of [1.5, 8, 13, 18, 23]) {
        await S((t) => window.__dev.session().debug.holdArrival(t), t);
        await page.waitForTimeout(900);
        if ((await D('d.arrival()?.phase')) !== 'flying') break;
        await shot(`arrival-${t}`);
      }
      await S(() => window.__dev.session().debug.holdArrival(null));
      if ((await D('d.arrival()?.phase')) === 'flying') await D('d.skipArrival()');
      await page
        .waitForFunction(
          (lyra) =>
            window.__dev
              .session()
              .debug.cast()
              .some((n) => n.id === lyra),
          cfg.lyra,
          { timeout: 90000 },
        )
        .catch(() => fail(`${cfg.name}’s cast never came`));
      await page
        .waitForFunction(() => window.__dev.state().dialogue, null, { timeout: 8000 })
        .catch(() => fail(`no ${cfg.name} welcome`));
      await page.waitForTimeout(1200);
      await shot('welcome');
      await calm('welcome');
      await page.waitForTimeout(1200);
      await shot('ashore');
      const tracker = await S(() => window.__dev.learn.getState().tracker);
      if (tracker?.island !== cfg.name) fail(`tracker shows ${tracker?.island}`);
      if (!(await compassLabel())?.includes('Lyra'))
        fail(`compass points at ${await compassLabel()}, not Lyra`);
      // The cast stands on its ground (the sitters on their seat blocks, the keeper on the booth's floor).
      const seated = new Set(cfg.seated);
      const cast = await D('d.cast()');
      note(`cast: ${cast.length}`);
      if (cast.length < cfg.cast) fail(`${cast.length} cast on ${cfg.name}, not ${cfg.cast}`);
      for (const c of cast) {
        const off = c.y - c.ground - (cfg.onBoards?.[c.id] ?? 0);
        // A seat block is a solid, so the surface under a sitter is the block's own top.
        if (seated.has(c.id)) {
          if (off < -0.05 || off > 0.8) fail(`${c.id} sits ${off.toFixed(2)} m off its seat`);
        } else if (Math.abs(off) > 0.08) fail(`${c.id} stands ${off.toFixed(2)} m off the ground`);
      }
    },

    /** A stop that is a talk: up to `npc`, E, and its talk through until `quest` is done. */
    async stop({ npc, quest, next }) {
      await talk(npc);
      await drive(npc, (st) => st.quests[quest] === 'done' && !st.dialogue);
      await after(npc, next);
    },

    /**
     * A stop that is a circuit: `npc` starts `puzzle` (the quest goes to `step`), the lap is walked,
     * and `npc` closes it (the quest goes to done).
     */
    async lap({ npc, quest, step, puzzle }) {
      if ((await learnState()).quests[quest] !== step) {
        await talk(npc);
        await drive(`${npc} ${step}`, (st) => st.quests[quest] === step && !st.dialogue);
      }
      await circuit(puzzle, quest);
      if ((await learnState()).quests[quest] !== 'done') await talk(npc);
      await drive(`${npc} solved`, (st) => st.quests[quest] === 'done' && quiet(st));
    },

    /**
     * The Trial at `npc` (failed once with three wrong answers and left, then passed), the Seal's
     * moment (three shots of it), the island's dress and the lamps in `lamps` lit after it.
     * `settled(st)` says when everything the Seal starts is over (the quest done and nothing open).
     */
    async trialAndSeal({ npc, quest, lamps, ms = 300000 }) {
      await talk(npc);
      await drive(
        'trial 1',
        (st) => trialRound >= 1 && !st.quiz && !st.dialogue && !st.reveal && !st.banner,
        240000,
      );
      if ((await learnState()).quests[quest] === 'done') fail('the Trial passed with three wrong answers');
      await shot('trial-failed');
      let sealSeen = false;
      const sealWatch = (async () => {
        for (let i = 0; i < 2000 && !sealSeen; i++) {
          if (await isle('sealing')) {
            sealSeen = true;
            for (const t of [900, 1500, 2600]) {
              await page.waitForTimeout(t);
              await shot('seal');
            }
            return;
          }
          await page.waitForTimeout(150);
        }
      })();
      await talk(npc);
      await drive('trial 2', (st) => st.quests[quest] === 'done' && quiet(st), ms);
      if (trialRound !== 2) fail(`the Trial ran ${trialRound} times, not 2`);
      const sealShot = sealSeen;
      sealSeen = true;
      await sealWatch;
      if (!sealShot) fail('the Seal’s moment never played');
      await shot('sealed');
      if (!(await isle('showing', 'sealed'))) fail('the island isn’t dressed for its Seal');
      for (const key of lamps)
        if ((await isle('lamp', key)) !== 'ready') fail(`lamp ${key} isn’t lit after the Seal`);
    },

    /** The optional assignment `quest`, from `npc` and back to them. */
    async assignment({ npc, quest }) {
      for (let round = 0; round < 3 && (await learnState()).quests[quest] !== 'done'; round++) {
        await talk(npc);
        await drive(`${npc} ${quest}`, quiet, 120000);
        await page.waitForTimeout(800);
      }
      if ((await learnState()).quests[quest] !== 'done') fail(`${quest} isn’t done after talking to ${npc}`);
    },

    /**
     * The chests (`found`, one id or a list, are walked up to and opened with E; the rest were given),
     * the bottles (each read where it lies) and the five starfish (each walked onto; their ids start
     * `starfish`).
     */
    async collect({ chests: chestCount, found: foundChests, bottles: bottleCount, starfish: starPrefix }) {
      const chests = await D(`d.chests().filter((c) => c.id.startsWith('C${n}.'))`);
      if (chests.length !== chestCount) fail(`${chests.length} chests on ${cfg.name}, not ${chestCount}`);
      // The found chests (not given by a stop): each walked up to and opened with E.
      for (const id of [foundChests].flat()) {
        const c = chests.find((x) => x.id === id);
        if (!c || c.opened) continue;
        let opened = false;
        for (const a of [c.h, c.h + Math.PI / 2, c.h - Math.PI / 2, c.h + Math.PI]) {
          await S(
            ([x, z, h]) => window.__dev.session().debug.teleport(x, z, h),
            [c.x + Math.sin(a) * 1.5, c.z + Math.cos(a) * 1.5, a + Math.PI],
          );
          await page.waitForTimeout(500);
          const prompt = await S(() => document.querySelector('.hud-prompt.show')?.textContent ?? null);
          if (!prompt?.toLowerCase().includes('chest')) continue;
          await shot(`chest-${id}`);
          await tap('KeyE');
          await page
            .waitForFunction(() => !!window.__dev.learn.getState().reveal, null, { timeout: 8000 })
            .catch(() => fail(`chest ${id}: E didn’t open it`));
          await drive(`chest ${id}`, (st) => !st.reveal && !st.banner && !st.dialogue, 30000);
          opened = true;
          break;
        }
        if (!opened) fail(`chest ${id}: no prompt beside it from any side`);
      }
      for (const c of chests)
        if (!(await S((id) => window.__dev.learn.isChestOpen(id), c.id)))
          fail(`chest ${c.id} is still shut at the end`);
      const bottles = await D(`d.bottles().filter((b) => b.id.startsWith('B${n}.'))`);
      if (bottles.length !== bottleCount)
        fail(`${bottles.length} bottles on ${cfg.name}, not ${bottleCount}`);
      const starfish = await D(`d.starfish().filter((s) => s.island === '${cfg.id}')`);
      if (starfish.length !== 5) fail(`${starfish.length} starfish on ${cfg.name}, not 5`);
      // Each bottle read where it lies (E at it).
      for (const b of bottles) {
        await S(([x, z]) => window.__dev.session().debug.teleport(x + 1.2, z + 0.6), [b.x, b.z]);
        await page.waitForTimeout(500);
        const prompt = await S(() => document.querySelector('.hud-prompt.show')?.textContent ?? null);
        if (!prompt?.includes('bottle')) {
          fail(`bottle ${b.id}: no prompt beside it (${prompt})`);
          continue;
        }
        await shot(`bottle-${b.id}`);
        await tap('KeyE');
        // Its message opens as a reveal: wait for it, then read it through.
        await page
          .waitForFunction(() => !!window.__dev.learn.getState().reveal, null, { timeout: 6000 })
          .catch(() => fail(`bottle ${b.id}: E didn't open its message`));
        await drive(`bottle ${b.id}`, (st) => !st.reveal && !st.banner && !st.dialogue, 30000);
        await page.waitForTimeout(500);
      }
      const read = await D(`d.bottles().filter((b) => b.id.startsWith('B${n}.') && b.read).length`);
      if (read !== bottleCount) fail(`${read} of ${bottleCount} bottles read`);

      // Each starfish picked up by walking onto it: from 3 m off, W toward it until it's in the save.
      const found = () =>
        S((p) => window.__dev.learn.progress.data.starfish.filter((id) => id.startsWith(p)), starPrefix);
      for (const sf of starfish) {
        let got = false;
        for (const a of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
          if (got) break;
          const x = sf.x + Math.sin(a) * 3;
          const z = sf.z + Math.cos(a) * 3;
          await S(
            ([x, z, h, y]) => window.__dev.session().debug.teleport(x, z, h, y),
            [x, z, a + Math.PI, sf.y],
          );
          await page.waitForTimeout(400);
          for (let k = 0; k < 14 && !got; k++) {
            await S((ms) => window.__dev.hold(['KeyW'], ms), 120);
            got = (await found()).includes(sf.id);
          }
        }
        if (!got) fail(`starfish ${sf.id}: walking onto it didn't pick it up`);
        else await shot(`starfish-${sf.id}`);
      }
      const stars = (await found()).length;
      if (stars !== 5) fail(`${stars} of 5 starfish found`);
    },

    /** The shuffle's check, the hitch check, the report and the exit code. */
    async finish() {
      for (const [what, list] of [
        ['quizzes', quizOrders],
        ['choice cards', cardOrders],
      ])
        if (list.length >= 5 && list.filter((i) => i === 0).length > list.length * 0.6)
          fail(
            `${what}: the right answer showed first in ${list.filter((i) => i === 0).length} of ${list.length}`,
          );
      const hitches = await S(() => window.__isles?.hitches?.() ?? []);
      if (hitches.length) fail(`hitches after warm-up: ${JSON.stringify(hitches)}`);
      console.log(JSON.stringify({ shots: shots.length, out, logs }, null, 2));
      stopWatch?.();
      await browser.close();
      process.exit(logs.length ? 1 : 0);
    },
  };
}
