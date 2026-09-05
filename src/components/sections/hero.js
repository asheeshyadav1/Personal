import React from 'react';
import styled from 'styled-components';
import { useMagnetic, useSectionActivation, useReveal } from '@hooks';

/**
 * The opening statement, set against the portal rather than wrapped around it.
 *
 * An earlier version anchored five résumé facts to points on the ring. It read
 * well once, but it made the hero a list, it cost two and a half screens of
 * scroll before the reader learned anything, and it was the same composition
 * About uses further down. The facts moved to About, which is where a reader
 * goes looking for them; the hero kept the ring and got its own shape.
 */
const StyledHeroSection = styled.section`
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 100dvh;
  max-width: none;
  padding: 0;
  /* The portal sits right of centre, so the copy takes the left and stops
     short of it rather than running underneath. The global section rule
     centres with margin auto, which would pull this back into the middle. */
  width: min(46rem, 52vw);
  margin-left: 0;
  margin-right: auto;

  @media (max-width: 1080px) {
    width: 100%;
    max-width: 700px;
    margin: 0 auto;
    min-height: auto;
    padding: 22vh 0 12vh;
  }

  .hero-name {
    font-size: clamp(44px, 7vw, 82px);
    line-height: 1.02;
    letter-spacing: -0.02em;
    color: var(--lightest-slate);
    margin: 0;
  }

  .hero-tagline {
    font-size: clamp(21px, 2.9vw, 34px);
    line-height: 1.15;
    letter-spacing: -0.01em;
    color: var(--slate);
    margin: 14px 0 0;
    max-width: 20ch;
  }

  .hero-subtext {
    color: var(--light-slate);
    font-size: var(--fz-lg);
    line-height: 1.55;
    max-width: 46ch;
    margin: 26px 0 0;
  }

  .hero-cta {
    ${({ theme }) => theme.mixins.bigButton};
    display: inline-block;
    /* Wide enough that the label can never wrap. */
    white-space: nowrap;
    margin-top: 38px;
  }
`;

const Hero = () => {
  const { ref: sectionRef, step } = useSectionActivation('hero', 6);
  const ctaRef = useMagnetic();

  // The hero is the first impression: it arrives rather than waiting for a
  // scroll beat it will never get.
  const nameRef = useReveal(true, 1.5);
  const taglineRef = useReveal(true, 1.2);
  const subtextRef = useReveal(step >= 1, 0.8);
  const buttonRef = useReveal(step >= 1, 1.1);

  return (
    <StyledHeroSection ref={sectionRef}>
      <h1 className="hero-name" ref={nameRef}>
        Asheesh Yadav
      </h1>

      <p className="hero-tagline" ref={taglineRef}>
        I build data systems that hold up in production.
      </p>

      <p className="hero-subtext" ref={subtextRef}>
        Computer science at Simon Fraser University. Four internships spent on ETL pipelines,
        forecasting models, and full-stack apps.
      </p>

      <span ref={buttonRef}>
        <a ref={ctaRef} className="hero-cta" href="#projects">
          View my work
        </a>
      </span>
    </StyledHeroSection>
  );
};

export default Hero;
