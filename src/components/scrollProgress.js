import React, { useEffect, useRef } from 'react';
import styled from 'styled-components';

const StyledProgress = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  height: 2px;
  width: 100%;
  transform: scaleX(0);
  transform-origin: 0 50%;
  background-color: var(--green);
  opacity: 0.7;
  z-index: 12;
  pointer-events: none;
  will-change: transform;
`;

const ScrollProgress = () => {
  const barRef = useRef(null);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) {
      return undefined;
    }

    let frameId = null;
    // Reading scrollHeight forces a layout flush, so it is cached rather than
    // read per frame. Only a resize or the document itself changing height can
    // invalidate it, and both are observed below.
    let scrollable = 0;

    const remeasure = () => {
      scrollable = document.documentElement.scrollHeight - window.innerHeight;
    };

    const paint = () => {
      frameId = null;
      const progress = scrollable > 0 ? window.scrollY / scrollable : 0;
      bar.style.transform = `scaleX(${Math.min(1, Math.max(0, progress))})`;
    };

    const onScroll = () => {
      if (frameId === null) {
        frameId = requestAnimationFrame(paint);
      }
    };

    const onResize = () => {
      remeasure();
      onScroll();
    };

    remeasure();
    paint();

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);

    let observer = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(onResize);
      observer.observe(document.documentElement);
    }

    return () => {
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
      }
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      if (observer) {
        observer.disconnect();
      }
    };
  }, []);

  return <StyledProgress ref={barRef} aria-hidden="true" />;
};

export default ScrollProgress;
