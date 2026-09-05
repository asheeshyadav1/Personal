/**
 * The constellation formation.
 *
 * One real constellation per role, ordered by how hard each is to actually find
 * in the sky: Orion, Cassiopeia, Taurus, Ursa Minor. The stars carry their real
 * relative brightnesses, so the run gets visibly fainter and harder to read as
 * it goes — which is the ordering doing its own explaining.
 *
 * Changing role clears the current figure and draws the next one: stars ignite
 * in turn and the lines are traced between them, rather than the whole thing
 * appearing at once. Arriving at the section does the same, so the figure is
 * always drawn in front of the reader.
 *
 * Deliberately carries no labels. The rail beside it already names every role,
 * and the panel under that is dense enough; this is meant to be the quiet thing
 * in the corner of the frame.
 */

import { FIGURE } from './portalMetrics';

const CLUSTER = 26; // points per star, so each reads as a body rather than a pixel

/* How far a star has to have come up before the next one starts. Low enough
   that the figure keeps moving, high enough that the order is legible. */
const IGNITE_HANDOVER = 0.5;
/* And how far both of a line's stars have to have come up before it is drawn. */
const LINK_HANDOVER = 0.22;

const gaussian = () => {
  const u = Math.max(Math.random(), 1e-6);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * Math.random());
};

/* Stars and dust share this. Brightness is per-point rather than per-material,
   because the whole formation is one draw and the stars light one at a time. */
const starMaterial = (THREE, palette, size, opacity) =>
  new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uSize: { value: size },
      uOpacity: { value: opacity },
      uScale: { value: 300 },
      uGlow: { value: new THREE.Color(palette.sections.jobs[0]) },
      uGlowAlt: { value: new THREE.Color(palette.sections.jobs[1]) },
      uCore: { value: new THREE.Color(palette.core) },
    },
    vertexShader: `
      uniform float uTime;
      uniform float uSize;
      uniform float uScale;
      attribute float aSeed;
      attribute float aScale;
      attribute float aHue;
      attribute float aLit;
      varying float vGlow;
      varying float vHue;

      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        float phase = aSeed * 6.2831853;
        float twinkle = 0.82 + 0.18 * sin(uTime * 1.5 + phase);
        vGlow = aLit * twinkle;
        vHue = aHue;
        // A star swells as it ignites rather than simply appearing.
        gl_PointSize = uSize * aScale * (0.4 + aLit * 0.75) * (uScale / max(-mv.z, 0.001));
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform float uOpacity;
      uniform vec3 uGlow;
      uniform vec3 uGlowAlt;
      uniform vec3 uCore;
      varying float vGlow;
      varying float vHue;

      void main() {
        float d = length(gl_PointCoord - vec2(0.5));
        if (d > 0.5) discard;
        float falloff = max(0.0, 1.0 - d * 2.0);
        float bloom = pow(falloff, 0.85) * 0.2;
        float corona = pow(falloff, 2.1) * 0.55;
        float core = smoothstep(0.17, 0.0, d) * 1.7;
        float total = bloom + corona + core;

        vec3 tint = mix(uGlow, uGlowAlt, pow(vHue, 1.4));
        float hotness = pow(clamp(core / max(total, 0.0001), 0.0, 1.0), 0.6);
        gl_FragColor = vec4(mix(tint, uCore, hotness), total * uOpacity * vGlow);
      }
    `,
  });

/* Each link is drawn from its start toward its end, brightest at the leading
   edge, so the figure reads as being traced rather than switched on. */
const linkMaterial = (THREE, palette) =>
  new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uOpacity: { value: 0 },
      uColour: { value: new THREE.Color(palette.sections.jobs[0]) },
    },
    vertexShader: `
      attribute float aT;
      attribute float aReveal;
      varying float vT;
      varying float vReveal;
      void main() {
        vT = aT;
        vReveal = aReveal;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uOpacity;
      uniform vec3 uColour;
      varying float vT;
      varying float vReveal;
      void main() {
        if (vT > vReveal) discard;
        float tip = smoothstep(vReveal - 0.14, vReveal, vT);
        gl_FragColor = vec4(uColour, uOpacity * (0.78 + tip * 0.7));
      }
    `,
  });

export const createStarFigure = (THREE, palette) => {
  const sets = FIGURE.constellations;
  // Sized for the largest figure; smaller ones simply leave slots dark.
  const slots = Math.max(...sets.map(c => c.stars.length));
  const linkSlots = Math.max(...sets.map(c => c.links.length));
  const total = slots * CLUSTER + FIGURE.dust;

  const positions = new Float32Array(total * 3);
  const seeds = new Float32Array(total);
  const scales = new Float32Array(total);
  const hues = new Float32Array(total);
  const lit = new Float32Array(total);
  // Each point's offset from its star's centre, so a slot can be re-pointed at
  // a different star without regenerating its halo.
  const offsets = new Float32Array(slots * CLUSTER * 3);
  const shape = new Float32Array(slots * CLUSTER);

  for (let s = 0; s < slots; s++) {
    for (let k = 0; k < CLUSTER; k++) {
      const i = s * CLUSTER + k;
      // A tight core with a few outliers, so the star has a halo of its own.
      const spread = k === 0 ? 0 : 0.4 + Math.random() * 1.6;
      offsets[i * 3] = gaussian() * spread;
      offsets[i * 3 + 1] = gaussian() * spread;
      offsets[i * 3 + 2] = gaussian() * spread;
      // One fat point at the centre carries the star; the rest are its glow.
      shape[i] = k === 0 ? 3.1 : 0.4 + Math.random() * 0.55;
      seeds[i] = Math.random();
      hues[i] = Math.random();
    }
  }

  for (let k = 0; k < FIGURE.dust; k++) {
    const i = slots * CLUSTER + k;
    positions[i * 3] = (Math.random() - 0.5) * FIGURE.dustSpread;
    positions[i * 3 + 1] = (Math.random() - 0.5) * FIGURE.dustSpread;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 0.8;
    seeds[i] = Math.random();
    hues[i] = Math.random();
    scales[i] = 0.25 + Math.pow(Math.random(), 2.6) * 0.7;
    lit[i] = FIGURE.dustLit; // always faintly there, framing the figure
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
  geometry.setAttribute('aHue', new THREE.BufferAttribute(hues, 1));
  geometry.setAttribute('aLit', new THREE.BufferAttribute(lit, 1));

  const material = starMaterial(THREE, palette, FIGURE.size, 2.2);
  const points = new THREE.Points(geometry, material);

  const linkPositions = new Float32Array(linkSlots * 6);
  const linkT = new Float32Array(linkSlots * 2);
  const linkReveal = new Float32Array(linkSlots * 2);
  for (let k = 0; k < linkSlots; k++) {
    linkT[k * 2] = 0;
    linkT[k * 2 + 1] = 1;
  }
  const linkGeometry = new THREE.BufferGeometry();
  linkGeometry.setAttribute('position', new THREE.BufferAttribute(linkPositions, 3));
  linkGeometry.setAttribute('aT', new THREE.BufferAttribute(linkT, 1));
  linkGeometry.setAttribute('aReveal', new THREE.BufferAttribute(linkReveal, 1));
  const links = new THREE.LineSegments(linkGeometry, linkMaterial(THREE, palette));

  const group = new THREE.Group();
  group.add(points);
  group.add(links);

  const brightness = new Float32Array(slots);
  const traced = new Float32Array(linkSlots);
  let shown = 0; // the figure currently drawn
  let wanted = 0; // the figure asked for
  let clearing = false;

  /** Moves the slots onto a figure's stars. Only runs while nothing is lit. */
  const layOut = index => {
    const set = sets[index];
    for (let s = 0; s < slots; s++) {
      const star = set.stars[s];
      for (let k = 0; k < CLUSTER; k++) {
        const i = s * CLUSTER + k;
        if (star) {
          const spread = FIGURE.starSpread * (star[4] || 1);
          positions[i * 3] = star[0] + offsets[i * 3] * spread;
          positions[i * 3 + 1] = star[1] + offsets[i * 3 + 1] * spread;
          positions[i * 3 + 2] = star[2] + offsets[i * 3 + 2] * spread;
          scales[i] = shape[i] * (FIGURE.magFloor + star[3] * FIGURE.magGain);
        } else {
          scales[i] = 0;
        }
      }
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.aScale.needsUpdate = true;

    for (let k = 0; k < linkSlots; k++) {
      const link = set.links[k];
      for (let axis = 0; axis < 3; axis++) {
        const from = link ? set.stars[link[0]][axis] : 0;
        const to = link ? set.stars[link[1]][axis] : 0;
        linkPositions[k * 6 + axis] = from;
        linkPositions[k * 6 + 3 + axis] = to;
      }
    }
    linkGeometry.attributes.position.needsUpdate = true;
  };

  const writeLit = () => {
    for (let s = 0; s < slots; s++) {
      for (let k = 0; k < CLUSTER; k++) {
        lit[s * CLUSTER + k] = brightness[s];
      }
    }
    geometry.attributes.aLit.needsUpdate = true;
    for (let k = 0; k < linkSlots; k++) {
      linkReveal[k * 2] = traced[k];
      linkReveal[k * 2 + 1] = traced[k];
    }
    linkGeometry.attributes.aReveal.needsUpdate = true;
  };

  layOut(0);
  writeLit();

  return {
    group,
    points,
    material,
    links,

    /** Which constellation to show, as a fraction of the way through the roles. */
    setFigure(fraction) {
      const index = Math.max(0, Math.min(sets.length - 1, Math.round(fraction * sets.length) - 1));
      if (index !== wanted) {
        wanted = index;
        clearing = index !== shown;
      }
    },

    /** Puts the figure out, so arriving at the section draws it from nothing. */
    reset() {
      brightness.fill(0);
      traced.fill(0);
      shown = wanted;
      clearing = false;
      layOut(shown);
      writeLit();
    },

    update() {
      const set = sets[shown];

      if (clearing) {
        // Take the old figure down before the new one is laid out, so the two
        // are never on screen at once and no star appears to slide across.
        for (let s = 0; s < slots; s++) {
          brightness[s] += (0 - brightness[s]) * FIGURE.clearRate;
        }
        for (let k = 0; k < linkSlots; k++) {
          traced[k] += (0 - traced[k]) * FIGURE.clearRate;
        }
        let peak = 0;
        for (let s = 0; s < slots; s++) {
          peak = Math.max(peak, brightness[s]);
        }
        if (peak < 0.02) {
          shown = wanted;
          clearing = false;
          brightness.fill(0);
          traced.fill(0);
          layOut(shown);
        }
      } else {
        // In turn, not all at once.
        //
        // Every star used to ramp from the same frame at the same rate, which
        // meant the figure faded up as a single flat object: identical
        // brightness in every slot on every frame, and the trace rate had
        // nothing to run ahead of. A star now waits for the one before it to
        // have caught, so the figure is drawn in the order its stars are
        // written, which is the order you would find them in the sky.
        for (let s = 0; s < slots; s++) {
          const inSet = s < set.stars.length;
          const ready = s === 0 || brightness[s - 1] > IGNITE_HANDOVER;
          const goal = inSet && ready ? 1 : 0;
          brightness[s] += (goal - brightness[s]) * FIGURE.igniteRate;
        }

        // A line is only drawn between two stars that have both begun to
        // light, so it never hangs off into empty sky. Because the trace runs
        // faster than the ignite, it still arrives at its far star before that
        // star is fully up, which is the effect the two rates were chosen for.
        for (let k = 0; k < linkSlots; k++) {
          const link = k < set.links.length ? set.links[k] : null;
          const ready =
            link && brightness[link[0]] > LINK_HANDOVER && brightness[link[1]] > LINK_HANDOVER;
          const goal = ready ? 1 : 0;
          traced[k] += (goal - traced[k]) * FIGURE.traceRate;
        }
      }

      writeLit();
    },
  };
};
