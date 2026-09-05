import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { usePrefersReducedMotion } from '@hooks';
import { getSceneState, subscribeToScene, startSceneTracking } from './sceneStore';
import { buildSectionShapes } from './shapes';
import {
  createStarLayer,
  createMeteors,
  updateMeteor,
  createGlowMaterial,
  addGlowAttributes,
  createRingGlow,
} from './space';
import {
  PORTAL_LAYOUT as LAYOUT,
  CAMERA,
  NARROW_BREAKPOINT,
  FORMATIONS,
  formationFor,
  FIGURE,
  clampWorldX,
  galaxyOffsetX,
} from './portalMetrics';
import { createGalaxy } from './galaxy';
import { createStarFigure } from './starFigure';
import { createAsteroidBelt } from './asteroids';
import { getBeltCount, getBeltActive } from './beltStore';
import { getActivePalette, applyPaletteVariables } from './palettes';
import { getViewport, onViewportChange } from '@utils/viewport';

/**
 * One fixed layer holding the scene and its scrim. They share a stacking
 * context so the scrim reliably paints over the canvas — sitting them at
 * competing negative z-indexes instead puts the canvas behind the page.
 */
const StyledSceneLayer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh; /* Fallback for Edge before 108, which has no dvh. */
  height: 100dvh;
  z-index: -1;
  pointer-events: none;
`;

const StyledCanvasHost = styled.div`
  position: absolute;
  inset: 0;
  opacity: 0;
  transition: opacity 1.4s var(--easing);

  &.is-ready {
    opacity: 1;
  }

  /**
   * Below the breakpoint every section collapses from a composition into a
   * single column of prose, and that column sits directly over the formation
   * instead of beside it. At full strength the arms of the galaxy ran straight
   * through the About copy and the Contact heading was barely legible. The
   * scene is still there — it is the page's whole character — but on a phone
   * it is behind the text rather than next to it, and it is lit accordingly.
   */
  @media (max-width: 1080px) {
    &.is-ready {
      opacity: 0.42;
    }
  }

  @media (max-width: 768px) {
    &.is-ready {
      opacity: 0.3;
    }
  }

  canvas {
    display: block;
    /* The drawing buffer is sized in JS; the element always fills the layer,
       so a stale buffer scales rather than leaving a gap at the edge. */
    width: 100% !important;
    height: 100% !important;
  }
`;

/**
 * Darkens the middle of the portal so copy sitting inside the aperture stays
 * readable against the core, without dimming the ring or the starfield.
 */
const StyledScrim = styled.div`
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background: radial-gradient(
    ellipse 46% 42% at var(--portal-x, 50%) 50%,
    rgba(var(--scrim-rgb), 0.7) 0%,
    rgba(var(--scrim-rgb), 0.42) 55%,
    rgba(var(--scrim-rgb), 0) 100%
  );
`;

/**
 * The matte pass.
 *
 * Matte black is deep, non-reflective and low-contrast: no highlight, no
 * gloss, no light source implied anywhere on the surface. So this is only a
 * falloff — the field settles toward a near-black at the edges while the
 * middle sits a shade above it, carrying a trace of cold blue, and the whole
 * range is kept narrow on purpose.
 * A wide gradient like this is what stops a flat fill reading as a flat fill.
 */
const StyledMatte = styled.div`
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  background: radial-gradient(
      ellipse 120% 100% at 50% 42%,
      rgba(var(--matte-lift), 0.24) 0%,
      rgba(var(--matte-lift), 0.1) 45%,
      rgba(var(--matte-lift), 0) 72%
    ),
    radial-gradient(
      ellipse 96% 84% at 50% 50%,
      rgba(var(--matte-deep), 0) 52%,
      rgba(var(--matte-deep), 0.26) 84%,
      rgba(var(--matte-deep), 0.46) 100%
    );
`;

/**
 * The tooth of the surface. Fine fractal noise at a few percent, screened over
 * the black so it lifts as speckle rather than washing the field grey — this is
 * the part that reads as a finish rather than an absence of colour. Fixed, not
 * animated: matte is a texture, and a crawling one would read as video noise.
 */
const StyledGrain = styled.div`
  position: absolute;
  inset: 0;
  z-index: 3;
  pointer-events: none;
  opacity: 0.5;
  mix-blend-mode: screen;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='0.14'/%3E%3C/svg%3E");
  background-size: 160px 160px;
`;

const CORE_POINTS = 2200;
const GALAXY_POINTS = 26000;
/** The per-section core opacities were tuned for flat points; glowing ones
    spread their energy into the corona and need more to read the same. */
const CORE_GAIN = 3.1;
const METEOR_COUNT = 7;

const SETTINGS = {
  cameraZ: 6.4,
  morph: 0.035,
  lerp: 0.045,
  burstDecay: 0.955,
  ease: 0.045,
};

const SceneCanvas = () => {
  const hostRef = useRef(null);
  const scrimRef = useRef(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const [active, setActive] = useState('hero');

  // Tracking runs regardless of WebGL, so the scrim still follows the page on
  // machines that can't render the scene.
  useEffect(() => startSceneTracking(), []);
  useEffect(() => applyPaletteVariables(getActivePalette()), []);
  useEffect(() => subscribeToScene(s => setActive(s.active)), []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }

    let renderer;
    let frameId;
    let disposed = false;
    const cleanups = [];

    import('three').then(THREE => {
      if (disposed) {
        return;
      }

      try {
        renderer = new THREE.WebGLRenderer({
          antialias: true,
          alpha: true,
          powerPreference: 'low-power',
        });
      } catch (e) {
        return; // No WebGL. The page reads fine without it.
      }

      const palette = getActivePalette();
      const WHITE = new THREE.Color(0xffffff);
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(CAMERA.fov, 1, 0.1, 100);
      camera.position.z = CAMERA.z;
      renderer.setClearColor(0x000000, 0);
      host.appendChild(renderer.domElement);

      // --- starfield, four depths for parallax ---------------------------
      // Real stars are not white: they scatter blue to amber by temperature.
      // Most here are cool, a minority warm, which is what stops the field
      // reading as grey dust.
      //
      // Density is weighted hard toward the back. A deep field is mostly faint
      // and far — piling the extra stars into the near layers would crowd the
      // formations instead, and near stars are the expensive ones to draw,
      // being both large on screen and additively blended.
      const starLayers = [
        {
          layer: createStarLayer(THREE, {
            count: 8400,
            spread: 66,
            depth: [-44, -26],
            size: 0.034,
            opacity: 0.5,
            twinkle: 0.1,
            ...palette.stars,
          }),
          factor: 0.025,
        },
        {
          layer: createStarLayer(THREE, {
            count: 7200,
            spread: 42,
            depth: [-24, -12],
            size: 0.05,
            opacity: 0.8,
            twinkle: 0.2,
            ...palette.stars,
          }),
          factor: 0.06,
        },
        {
          layer: createStarLayer(THREE, {
            count: 3000,
            spread: 26,
            depth: [-12, -5],
            size: 0.066,
            opacity: 1.05,
            twinkle: 0.34,
            ...palette.stars,
          }),
          factor: 0.18,
        },
        {
          layer: createStarLayer(THREE, {
            count: 840,
            spread: 16,
            depth: [-5, 1],
            size: 0.095,
            opacity: 1.35,
            twinkle: 0.5,
            ...palette.stars,
          }),
          factor: 0.4,
        },
      ];
      starLayers.forEach(({ layer }) => scene.add(layer));

      // --- meteors ------------------------------------------------------
      const meteors = createMeteors(THREE, METEOR_COUNT);
      meteors.forEach(m => scene.add(m.line));

      // --- the portal: a ring the section's copy sits inside -------------
      const portal = new THREE.Group();
      scene.add(portal);

      const ringMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.5,
      });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.006, 6, 220), ringMaterial);
      portal.add(ring);

      // Two additive shells around the ring so its light falls off into the
      // black instead of stopping at the geometry's edge.
      const haloMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.1,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const halo = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.02, 6, 180), haloMaterial);
      portal.add(halo);

      const { mesh: ringGlow, material: bloomMaterial } = createRingGlow(THREE, {
        width: 0.085,
        opacity: 0.3,
        colour: palette.sections.hero[0],
      });
      portal.add(ringGlow);

      // Particles orbiting the rim, like matter falling into the aperture.
      const swirlCount = 900;
      const swirlSeeds = new Float32Array(swirlCount * 2); // angle, radius factor
      const swirlPositions = new Float32Array(swirlCount * 3);
      for (let i = 0; i < swirlCount; i++) {
        swirlSeeds[i * 2] = Math.random() * Math.PI * 2;
        swirlSeeds[i * 2 + 1] = 0.82 + Math.random() * 0.3;
      }
      const swirlGeometry = new THREE.BufferGeometry();
      swirlGeometry.setAttribute('position', new THREE.BufferAttribute(swirlPositions, 3));
      addGlowAttributes(THREE, swirlGeometry, swirlCount);
      const swirlMaterial = createGlowMaterial(THREE, {
        size: 0.042,
        opacity: 1.0,
        twinkle: 0.4,
        halo: 2.2,
        glow: palette.sections.hero[0],
        glowAlt: palette.sections.hero[1],
        core: palette.core,
      });
      const swirl = new THREE.Points(swirlGeometry, swirlMaterial);
      portal.add(swirl);

      // --- the core: the morphing form inside the aperture ---------------
      const shapes = buildSectionShapes(THREE, CORE_POINTS);
      const current = Float32Array.from(shapes.hero.points);
      const target = Float32Array.from(shapes.hero.points);
      const scatter = new Float32Array(CORE_POINTS * 3);
      for (let i = 0; i < scatter.length; i++) {
        scatter[i] = (Math.random() - 0.5) * 2;
      }

      const coreGeometry = new THREE.BufferGeometry();
      coreGeometry.setAttribute('position', new THREE.BufferAttribute(current, 3));
      addGlowAttributes(THREE, coreGeometry, CORE_POINTS);
      // The widest falloff in the scene: the core is the one thing meant to
      // read as a body of light rather than a field of separate points.
      const coreMaterial = createGlowMaterial(THREE, {
        size: 0.046,
        opacity: LAYOUT.hero.core * CORE_GAIN,
        twinkle: 0.34,
        halo: 1.9,
        glow: palette.sections.hero[0],
        glowAlt: palette.sections.hero[1],
        core: palette.core,
      });
      const core = new THREE.Points(coreGeometry, coreMaterial);
      core.scale.setScalar(0.3);
      portal.add(core);

      // --- the galaxy: About's formation, in place of the ring -----------
      const { points: galaxy, material: galaxyMaterial } = createGalaxy(
        THREE,
        GALAXY_POINTS,
        palette,
      );
      // Seated by placeFormations() below, which applies the aspect-ratio
      // clamp; GALAXY.offsetX is the unclamped intent.
      scene.add(galaxy);

      // --- the asteroid belt: Work's formation ---------------------------
      // The belt is built once with as many project rocks as the section
      // registered before the scene mounted.
      const belt = createAsteroidBelt(THREE, palette, Math.max(1, getBeltCount()));
      belt.layout();
      scene.add(belt.group);

      // --- the constellation: Experience's formation, a star per role ----
      const figure = createStarFigure(THREE, palette);
      figure.group.position.set(FIGURE.x, FIGURE.y, 0);
      scene.add(figure.group);

      // Every material driven by the glow shader, so time and the attenuation
      // scale can be pushed to all of them at once.
      const glowMaterials = [
        ...starLayers.map(({ layer }) => layer.material),
        swirlMaterial,
        coreMaterial,
        galaxyMaterial,
        figure.material,
        belt.material,
      ];

      /**
       * Sized from the layer that holds it rather than from `window`.
       *
       * The layer is `100dvh`, which is what the reader actually sees; on a
       * phone `innerHeight` disagrees with that by the height of the URL bar
       * and changes constantly as it slides. Reading the host means the buffer
       * matches the box it is painted into, at any resolution, and a device
       * pixel ratio above 2 is not worth four times the fill rate for a field
       * of soft points.
       */
      const resize = () => {
        const w = Math.max(1, host.clientWidth);
        const h = Math.max(1, host.clientHeight);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(w, h, false);
        // Half the drawing buffer height, which is the scale the glow shader
        // attenuates point size against.
        const scale = renderer.domElement.height * 0.5;
        glowMaterials.forEach(m => {
          m.uniforms.uScale.value = scale;
        });
        placeFormations();
      };

      /**
       * Re-seats the formations that carry a fixed horizontal offset.
       *
       * Those offsets are world units, and world units scale with viewport
       * height, so a window whose proportions the layout never anticipated —
       * a portrait monitor, a half-width window, a tall tablet — can push a
       * formation clean off the side of the screen. The clamp is a no-op at
       * every ordinary landscape size.
       */
      function placeFormations() {
        const { width, height } = getViewport();
        figure.group.position.x = clampWorldX(FIGURE.x, width, height);
        galaxy.position.x = galaxyOffsetX(width, height);
      }

      resize();

      if (prefersReducedMotion) {
        portal.position.x = LAYOUT.hero.x;
        portal.scale.setScalar(LAYOUT.hero.radius);
        renderer.render(scene, camera);
        host.classList.add('is-ready');
        return;
      }

      let burst = 0;
      cleanups.push(
        subscribeToScene(s => {
          const shape = shapes[s.active];
          if (!shape) {
            return;
          }
          target.set(shape.points);
          burst = 1; // scatters the core, which then reforms
        }),
      );

      const pointer = { x: 0, y: 0 };
      const pointerTarget = { x: 0, y: 0 };
      const onPointerMove = e => {
        const { width, height } = getViewport();
        pointerTarget.x = (e.clientX / width) * 2 - 1;
        pointerTarget.y = (e.clientY / height) * 2 - 1;
      };

      let visible = !document.hidden;
      const onVisibility = () => {
        visible = !document.hidden;
      };

      window.addEventListener('pointermove', onPointerMove, { passive: true });
      document.addEventListener('visibilitychange', onVisibility);
      // Every viewport change, coalesced to one call a frame: the buffer has
      // to track its box exactly, and reallocating it is cheap next to
      // rendering into the wrong size.
      const stopWatchingViewport = onViewportChange(resize);
      // The host is also observed directly, because `100dvh` moves for reasons
      // no window event reports.
      let hostObserver = null;
      if (typeof ResizeObserver !== 'undefined') {
        hostObserver = new ResizeObserver(resize);
        hostObserver.observe(host);
      }
      cleanups.push(() => {
        window.removeEventListener('pointermove', onPointerMove);
        document.removeEventListener('visibilitychange', onVisibility);
        stopWatchingViewport();
        if (hostObserver) {
          hostObserver.disconnect();
        }
      });

      const clock = new THREE.Clock();
      let swirlAngle = 0;
      // How much of the scene each formation currently holds. They are eased
      // rather than switched, and always sum to roughly one.
      let figureWasPresent = false;
      const strength = {
        [FORMATIONS.RING]: 1,
        [FORMATIONS.BELT]: 0,
        [FORMATIONS.GALAXY]: 0,
        [FORMATIONS.FIGURE]: 0,
      };

      // The section's two colours, eased rather than switched. A hue that
      // crossfades over a second or so reads as one light changing; a hard cut
      // reads as a different scene.
      const tint = new THREE.Color(palette.sections.hero[0]);
      const tintAlt = new THREE.Color(palette.sections.hero[1]);
      const goalTint = new THREE.Color();
      const goalTintAlt = new THREE.Color();
      // The ring itself stays close to white; it is the source, not the spill.
      const ringTint = new THREE.Color();

      const animate = () => {
        frameId = requestAnimationFrame(animate);
        if (!visible) {
          return;
        }

        const dt = Math.min(clock.getDelta(), 0.05);
        const t = clock.getElapsedTime();
        const { active: key, sectionProgress } = getSceneState();
        const layout = LAYOUT[key] || LAYOUT.hero;
        const { width: viewWidth, height: viewHeight } = getViewport();
        const isNarrow = viewWidth < NARROW_BREAKPOINT;

        pointer.x += (pointerTarget.x - pointer.x) * SETTINGS.lerp;
        pointer.y += (pointerTarget.y - pointer.y) * SETTINGS.lerp;

        // --- portal placement, eased so section changes glide -----------
        const goalX = isNarrow ? 0 : clampWorldX(layout.x, viewWidth, viewHeight);
        const goalScale = layout.radius * (isNarrow ? 0.8 : 1);
        portal.position.x += (goalX - portal.position.x) * SETTINGS.ease;
        portal.position.y += ((0.5 - sectionProgress) * 0.6 - portal.position.y) * SETTINGS.ease;
        const ps = portal.scale.x;
        portal.scale.setScalar(ps + (goalScale - ps) * SETTINGS.ease);

        // The ring stays square to the camera and the camera stays put. Real
        // DOM copy is anchored to this ring from fixed projection maths, so any
        // tilt or camera parallax would slide the text off the geometry it is
        // supposed to sit on. Depth comes from the parallaxing starfield instead.
        portal.rotation.z = t * 0.02;

        // --- swirl: orbits the rim, faster right after a section change ---
        swirlAngle += dt * (layout.spin + burst * 3);
        for (let i = 0; i < swirlCount; i++) {
          const a = swirlSeeds[i * 2] + swirlAngle * (0.4 + swirlSeeds[i * 2 + 1] * 0.6);
          const r = swirlSeeds[i * 2 + 1] + Math.sin(t * 0.8 + i) * 0.012;
          swirlPositions[i * 3] = Math.cos(a) * r;
          swirlPositions[i * 3 + 1] = Math.sin(a) * r;
          swirlPositions[i * 3 + 2] = Math.sin(a * 3 + t) * 0.05;
        }
        swirlGeometry.attributes.position.needsUpdate = true;

        // --- core morph --------------------------------------------------
        burst *= SETTINGS.burstDecay;
        for (let i = 0; i < current.length; i++) {
          const goal = target[i] + scatter[i] * burst * 1.4;
          current[i] += (goal - current[i]) * SETTINGS.morph;
        }
        coreGeometry.attributes.position.needsUpdate = true;
        core.rotation.y = t * 0.12 + sectionProgress * 0.9;
        core.rotation.x = Math.sin(t * 0.18) * 0.18;
        // The core lives in portal-local space, so undo the portal's scale to
        // keep it a constant size inside the aperture.
        core.scale.setScalar(0.3 + burst * 0.03);

        const hues = palette.sections[key] || palette.sections.hero;
        // --- formation cross-fade ----------------------------------------
        // A section owns exactly one formation. Whichever holds the frame rises
        // while every other falls, so two never overlap into a shape that is
        // neither.
        //
        // The galaxy is the exception to keying this on the active section: its
        // stage is tall enough that "nearest the viewport centre" only changes
        // hands hundreds of pixels after the stage has scrolled away, so it
        // follows its own presence — the same value that drives its build —
        // and the ring stands down while it holds the frame.
        const presence = getSceneState().formationProgress;
        const wants = formationFor(key);
        // A section that brings its own formation outranks the galaxy's
        // presence hold. Without this, formationProgress left over from About
        // kept the galaxy nominated all the way through Work, so the belt was
        // asked for and never rose: no rocks, and no ring either, because the
        // ring had correctly stood down for a formation that never arrived.
        const beltWants = getBeltActive();
        const bringsOwn = wants === FORMATIONS.FIGURE || beltWants;
        const galaxyHolds = presence > 0.002 && !bringsOwn;
        const goal = {
          [FORMATIONS.GALAXY]: galaxyHolds ? 1 : 0,
          [FORMATIONS.FIGURE]: wants === FORMATIONS.FIGURE ? 1 : 0,
          [FORMATIONS.BELT]: beltWants ? 1 : 0,
          [FORMATIONS.RING]: wants === FORMATIONS.RING && !galaxyHolds && !beltWants ? 1 : 0,
        };
        Object.keys(strength).forEach(name => {
          strength[name] += (goal[name] - strength[name]) * 0.08;
        });
        const beltStrength = strength[FORMATIONS.BELT];
        const galaxyStrength = strength[FORMATIONS.GALAXY];
        const ringStrength = strength[FORMATIONS.RING];
        const figureStrength = strength[FORMATIONS.FIGURE];

        galaxyMaterial.uniforms.uOpacity.value = galaxyStrength * 1.45;

        // The belt only turns while Work holds the frame; there is no reason to
        // move 5700 points for a formation nobody can see.
        // The labels are position:fixed DOM, so they float over whatever is on
        // screen. Left to themselves they kept their last transform and stayed
        // legible over About and Contact. They go out with the formation.
        const beltHere = beltStrength > 0.004;
        belt.group.visible = beltHere;
        if (beltHere) {
          belt.update(t, dt);
        } else {
          // Every frame, not just on the transition. A label registered after
          // the transition had already fired would otherwise keep whatever the
          // build-time layout pass gave it and hang over the hero. Eleven style
          // writes on a frame that is drawing nothing is not a cost worth
          // being clever about.
          belt.clearLabels();
        }
        belt.material.uniforms.uOpacity.value = beltStrength * 2.1;
        belt.setOpacity(Math.min(1, beltStrength * 1.4));

        // Arriving at the section puts the figure out and draws it again, so
        // the constellation is traced in front of the reader rather than being
        // there already.
        const figureHere = goal[FORMATIONS.FIGURE] === 1;
        if (figureHere && !figureWasPresent) {
          figure.reset();
        }
        figureWasPresent = figureHere;

        // One constellation per role, ordered by how hard each is to find.
        figure.setFigure(getSceneState().formationVariant);
        figure.update();
        figure.material.uniforms.uTime.value = t;
        figure.material.uniforms.uOpacity.value = figureStrength * 2.2;
        figure.material.uniforms.uGlow.value.copy(tint);
        figure.material.uniforms.uGlowAlt.value.copy(tintAlt);
        figure.links.material.uniforms.uOpacity.value = figureStrength * 2.0;
        figure.links.material.uniforms.uColour.value.copy(tint);
        // A constellation does not spin. It drifts, barely, so it is not dead.
        figure.group.rotation.z = Math.sin(t * 0.07) * 0.02;
        figure.group.rotation.y = Math.sin(t * 0.05) * 0.05;

        // A faded-out formation still costs its full fill rate, and these are
        // large additive sprites. Drop them from the draw entirely once they
        // have nothing left to contribute.
        galaxy.visible = galaxyStrength > 0.012;
        portal.visible = ringStrength > 0.012;
        figure.group.visible = figureStrength > 0.012;
        // Overshoots one so the bulge is fully closed by the end of the run.
        galaxyMaterial.uniforms.uBuild.value = presence * 1.15;
        galaxyMaterial.uniforms.uDisperse.value = getSceneState().formationDispersing;
        // Deliberately not spun. The DOM labels are projected from the arm
        // maths once and then sit still, so any rotation here would slowly
        // carry the arms out from under the facts anchored to them.

        goalTint.setHex(hues[0]);
        goalTintAlt.setHex(hues[1]);
        tint.lerp(goalTint, SETTINGS.ease);
        tintAlt.lerp(goalTintAlt, SETTINGS.ease);
        ringTint.copy(tint).lerp(WHITE, 0.5);

        glowMaterials.forEach(m => {
          m.uniforms.uTime.value = t;
        });
        [swirlMaterial, coreMaterial].forEach(m => {
          m.uniforms.uGlow.value.copy(tint);
          m.uniforms.uGlowAlt.value.copy(tintAlt);
        });
        bloomMaterial.uniforms.uColour.value.copy(tint);
        ringMaterial.color.copy(ringTint);
        haloMaterial.color.copy(tint);
        const coreOpacity = coreMaterial.uniforms.uOpacity;
        coreOpacity.value += (layout.core * CORE_GAIN * ringStrength - coreOpacity.value) * 0.05;
        ringMaterial.opacity += (0.5 * ringStrength + burst * 0.4 - ringMaterial.opacity) * 0.06;
        haloMaterial.opacity = 0.1 * ringStrength;
        swirlMaterial.uniforms.uOpacity.value = 1.0 * ringStrength;
        // The ring's bloom swells with the burst, so a section change lands as
        // a pulse of light rather than only a reshuffle of points.
        const bloomOpacity = bloomMaterial.uniforms.uOpacity;
        bloomOpacity.value += (0.3 * ringStrength + burst * 0.3 - bloomOpacity.value) * 0.06;

        // --- ambient ------------------------------------------------------
        starLayers.forEach(({ layer, factor }) => {
          layer.position.x = -pointer.x * factor * 6;
          layer.position.y = pointer.y * factor * 6;
          layer.rotation.z = t * 0.004 * factor;
        });
        meteors.forEach(m => updateMeteor(m, dt));

        renderer.render(scene, camera);
      };
      animate();

      host.classList.add('is-ready');

      cleanups.push(() => {
        scene.traverse(obj => {
          if (obj.geometry) {
            obj.geometry.dispose();
          }
          if (obj.material) {
            obj.material.dispose();
          }
        });
      });
    });

    return () => {
      disposed = true;
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
      cleanups.forEach(fn => fn());
      if (renderer) {
        renderer.dispose();
        if (renderer.domElement.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
      }
    };
  }, [prefersReducedMotion]);

  const portalX = (LAYOUT[active] || LAYOUT.hero).screenX;

  return (
    <StyledSceneLayer aria-hidden="true">
      <StyledCanvasHost ref={hostRef} />
      <StyledScrim ref={scrimRef} style={{ '--portal-x': portalX }} />
      <StyledMatte />
      <StyledGrain />
    </StyledSceneLayer>
  );
};

export default SceneCanvas;
