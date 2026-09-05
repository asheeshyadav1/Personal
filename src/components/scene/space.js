/**
 * Builders for the ambient space layers: stars at three depths, and a pool of
 * meteors that streak across on their own timers.
 *
 * Kept apart from the scene component so the maths stays readable and the
 * component is left doing composition and animation.
 */

const randomBetween = (min, max) => min + Math.random() * (max - min);

/**
 * The glow every point in the scene is drawn with.
 *
 * A default THREE.PointsMaterial draws each point as a flat square of uniform
 * brightness, which reads as dust. These are meant to read as *lit* — so each
 * point is a hot core inside a wide soft falloff, drawn additively so that
 * overlapping points stack into a bloom the way real light does. Size and
 * brightness are per-point and breathe on their own phase, so the field looks
 * alive rather than like a texture scrolling past.
 *
 * @param {number} size base point size in world units.
 * @param {number} opacity overall brightness, animated by the scene.
 * @param {number} twinkle 0 = steady, ~0.5 = strongly breathing.
 * @param {number} halo falloff width; higher is tighter and more star-like.
 * @param {number} glow the saturated colour the corona carries.
 * @param {number} glowAlt a second colour a minority of points take instead.
 * @param {number} core the colour of the blown-out centre; near-white, since a
 *   bright enough light source always reads white at its hottest point.
 */
export const createGlowMaterial = (
  THREE,
  {
    size,
    opacity,
    twinkle = 0.25,
    halo = 2.6,
    glow = 0xffffff,
    glowAlt = 0xffffff,
    core = 0xffffff,
  },
) =>
  new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uSize: { value: size },
      uOpacity: { value: opacity },
      uTwinkle: { value: twinkle },
      uHalo: { value: halo },
      uGlow: { value: new THREE.Color(glow) },
      uGlowAlt: { value: new THREE.Color(glowAlt) },
      uCore: { value: new THREE.Color(core) },
      // The build front. Points further out than uBuild (as a fraction of
      // uBuildScale) have not formed yet. Defaults past 1 so every formation
      // that doesn't animate a build is simply fully born.
      uBuild: { value: 4.0 },
      uBuildScale: { value: 1.0 },
      // 1 = points fly in from aOrigin as the build front passes them.
      uAssemble: { value: 0.0 },
      // 1 = the formation is coming apart, and unformed points blow outward
      // along aScatter instead of waiting at aOrigin.
      uDisperse: { value: 0.0 },
      // Matches THREE's own size-attenuation scale: half the drawing buffer
      // height, so points hold their apparent size at any resolution.
      uScale: { value: 300 },
    },
    vertexShader: `
      uniform float uTime;
      uniform float uSize;
      uniform float uScale;
      uniform float uTwinkle;
      uniform float uBuild;
      uniform float uBuildScale;
      uniform float uAssemble;
      uniform float uDisperse;
      attribute vec3 aOrigin;
      attribute vec3 aScatter;
      attribute float aSeed;
      attribute float aScale;
      attribute float aHue;
      varying float vGlow;
      varying float vHue;

      void main() {
        float phase = aSeed * 6.2831853;

        // Distance out along the formation's own plane, measured on the point's
        // final position, so a build reads as travelling across the disc rather
        // than toward the camera.
        float reach = length(position.xz) / uBuildScale;
        // The front starts at the rim and closes inward, so the formation
        // gathers onto its centre and finishes there. Running it the other way
        // makes the middle appear first and the arms grow away from it, which
        // reads as the thing spreading out rather than coming together.
        float front = 1.0 - uBuild;
        // A long soft leading edge, so points are visibly in flight rather than
        // switching on.
        float born = smoothstep(front - 0.5, front, reach);

        // Eased so a point decelerates into its slot instead of arriving at
        // full speed and stopping dead.
        float settle = born * born * (3.0 - 2.0 * born);

        // Assembly retraces a path: in from aOrigin, onto the arm.
        vec3 assembled = mix(mix(position, aOrigin, uAssemble), position, settle);
        // Dispersal is not that path reversed. A point leaves from where it
        // stands, straight out along its own scatter vector, so the formation
        // comes apart where it stood rather than rewinding.
        vec3 scattered = position + aScatter * (1.0 - settle);
        vec3 placed = mix(assembled, scattered, uDisperse);
        vec4 mv = modelViewMatrix * vec4(placed, 1.0);
        // Two incommensurate rates, so the field never falls into lockstep.
        float breathe = sin(uTime * 0.7 + phase) * 0.5 + 0.5;
        float flicker = sin(uTime * 1.9 + phase * 2.7) * 0.5 + 0.5;
        // Bigger points burn hotter, so the field has a few real highlights
        // instead of a uniform wash.
        vGlow = (1.0 - uTwinkle + uTwinkle * mix(breathe, flicker, 0.35) * 2.0)
                // Points waiting to form stay dimly visible; points coming
                // apart fade out entirely as they go.
                * (0.55 + aScale * 0.55)
                * mix(mix(0.25, 1.0, settle), settle, uDisperse);
        vHue = aHue;
        gl_PointSize = uSize * aScale * (1.0 + uTwinkle * (breathe - 0.5) * 0.5)
                       * (0.5 + settle * 0.5)
                       * (uScale / max(-mv.z, 0.001));
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform float uOpacity;
      uniform float uHalo;
      uniform vec3 uGlow;
      uniform vec3 uGlowAlt;
      uniform vec3 uCore;
      varying float vGlow;
      varying float vHue;

      void main() {
        float d = length(gl_PointCoord - vec2(0.5));
        if (d > 0.5) discard;
        float falloff = max(0.0, 1.0 - d * 2.0);
        // Three nested terms: a faint bloom carrying most of the sprite, a
        // tighter corona, and a blown-out centre. Stacked additively across
        // neighbours this is what reads as light rather than as a dot.
        float bloom = pow(falloff, 0.85) * 0.17;
        float corona = pow(falloff, uHalo) * 0.55;
        float core = smoothstep(0.17, 0.0, d) * 1.7;
        float total = bloom + corona + core;

        // Hue varies per point, but skewed hard toward the primary so the alt
        // colour reads as the occasional odd one out, not a second population.
        vec3 tint = mix(uGlow, uGlowAlt, pow(vHue, 1.4));
        // Saturated at the edges, white-hot at the centre — the way an actual
        // light source desaturates as it blows out.
        // Biased toward the hot end: a saturated colour carries far less
        // luminance than white through additive blending, so without this the
        // whole field sinks into a murky navy.
        float hotness = pow(clamp(core / max(total, 0.0001), 0.0, 1.0), 0.6);
        vec3 colour = mix(tint, uCore, hotness);

        gl_FragColor = vec4(colour, total * uOpacity * vGlow);
      }
    `,
  });

/**
 * Gives a point geometry the per-point phase and size variation the glow
 * material reads. Sizes are skewed so most points are small and a few are
 * bright and large — an even spread reads as noise.
 */
export const addGlowAttributes = (THREE, geometry, count) => {
  const seeds = new Float32Array(count);
  const scales = new Float32Array(count);
  const hues = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    seeds[i] = Math.random();
    scales[i] = 0.45 + Math.pow(Math.random(), 2.4) * 1.9;
    hues[i] = Math.random();
  }
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
  geometry.setAttribute('aHue', new THREE.BufferAttribute(hues, 1));
};

/**
 * A slab of stars at a given depth. Each layer is its own object so it can be
 * parallaxed independently — near stars swing further than far ones, which is
 * what sells the depth.
 */
export const createStarLayer = (
  THREE,
  { count, spread, depth, size, opacity, twinkle, glow, glowAlt },
) => {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = randomBetween(-spread, spread);
    positions[i * 3 + 1] = randomBetween(-spread * 0.6, spread * 0.6);
    positions[i * 3 + 2] = randomBetween(depth[0], depth[1]);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  addGlowAttributes(THREE, geometry, count);

  // Near stars twinkle hardest; distant ones are steadier, which is both true
  // to life and keeps the far field from fizzing.
  return new THREE.Points(
    geometry,
    createGlowMaterial(THREE, { size, opacity, twinkle, glow, glowAlt }),
  );
};

const resetMeteor = m => {
  // Enter from the upper right, travel down and to the left.
  m.x = randomBetween(6, 16);
  m.y = randomBetween(2, 9);
  m.z = randomBetween(-9, -1);
  m.speed = randomBetween(9, 16);
  m.angle = randomBetween(0.35, 0.6); // radians below horizontal
  m.duration = randomBetween(0.9, 1.6);
  m.trail = randomBetween(0.9, 2.1);
  m.life = 0;
  m.wait = randomBetween(0.8, 7);
};

/**
 * A meteor is a two-vertex line whose head and tail are rewritten each frame.
 * Each carries its own timer, so they arrive irregularly rather than in lockstep.
 */
export const createMeteors = (THREE, count) =>
  Array.from({ length: count }, () => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));

    const line = new THREE.Line(
      geometry,
      new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    );

    const meteor = { line };
    resetMeteor(meteor);
    return meteor;
  });

/** Advances one meteor by `dt` seconds, respawning it once it burns out. */
export const updateMeteor = (m, dt) => {
  if (m.wait > 0) {
    m.wait -= dt;
    m.line.material.opacity = 0;
    return;
  }

  m.life += dt;
  if (m.life > m.duration) {
    resetMeteor(m);
    return;
  }

  const dx = -Math.cos(m.angle) * m.speed;
  const dy = -Math.sin(m.angle) * m.speed;
  const headX = m.x + dx * m.life;
  const headY = m.y + dy * m.life;

  const pos = m.line.geometry.attributes.position.array;
  pos[0] = headX;
  pos[1] = headY;
  pos[2] = m.z;
  pos[3] = headX - dx * (m.trail / m.speed);
  pos[4] = headY - dy * (m.trail / m.speed);
  pos[5] = m.z;
  m.line.geometry.attributes.position.needsUpdate = true;

  // Fade in fast, out slowly, so the streak reads as travelling.
  const t = m.life / m.duration;
  m.line.material.opacity = Math.sin(Math.PI * t) * 0.85;
};

/**
 * The ring's glow.
 *
 * A wide torus can't do this: a tube of flat colour has edges, so it reads as a
 * grey band rather than light falling off. This is a flat annulus whose alpha
 * decays with distance from the ring's radius, drawn additively, which is what
 * a light source spilling into black actually looks like.
 *
 * @param {number} width how far the spill reaches, in ring radii.
 */
export const createRingGlow = (THREE, { width = 0.1, opacity = 0.5, colour = 0xffffff } = {}) => {
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uOpacity: { value: opacity },
      uWidth: { value: width },
      uColour: { value: new THREE.Color(colour) },
    },
    vertexShader: `
      varying vec2 vPos;
      void main() {
        vPos = position.xy;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uOpacity;
      uniform float uWidth;
      uniform vec3 uColour;
      varying vec2 vPos;
      void main() {
        float d = abs(length(vPos) - 1.0) / uWidth;
        // Gaussian rather than linear, so there is no distance at which the
        // spill visibly stops.
        gl_FragColor = vec4(uColour, exp(-d * d * 2.3) * uOpacity);
      }
    `,
  });

  const mesh = new THREE.Mesh(
    new THREE.RingGeometry(1 - width * 3, 1 + width * 3, 160, 1),
    material,
  );
  return { mesh, material };
};
