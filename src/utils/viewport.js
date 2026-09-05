/**
 * One place to ask "how big is the viewport", and one place to be told when
 * that answer has meaningfully changed.
 *
 * Mobile browsers fire `resize` constantly while you scroll, because the URL
 * bar collapsing and expanding changes `innerHeight` by 60–120px. Every hook
 * on this page that reset itself on a raw `resize` was therefore resetting
 * itself several times a second on a phone — which is what froze the reveal
 * animations mid-fade and left the About and Contact copy sitting at a quarter
 * opacity over the starfield.
 *
 * So there are two subscriptions here and they mean different things:
 *
 *   onLayoutChange  the layout genuinely changed — a rotation, a window drag,
 *                   a real resize. Height wobble under HEIGHT_EPSILON is not
 *                   a layout change and never reaches these listeners.
 *   onViewportChange every change, coalesced to one call per frame. For things
 *                   that must track the box exactly, like a canvas backing
 *                   store.
 */

/** Height movement below this is browser chrome, not a new layout. */
const HEIGHT_EPSILON = 150;

const layoutListeners = new Set();
const viewportListeners = new Set();

let last = null;
let frameId = null;
let attached = false;

/**
 * The viewport, excluding any classic scrollbar.
 *
 * `clientWidth` rather than `innerWidth` because on Windows — which is to say
 * on most Edge installs — `innerWidth` includes the scrollbar gutter, and
 * anything laid out against it lands a dozen pixels wide.
 */
export const getViewport = () => {
  if (typeof window === 'undefined') {
    return { width: 0, height: 0 };
  }
  const doc = document.documentElement;
  return {
    width: doc.clientWidth || window.innerWidth,
    height: window.innerHeight || doc.clientHeight,
  };
};

/** Width of the classic scrollbar, or 0 where scrollbars are overlaid. */
export const getScrollbarWidth = () => {
  if (typeof window === 'undefined') {
    return 0;
  }
  return Math.max(0, window.innerWidth - document.documentElement.clientWidth);
};

/**
 * Publishes the scrollbar width as a custom property, so full-bleed rules can
 * subtract it from `100vw` instead of overflowing by a scrollbar on Windows.
 */
export const syncScrollbarWidth = () => {
  if (typeof document === 'undefined') {
    return;
  }
  document.documentElement.style.setProperty('--scrollbar-width', `${getScrollbarWidth()}px`);
};

const flush = () => {
  frameId = null;
  const next = getViewport();
  const previous = last;
  last = next;

  syncScrollbarWidth();
  viewportListeners.forEach(fn => fn(next));

  if (
    previous &&
    previous.width === next.width &&
    Math.abs(previous.height - next.height) < HEIGHT_EPSILON
  ) {
    return;
  }
  layoutListeners.forEach(fn => fn(next));
};

const schedule = () => {
  if (frameId === null) {
    frameId = requestAnimationFrame(flush);
  }
};

const attach = () => {
  if (attached || typeof window === 'undefined') {
    return;
  }
  attached = true;
  last = getViewport();
  syncScrollbarWidth();
  window.addEventListener('resize', schedule);
  window.addEventListener('orientationchange', schedule);
  // The visual viewport moves for reasons `resize` never reports: a pinch
  // zoom, an on-screen keyboard opening over the page.
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', schedule);
  }
};

const detach = () => {
  if (!attached || layoutListeners.size > 0 || viewportListeners.size > 0) {
    return;
  }
  attached = false;
  window.removeEventListener('resize', schedule);
  window.removeEventListener('orientationchange', schedule);
  if (window.visualViewport) {
    window.visualViewport.removeEventListener('resize', schedule);
  }
  if (frameId !== null) {
    cancelAnimationFrame(frameId);
    frameId = null;
  }
};

const subscribe = (set, fn) => {
  if (typeof window === 'undefined') {
    return () => {};
  }
  set.add(fn);
  attach();
  return () => {
    set.delete(fn);
    detach();
  };
};

/** Fires only when the layout actually changed. See the note above. */
export const onLayoutChange = fn => subscribe(layoutListeners, fn);

/** Fires on every viewport change, at most once a frame. */
export const onViewportChange = fn => subscribe(viewportListeners, fn);
