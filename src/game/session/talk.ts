import type { IslesAudio } from '../../audio';
import { barksFor } from '../../course/active';
import type { Input } from '../../engine/input';
import { defaultShipName } from '../../learn/progress';
import { fillSetup } from '../../learn/setup';
import type { LearnStore } from '../../learn/store';
import type { Character } from '../../world/characters';
import type { CollisionWorld } from '../collision';
import { npcScript } from '../cove-quests';
import { Dialogue } from '../dialogue';
import type { CameraShot, FollowCamera } from '../follow-camera';
import type { Hud } from '../hud';
import type { Interactions } from '../interaction';
import type { IslandContent } from '../island-code';
import type { Npc, NpcCrowd } from '../npcs';
import type { PlayerController } from '../player-controller';
import { runScript, type ScriptStep } from '../script';
import { createTalkShots, localNpcPoint } from './talk-shots';
import type { SessionStatus } from './types';

/** Metres of focus handicap for townsfolk who only bark (see `Interactable.bias`). */
const BARK_FOCUS_BIAS = 1.5;

export interface TalkHost {
  status: SessionStatus;
  hud: Hud;
  audio: IslesAudio | null;
  input: Input;
  learn: LearnStore | null;
  interactions: Interactions;
  player: PlayerController;
  cam: FollowCamera;
  world: CollisionWorld;
  /** Anchorage's cast (the session's own). */
  npcs: NpcCrowd;
  /** The streamed islands' content: their cast speaks and takes quest beats too. */
  contents: readonly IslandContent[];
  /** Teleports the player (and the hero with it). */
  placePlayer(x: number, z: number, heading: number): void;
  quests(): Record<string, string>;
  setQuest(id: string, step: string): void;
  /** Wingman's welcome is on (it pauses between lines, and nobody talks over it). */
  welcoming(): boolean;
}

/**
 * The session's conversations: the dialogue and who's on camera for it (the speaker's face, the
 * glances of those beside them, the two-shot when a second islander joins in), talking to an
 * islander, and the scripted beats of quests and puzzles.
 */
export interface Talk {
  readonly dialogue: Dialogue;
  /** World beats a script can wait on (`{ cue }` steps), registered by the puzzles and the islands. */
  readonly cues: Map<string, () => Promise<void>>;
  /** A quest beat or a puzzle's script is playing. */
  readonly scripting: boolean;
  /** The camera shot of the conversation that's on (so a cutaway can come back to it), or null. */
  readonly shot: CameraShot | null;
  /** Everyone in the session: Anchorage's cast and each streamed island's. */
  everyone(): Npc[];
  anyTalking(): boolean;
  /** Plays a scripted beat (a puzzle's). False when one's already playing, or it was cancelled. */
  beat(steps: readonly ScriptStep[], speaker: string): Promise<boolean>;
  talkTo(n: Npc): Promise<void>;
  /** Gives an islander their "Talk to" (those with something to say). */
  addNpcTalk(n: Npc): void;
  /** The open conversation's camera shot, again (after a cutaway in a script). */
  backToTalk(): void;
  /** A Seal's lamp lighting: cut to `shot`, `light` it to a stinger, then cut back to the talk. */
  showLighting(shot: CameraShot, light: () => void): Promise<void>;
}

export function createTalk(host: TalkHost): Talk {
  const { status, hud, audio, input, learn, interactions, player, cam, npcs, contents } = host;
  const { placePlayer, quests, setQuest } = host;
  const shots = createTalkShots(host.world, player);
  let facialSpeaker: Character | null = null;
  let lineFace: Character | null = null;
  const glancers: Npc[] = [];
  /** Who the open conversation is with, and whether its camera has widened to a two-shot. */
  let partner: Npc | null = null;
  let twoShot = false;
  /** Everyone lit for the open conversation (the partner, and anyone else who speaks in it). */
  const lit: Character[] = [];
  const spotlight = (c: Character | null) => {
    if (!c || lit.includes(c)) return;
    c.setSpotlight(true);
    lit.push(c);
  };
  // Each voiced line moves the face of whoever says it: Pim and Pol share scenes, and Rhea talks
  // aboard. The nearest islander with that name wins (Lyra plays on two islands). Anyone else in the
  // scene glances toward the speaker while they talk.
  /** Everyone in the session: Anchorage's cast and each streamed island's. */
  const everyone = (): Npc[] => [...npcs.list, ...contents.flatMap((c) => c.npcs)];
  /** An island's character who speaks somewhere else now (Rhea aboard for the Three Helms). */
  const speakerElsewhere = (speaker: string): Character | null => {
    for (const c of contents) {
      const figure = c.speaker?.(speaker);
      if (figure) return figure;
    }
    return null;
  };
  const speakerNpc = (speaker: string): Npc | null => {
    let best: Npc | null = null;
    let bestD = Infinity;
    for (const n of everyone()) {
      if (!n.spec.name.split(' ').includes(speaker)) continue;
      const d = (n.x - player.x) ** 2 + (n.z - player.z) ** 2;
      if (d < bestD) [best, bestD] = [n, d];
    }
    return best;
  };
  const clearGlances = () => {
    for (const n of glancers) n.glance = null;
    glancers.length = 0;
  };
  const dialogue = new Dialogue(hud, audio, (line) => {
    const npc = line ? speakerNpc(line.speaker) : null;
    const aboard = line ? speakerElsewhere(line.speaker) : null;
    const face = line ? (aboard ?? npc?.character ?? facialSpeaker) : null;
    if (lineFace && lineFace !== face) lineFace.speak(null);
    lineFace = face;
    face?.speak(line);
    if (partner) spotlight(face);
    clearGlances();
    if (!npc || aboard) return;
    // Staging: when someone beside your partner speaks (Pim and Pol), widen once to frame them both.
    if (partner && npc !== partner && !twoShot && talkShot) {
      const shot = shots.pairShot(partner, npc);
      if (shot) {
        twoShot = true;
        talkShot = shot;
        cam.frame(shot);
      }
    }
    for (const other of everyone()) {
      // The one you're talking with, and anyone standing right beside the speaker (Pim and Pol).
      const d2 = (other.x - npc.x) ** 2 + (other.z - npc.z) ** 2;
      if (other === npc || d2 > (other.talking ? 36 : 9)) continue;
      // Most of the way toward the speaker's face, a little toward you: a glance, not a stare.
      other.glance = {
        x: npc.x * 0.7 + player.x * 0.3,
        y: npc.y + 1.25,
        z: npc.z * 0.7 + player.z * 0.3,
      };
      glancers.push(other);
    }
  });
  // A text-only course's caption has a button that moves the conversation on (touch parity with E).
  hud.onNext = () => dialogue.next();

  let scriptRunning = false;
  // World beats a script can wait on (`{ cue }` steps), registered by the puzzles below.
  const cues = new Map<string, () => Promise<void>>();
  const scriptExtras = {
    onCue: (cue: string) => cues.get(cue)?.(),
    format: (text: string) => {
      const named = text
        .replaceAll('{ship}', learn?.progress.shipName ?? defaultShipName(null))
        .replaceAll('{captain}', learn?.progress.data.captainName ?? 'Captain');
      const l = learn?.getState();
      return l ? fillSetup(named, l.setup, l.osDetected) : named;
    },
  };
  const play = (steps: readonly ScriptStep[], speaker: string) =>
    runScript(steps, {
      dialogue,
      learn,
      speaker,
      onQuest: setQuest,
      cancelled: () => status.disposed,
      ...scriptExtras,
    });
  async function beat(steps: readonly ScriptStep[], speaker: string): Promise<boolean> {
    if (scriptRunning) return false;
    scriptRunning = true;
    input.enabled = false;
    const ok = await play(steps, speaker);
    input.enabled = !status.paused;
    scriptRunning = false;
    return ok;
  }

  // Talk to NPCs: quest beats run as scripts; Nell's lines are voiced; everyone else offers a bark.
  const talkTo = async (n: Npc) => {
    // Not over Wingman's welcome either (it pauses between Juno's line and his while he takes off).
    if (dialogue.active || scriptRunning || host.welcoming()) return;
    const originalPlayer = { x: player.x, z: player.z, heading: player.heading };
    const originalInputEnabled = input.enabled;
    if (n.spec.talkShot?.standLocal) {
      const stand = localNpcPoint(n, n.spec.talkShot.standLocal);
      placePlayer(stand.x, stand.z, Math.atan2(n.x - stand.x, n.z - stand.z));
      input.enabled = false;
    }
    const shot = shots.npcShot(n);
    partner = n;
    twoShot = false;
    spotlight(n.character);
    const priorFaceTarget = n.faceTarget;
    talkShot = shot;
    cam.frame(shot);
    if (n.spec.talkShot?.faceLocal) n.faceTarget = localNpcPoint(n, n.spec.talkShot.faceLocal);
    try {
      npcs.setTalking(n, true);
      facialSpeaker = n.character;
      const script = learn ? scriptFor(n) : null;
      if (script) {
        scriptRunning = true;
        input.enabled = false;
        await play(script.steps, n.spec.name.split(' ')[0]!);
        input.enabled = !status.paused;
        scriptRunning = false;
      } else if (n.spec.voiced) {
        input.enabled = false;
        await dialogue.play(n.spec.voiced);
        input.enabled = true;
      } else if (barksFor(n.spec.id)?.length) {
        const barks = barksFor(n.spec.id)!;
        const i = Math.floor(Math.random() * barks.length);
        hud.showText(n.spec.name, barks[i]!, 4.5);
        await new Promise((r) => setTimeout(r, 2600));
      }
    } finally {
      facialSpeaker?.speak(null);
      facialSpeaker = null;
      lineFace?.speak(null);
      lineFace = null;
      clearGlances();
      partner = null;
      twoShot = false;
      for (const c of lit) c.setSpotlight(false);
      lit.length = 0;
      n.faceTarget = priorFaceTarget;
      npcs.setTalking(n, false);
      cam.frame(null);
      if (n.spec.talkShot?.standLocal) {
        placePlayer(originalPlayer.x, originalPlayer.z, originalPlayer.heading);
        input.enabled = originalInputEnabled && !status.paused;
      }
      if (scriptRunning) {
        scriptRunning = false;
        input.enabled = !status.paused;
      }
    }
  };
  /** The scripted beat an NPC offers now: a streamed island's cast follow its chapter, everyone else Chapter 00. */
  function scriptFor(n: Npc) {
    for (const c of contents) if (c.owns(n.spec.id)) return c.script(n.spec.id);
    return npcScript(n.spec.id, quests());
  }
  /** The camera shot of the conversation that's on (so a tour can come back to it). */
  let talkShot: CameraShot | null = null;
  const addNpcTalk = (n: Npc) => {
    if (!n.spec.voiced && !barksFor(n.spec.id) && !scriptFor(n)) return;
    interactions.add({
      id: `npc:${n.spec.id}`,
      label: () => `Talk to ${n.spec.name}`,
      get x() {
        return n.x;
      },
      get y() {
        return n.y;
      },
      get z() {
        return n.z;
      },
      radius: n.spec.talkRadius ?? 2.6,
      // Islanders with a part in the story keep the E over townsfolk who only bark (POC §4, #178).
      bias: scriptFor(n) || n.spec.voiced ? 0 : BARK_FOCUS_BIAS,
      enabled: () => status.mode === 'walk' && !n.talking,
      onInteract: () => void talkTo(n),
    });
  };

  const anyTalking = () =>
    npcs.list.some((n) => n.talking) || contents.some((c) => c.npcs.some((n) => n.talking));
  async function showLighting(shot: CameraShot, light: () => void): Promise<void> {
    await hud.fade(true, 260);
    cam.cut(shot);
    await hud.fade(false, 260);
    await new Promise((r) => setTimeout(r, 1100));
    light();
    audio?.sfx.oneShot('stinger_triumph', player, 0.8);
    await new Promise((r) => setTimeout(r, 2600));
    await hud.fade(true, 260);
    if (talkShot) cam.cut(talkShot);
    await hud.fade(false, 260);
  }

  return {
    dialogue,
    cues,
    get scripting() {
      return scriptRunning;
    },
    get shot() {
      return talkShot;
    },
    everyone,
    anyTalking,
    beat,
    talkTo,
    addNpcTalk,
    backToTalk: () => cam.frame(talkShot),
    showLighting,
  };
}
