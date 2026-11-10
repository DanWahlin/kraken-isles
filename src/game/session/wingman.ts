import { Vector3, type Camera, type Object3D } from 'three/webgpu';
import type { Character } from '../../world/characters';
import { ParrotFlight, type FlightView } from '../../world/characters/parrot-flight';

/** What Wingman flies by: the captain and the camera, and where he's wanted. */
export interface WingmanView {
  captain: Vector3;
  height: number;
  eye: Vector3;
  /** The way the captain faces, when Wingman hovers ahead to talk (his welcome). */
  ahead: { x: number; z: number } | null;
  /** The swimming captain's travel, when Wingman escorts a swim. */
  travel: { x: number; z: number } | null;
}

/** Wingman, the parrot on the captain's shoulder: he leaves it to talk, to celebrate, and for a swim. */
export type Wingman = ReturnType<typeof createWingman>;

export function createWingman(hero: Character, scene: Object3D, camera: Camera) {
  const flight = ParrotFlight.attach(hero.group, scene);
  const view: WingmanView = {
    captain: new Vector3(),
    height: hero.capsule.height,
    eye: new Vector3(),
    ahead: null,
    travel: null,
  };
  const look = () => {
    hero.group.getWorldPosition(view.captain);
    camera.getWorldPosition(view.eye);
  };
  return {
    /** The parrot's flight, or null when the hero has no parrot. */
    flight,
    view,
    /** Off the shoulder, by where the captain and the camera are now (set `view.ahead` first). */
    takeOff(): void {
      if (!flight) return;
      look();
      flight.takeOff(view as FlightView);
    },
    update(dt: number): void {
      if (!flight || flight.phase === 'perched') return;
      look();
      flight.update(dt, view);
    },
  };
}
