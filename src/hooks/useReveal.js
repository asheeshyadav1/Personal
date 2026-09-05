import { useEffect, useLayoutEffect, useRef } from 'react';
import { registerMotion } from '@components/scene/sceneMotion';
import usePrefersReducedMotion from './usePrefersReducedMotion';

// useLayoutEffect warns during SSR; there is no layout to read on the server.
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * Places an element into the scene's motion field and reveals it when its
 * section has been scrolled far enough.
 *
 * The element doesn't just fade in — it arrives from depth and then keeps
 * drifting and tilting with the cursor and the scroll, so the copy travels with
 * the 3D rather than sitting on top of it.
 *
 * Styles are written straight to the DOM node rather than rendered, so the
 * server-rendered markup stays untouched and hydration can't mismatch.
 *
 * @param {boolean} active whether this element's beat has arrived.
 * @param {number} depth motion strength; ~1.4 reads as near, ~0.5 as far.
 * @param {boolean} pinned true when the element sits in a sticky stage, which
 *   holds still on screen and so must not take scroll-driven drift.
 */
const useReveal = (active, depth = 0.8, pinned = false) => {
  const ref = useRef(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const handleRef = useRef(null);
  // Read by the registration below, which has to know the current state
  // without taking `active` as a dependency and re-registering on every beat.
  const activeRef = useRef(active);
  activeRef.current = active;

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion) {
      return undefined;
    }

    handleRef.current = registerMotion(el, depth, pinned);
    // A fresh registration starts hidden, so whatever the element's state
    // already is has to be re-applied here. The effect below only fires when
    // `active` *changes*, and this effect runs again whenever the motion
    // preference resolves — which happens one tick after the first render, and
    // for content that is active from the outset (the hero's name and tagline)
    // there is no later change to put it back on screen.
    handleRef.current.setActive(!!activeRef.current);

    return () => {
      handleRef.current.release();
      handleRef.current = null;
    };
  }, [prefersReducedMotion, depth, pinned]);

  useEffect(() => {
    if (handleRef.current) {
      handleRef.current.setActive(!!active);
    }
  }, [active]);

  return ref;
};

export default useReveal;
