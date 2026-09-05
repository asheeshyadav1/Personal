/**
 * Shared geometry for the portal.
 *
 * The ring is drawn in WebGL but the copy that sits on it is real DOM, so both
 * have to agree on where the ring is. These constants are the single source of
 * truth: the scene reads them in world units, the constellation converts them
 * to pixels.
 */

export const CAMERA = { fov: 45, z: 6.4 };

/**
 * Portal placement per section. `x` and `radius` are world units; `screenX` is
 * the same horizontal position as a CSS percentage, used to centre the
 * readability scrim.
 *
 * Colour lives in palettes.js, not here — placement and palette change for
 * different reasons and shouldn't have to be edited together.
 */
export const PORTAL_LAYOUT = {
  /* The hero copy takes the left of the frame, so the ring moves off to the
     right rather than sitting behind the headline. */
  hero: { x: 2.4, screenX: '74%', radius: 1.9, core: 0.55, spin: 0.5 },
  /* About doesn't use the ring at all — see FORMATIONS below. */
  about: { x: 0, screenX: '50%', radius: 2.2, core: 0.34, spin: 0.35, form: 'galaxy' },
  /* Jobs lays its own rail out on the left, so the ring moves aside and
     shrinks into a background body rather than framing the copy. */
  jobs: { x: 3.0, screenX: '82%', radius: 1.3, core: 0.22, spin: 0.55, form: 'figure' },
  /* Work is one section now, and it owns the belt. The ring stands down
     entirely: a circle behind a circular belt is two rings arguing. */
  projects: { x: 0, screenX: '50%', radius: 2.3, core: 0.26, spin: 0.3, form: 'belt' },
  contact: { x: 0, screenX: '50%', radius: 1.95, core: 0.5, spin: 0.7 },
};

export const NARROW_BREAKPOINT = 1080;

/**
 * Where the portal lands on screen, in pixels.
 *
 * Vertical field of view fixes the world-to-pixel ratio, so this holds at any
 * aspect ratio. Mirrors the narrow-viewport adjustments the scene makes.
 */
export const getPortalMetrics = key => {
  const layout = PORTAL_LAYOUT[key] || PORTAL_LAYOUT.hero;
  const width = window.innerWidth;
  const height = window.innerHeight;

  const halfHeightWorld = Math.tan(((CAMERA.fov / 2) * Math.PI) / 180) * CAMERA.z;
  const pxPerWorld = height / 2 / halfHeightWorld;
  const narrow = width < NARROW_BREAKPOINT;

  return {
    narrow,
    centreX: width / 2 + (narrow ? 0 : layout.x) * pxPerWorld,
    centreY: height / 2,
    radius: layout.radius * (narrow ? 0.8 : 1) * pxPerWorld,
  };
};

/**
 * Which formation a section is drawn as.
 *
 * The ring is one formation, not the whole scene. A section that names another
 * fades the ring out entirely and brings its own geometry up in its place, so
 * the page isn't six variations on a circle.
 */
export const FORMATIONS = { RING: 'ring', GALAXY: 'galaxy', FIGURE: 'figure', BELT: 'belt' };

export const formationFor = key =>
  (PORTAL_LAYOUT[key] || PORTAL_LAYOUT.hero).form || FORMATIONS.RING;

/**
 * The spiral galaxy, in world units.
 *
 * Shared between the point cloud and the DOM labels that sit on its arms, so
 * both are laid out from one description of the shape rather than two that have
 * to be kept in step by hand.
 */
export const GALAXY = {
  arms: 4,
  inner: 0.55, // where an arm leaves the bulge
  outer: 3.0, // where it fades out
  /* How far an arm winds between the bulge and the rim, as ln(outer/inner) *
     pitch radians. Arms sit an equal fraction of a turn apart, so anything much
     past ~1.5 here sweeps an arm past its neighbour and they close into an
     annulus — a ring, not a spiral. The gaps are the whole point. */
  pitch: 1.15,
  bulge: 0.8,
  thickness: 0.09,
  /* Inclination. sin(tilt) is how face-on the disc reads: 1 is flat to the
     camera, 0 is edge-on. Kept fairly face-on on purpose: tilt it much further
     and perspective throws the near edge of the disc off the bottom of the
     viewport, because that edge is nearly three world units closer than the
     far one. */
  tilt: 1.05,
  /* Pushed off centre so the left of the frame belongs to the copy rather than
     to an arm. Both the point cloud and the labels read this, so they stay in
     register. */
  offsetX: 1.0,
};

/** A point on the centreline of arm `arm` at travel `t` (0 at the bulge, 1 at the rim). */
export const galaxyArmPoint = (arm, t) => {
  const r = GALAXY.inner + (GALAXY.outer - GALAXY.inner) * t;
  // Logarithmic spiral: the curve real arms actually follow.
  const theta = (arm / GALAXY.arms) * Math.PI * 2 + Math.log(r / GALAXY.inner) * GALAXY.pitch;
  return { r, theta, x: Math.cos(theta) * r, z: Math.sin(theta) * r };
};

/** Tilts a point on the galaxy's plane into world space. */
export const galaxyToWorld = ({ x, z }) => {
  const c = Math.cos(GALAXY.tilt);
  const s = Math.sin(GALAXY.tilt);
  return { x: x + GALAXY.offsetX, y: -z * s, z: z * c };
};

/**
 * Projects a world point to viewport pixels.
 *
 * The ring gets away with a flat conversion because it sits square to the
 * camera at a fixed depth. A tilted disc does not: its near edge is nearly two
 * world units closer than its far edge, so anything anchored to it has to be
 * projected with the perspective divide or the labels drift off the arms.
 */
export const projectToScreen = ({ x, y, z }) => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const depth = Math.max(CAMERA.z - z, 0.001);
  const pxPerWorld = height / 2 / (Math.tan(((CAMERA.fov / 2) * Math.PI) / 180) * depth);
  return { x: width / 2 + x * pxPerWorld, y: height / 2 - y * pxPerWorld, pxPerWorld };
};

/**
 * The constellations, in world units.
 *
 * One per role, ordered the way an observer meets them: Orion, which anyone can
 * find; Cassiopeia's compact W; Taurus, which needs you to pick a V out of a
 * field and spot a smudge of a cluster; and Ursa Minor, which holds the North
 * Star and almost nothing else bright enough to survive a city sky.
 *
 * Each star is [x, y, z, magnitude, spread]. The magnitude is a size factor
 * derived from the real apparent brightness, which is why Orion reads as bold
 * and Ursa Minor as nearly all faint — that difference is the whole point of
 * the ordering. Spread is optional and widens a star into a cluster.
 */
export const FIGURE = {
  constellations: [
    {
      name: 'Orion',
      stars: [
        [-0.55, 1.0, 0.05, 1.29], // Betelgeuse
        [0.6, 1.05, -0.04, 1.04], // Bellatrix
        [-0.3, 0.05, 0.05, 1.01], // Alnitak
        [0.0, 0.1, -0.03, 1.03], // Alnilam
        [0.32, 0.15, 0.04, 0.91], // Mintaka
        [-0.5, -0.95, -0.05, 0.94], // Saiph
        [0.62, -0.9, 0.04, 1.37], // Rigel, the brightest of the lot
      ],
      links: [
        [0, 1],
        [0, 2],
        [1, 4],
        [2, 3],
        [3, 4],
        [2, 5],
        [4, 6],
      ],
    },
    {
      name: 'Cassiopeia',
      stars: [
        [-1.15, 0.3, 0.04, 0.8], // Segin
        [-0.55, -0.35, -0.03, 0.92], // Ruchbah
        [0.0, 0.45, 0.05, 1.01], // Gamma Cas
        [0.6, -0.3, -0.04, 0.99], // Schedar
        [1.15, 0.35, 0.03, 0.99], // Caph
      ],
      links: [
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 4],
      ],
    },
    {
      name: 'Taurus',
      stars: [
        [0.3, -0.2, 0.05, 1.25], // Aldebaran
        [-0.05, -0.55, -0.03, 0.79], // Theta Tauri
        [-0.45, -0.75, 0.04, 0.74], // Gamma Tauri
        [-0.1, -0.2, -0.04, 0.72], // Delta Tauri
        [0.1, 0.05, 0.03, 0.76], // Epsilon Tauri
        [1.05, 0.95, -0.05, 1.1], // Elnath, the northern horn
        [0.95, -0.95, 0.04, 0.86], // Zeta Tauri, the southern horn
        // The Pleiades: a smudge rather than a point, and joined to nothing.
        [-1.3, 0.55, 0.02, 1.0, 3.4],
      ],
      links: [
        [2, 1],
        [1, 0],
        [2, 3],
        [3, 4],
        [4, 5],
        [0, 6],
      ],
    },
    {
      name: 'Ursa Minor',
      stars: [
        [1.45, 0.3, 0.05, 1.08], // Polaris
        [1.0, 0.15, -0.03, 0.7], // Yildun
        [0.55, 0.0, 0.04, 0.73], // Epsilon UMi
        [0.05, -0.1, -0.04, 0.71], // Zeta UMi
        [-0.3, 0.35, 0.03, 0.61], // Eta UMi, the faintest here
        [-0.95, 0.15, -0.05, 0.92], // Pherkad
        [-0.85, -0.55, 0.04, 1.07], // Kochab
      ],
      links: [
        [3, 4],
        [4, 5],
        [5, 6],
        [6, 3],
        [3, 2],
        [2, 1],
        [1, 0],
      ],
    },
  ],
  starSpread: 0.055,
  size: 0.115,
  /* Magnitudes are lifted off zero before they are used, so the faint half of
     Ursa Minor stays readable. The gain keeps the differences between stars —
     which is what makes the run of figures get harder to read — while the floor
     stops the dimmest ones disappearing entirely. */
  magFloor: 0.45,
  magGain: 0.72,
  /* A faint scatter around the figure, so the stars sit in a patch of sky
     rather than floating in a void. */
  dust: 900,
  dustSpread: 5.2,
  dustLit: 0.42,
  /* The trace runs faster than the ignite, so a line arrives at its star just
     before the star catches light. */
  igniteRate: 0.055,
  traceRate: 0.09,
  /* How fast the old figure clears before the new one is drawn. */
  clearRate: 0.14,
  /* Right of the rail and the role panel. World units scale with viewport
     *height* while the panel is in vw, so this is the offset that keeps both
     clear across the usual aspect ratios. */
  x: 2.9,
  y: 0,
};
