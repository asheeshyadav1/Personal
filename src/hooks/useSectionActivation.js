import { useEffect, useRef, useState } from 'react';
import { registerSection } from '@components/scene/sceneStore';
import { onLayoutChange } from '@utils/viewport';
import { useMotionPreference } from './usePrefersReducedMotion';

/**
 * Registers a section with the WebGL scene and meters how far the reader has
 * scrolled into it, as an integer `step` from 0 to `steps`.
 *
 * Content is gated on that step, so information is dealt out as you scroll
 * rather than dumped the moment the section appears — the 3D form and the copy
 * advance together.
 *
 * The step only ever climbs: scrolling back up does not un-reveal text, which
 * would be maddening to read against. Quantising to integers also caps
 * re-renders at `steps` per section instead of one per frame.
 *
 * @param {string} key one of SECTION_KEYS.
 * @param {number} steps how many beats to divide the section into.
 */
const useSectionActivation = (key, steps = 12) => {
  const ref = useRef(null);
  const { prefersReducedMotion, resolved } = useMotionPreference();
  const [step, setStep] = useState(0);
  const highWaterMark = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return undefined;
    }

    // Wait for the real motion preference. The branch below deals every
    // section out in full, and the meter that replaces it only ever counts
    // up — so acting on the pre-resolution assumption and then correcting
    // would leave every section permanently revealed, with nothing left for
    // scrolling to do.
    if (!resolved) {
      return undefined;
    }

    const unregister = registerSection(key, el);

    // Nothing to meter without motion: show it all.
    if (prefersReducedMotion) {
      setStep(steps);
      return unregister;
    }

    highWaterMark.current = 0;

    let frameId = null;

    const update = () => {
      frameId = null;
      const rect = el.getBoundingClientRect();
      // 0 as the section's top crosses the lower part of the viewport, 1 once
      // most of its height has passed that line.
      const travelled = window.innerHeight * 0.82 - rect.top;
      const distance = Math.max(rect.height * 0.68, 1);
      const next = Math.round(Math.min(1, Math.max(0, travelled / distance)) * steps);

      if (next > highWaterMark.current) {
        highWaterMark.current = next;
        setStep(next);
      }
    };

    const onScroll = () => {
      if (frameId === null) {
        frameId = requestAnimationFrame(update);
      }
    };

    // A real resize relays the section out from scratch, so the mark measured
    // against the old layout no longer describes anything. Keeping it would
    // leave a rotated phone showing content revealed against a stage that has
    // moved out from under it, with no way to recover but a reload.
    //
    // A *real* one, though — hence onLayoutChange rather than the raw resize
    // event. A phone fires resize every time the URL bar slides away, and
    // resetting the mark on those wiped the reveal several times a second and
    // left every section's copy stranded part-way in.
    const onLayout = () => {
      highWaterMark.current = 0;
      setStep(0);
      onScroll();
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    const stopWatchingLayout = onLayoutChange(onLayout);

    return () => {
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
      }
      window.removeEventListener('scroll', onScroll);
      stopWatchingLayout();
      unregister();
    };
  }, [key, steps, prefersReducedMotion, resolved]);

  return { ref, step, activated: step > 0 };
};

export default useSectionActivation;
