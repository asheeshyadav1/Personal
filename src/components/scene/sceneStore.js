/**
 * A tiny module-level store shared between the WebGL scene and the DOM.
 *
 * Deliberately not React context: the scroll position updates every frame and
 * pushing that through React would re-render the whole tree 60x a second. The
 * canvas polls `getSceneState()` inside its own animation loop, while React
 * components subscribe and only re-render when the *active section* changes,
 * which happens a handful of times per page.
 */

export const SECTION_KEYS = ['hero', 'about', 'jobs', 'projects', 'contact'];

const state = {
  active: 'hero',
  activeIndex: 0,
  // 0..1 through the active section, measured against the viewport centre.
  sectionProgress: 0,
  // 0..1 through the whole document.
  scrollProgress: 0,
  // How far a section's formation has been assembled, 0..1. Written by the
  // section itself rather than derived here, so the geometry and the copy that
  // sits on it are driven by exactly the same number.
  formationProgress: 0,
  // Which variant of a formation to show — the constellation reads it as how
  // far through its sequence to light, 0 to 1.
  formationVariant: 0,
  // 1 while a formation is coming apart rather than together. The two are not
  // mirror images: coming together is a path, coming apart is a scattering.
  formationDispersing: 0,
};

const sections = new Map(); // key -> element
const listeners = new Set();

/* Document height, cached. Reading it forces a layout flush, and measure()
   runs on every scroll frame, so it is refreshed on resize instead. */
let scrollableHeight = 0;
const remeasureDocument = () => {
  scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
};

export const getSceneState = () => state;

export const setFormationProgress = value => {
  state.formationProgress = value;
};

export const setFormationVariant = value => {
  state.formationVariant = value;
};

export const setFormationDispersing = value => {
  state.formationDispersing = value;
};

export const subscribeToScene = listener => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const registerSection = (key, el) => {
  sections.set(key, el);
  measure();
  return () => {
    sections.delete(key);
  };
};

let frameId = null;

function distanceToCentre(rect, centre) {
  if (rect.top > centre) {
    return rect.top - centre;
  }
  if (rect.bottom < centre) {
    return centre - rect.bottom;
  }
  return 0;
}

function measure() {
  if (typeof window === 'undefined') {
    return;
  }

  const viewportCentre = window.innerHeight / 2;
  let bestKey = state.active;
  let bestProgress = state.sectionProgress;
  let bestDistance = Infinity;

  sections.forEach((el, key) => {
    if (!el) {
      return;
    }
    const rect = el.getBoundingClientRect();
    // How far the viewport centre has travelled through this section.
    const progress = (viewportCentre - rect.top) / Math.max(rect.height, 1);
    // Distance from the centre to the section, zero while we're inside it.
    const distance = distanceToCentre(rect, viewportCentre);

    if (distance < bestDistance) {
      bestDistance = distance;
      bestKey = key;
      bestProgress = Math.min(1, Math.max(0, progress));
    }
  });

  state.sectionProgress = bestProgress;
  state.scrollProgress = scrollableHeight > 0 ? Math.min(1, window.scrollY / scrollableHeight) : 0;

  if (bestKey !== state.active) {
    state.active = bestKey;
    state.activeIndex = Math.max(0, SECTION_KEYS.indexOf(bestKey));
    listeners.forEach(fn => fn(state));
  }
}

const onScroll = () => {
  if (frameId) {
    return;
  }
  frameId = requestAnimationFrame(() => {
    frameId = null;
    measure();
  });
};

const onResize = () => {
  remeasureDocument();
  onScroll();
};

export const startSceneTracking = () => {
  if (typeof window === 'undefined') {
    return () => {};
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize);

  let observer = null;
  if (typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(onResize);
    observer.observe(document.documentElement);
  }

  remeasureDocument();
  measure();

  return () => {
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onResize);
    if (observer) {
      observer.disconnect();
    }
    if (frameId) {
      cancelAnimationFrame(frameId);
      frameId = null;
    }
  };
};
