import { useEffect, useRef } from 'react';
import usePrefersReducedMotion from './usePrefersReducedMotion';

/**
 * Pulls an element toward the cursor while the cursor is near it, then releases
 * it. Returns a ref to attach to the element you want to make magnetic.
 *
 * @param {number} strength how far the element travels, as a fraction of the
 *   cursor's offset from the element's centre.
 * @param {number} radius how far outside the element the effect starts, in px.
 */
const useMagnetic = (strength = 0.35, radius = 60) => {
  const ref = useRef(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const el = ref.current;
    // A coarse pointer means there is no hover to respond to.
    if (!el || prefersReducedMotion || window.matchMedia('(pointer: coarse)').matches) {
      return;
    }

    let frameId;

    const onMove = e => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;

        const withinX = Math.abs(dx) < rect.width / 2 + radius;
        const withinY = Math.abs(dy) < rect.height / 2 + radius;

        if (withinX && withinY) {
          el.style.transform = `translate(${dx * strength}px, ${dy * strength}px)`;
        } else {
          el.style.transform = '';
        }
      });
    };

    const onLeave = () => {
      cancelAnimationFrame(frameId);
      el.style.transform = '';
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('blur', onLeave);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('blur', onLeave);
      el.style.transform = '';
    };
  }, [prefersReducedMotion, strength, radius]);

  return ref;
};

export default useMagnetic;
