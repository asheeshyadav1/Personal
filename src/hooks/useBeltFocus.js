import { useEffect, useRef, useState } from 'react';
import { setBeltFocus, setBeltActive } from '@components/scene/beltStore';
import { getViewport, onLayoutChange } from '@utils/viewport';
import usePrefersReducedMotion from './usePrefersReducedMotion';

/**
 * Meters a pinned section into one beat per project and reports which one is
 * in focus.
 *
 * This replaces a scroll-hijacked card track, and it exists because that track
 * had two systems eating the same scroll: the pan moved the rail sideways
 * while a separate reveal counted items in, and the last two projects only
 * unlocked as the pan finished. At any real scrolling speed they never got a
 * frame. One beat per project cannot skip anything: the index is derived from
 * position, not accumulated, so landing anywhere in the section lands on a
 * project.
 *
 * Unlike the section-activation meter this does not latch. Scrolling back up
 * walks back through the projects, because that is what a reader expects of an
 * index they are travelling along.
 *
 * @param {number} count how many projects.
 * @param {number} breakpoint narrowest viewport that still gets the belt.
 * @param {number} minHeight shortest viewport that still gets the belt.
 * @returns {{sectionRef, index: number, panning: boolean}}
 */
const useBeltFocus = (count, breakpoint = 1080, minHeight = 620) => {
  const sectionRef = useRef(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  const [panning, setPanning] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || count < 1) {
      return undefined;
    }

    if (prefersReducedMotion) {
      // No belt, no pinning: the section becomes an ordinary list and every
      // project is simply present.
      setPanning(false);
      section.style.height = '';
      return undefined;
    }

    let frameId = null;
    let active = false;

    // Measured through the shared viewport rather than `innerWidth`, so the
    // pinned height is set from a stable number. Re-deriving it from a phone's
    // live `innerHeight` would rewrite the section's height — and so every
    // scroll offset below it — on every URL-bar movement.
    const measure = () => {
      const { width, height } = getViewport();
      // Height counts as well as width. The stage is pinned, so it cannot
      // scroll, and on a short window — a laptop in a split screen, a phone in
      // landscape — the panel simply runs off the bottom with no way to reach
      // it. Below either threshold the work becomes a plain list instead.
      active = width >= breakpoint && height >= minHeight;
      setPanning(active);
      if (!active) {
        section.style.height = '';
        return;
      }
      // One viewport to read each project, plus one to hold the last while it
      // is still on screen.
      section.style.height = `${height * (count + 1)}px`;
    };

    const read = () => {
      frameId = null;
      if (!active) {
        return;
      }
      const rect = section.getBoundingClientRect();
      const travelled = -rect.top;
      const total = Math.max(1, rect.height - window.innerHeight);
      const progress = Math.min(1, Math.max(0, travelled / total));
      const next = Math.min(count - 1, Math.floor(progress * count));
      setIndex(previous => (previous === next ? previous : next));
    };

    const onScroll = () => {
      if (frameId === null) {
        frameId = requestAnimationFrame(read);
      }
    };

    const onLayout = () => {
      measure();
      onScroll();
    };

    measure();
    read();
    window.addEventListener('scroll', onScroll, { passive: true });
    const stopWatchingLayout = onLayoutChange(onLayout);

    return () => {
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
      }
      window.removeEventListener('scroll', onScroll);
      stopWatchingLayout();
      section.style.height = '';
    };
  }, [count, breakpoint, minHeight, prefersReducedMotion]);

  // The scene reads focus from the store rather than from props, so it never
  // has to wait on a React render to know which rock to light.
  useEffect(() => {
    setBeltFocus(index);
  }, [index]);

  // And it reads visibility from an observer on the section itself. Deriving it
  // instead from whichever section sits nearest the viewport centre put a layer
  // of inference between "the reader is looking at Work" and "draw the belt",
  // and when the belt failed to appear there was nothing on the page to read to
  // find out why.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section || typeof IntersectionObserver === 'undefined') {
      setBeltActive(false);
      return undefined;
    }

    const observer = new IntersectionObserver(
      entries => {
        const visible = entries.some(entry => entry.isIntersecting);
        setBeltActive(visible && !prefersReducedMotion);
        section.dataset.beltActive = visible ? 'true' : 'false';
      },
      // Only while the section spans the middle of the viewport.
      //
      // A bare threshold of 0 counts "touching the viewport at all", and this
      // section is over ten thousand pixels tall, so it was still intersecting
      // while the reader was well into Contact. The belt stayed nominated,
      // which held the ring down, and Contact lost the portal it animates
      // against. Collapsing the root to a line through the centre makes the
      // question "is Work the thing being looked at" instead.
      { threshold: 0, rootMargin: '-50% 0px -50% 0px' },
    );
    observer.observe(section);

    return () => {
      observer.disconnect();
      setBeltActive(false);
      section.dataset.beltActive = 'false';
    };
  }, [prefersReducedMotion]);

  return { sectionRef, index, panning };
};

export default useBeltFocus;
