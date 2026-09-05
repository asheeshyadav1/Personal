/**
 * The spiral galaxy formation.
 *
 * A point cloud built once at true world scale, rather than another target for
 * the morphing core — a galaxy is a structure, not a silhouette, and it wants
 * its own density falloff, its own thickness, and its own build order.
 *
 * The three populations are what make it read as a galaxy rather than a swirl:
 * a dense bulge, arms with scatter that widens as they wind out, and a thin
 * field of stars between the arms so the gaps aren't empty.
 */

import { GALAXY, galaxyArmPoint } from './portalMetrics';
import { createGlowMaterial } from './space';

const gaussian = () => {
  // Box-Muller: real scatter is normal, and uniform scatter reads as a band.
  const u = Math.max(Math.random(), 1e-6);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * Math.random());
};

/**
 * Positions, plus the per-point phase and size the glow shader reads.
 *
 * The attributes are generated here rather than by the shared helper because a
 * galaxy is not uniform: the bulge wants fewer, fatter, hotter points so it
 * reads as a blazing centre, and the arms want many small ones so they read as
 * structure. One size distribution across both would flatten the difference.
 */
const buildAttributes = count => {
  const out = new Float32Array(count * 3);
  const origins = new Float32Array(count * 3);
  const scatters = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  const scales = new Float32Array(count);
  const hues = new Float32Array(count);
  const bulgeCount = Math.floor(count * 0.19);
  const fieldCount = Math.floor(count * 0.06);

  for (let i = 0; i < count; i++) {
    let x;
    let y;
    let z;

    seeds[i] = Math.random();
    hues[i] = Math.random();
    scales[i] =
      i < bulgeCount
        ? 0.7 + Math.pow(Math.random(), 1.6) * 2.4
        : 0.4 + Math.pow(Math.random(), 2.4) * 1.7;
    // Arm points are re-scaled by radius further down, once t is known.

    if (i < bulgeCount) {
      // Bulge: crowded hard toward the centre, and rounder than the disc.
      const r = GALAXY.bulge * Math.pow(Math.random(), 2.3);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      x = Math.sin(phi) * Math.cos(theta) * r;
      z = Math.sin(phi) * Math.sin(theta) * r;
      y = Math.cos(phi) * r * 0.62;
    } else if (i < bulgeCount + fieldCount) {
      // Field stars filling the disc between the arms.
      const r = GALAXY.inner + (GALAXY.outer - GALAXY.inner) * Math.sqrt(Math.random());
      const theta = Math.random() * Math.PI * 2;
      x = Math.cos(theta) * r;
      z = Math.sin(theta) * r;
      y = gaussian() * GALAXY.thickness * 0.5;
    } else {
      // Arms: three quarters of the cloud, so an arm is a dense band of
      // material a label can sit on rather than a scatter of specks.
      // Crowded toward the inside, where a real disc is brightest.
      // The exponent has to be ABOVE one to do that — below one piles the
      // density up at the rim and the disc reads as a ring with a hole in it.
      const arm = Math.floor(Math.random() * GALAXY.arms);
      // Crowding toward the inside is right, but 1.6 overdid it. An arm's arc
      // length grows with radius and its scatter widens too, so the points per
      // unit area were falling to about a seventh by the rim, and the two
      // outermost About labels were anchored to arm that had effectively run
      // out. A disc should still fade outward; it should not evaporate.
      const t = Math.pow(Math.random(), 1.2);
      const spine = galaxyArmPoint(arm, t);
      // Scatter widens with radius, so the arms fray as they unwind. Kept tight
      // enough that the arm stays narrower than the gap beside it, and tighter
      // than before so the thinner rim still reads as a band.
      const spread = 0.025 + t * 0.075;
      x = spine.x + gaussian() * spread;
      z = spine.z + gaussian() * spread;
      y = gaussian() * GALAXY.thickness * (1 - t * 0.55);
      // Part of the remaining falloff is paid back in size rather than count:
      // the rim keeps its dimness without keeping its emptiness. Full
      // compensation would need points twice the size, which reads as gravel.
      scales[i] *= 1 + t * 0.35;
    }

    out[i * 3] = x;
    out[i * 3 + 1] = y;
    out[i * 3 + 2] = z;

    // Where the point waits before the front reaches it: out on a wide shell,
    // at its own angle swung back so it spirals in along an arc.
    //
    // The shell radius is deliberately independent of where the point ends up.
    // Scaling each point's own position outward instead would leave the bulge
    // starting almost on top of its destination, and the centre — the thing
    // everything is supposed to converge on — would barely move.
    const swing = Math.atan2(z, x) + 1.4 + Math.random() * 0.8;
    const shell = GALAXY.outer * (1.5 + Math.random() * 0.7);
    origins[i * 3] = Math.cos(swing) * shell;
    origins[i * 3 + 1] = y * 3 + gaussian() * 0.6;
    origins[i * 3 + 2] = Math.sin(swing) * shell;

    // And the way it leaves: straight out from the axis it sits on, far enough
    // to clear the frame, with enough tumble that the cloud comes apart rather
    // than expanding as one piece.
    const radius = Math.hypot(x, z);
    const outward = radius > 0.05 ? Math.atan2(z, x) : Math.random() * Math.PI * 2;
    const throwOut = 1.8 + Math.random() * 2.6;
    scatters[i * 3] = Math.cos(outward) * throwOut + gaussian() * 0.45;
    scatters[i * 3 + 1] = gaussian() * 1.0;
    scatters[i * 3 + 2] = Math.sin(outward) * throwOut + gaussian() * 0.45;
  }

  return { positions: out, origins, scatters, seeds, scales, hues };
};

/**
 * @param {number} count how many points the disc is made of.
 * @param {object} palette supplies the two hues and the hot-core colour.
 */
export const createGalaxy = (THREE, count, palette) => {
  const { positions, origins, scatters, seeds, scales, hues } = buildAttributes(count);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aOrigin', new THREE.BufferAttribute(origins, 3));
  geometry.setAttribute('aScatter', new THREE.BufferAttribute(scatters, 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
  geometry.setAttribute('aHue', new THREE.BufferAttribute(hues, 1));

  const material = createGlowMaterial(THREE, {
    size: 0.024,
    opacity: 0,
    twinkle: 0.3,
    halo: 2.0,
    glow: palette.sections.about[0],
    glowAlt: palette.sections.about[1],
    core: palette.core,
  });
  // The build front sweeps this far; see uBuild in the glow shader.
  material.uniforms.uBuildScale.value = GALAXY.outer;
  // Only this formation flies its points in; everything else stays put.
  material.uniforms.uAssemble.value = 1;

  const points = new THREE.Points(geometry, material);
  points.rotation.x = GALAXY.tilt;

  return { points, material, geometry };
};
