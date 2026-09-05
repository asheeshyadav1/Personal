import { useEffect, useRef } from 'react';
import usePrefersReducedMotion from './usePrefersReducedMotion';

/**
 * Tilts an element in 3D toward the cursor while hovered. Returns a ref to
 * attach to the element you want to tilt.
 *
 * @param {number} max maximum rotation on either axis, in degrees.
 */
const useTilt = (max = 6) => {
  const ref = useRef(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion || window.matchMedia('(pointer: coarse)').matches) {
      return;
    }

    let frameId;

    const onMove = e => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        // -0.5 .. 0.5 across each axis of the element.
        const px = (e.clientX - rect.left) / rect.width - 0.5;
        const py = (e.clientY - rect.top) / rect.height - 0.5;

        el.style.transform = `perspective(1000px) rotateY(${px * max * 2}deg) rotateX(${
          -py * max * 2
        }deg) scale(1.02)`;
      });
    };

    const onLeave = () => {
      cancelAnimationFrame(frameId);
      el.style.transform = '';
    };

    el.style.transition = 'transform 0.4s var(--easing)';
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);

    return () => {
      cancelAnimationFrame(frameId);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
      el.style.transform = '';
      el.style.transition = '';
    };
  }, [prefersReducedMotion, max]);

  return ref;
};

export default useTilt;
