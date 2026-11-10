import { afterEach, describe, expect, it } from 'vitest';
import { world } from '../engine/uniforms';
import { ISLAND_LIST } from '../islands/registry';
import { lampBurning } from './lighthouse-lamp';
import { sunState } from './sky/sun';

describe("a Seal's light (a lighthouse, the Gate Light, the Crown Beacon)", () => {
  afterEach(() => {
    world.night.value = 0;
  });

  it('burns once its Seal has lit it, by day too', () => {
    world.night.value = 0;
    expect(lampBurning(true)).toBe(true);
    expect(lampBurning(false)).toBe(false);
  });

  it('burns after dark on every island, whatever the story says', () => {
    world.night.value = 1;
    expect(lampBurning(false)).toBe(true);
    expect(lampBurning(true)).toBe(true);
    // Lit a little after sunset, not in the last of the daylight.
    world.night.value = 0.05;
    expect(lampBurning(false)).toBe(false);
    world.night.value = 0.5;
    expect(lampBurning(false)).toBe(true);
  });

  it("leaves the story's reward alone: every island's own time of day is daylight", () => {
    // In the game each island keeps its own light, so only its Seal lights its lamp there.
    for (const island of ISLAND_LIST) {
      world.night.value = sunState(island.sky.hours, island.sky.azimuth).night;
      expect(lampBurning(false)).toBe(false);
    }
    // The dev pages' Night (23:00) and the small hours light them all; noon and the golden hour don't.
    for (const [hours, lit] of [
      [23, true],
      [3, true],
      [12, false],
      [16.5, false],
    ] as const) {
      world.night.value = sunState(hours).night;
      expect(lampBurning(false)).toBe(lit);
    }
  });
});
