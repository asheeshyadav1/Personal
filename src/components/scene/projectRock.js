/**
 * One asteroid, as a single solid body.
 *
 * Every earlier attempt drew a project as a cloud of glow sprites, and no
 * amount of tuning fixed the core problem: a cloud has no surface. You could
 * see stars through it, and at any size where the individual sprites were
 * bright enough to read, you could count them. It looked like a swarm because
 * it was one.
 *
 * This is a real mesh. It occludes what is behind it, which is the single
 * thing that makes an object read as an object.
 *
 * It is lit by its own shader rather than by scene lights, because the rest of
 * this scene is unlit additive points and a PBR body dropped into that reads
 * as a photograph pasted over a starfield. The rock glows from inside instead:
 * a dark surface with luminous mottling in the palette's own hues, and a
 * fresnel rim that brightens toward the silhouette the way a translucent body
 * catches light at its edge.
 */

/* Value noise, used twice: once on the CPU to deform the sphere, once in the
   shader to mottle it. Same hash both sides, so the lit patches sit on the
   lumps rather than drifting independently of them. */
const hash3 = (x, y, z) => {
  const n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453123;
  return n - Math.floor(n);
};

const smooth = t => t * t * (3 - 2 * t);

const valueNoise = (x, y, z) => {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);
  const fx = smooth(x - ix);
  const fy = smooth(y - iy);
  const fz = smooth(z - iz);
  const lerp = (a, b, t) => a + (b - a) * t;
  const c = (dx, dy, dz) => hash3(ix + dx, iy + dy, iz + dz);
  return lerp(
    lerp(lerp(c(0, 0, 0), c(1, 0, 0), fx), lerp(c(0, 1, 0), c(1, 1, 0), fx), fy),
    lerp(lerp(c(0, 0, 1), c(1, 0, 1), fx), lerp(c(0, 1, 1), c(1, 1, 1), fx), fy),
    fz,
  );
};

const VERTEX = `
  varying vec3 vLocal;
  varying vec3 vNormal;
  varying vec3 vView;

  void main() {
    vLocal = position;
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAGMENT = `
  uniform vec3 uGlow;
  uniform vec3 uGlowAlt;
  uniform vec3 uCore;
  uniform float uFocus;
  uniform float uSeed;
  uniform float uOpacity;

  varying vec3 vLocal;
  varying vec3 vNormal;
  varying vec3 vView;

  float hash(vec3 p) {
    return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453123);
  }

  float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x),
          mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
      mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
          mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y),
      f.z);
  }

  void main() {
    vec3 p = vLocal * 9.0 + uSeed;

    // Two octaves: broad patches with finer grain inside them, so the surface
    // has a scale to it rather than one uniform speckle.
    float broad = noise(p);
    float fine = noise(p * 3.1);
    float mottle = broad * 0.68 + fine * 0.32;

    // Most of the surface is dark rock. The luminous patches are a minority of
    // it, which is what stops the whole thing reading as a glowing ball.
    float vein = smoothstep(0.52, 0.86, mottle);
    float dark = 0.06 + 0.10 * fine;

    vec3 body = vec3(dark);
    vec3 lit = mix(uGlow, uGlowAlt, broad);
    vec3 colour = body + lit * vein * (0.55 + uFocus * 0.85);

    // Hot pinpricks in the deepest part of the veins, so the texture has
    // somewhere to peak instead of flattening out at its brightest.
    colour += uCore * smoothstep(0.88, 1.0, mottle) * (0.3 + uFocus * 0.7);

    // Fresnel: the rim catches light the way a translucent body does, and it
    // is what separates the silhouette from the starfield behind it.
    float fres = pow(1.0 - clamp(dot(normalize(vNormal), normalize(vView)), 0.0, 1.0), 2.4);
    colour += mix(uGlow, uCore, 0.35) * fres * (0.5 + uFocus * 0.9);

    gl_FragColor = vec4(colour * uOpacity, 1.0);
  }
`;

/**
 * @param {object} THREE the lazily-imported three module.
 * @param {object} palette supplies the two glow hues and the hot core colour.
 * @param {number} radius body radius in world units.
 * @param {number} seed deterministic per-rock shape and texture.
 */
export const createProjectRock = (THREE, palette, radius, seed) => {
  // Detail 3 is about 640 vertices: enough that the deformation reads as lumps
  // rather than as facets, cheap enough to have one per project.
  const geometry = new THREE.IcosahedronGeometry(radius, 3);
  const position = geometry.attributes.position;

  // Deform on the CPU rather than in the vertex shader, so normals can be
  // recomputed afterwards and the shading follows the real surface. Displacing
  // in the shader leaves the normals describing a sphere the rock no longer is.
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    const len = Math.hypot(x, y, z) || 1;
    const nx = x / len;
    const ny = y / len;
    const nz = z / len;

    // Low frequency gives the overall lopsidedness, high frequency the dents.
    // Amplitudes are deliberately small: past about 0.3 the silhouette stops
    // reading as a rock and starts reading as a blob.
    const lump = valueNoise(nx * 1.7 + seed, ny * 1.7 + seed, nz * 1.7 + seed) - 0.5;
    const dent = valueNoise(nx * 5.3 + seed, ny * 5.3 + seed, nz * 5.3 + seed) - 0.5;
    const scale = 1 + lump * 0.34 + dent * 0.12;

    position.setXYZ(i, nx * radius * scale, ny * radius * scale, nz * radius * scale);
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();

  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    // Opaque and depth-writing on purpose: occluding the stars behind it is
    // the whole reason this is a mesh and not more points.
    transparent: false,
    depthWrite: true,
    uniforms: {
      uGlow: { value: new THREE.Color(palette.sections.projects[0]) },
      uGlowAlt: { value: new THREE.Color(palette.sections.projects[1]) },
      uCore: { value: new THREE.Color(palette.core) },
      uFocus: { value: 0 },
      uSeed: { value: seed },
      uOpacity: { value: 1 },
    },
  });

  const mesh = new THREE.Mesh(geometry, material);
  // A tumble axis of its own, so the field does not rotate in lockstep.
  mesh.userData.spin = {
    x: (Math.random() - 0.5) * 0.16,
    y: (Math.random() - 0.5) * 0.2,
    z: (Math.random() - 0.5) * 0.12,
  };

  return { mesh, material, geometry };
};

export default createProjectRock;
