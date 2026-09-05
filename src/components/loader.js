import React, { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { usePrefersReducedMotion } from '@hooks';
import { IconLoader } from '@components/icons';

const StyledLoader = styled.div`
  ${({ theme }) => theme.mixins.flexCenter};
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: var(--dark-navy);
  z-index: 99;
  opacity: 1;
  transition: opacity 0.6s var(--easing);

  &.is-finishing {
    opacity: 0;
  }

  canvas {
    display: block;
    width: 100%;
    height: 100%;
  }

  .fallback-logo {
    width: 100px;
    color: var(--green);
    svg {
      width: 100%;
      fill: none;
    }
  }
`;

// Timeline, in ms. The rain runs, then resolves into the logo, then clears.
//
// This runs in front of the page's largest paint, so every millisecond here is
// a millisecond of Largest Contentful Paint. The old timeline held the reader
// for 3.6s plus the fade. It is now roughly half that, which still reads as a
// deliberate open rather than a stall.
const RAIN_MS = 900;
const RESOLVE_MS = 800;
const HOLD_MS = 350;
const TOTAL_MS = RAIN_MS + RESOLVE_MS + HOLD_MS;

// Shown once per tab, not once per navigation. A reader who follows a link out
// and comes back has already watched it, and watching it again is a toll.
const SEEN_KEY = 'ay:loader-seen';

const alreadySeen = () => {
  try {
    return window.sessionStorage.getItem(SEEN_KEY) === '1';
  } catch (e) {
    // Private mode and blocked storage both throw; treat as a first visit.
    return false;
  }
};

const markSeen = () => {
  try {
    window.sessionStorage.setItem(SEEN_KEY, '1');
  } catch (e) {
    // Nothing to do: the loader simply plays again next time.
  }
};

const GLYPHS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789{}[]()<>/\\*+-=;:.,|&^%$#@!?_~';
const CELL_W = 11;
const CELL_H = 14;

// The AY mark, in the 84x96 viewBox of IconLogo with its translate(3,3) baked in.
const LOGO_VIEWBOX = { w: 84, h: 96 };
const HEX_PATH = 'M42 3 L3 25 L3 70 L42 93 L81 71 L81 26 Z';
const A_PATHS = ['M20 64 L29 33.3', 'M29 33.3 L38 64', 'M25 49.5 L33 49.5'];
const Y_PATH =
  'M44 33.3 L48.5 33.3 L53 45 L57.5 33.3 L62 33.3 L55.5 50 L55.5 64 L50.5 64 L50.5 50 Z';

/**
 * Rasterises the logo and reports, for each cell of the character grid, whether
 * that cell falls inside the mark. Those are the cells the rain freezes into.
 */
const buildLogoMask = (width, height, cols, rows) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return null;
  }

  const scale = (Math.min(width, height) * 0.55) / LOGO_VIEWBOX.h;
  ctx.translate(
    width / 2 - (LOGO_VIEWBOX.w * scale) / 2,
    height / 2 - (LOGO_VIEWBOX.h * scale) / 2,
  );
  ctx.scale(scale, scale);

  ctx.strokeStyle = '#fff';
  ctx.fillStyle = '#fff';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.lineWidth = 6.5;
  ctx.stroke(new Path2D(HEX_PATH));

  ctx.lineWidth = 5.5;
  A_PATHS.forEach(d => ctx.stroke(new Path2D(d)));

  const y = new Path2D(Y_PATH);
  ctx.fill(y);
  ctx.lineWidth = 2.5;
  ctx.stroke(y); // fatten the Y to match the weight of the stroked A

  const { data } = ctx.getImageData(0, 0, width, height);
  const mask = [];
  for (let col = 0; col < cols; col++) {
    for (let row = 0; row < rows; row++) {
      let hit = false;
      // Probe a few points across the cell; a single centre sample misses
      // strokes that are narrower than one cell.
      for (let sx = 0; sx < 3 && !hit; sx++) {
        for (let sy = 0; sy < 3 && !hit; sy++) {
          const x = Math.floor(col * CELL_W + (sx + 0.5) * (CELL_W / 3));
          const y = Math.floor(row * CELL_H + (sy + 0.5) * (CELL_H / 3));
          if (x < width && y < height && data[(y * width + x) * 4 + 3] > 40) {
            hit = true;
          }
        }
      }
      if (hit) {
        mask.push({ col, row, char: GLYPHS[Math.floor(Math.random() * GLYPHS.length)] });
      }
    }
  }
  return mask;
};

const Loader = ({ finishLoading }) => {
  const canvasRef = useRef(null);
  const wrapperRef = useRef(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const [supportsCanvas, setSupportsCanvas] = useState(true);

  // The parent passes a fresh arrow function on every render. Holding it in a
  // ref keeps it out of the effect's dependencies — otherwise any re-render of
  // the layout would tear down the animation and restart it from zero, and the
  // loader would never reach its end.
  const finishRef = useRef(finishLoading);
  finishRef.current = finishLoading;

  useEffect(() => {
    if (prefersReducedMotion || alreadySeen()) {
      const timeout = setTimeout(() => finishRef.current(), 0);
      return () => clearTimeout(timeout);
    }

    markSeen();

    const canvas = canvasRef.current;
    const ctx = canvas && canvas.getContext('2d');
    if (!ctx) {
      setSupportsCanvas(false);
      const timeout = setTimeout(() => finishRef.current(), 800);
      return () => clearTimeout(timeout);
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const cols = Math.ceil(width / CELL_W);
    const rows = Math.ceil(height / CELL_H);

    const mask = buildLogoMask(width, height, cols, rows) || [];
    // Column heads, staggered so the rain doesn't start as a flat line.
    const heads = new Array(cols).fill(0).map(() => -Math.random() * rows);
    const speeds = new Array(cols).fill(0).map(() => 0.6 + Math.random() * 0.9);

    const start = performance.now();
    let frameId;
    let finished = false;

    const finish = () => {
      if (finished) {
        return;
      }
      finished = true;
      if (wrapperRef.current) {
        wrapperRef.current.classList.add('is-finishing');
      }
      setTimeout(() => finishRef.current(), 600);
    };

    // requestAnimationFrame is paused in background tabs, so a reader who
    // switches away mid-load would come back to a frozen loader. This wall
    // clock releases the page regardless of whether frames are being served.
    const fallback = setTimeout(finish, TOTAL_MS + 1200);

    const draw = now => {
      const elapsed = now - start;

      // Trails: paint the background at partial alpha instead of clearing.
      ctx.fillStyle = 'rgba(5, 5, 5, 0.28)';
      ctx.fillRect(0, 0, width, height);
      ctx.font = `500 ${CELL_H - 3}px "SF Mono", "Fira Code", monospace`;
      ctx.textBaseline = 'top';

      // Phase 1 accelerates; phase 2 fades the loose rain out.
      const rainRamp = Math.min(1, elapsed / RAIN_MS);
      const resolve = Math.min(1, Math.max(0, (elapsed - RAIN_MS) / RESOLVE_MS));
      const rainAlpha = 1 - resolve;

      if (rainAlpha > 0.01) {
        for (let col = 0; col < cols; col++) {
          heads[col] += speeds[col] * (0.8 + rainRamp * 2.6);
          if (heads[col] > rows + 6) {
            heads[col] = -Math.random() * 12;
          }

          const head = Math.floor(heads[col]);
          // A short lit tail behind each head.
          for (let k = 0; k < 9; k++) {
            const row = head - k;
            if (row < 0 || row >= rows) {
              continue;
            }
            const char = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
            const fade = (1 - k / 9) * rainAlpha;
            ctx.fillStyle =
              k === 0 ? `rgba(255,255,255,${fade})` : `rgba(200,200,200,${fade * 0.5})`;
            ctx.fillText(char, col * CELL_W, row * CELL_H);
          }
        }
      }

      // Phase 2: the mark locks in, cell by cell, out of the noise.
      if (resolve > 0) {
        const locked = Math.floor(mask.length * Math.min(1, resolve * 1.15));
        for (let i = 0; i < locked; i++) {
          const cell = mask[i];
          // Cells flicker briefly as they land, then hold steady.
          const settled = i < locked - 40;
          ctx.fillStyle = settled
            ? 'rgba(255,255,255,0.95)'
            : `rgba(255,255,255,${0.4 + Math.random() * 0.6})`;
          const char = settled ? cell.char : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
          ctx.fillText(char, cell.col * CELL_W, cell.row * CELL_H);
        }
      }

      if (elapsed < TOTAL_MS) {
        frameId = requestAnimationFrame(draw);
        return;
      }

      finish();
    };

    frameId = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(fallback);
    };
  }, [prefersReducedMotion]);

  return (
    <StyledLoader ref={wrapperRef} className="loader">
      <Helmet bodyAttributes={{ class: `hidden` }} />

      {supportsCanvas && !prefersReducedMotion ? (
        <canvas ref={canvasRef} aria-label="Loading" role="img" />
      ) : (
        <div className="fallback-logo">
          <IconLoader />
        </div>
      )}
    </StyledLoader>
  );
};

Loader.propTypes = {
  finishLoading: PropTypes.func.isRequired,
};

export default Loader;
