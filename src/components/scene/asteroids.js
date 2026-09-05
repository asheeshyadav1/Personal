/**
 * The asteroid belt, seen from inside it.
 *
 * Not a ring viewed from the outside. The camera sits in the belt plane and
 * the rocks stream past it, so scrolling is flying rather than turning a
 * carousel. That change is what makes the projects legible: a rock coming
 * toward you grows, and the one nearest the camera is unambiguously the one
 * you are reading about. On a ring seen from outside, every rock is the same
 * size and the "focused" one has to be announced with colour.
 *
 * Three populations share the corridor:
 *
 *  - Project rocks, one per project, on fixed stations down the z axis. These
 *    carry the labels and are the only reason the formation exists.
 *  - Rubble, scattered through the tube and wrapped endlessly, so the corridor
 *    has no visible start or end.
 *  - A clear zone around the camera axis, so nothing flies through the reader's
 *    face and nothing sits on top of the panel.
 *
 * Drawn with the scene's shared glow shader, so it belongs to the same world
 * as the galaxy and the constellations.
 */

import { createGlowMaterial } from './space';
import { CAMERA, projectToScreen } from './portalMetrics';
import { getBeltLabels, getBeltCount, getBeltFocus } from './beltStore';
import { createProjectRock } from './projectRock';

export const BELT = {
  /* Rubble rocks in the corridor at any time. */
  rubble: 200,
  pointsPerRock: 16,

  /* How far apart the project stations sit along the corridor. One scroll beat
     covers exactly this distance. */
  spacing: 5.2,
  /* Where a rock counts as focused, in world z. Just in front of the origin so
     the rock is large and clearly lit, but not clipping the near plane. */
  focusZ: 3.4,
  /* The corridor runs from here to the camera. Rubble wraps within it. */
  depth: 42,

  /* Rocks live in a tube around the camera axis: never nearer the axis than
     `clear`, never further than `radius`. The hole is what keeps the panel
     readable and stops a rock hitting the lens. */
  clear: 1.5,
  radius: 5.0,
  /* Project stations, as offsets from the centre of the frame.
     Work arrives from the left or the right with vertical variety, which both
     reads as flying through a belt and keeps the rocks out of the centred
     copy. The bounds are not free: at the focus distance the camera only sees
     about 2.2 world units either side of centre and 1.24 above and below, and
     the previous band ran to 2.5, which is exactly why a rock sat half off the
     left edge. */
  stationX: [1.15, 1.75],
  stationY: 0.86,

  rubbleRadius: [0.025, 0.11],
  projectRadius: 0.15,
};

/**
 * @param {object} THREE the lazily-imported three module.
 * @param {object} palette supplies the two glow hues and the hot core colour.
 * @param {number} slots how many projects ride the belt.
 */
/* The golden angle never repeats a direction, so it spaces both the stations
   around the corridor and the points over a rock's surface without clumping. */
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

export const createAsteroidBelt = (THREE, palette, slots) => {
  // The point cloud is background rubble only. Projects are meshes, built
  // below, because a project has to read as one object and a cloud cannot.
  const total = BELT.rubble * BELT.pointsPerRock;

  const positions = new Float32Array(total * 3);
  const seeds = new Float32Array(total);
  const scales = new Float32Array(total);
  const baseScale = new Float32Array(total);
  const hues = new Float32Array(total);
  const shape = new Float32Array(total * 3);

  // Rubble: x, y, z, spin
  const rubble = new Float32Array(BELT.rubble * 4);
  // Project stations: x, y
  const station = new Float32Array(slots * 2);

  const tubePoint = (min, max) => {
    const angle = Math.random() * Math.PI * 2;
    const r = min + Math.random() * (max - min);
    return [Math.cos(angle) * r, Math.sin(angle) * r * 0.62];
  };

  for (let i = 0; i < BELT.rubble; i++) {
    const [x, y] = tubePoint(BELT.clear, BELT.radius);
    rubble[i * 4] = x;
    rubble[i * 4 + 1] = y;
    rubble[i * 4 + 2] = Math.random() * BELT.depth;
    rubble[i * 4 + 3] = 0.2 + Math.random() * 0.8;

    const size =
      BELT.rubbleRadius[0] +
      Math.pow(Math.random(), 2.4) * (BELT.rubbleRadius[1] - BELT.rubbleRadius[0]);

    for (let k = 0; k < BELT.pointsPerRock; k++) {
      const p = i * BELT.pointsPerRock + k;
      const spread = size * (k === 0 ? 0 : Math.pow(Math.random(), 0.6));
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      shape[p * 3] = Math.sin(phi) * Math.cos(theta) * spread;
      shape[p * 3 + 1] = Math.cos(phi) * spread;
      shape[p * 3 + 2] = Math.sin(phi) * Math.sin(theta) * spread;
      seeds[p] = Math.random();
      hues[p] = Math.random();
      baseScale[p] = k === 0 ? 0.85 + size * 3 : 0.22 + Math.random() * 0.4;
    }
  }

  for (let i = 0; i < slots; i++) {
    // Alternating sides, so consecutive projects sweep past from opposite
    // directions rather than all down one flank. The vertical offset walks by
    // the golden angle so no two on the same side share a height.
    const side = i % 2 === 0 ? 1 : -1;
    const spread = BELT.stationX[0] + ((i % 3) / 2) * (BELT.stationX[1] - BELT.stationX[0]);
    station[i * 2] = side * spread;
    station[i * 2 + 1] = Math.sin(i * GOLDEN_ANGLE) * BELT.stationY;
  }

  scales.set(baseScale);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aOrigin', new THREE.BufferAttribute(new Float32Array(total * 3), 3));
  geometry.setAttribute('aScatter', new THREE.BufferAttribute(new Float32Array(total * 3), 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
  geometry.setAttribute('aHue', new THREE.BufferAttribute(hues, 1));

  const material = createGlowMaterial(THREE, {
    size: 0.05,
    opacity: 0,
    twinkle: 0.14,
    halo: 1.7,
    glow: palette.sections.projects[0],
    glowAlt: palette.sections.projects[1],
    core: palette.core,
  });

  const points = new THREE.Points(geometry, material);

  // One mesh per project, each with its own deformation and texture seed.
  const group = new THREE.Group();
  group.add(points);
  const rocks = [];
  for (let i = 0; i < slots; i++) {
    const rock = createProjectRock(THREE, palette, BELT.projectRadius, i * 13.7 + 4.2);
    rocks.push(rock);
    group.add(rock.mesh);
  }

  // Set by the scene each frame so the rocks fade with the formation rather
  // than snapping in when the section arrives.
  let beltOpacity = 1;

  // How far down the corridor the reader has flown. Eased rather than snapped,
  // so a beat of scroll reads as travel and not as a cut.
  let travel = 0;
  const brightness = new Float32Array(slots);

  /** Where project i currently sits in world space. */
  const projectWorld = i => ({
    x: station[i * 2],
    y: station[i * 2 + 1],
    z: BELT.focusZ - i * BELT.spacing + travel,
  });

  /** Puts every label out. Used when the belt is not on screen. */
  const clearLabels = () => {
    getBeltLabels().forEach(el => {
      el.style.opacity = '0';
    });
  };

  return {
    points,
    group,
    material,
    geometry,
    clearLabels,

    /** Fades the bodies with the rest of the formation. */
    setOpacity(value) {
      beltOpacity = value;
    },

    /**
     * Lays the rocks out once, without touching the labels.
     *
     * The geometry needs a pass before its first frame or every point sits on
     * the origin. Running the full update to get that also wrote label
     * positions and opacities, which then hung over the hero until the belt
     * happened to come into view. Geometry and labels are separated here so
     * the layout pass cannot light anything.
     */
    layout() {
      this.update(0, 1, true);
    },

    update(time, dt, geometryOnly) {
      const focus = getBeltFocus();
      const count = getBeltCount() || slots;

      travel += (focus * BELT.spacing - travel) * Math.min(1, dt * 2.6);

      // --- rubble streams past and wraps -----------------------------------
      for (let i = 0; i < BELT.rubble; i++) {
        const x = rubble[i * 4];
        const y = rubble[i * 4 + 1];
        // Wrapped into the corridor so the field never runs out ahead of the
        // reader, however far they fly.
        let z = (rubble[i * 4 + 2] + travel + time * rubble[i * 4 + 3] * 0.35) % BELT.depth;
        if (z < 0) {
          z += BELT.depth;
        }
        z = CAMERA.z - z;

        for (let k = 0; k < BELT.pointsPerRock; k++) {
          const o = (i * BELT.pointsPerRock + k) * 3;
          positions[o] = x + shape[o];
          positions[o + 1] = y + shape[o + 1];
          positions[o + 2] = z + shape[o + 2];
        }
      }

      geometry.attributes.position.needsUpdate = true;

      // --- project rocks hold their stations --------------------------------
      for (let i = 0; i < slots; i++) {
        const world = projectWorld(i);
        const goal = i === focus ? 1 : 0;
        brightness[i] += (goal - brightness[i]) * Math.min(1, dt * 4);

        const rock = rocks[i];
        rock.mesh.position.set(world.x, world.y, world.z);
        // Tumbling, slowly. A rock that holds still reads as a prop; one that
        // spins fast reads as a loading spinner.
        rock.mesh.rotation.x += rock.mesh.userData.spin.x * dt;
        rock.mesh.rotation.y += rock.mesh.userData.spin.y * dt;
        rock.mesh.rotation.z += rock.mesh.userData.spin.z * dt;
        rock.material.uniforms.uFocus.value = brightness[i];
        // Far rocks dim rather than vanish, so the corridor has depth without
        // the distant ones competing with the one being read.
        const distance = CAMERA.z - world.z;
        const near = Math.max(0, 1 - Math.abs(distance) / (BELT.spacing * 3.4));
        rock.mesh.visible = distance > 0.4 && near > 0.02;
        rock.material.uniforms.uOpacity.value = (0.3 + near * 0.7) * beltOpacity;
      }

      if (geometryOnly) {
        return;
      }

      // --- carry the DOM labels to their rocks ------------------------------
      const els = getBeltLabels();
      for (let i = 0; i < count; i++) {
        const el = els.get(i);
        if (!el) {
          continue;
        }
        const world = projectWorld(i);
        // Behind the camera, or so far ahead it is a speck: hide it rather than
        // let the projection throw it somewhere absurd.
        const distance = CAMERA.z - world.z;
        if (distance < 0.6 || distance > BELT.spacing * 3.4) {
          el.style.opacity = '0';
          continue;
        }
        const screen = projectToScreen(world);
        // A label the size of its rock: near ones are readable, far ones are
        // a hint that there is more belt to come.
        const near = Math.max(0, 1 - distance / (BELT.spacing * 3.4));
        const scale = 0.62 + near * 0.55;
        el.style.transform = `translate3d(${screen.x.toFixed(1)}px, ${screen.y.toFixed(
          1,
        )}px, 0) scale(${scale.toFixed(3)})`;
        el.style.opacity = (0.18 + near * 0.5 + brightness[i] * 0.5).toFixed(3);
        el.dataset.focused = i === focus ? 'true' : 'false';
      }
    },
  };
};

export default createAsteroidBelt;
