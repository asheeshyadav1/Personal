/**
 * Based on https://www.joshwcomeau.com/snippets/react-hooks/use-prefers-reduced-motion/
 *
 * With one deliberate change: the media query is not read during render.
 *
 * The original reads matchMedia in the initial state, which means the server
 * renders one answer (it has no window, so it assumes reduced motion) and the
 * client's very first render — the hydration pass — reads the real one. For
 * the majority of readers, who express no preference, those two disagree, and
 * every component that branches on this hook then hands React a different tree
 * than the HTML it is hydrating.
 *
 * React 17 does not rebuild a mismatched tree; it reuses the DOM it finds,
 * position by position. In the nav that meant the server's logo div was
 * matched against the client's links container: the page ended up with two
 * divs both claiming to be the logo, the second one holding an unstyled,
 * decimal-numbered list of nav links stacked down the right-hand edge of the
 * screen. The side rails had the same fault for the same reason.
 *
 * So the first client render deliberately repeats the server's answer, and the
 * real preference is applied in an effect, one tick later. Hydration matches,
 * and a reader who does prefer reduced motion still gets it — on the home page
 * the correction happens while the loader is still covering the viewport.
 */

import { useState, useEffect } from 'react';

const QUERY = '(prefers-reduced-motion: no-preference)';

/**
 * What the server assumes. It cannot know, and this is the safe direction:
 * every component treats it as "render the whole thing, statically", so the
 * server-rendered HTML carries all of the page's content for a crawler or a
 * reader without JavaScript.
 */
const SERVER_ASSUMPTION = true;

/**
 * The preference, plus whether it has actually been read yet.
 *
 * Almost every caller can ignore `resolved`: they re-run when the value
 * changes, so starting from the assumption and correcting a tick later costs
 * them nothing. It matters only where the first answer is acted on
 * irreversibly — the loader dismisses itself and is unmounted, so if it
 * believes the assumption it never plays at all.
 */
export const useMotionPreference = () => {
  const [state, setState] = useState({
    prefersReducedMotion: SERVER_ASSUMPTION,
    resolved: false,
  });

  useEffect(() => {
    const mediaQueryList = window.matchMedia(QUERY);
    const apply = matches => setState({ prefersReducedMotion: !matches, resolved: true });

    apply(mediaQueryList.matches);

    const listener = event => apply(event.matches);
    // addListener rather than addEventListener: Safari only gained the latter
    // on MediaQueryList in 14, and the deprecated form works everywhere.
    mediaQueryList.addListener(listener);
    return () => mediaQueryList.removeListener(listener);
  }, []);

  return state;
};

function usePrefersReducedMotion() {
  return useMotionPreference().prefersReducedMotion;
}

export default usePrefersReducedMotion;
