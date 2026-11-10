import { AdditiveBlending, DoubleSide, MeshBasicNodeMaterial } from 'three/webgpu';
import { color, float, smoothstep, uv } from 'three/tsl';
import { world } from '../engine/uniforms';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyNode = any;

/**
 * How far into the night (`world.night`: 0 while the sun is up, 1 at full night) the lamps are lit:
 * a little after sunset, with the sun about 4° under the horizon.
 */
const LAMPS_LIT_AT = 0.3;

/**
 * Whether a light its island's Seal lights (a lighthouse, Keelhaven's Gate Light, Thousand-Bough's
 * Crown Beacon) is burning: once the Seal has lit it, by day too (the story's reward), and on every
 * island after dark whatever the story says (a lighthouse is lit at night). Every island's own time
 * of day in the game is daylight, so there only the Seal lights one.
 */
export function lampBurning(sealLit: boolean): boolean {
  return sealLit || world.night.value > LAMPS_LIT_AT;
}

/**
 * The lit lighthouse lamp's two materials (the Seal beat, PLAN §3), shared by every island's
 * lighthouse. Each island makes its own instances, but the node graphs are the same, so they compile
 * to the same two shader programs (PLAN §15.4).
 */
export function createLighthouseLitMaterial(name: string): MeshBasicNodeMaterial {
  const material = new MeshBasicNodeMaterial({
    transparent: true,
    opacity: 0.88,
    vertexColors: true,
    blending: AdditiveBlending,
    depthWrite: false,
  });
  material.name = name;
  return material;
}

/**
 * The soft round halo billboard round a lit lamp. `depthTest` off draws it over the lantern's own
 * glazing; with it on, the caller keeps the billboard in front of the lantern instead, so hills and
 * houses still hide it.
 */
export function createLighthouseHaloMaterial(name: string, depthTest = false): MeshBasicNodeMaterial {
  const material = new MeshBasicNodeMaterial({
    transparent: true,
    opacity: 0.92,
    blending: AdditiveBlending,
    depthWrite: false,
    depthTest,
    side: DoubleSide,
    // Additive: one pass for both faces looks the same and needs one shader, not two (PLAN §15.4).
    forceSinglePass: true,
  });
  material.name = name;
  const coord = uv() as AnyNode;
  const d = coord.sub(0.5).length();
  const alpha = smoothstep(float(0.5), float(0.0), d);
  material.opacityNode = alpha.mul(0.72);
  material.colorNode = color(0xffefaa).mul(alpha.mul(0.65).add(0.35));
  return material;
}
