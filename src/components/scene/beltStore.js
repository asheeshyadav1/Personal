/**
 * The bridge between the asteroid belt and the labels riding on it.
 *
 * The labels are real DOM, because text drawn into WebGL is unselectable,
 * unsearchable and invisible to a screen reader. But their positions come from
 * the scene and change every frame, so they cannot go through React: eleven
 * state updates a frame would re-render the section sixty times a second.
 *
 * So React renders the labels once and registers them here; the scene's own
 * loop writes their transforms directly. Same division of labour as
 * sceneMotion, for the same reason.
 */

const labels = new Map();
let focusIndex = 0;
let count = 0;

export const registerBeltLabel = (index, el) => {
  if (el) {
    labels.set(index, el);
  } else {
    labels.delete(index);
  }
};

export const getBeltLabels = () => labels;

/** How many projects the belt is carrying. Set by the section that owns it. */
export const setBeltCount = value => {
  count = value;
};

export const getBeltCount = () => count;

/** Which project is currently at the focus point. */
export const setBeltFocus = value => {
  focusIndex = value;
};

export const getBeltFocus = () => focusIndex;

/**
 * Whether the belt should be on screen.
 *
 * Set by the section that owns it, from an IntersectionObserver, rather than
 * inferred by the scene from which section is nearest the viewport centre.
 * The belt is not decoration behind a section; it is the section, so "is it
 * visible" is a question the DOM can answer directly and a question anyone
 * debugging can read off the page.
 */
let active = false;

export const setBeltActive = value => {
  active = value;
};

export const getBeltActive = () => active;
