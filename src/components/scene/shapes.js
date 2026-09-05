/**
 * Point-cloud target shapes.
 *
 * Every generator returns a Float32Array of `count * 3` coordinates, so the
 * scene can linearly interpolate from any shape to any other: one cloud of
 * points that reforms itself as you move through the page.
 */

const TAU = Math.PI * 2;

// Points spread evenly over a sphere via the golden-angle spiral.
const sphere = (count, radius) => {
  const out = new Float32Array(count * 3);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i;
    out[i * 3] = Math.cos(theta) * r * radius;
    out[i * 3 + 1] = y * radius;
    out[i * 3 + 2] = Math.sin(theta) * r * radius;
  }
  return out;
};

// A regular 3D grid — the most "constructed" of the shapes.
const lattice = (count, size, divisions) => {
  const out = new Float32Array(count * 3);
  const step = (size * 2) / (divisions - 1);
  for (let i = 0; i < count; i++) {
    const x = Math.floor(Math.random() * divisions);
    const y = Math.floor(Math.random() * divisions);
    const z = Math.floor(Math.random() * divisions);
    out[i * 3] = -size + x * step;
    out[i * 3 + 1] = -size + y * step;
    out[i * 3 + 2] = -size + z * step;
  }
  return out;
};

// Two intertwined strands.
const helix = (count, radius, height, turns) => {
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const t = i / count;
    const angle = t * TAU * turns + (i % 2 === 0 ? 0 : Math.PI);
    out[i * 3] = Math.cos(angle) * radius;
    out[i * 3 + 1] = (t - 0.5) * height;
    out[i * 3 + 2] = Math.sin(angle) * radius;
  }
  return out;
};

// A flat annulus, seen edge-on it collapses to a line — a calm closing shape.
const disc = (count, inner, outer) => {
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * TAU;
    const r = inner + Math.random() * (outer - inner);
    out[i * 3] = Math.cos(angle) * r;
    out[i * 3 + 1] = (Math.random() - 0.5) * 0.25;
    out[i * 3 + 2] = Math.sin(angle) * r;
  }
  return out;
};

/**
 * Scatters points along the edges of a polyhedron, which keeps the silhouette
 * legible in a way a surface sampling does not.
 */
const edges = (THREE, geometry, count) => {
  const wire = new THREE.WireframeGeometry(geometry);
  const pos = wire.attributes.position.array;
  const edgeCount = pos.length / 6; // two vertices per edge
  const out = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const e = Math.floor(Math.random() * edgeCount) * 6;
    const t = Math.random();
    out[i * 3] = pos[e] + (pos[e + 3] - pos[e]) * t;
    out[i * 3 + 1] = pos[e + 1] + (pos[e + 4] - pos[e + 1]) * t;
    out[i * 3 + 2] = pos[e + 2] + (pos[e + 5] - pos[e + 2]) * t;
  }

  wire.dispose();
  geometry.dispose();
  return out;
};

/** One target cloud and one wireframe form per section. */
export const buildSectionShapes = (THREE, count) => ({
  hero: {
    points: edges(THREE, new THREE.IcosahedronGeometry(2.1, 1), count),
    wireframe: () => new THREE.IcosahedronGeometry(2.1, 1),
  },
  about: {
    points: sphere(count, 2.2),
    wireframe: () => new THREE.OctahedronGeometry(2.4, 1),
  },
  jobs: {
    points: lattice(count, 1.9, 7),
    wireframe: () => new THREE.BoxGeometry(3.2, 3.2, 3.2, 2, 2, 2),
  },
  projects: {
    points: helix(count, 1.6, 5.2, 4),
    wireframe: () => new THREE.DodecahedronGeometry(2.2, 0),
  },
  contact: {
    points: disc(count, 1.2, 2.6),
    wireframe: () => new THREE.TorusGeometry(2.1, 0.35, 8, 48),
  },
});
