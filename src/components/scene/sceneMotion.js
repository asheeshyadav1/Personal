/**
 * Moves DOM content through the same space the WebGL scene occupies.
 *
 * Every registered element is given a depth, then driven each frame by the
 * cursor and by its own position in the viewport: it drifts, tilts, and pushes
 * back in Z as it travels past. Copy nearer the "front" (a heading) swings more
 * than copy set deeper (body text), which is what makes the text read as being
 * inside the scene rather than pasted on top of it.
 *
 * One shared loop drives every element. Transforms and opacity are written
 * together here because they have to compose into a single transform string —
 * splitting them across two owners means the last writer wins.
 */

const entries = new Set();
const pointer = { x: 0, y: 0 };
const target = { x: 0, y: 0 };
let frameId = null;

// Element offsets are cached so the loop never forces layout. They are
// document-space values, so scrolling cannot change them: the only things that
// can are a resize and the page itself growing or shrinking. Measuring on
// scroll instead would flush layout on every frame, which is what this cache
// exists to avoid.
const measure = entry => {
  const rect = entry.el.getBoundingClientRect();
  entry.top = rect.top + window.scrollY;
  entry.height = rect.height;
};

const remeasureAll = () => entries.forEach(measure);

// Catches layout shifts that are nobody's resize event: images arriving, fonts
// swapping, a section expanding when "Show more" is pressed.
let observer = null;

const onPointerMove = e => {
  target.x = (e.clientX / window.innerWidth) * 2 - 1;
  target.y = (e.clientY / window.innerHeight) * 2 - 1;
};

const loop = () => {
  frameId = requestAnimationFrame(loop);

  pointer.x += (target.x - pointer.x) * 0.05;
  pointer.y += (target.y - pointer.y) * 0.05;

  const viewportHeight = window.innerHeight;

  entries.forEach(entry => {
    if (entry.active && entry.progress < 1) {
      entry.progress = Math.min(1, entry.progress + 0.04);
    }
    if (!entry.active && entry.progress === 0) {
      return; // not yet dealt out; leave it hidden
    }

    const p = entry.progress;
    const eased = p * p * (3 - 2 * p); // smoothstep
    const depth = entry.depth;

    // -0.5 at the top of the viewport, +0.5 at the bottom.
    //
    // Pinned content lives in a sticky stage: it holds still on screen while
    // the page scrolls past, so its document offset keeps growing while its
    // real position does not. Applying scroll drift to it would march it out
    // of the frame, so pinned elements take their motion from the cursor only.
    const centre = entry.top + entry.height / 2 - window.scrollY;
    const relative = entry.pinned ? 0 : (centre - viewportHeight / 2) / viewportHeight;

    const x = pointer.x * depth * 14;
    const y = relative * depth * -22 + (1 - eased) * 36;
    const z = (1 - eased) * -180;
    const rotateY = pointer.x * depth * 3.4;
    const rotateX = relative * depth * -2.6;
    const scale = 0.95 + 0.05 * eased;

    entry.el.style.opacity = eased;
    entry.el.style.transform = `perspective(1100px) translate3d(${x.toFixed(2)}px, ${y.toFixed(
      2,
    )}px, ${z.toFixed(2)}px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(
      2,
    )}deg) scale(${scale.toFixed(3)})`;
  });
};

const start = () => {
  if (frameId !== null || typeof window === 'undefined') {
    return;
  }
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('resize', remeasureAll);
  if (typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(remeasureAll);
    observer.observe(document.documentElement);
  }
  frameId = requestAnimationFrame(loop);
};

const stop = () => {
  if (frameId === null) {
    return;
  }
  cancelAnimationFrame(frameId);
  frameId = null;
  window.removeEventListener('pointermove', onPointerMove);
  window.removeEventListener('resize', remeasureAll);
  if (observer) {
    observer.disconnect();
    observer = null;
  }
};

/**
 * @param {HTMLElement} el element to drive.
 * @param {number} depth how strongly it responds; ~1.4 for headings, ~0.6 for body.
 * @param {boolean} pinned true for content inside a sticky stage.
 * @returns {{setActive: (active: boolean) => void, release: () => void}}
 */
export const registerMotion = (el, depth, pinned = false) => {
  const entry = { el, depth, pinned, progress: 0, active: false, top: 0, height: 0 };
  measure(entry);
  el.style.opacity = '0';
  el.style.willChange = 'transform, opacity';
  el.style.backfaceVisibility = 'hidden';
  entries.add(entry);
  start();

  return {
    setActive: active => {
      if (active && !entry.active) {
        measure(entry); // position may have shifted since registration
      }
      entry.active = active;
    },
    release: () => {
      entries.delete(entry);
      el.style.opacity = '';
      el.style.transform = '';
      el.style.willChange = '';
      el.style.backfaceVisibility = '';
      if (entries.size === 0) {
        stop();
      }
    },
  };
};
