import React from 'react';
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

/**
 * The About material, placed on the galaxy's arms.
 *
 * `arm` picks a spiral, `t` is how far out along it the fact sits — 0 at the
 * bulge, 1 at the rim. Two labels per arm, spread across all four, because a
 * projected arm traces a narrow curve: eight facts on two arms crowd into one
 * band down the middle of the screen no matter how they are spaced along it.
 *
 * The pairs are chosen so every label clears the bulge at the centre, the
 * heading, and each other once projected — an arm's outer reaches fall off the
 * bottom of the frame long before the point cloud itself does.
 */
const ABOUT_NODES = [
  { label: 'C, C++, Java, Python', detail: 'core languages', arm: 0, t: 0.28 },
  { label: 'SQL & schema design', detail: '13 facts, 19 dimensions', arm: 2, t: 0.32 },
  { label: 'Spring Boot & REST', detail: 'auth, RBAC, 90% coverage', arm: 0, t: 0.48 },
  { label: 'Automated ingestion', detail: '50,000+ records a day', arm: 3, t: 0.52 },
  { label: 'ETL & warehousing', detail: 'PostgreSQL, tuned', arm: 2, t: 0.58 },
  { label: 'PyTorch & scikit-learn', detail: 'sequence models, ranking', arm: 1, t: 0.62 },
  { label: 'AWS, Azure, GCP', detail: 'cloud & Kubernetes', arm: 3, t: 0.82 },
  { label: 'RAG with pgvector', detail: '71% → 93% answer quality', arm: 1, t: 0.88 },
];

const About = () => {
  const { ref: sectionRef, step } = useSectionActivation('about', 8);
  const headingRef = useReveal(step >= 1, 1.4, true);
  const introRef = useReveal(step >= 1, 0, true);

  // One number drives both the point cloud's build front and the order the
  // facts appear in, so a label never arrives before the arm carrying it. It
  // rises while the section is being read and falls once it isn't, which is
  // what gathers the galaxy on arrival and throws it apart on the way out.
  const progress = useFormationPresence(sectionRef);

  const intro = (
    <div ref={introRef}>
      <p>
        I’m <strong>Asheesh</strong>, a computer science student at Simon Fraser University in
        Vancouver, BC. I build systems that turn data into something you can act on.
      </p>
      <p>
        Across co-op terms at Accenture and GeoBC and a research assistantship at SFU Beedie, I’ve
        architected ingestion that processes 50,000+ records a day, cut a 24-hour geospatial run to
        three hours, and lifted a RAG pipeline’s answer quality from 71% to 93%. I’m drawn to
        statistical learning and AI: finding the signal, making things faster, supporting better
        decisions.
      </p>
      <p>
        Outside of that I’ve built Sync, a social platform with token-based auth and multi-factor
        verification at 90% test coverage, and an NFL projection model in PyTorch served as a
        Kubernetes inference service.
      </p>
    </div>
  );

  return (
    <StyledAboutSection id="about" ref={sectionRef}>
      {/* No `core`: the bulge is left as the bulge. A portrait sitting in the
          middle of the disc was the one opaque object in a section made of
          light, and it read as a photo pasted over the galaxy rather than
          anything belonging to it. */}
      <GalaxyField
        progress={progress}
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
