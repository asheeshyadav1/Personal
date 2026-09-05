import React, { useEffect } from 'react';
import { useStaticQuery, graphql } from 'gatsby';
import styled from 'styled-components';
import { socialMedia } from '@config';
import { Icon } from '@components/icons';
import { useSectionActivation, useReveal, useBeltFocus } from '@hooks';
import { registerBeltLabel, setBeltCount, setBeltFocus } from '@components/scene/beltStore';

/**
 * Work, as an asteroid belt.
 *
 * The projects are rocks in the belt the scene is already drawing. Scrolling
 * turns the belt; whichever rock reaches the focus point is the project being
 * read, and its detail fills the panel on the left.
 *
 * This replaced a horizontally-panned rail of cards. Two problems killed that
 * version and both are structural rather than cosmetic. The pan and the
 * per-card reveal were both driven by the same scroll, so the last projects
 * only unlocked as the pan ran out and were skipped entirely at any real
 * scrolling speed. And a card forces a fixed height, which meant clamping
 * every description to fit a box. Here the index is derived from scroll
 * position rather than accumulated, so nothing can be missed, and the panel
 * has no height to fight.
 */
/* Wordiness caps. Inside a belt you are moving, and you read a rock the way you
   read a road sign: one glance. The full write-up lives in the repo. */
const BRIEF_MIN_WORDS = 8;
const BRIEF_MAX_WORDS = 26;

/**
 * The one-glance version of a project's description.
 *
 * The markdown bodies run to seventy words and up, which is right for a repo
 * README and far too much to read while flying past. Taking the first sentence
 * gets most of them to a sane length without truncating mid-word, which is what
 * a CSS line clamp does and what made the earlier cards look broken.
 *
 * Two cases need more than that: a sentence can be long on its own (one runs to
 * forty-nine words), so an over-long one is cut at its last clause boundary; and
 * one project opens with a four-word greeting, so sentences are taken until
 * there is enough to be worth reading.
 */
const brief = html => {
  const text = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();

  const sentences = text.match(/[^.!?]+[.!?]?/g) || [text];
  const taken = [];
  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) {
      continue;
    }
    const combined = [...taken, trimmed].join(' ');
    if (taken.length > 0 && combined.split(' ').length > BRIEF_MAX_WORDS) {
      break;
    }
    taken.push(trimmed);
    if (taken.join(' ').split(' ').length >= BRIEF_MIN_WORDS) {
      break;
    }
  }

  let out = taken.join(' ').trim();
  if (out.split(' ').length > BRIEF_MAX_WORDS) {
    // Cut at the last comma or semicolon that still fits, so the fragment ends
    // somewhere a reader would have paused anyway.
    let cut = -1;
    for (let i = 0; i < out.length; i++) {
      if (out[i] === ',' || out[i] === ';') {
        if (out.slice(0, i).split(' ').length <= BRIEF_MAX_WORDS) {
          cut = i;
        } else {
          break;
        }
      }
    }
    out = (
      cut > 0 ? out.slice(0, cut) : out.split(' ').slice(0, BRIEF_MAX_WORDS).join(' ')
    ).replace(/[\s,;]+$/, '');
    out += '.';
  }
  return out;
};

const StyledWorkSection = styled.section`
  position: relative;
  z-index: 1;
  max-width: none;
  padding: 0;

  &[data-panning='false'] {
    max-width: 1000px;
    margin: 0 auto;
    padding: 100px 0;
  }
`;

/**
 * The detail sits in the middle of the corridor and the rocks pass around it.
 *
 * An earlier version put the panel on the left and shoved the whole belt to
 * the right to clear it, which meant every project arrived from the same side
 * and the frame was lopsided. Centring the panel lets the corridor be centred
 * too, so work comes past on either side, above and below.
 *
 * Text over a moving field needs a floor under it. The scrim is a radial fade
 * rather than a panel edge, so the copy stays readable without putting a box
 * back into a section whose whole point was getting rid of boxes.
 */
const StyledStage = styled.div`
  position: sticky;
  top: 0;
  min-height: 100vh; /* Fallback for Edge before 108. */
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100%;
  text-align: center;
  /* Same reasoning as Experience: nothing here can scroll, so the header has
     to be accounted for rather than centred through. */
  padding: calc(var(--nav-height) + 16px) 0 32px;

  &:before {
    content: '';
    position: absolute;
    left: 50%;
    top: 50%;
    width: min(56rem, 78vw);
    height: min(42rem, 88vh);
    transform: translate(-50%, -50%);
    background: radial-gradient(
      ellipse at center,
      rgba(var(--scrim-rgb), 0.92) 0%,
      rgba(var(--scrim-rgb), 0.78) 42%,
      rgba(var(--scrim-rgb), 0) 72%
    );
    pointer-events: none;
  }

  > * {
    position: relative;
    z-index: 1;
  }

  [data-panning='false'] & {
    position: static;
    min-height: 0;
    text-align: left;
    align-items: stretch;
    padding: 0;

    &:before {
      display: none;
    }
  }
`;

const StyledHead = styled.div`
  h2 {
    font-size: clamp(24px, 5vw, var(--fz-heading));
    margin: 0 0 8px;
  }

  .archive-link {
    font-family: var(--font-mono);
    font-size: var(--fz-sm);
    &:after {
      bottom: 0.1em;
    }
  }
`;

/* Each project swaps into the same panel, so the change reads as a change. */
const StyledPanel = styled.div`
  margin-top: 26px;
  min-height: 11rem;
  max-width: 34rem;

  .work-count {
    color: var(--slate);
    font-family: var(--font-mono);
    font-size: var(--fz-xxs);
    margin: 0 0 12px;
  }

  .work-title {
    color: var(--lightest-slate);
    font-size: clamp(21px, 2.4vw, 28px);
    line-height: 1.2;
    margin: 0;

    a {
      ${({ theme }) => theme.mixins.inlineLink};
    }
  }

  .work-body {
    color: var(--light-slate);
    font-size: var(--fz-md);
    line-height: 1.5;
    margin-top: 10px;
    max-width: 46ch;
    margin-left: auto;
    margin-right: auto;
  }

  .work-tech {
    ${({ theme }) => theme.mixins.resetList};
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 4px 16px;
    margin-top: 18px;

    li {
      color: var(--slate);
      font-family: var(--font-mono);
      font-size: var(--fz-xxs);
    }
  }

  .work-links {
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 14px 0 0;
    color: var(--lightest-slate);

    a {
      ${({ theme }) => theme.mixins.flexCenter};
      padding: 8px;

      svg {
        width: 20px;
        height: 20px;
      }
    }
  }
`;

/**
 * A rock's name, anchored to the rock.
 *
 * Positioned by the scene rather than by CSS: the transform is written every
 * frame from the rock's projected position. These are real buttons so the belt
 * can be worked from the keyboard, which a canvas cannot offer.
 */
const StyledLabel = styled.button`
  position: fixed;
  top: 0;
  left: 0;
  z-index: 2;
  padding: 4px 8px;
  border: 0;
  background: transparent;
  color: var(--light-slate);
  font-family: var(--font-mono);
  font-size: var(--fz-xxs);
  text-align: left;
  /* A long title on a rock near the right-hand edge used to run straight off
     the screen. The belt flips the anchor for those — see the label pass in
     asteroids.js — and the cap here is the backstop for a title long enough to
     overflow from either side. */
  max-width: min(20rem, 32vw);
  cursor: pointer;
  pointer-events: auto;
  opacity: 0;
  transform-origin: 0 50%;
  transition: color 0.3s var(--easing);
  will-change: transform, opacity;

  &[data-focused='true'] {
    color: var(--green);
  }

  /* Anchored by its right edge, so the text runs back toward the middle of
     the frame instead of off the side of it. */
  &[data-side='right'] {
    text-align: right;
  }

  &:hover,
  &:focus-visible {
    color: var(--lightest-slate);
  }
`;

const StyledLabelLayer = styled.div`
  position: fixed;
  inset: 0;
  z-index: 2;
  pointer-events: none;

  [data-panning='false'] & {
    display: none;
  }
`;

/** Below the breakpoint there is no belt, so the work is simply a list. */
const StyledList = styled.ol`
  ${({ theme }) => theme.mixins.resetList};
  counter-reset: work;
  margin-top: 30px;

  li {
    padding: 22px 0;

    & + li {
      border-top: 1px solid var(--lightest-navy);
    }
  }
`;

const Work = () => {
  const data = useStaticQuery(graphql`
    query {
      featured: allMarkdownRemark(
        filter: { fileAbsolutePath: { regex: "/content/featured/" } }
        sort: { fields: [frontmatter___date], order: ASC }
      ) {
        edges {
          node {
            frontmatter {
              title
              tech
              github
              external
            }
            html
          }
        }
      }
      projects: allMarkdownRemark(
        filter: {
          fileAbsolutePath: { regex: "/content/projects/" }
          frontmatter: { showInProjects: { ne: false } }
        }
        sort: { fields: [frontmatter___date], order: DESC }
      ) {
        edges {
          node {
            frontmatter {
              title
              category
              tech
              github
              external
            }
            html
          }
        }
      }
    }
  `);
  const featured = data.featured.edges.filter(({ node }) => node);
  const archive = data.projects.edges.filter(({ node }) => node);

  /**
   * One belt, two weights, interleaved.
   *
   * Four featured pieces then seven archive ones would put all the strongest
   * work in the first third of the belt. Dealing them between each other keeps
   * something worth reading wherever the reader stops turning.
   */
  const projects = [];
  const perLead = Math.ceil(archive.length / Math.max(1, featured.length));
  let taken = 0;
  featured.forEach(({ node }, i) => {
    projects.push({ node, featured: true });
    const end = i === featured.length - 1 ? archive.length : taken + perLead;
    archive.slice(taken, end).forEach(({ node: archived }) => {
      projects.push({ node: archived, featured: false });
    });
    taken = end;
  });

  const { ref: activationRef, step } = useSectionActivation('projects', 8);
  const { sectionRef, index, panning } = useBeltFocus(projects.length);
  const headRef = useReveal(step >= 1, 1.3, true);
  const panelRef = useReveal(step >= 2, 0.9, true);

  // The scene builds its rocks from this count, so it has to be known before
  // the canvas mounts rather than after the first render.
  useEffect(() => {
    setBeltCount(projects.length);
    return () => setBeltCount(0);
  }, [projects.length]);

  // Two refs want the same node: one meters the section for the scene, the
  // other sizes and pins it.
  const attachSection = node => {
    activationRef.current = node;
    sectionRef.current = node;
  };

  const active = projects[Math.min(index, projects.length - 1)];
  const { frontmatter, html } = active.node;
  const href = frontmatter.external || frontmatter.github || null;

  const links = node => (
    <div className="work-links">
      {node.frontmatter.github && (
        <a
          href={node.frontmatter.github}
          aria-label={`${node.frontmatter.title} on GitHub`}
          target="_blank"
          rel="noreferrer">
          <Icon name="GitHub" />
        </a>
      )}
      {node.frontmatter.external && (
        <a
          href={node.frontmatter.external}
          aria-label={`${node.frontmatter.title}, live site`}
          target="_blank"
          rel="noreferrer">
          <Icon name="External" />
        </a>
      )}
    </div>
  );

  return (
    <StyledWorkSection id="projects" ref={attachSection} data-panning={panning}>
      <StyledStage>
        <StyledHead ref={headRef}>
          <h2>Selected work</h2>
          <a
            className="inline-link archive-link"
            href={socialMedia.find(social => social.name === 'GitHub')?.url}
            target="_blank"
            rel="noopener noreferrer">
            The full archive is on GitHub
          </a>
        </StyledHead>

        {panning ? (
          <StyledPanel ref={panelRef}>
            <div key={frontmatter.title}>
              {frontmatter.category && <p className="work-count">{frontmatter.category}</p>}

              <h3 className="work-title">
                {href ? (
                  <a href={href} target="_blank" rel="noreferrer">
                    {frontmatter.title}
                  </a>
                ) : (
                  frontmatter.title
                )}
              </h3>

              <p className="work-body">{brief(html)}</p>

              {frontmatter.tech && frontmatter.tech.length > 0 && (
                <ul className="work-tech">
                  {frontmatter.tech.slice(0, 4).map(t => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              )}

              {links(active.node)}
            </div>
          </StyledPanel>
        ) : (
          <StyledList>
            {projects.map(({ node }) => (
              <li key={node.frontmatter.title}>
                <h3 className="work-title">{node.frontmatter.title}</h3>
                <p className="work-body">{brief(node.html)}</p>
                {links(node)}
              </li>
            ))}
          </StyledList>
        )}
      </StyledStage>

      <StyledLabelLayer aria-hidden={!panning}>
        {projects.map((item, i) => (
          <StyledLabel
            key={item.node.frontmatter.title}
            type="button"
            ref={el => registerBeltLabel(i, el)}
            onClick={() => setBeltFocus(i)}
            data-focused={i === index ? 'true' : 'false'}>
            {item.node.frontmatter.title}
          </StyledLabel>
        ))}
      </StyledLabelLayer>
    </StyledWorkSection>
  );
};

export default Work;
