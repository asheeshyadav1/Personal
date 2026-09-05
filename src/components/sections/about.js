import React from 'react';
import { StaticImage } from 'gatsby-plugin-image';
import styled from 'styled-components';
import { useSectionActivation, useReveal, useFormationPresence } from '@hooks';
import GalaxyField from '@components/galaxyField';

const StyledAboutSection = styled.section`
  position: relative;
  z-index: 1;
  max-width: none;
  min-height: 200vh;

  @media (max-width: 1080px) {
    min-height: auto;
    max-width: 900px;
    margin: 0 auto;
    padding: 100px 0;
  }

  .about-heading {
    ${({ theme }) => theme.mixins.flexCenter};
    justify-content: flex-start;
    color: var(--green);
    font-family: var(--font-mono);
    font-size: var(--fz-md);
    font-weight: 400;
    margin: 0 0 24px;
    white-space: nowrap;
  }
`;

const StyledPortrait = styled.div`
  position: relative;
  width: 168px;
  margin: 0 auto;

  .img {
    border-radius: var(--border-radius);
    filter: grayscale(100%) contrast(1.05);
    transition: var(--transition);
  }

  &:after {
    content: '';
    position: absolute;
    inset: 12px -12px -12px 12px;
    border: 1px solid var(--green);
    border-radius: var(--border-radius);
    opacity: 0.4;
    z-index: -1;
  }
`;

/**
 * The About material, placed on the galaxy's arms.
 *
 * `arm` picks a spiral, `t` is how far out along it the fact sits — 0 at the
 * bulge, 1 at the rim. Two labels per arm, spread across all four, because a
 * projected arm traces a narrow curve: eight facts on two arms crowd into one
 * band down the middle of the screen no matter how they are spaced along it.
 *
 * The pairs are chosen so every label clears the portrait at the centre, the
 * heading, and each other once projected — an arm's outer reaches fall off the
 * bottom of the frame long before the point cloud itself does.
 */
const ABOUT_NODES = [
  { label: 'C, C++, Java, Python', detail: 'core languages', arm: 0, t: 0.28 },
  { label: 'SQL & database design', detail: 'schemas, modelling', arm: 2, t: 0.32 },
  { label: 'Full-stack apps', detail: 'real-time messaging', arm: 0, t: 0.48 },
  { label: 'Automation pipelines', detail: '100k+ records processed', arm: 3, t: 0.52 },
  { label: 'ETL & data ingestion', detail: 'optimised at scale', arm: 2, t: 0.58 },
  { label: 'Predictive models', detail: 'resource forecasting', arm: 1, t: 0.62 },
  { label: 'AWS, Azure, GCP', detail: 'cloud platforms', arm: 3, t: 0.82 },
  { label: 'Blockchain in C', detail: 'SHA-256, proof-of-work', arm: 1, t: 0.88 },
];

const About = () => {
  const { ref: sectionRef, step } = useSectionActivation('about', 8);
  const headingRef = useReveal(step >= 1, 1.4, true);
  const portraitRef = useReveal(step >= 1, 0, true);
  const introRef = useReveal(step >= 1, 0, true);

  // One number drives both the point cloud's build front and the order the
  // facts appear in, so a label never arrives before the arm carrying it. It
  // rises while the section is being read and falls once it isn't, which is
  // what gathers the galaxy on arrival and throws it apart on the way out.
  const progress = useFormationPresence(sectionRef);

  const intro = (
    <div ref={introRef}>
      <p>
        I’m <strong>Asheesh</strong>, a Computer Science student at Simon Fraser University in
        Vancouver. I build systems that turn data into something you can act on.
      </p>
      <p>
        Across research and four internships I’ve optimised ETL workflows, automated ingestion at
        the scale of tens of thousands of records a day, and built predictive models for forecasting
        resource use. I’m drawn to statistical learning and AI: finding the signal, making things
        faster, supporting better decisions.
      </p>
      <p>
        Outside of that I’ve shipped full-stack apps with real-time messaging and written a small
        blockchain in C, mostly to understand tamper-resistant data structures from the inside.
      </p>
    </div>
  );

  const core = (
    <div ref={portraitRef}>
      <StyledPortrait>
        <StaticImage
          className="img"
          src="../../images/meAY.jpeg"
          width={440}
          quality={95}
          formats={['AUTO', 'WEBP', 'AVIF']}
          alt="Asheesh Yadav"
        />
      </StyledPortrait>
    </div>
  );

  return (
    <StyledAboutSection id="about" ref={sectionRef}>
      <GalaxyField
        progress={progress}
        core={core}
        intro={intro}
        nodes={ABOUT_NODES}
        heading={
          <h2 className="about-heading numbered-heading" ref={headingRef}>
            About Me
          </h2>
        }
      />
    </StyledAboutSection>
  );
};

export default About;
