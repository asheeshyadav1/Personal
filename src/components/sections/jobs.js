import React, { useState, useEffect } from 'react';
import { useStaticQuery, graphql } from 'gatsby';
import styled, { keyframes } from 'styled-components';
import { useSectionActivation, useReveal } from '@hooks';
import { setFormationVariant } from '@components/scene/sceneStore';

/** Beats of scroll spent on each role before the next one takes the panel. */
const STEPS_PER_JOB = 5;

const StyledJobsSection = styled.section`
  position: relative;
  z-index: 1;
  max-width: none;
  /* Enough scroll for each role to hold the panel, plus a lead-in. */
  min-height: 300vh;

  @media (max-width: 1080px) {
    max-width: 700px;
    margin: 0 auto;
    padding: 100px 0;
    min-height: 0;
  }
`;

/**
 * Pins to the viewport while the section scrolls past, so the rail and the
 * panel stay put and only their *contents* change as you move through the
 * roles — the reader tracks one panel instead of chasing four.
 */
const StyledStage = styled.div`
  position: sticky;
  top: 0;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  /* Leaves the right of the screen to the scene's ring. */
  width: min(52rem, 54vw);

  @media (max-width: 1080px) {
    position: static;
    min-height: 0;
    width: 100%;
  }
`;

/**
 * The roles as stations on a single horizontal run, oldest at the left. The
 * filled portion of the line doubles as the section's own progress bar.
 */
const StyledTrack = styled.ol`
  position: relative;
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
  gap: 0;
  list-style: none;
  margin: 34px 0 46px;
  padding: 0;

  /* The run itself, behind the stations. */
  &:before,
  .track-fill {
    content: '';
    position: absolute;
    top: 5px;
    left: 0;
    height: 1px;
  }

  /* Stops on the last station rather than trailing past it. */
  &:before {
    width: var(--line-end);
    background-color: var(--lightest-navy);
  }

  .track-fill {
    width: var(--fill);
    background-color: var(--green);
    transition: width 0.6s var(--easing);
  }

  li button {
    position: relative;
    display: block;
    width: 100%;
    padding: 20px 12px 0 0;
    background: transparent;
    border: 0;
    text-align: left;
    cursor: pointer;

    /* The station marker sitting on the run. */
    &:before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 11px;
      height: 11px;
      border-radius: 50%;
      border: 1px solid var(--dark-slate);
      background-color: var(--navy);
      transition: var(--transition);
    }
  }

  .station-company {
    color: var(--slate);
    font-size: var(--fz-sm);
    margin: 0;
    transition: var(--transition);
  }

  .station-year {
    color: var(--dark-slate);
    font-family: var(--font-mono);
    font-size: var(--fz-xxs);
    margin: 3px 0 0;
  }

  li button:hover .station-company,
  li button:focus-visible .station-company {
    color: var(--light-slate);
  }

  li[aria-current='true'] button {
    &:before {
      background-color: var(--green);
      border-color: var(--green);
      box-shadow: 0 0 0 5px var(--green-tint);
    }
    .station-company {
      color: var(--green);
    }
  }

  @media (max-width: 1080px) {
    grid-auto-flow: row;
    grid-auto-columns: auto;

    &:before {
      top: 0;
      left: 5px;
      width: 1px;
      height: var(--line-end);
    }
    .track-fill {
      top: 0;
      left: 5px;
      width: 1px;
      height: var(--fill);
      transition: height 0.6s var(--easing);
    }

    li button {
      padding: 12px 0 12px 26px;
      &:before {
        top: 14px;
      }
    }
  }
`;

/* Each role swaps in place, so the change is legible as a change. */
const enter = keyframes`
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: none; }
`;

const StyledPanel = styled.div`
  .role-title {
    color: var(--lightest-slate);
    font-size: clamp(20px, 2vw, 25px);
    line-height: 1.25;
    margin: 0;

    .company {
      color: var(--green);
    }
  }

  .role-meta {
    color: var(--slate);
    font-family: var(--font-mono);
    font-size: var(--fz-xs);
    margin: 8px 0 0;
  }

  /* Keyed on the active role so the animation replays on every swap. */
  .role-body {
    animation: ${enter} 0.5s var(--easing) both;
  }
`;

/**
 * The numbers first. This is what a reader actually scans for, and it is the
 * part a wall of bullets buries.
 */
const StyledMetrics = styled.dl`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1px;
  margin: 28px 0;
  padding: 0;
  background-color: var(--lightest-navy);
  border: 1px solid var(--lightest-navy);

  > div {
    padding: 16px 18px;
    background-color: var(--navy);
  }

  dt {
    color: var(--white);
    font-family: var(--font-mono);
    font-size: clamp(19px, 1.9vw, 24px);
    line-height: 1.1;
  }

  dd {
    color: var(--slate);
    font-size: var(--fz-xs);
    line-height: 1.35;
    margin: 7px 0 0;
  }

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

/* Short, one-line-each highlights — the detail lives on the résumé. */
const StyledHighlights = styled.div`
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  li {
    position: relative;
    padding-left: 22px;
    margin-bottom: 11px;
    color: var(--light-slate);
    font-size: var(--fz-sm);
    line-height: 1.45;

    &:before {
      content: '';
      position: absolute;
      left: 0;
      top: 0.62em;
      width: 8px;
      height: 1px;
      background-color: var(--dark-slate);
    }

    strong {
      color: var(--lightest-slate);
      font-weight: 600;
    }
  }
`;

const StyledStack = styled.ul`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  list-style: none;
  margin: 26px 0 0;
  padding: 0;

  li {
    padding: 4px 10px;
    border: 1px solid var(--lightest-navy);
    border-radius: var(--border-radius);
    color: var(--slate);
    font-family: var(--font-mono);
    font-size: var(--fz-xxs);
  }
`;

const Jobs = () => {
  const data = useStaticQuery(graphql`
    query {
      jobs: allMarkdownRemark(
        filter: { fileAbsolutePath: { regex: "/content/jobs/" } }
        sort: { fields: [frontmatter___date], order: DESC }
      ) {
        edges {
          node {
            frontmatter {
              title
              company
              short
              location
              range
              url
              stack
              metrics {
                value
                label
              }
            }
            html
          }
        }
      }
    }
  `);

  // Oldest first, so the rail reads left-to-right as a career, not a résumé.
  const jobsData = [...data.jobs.edges].reverse();
  const { ref: sectionRef, step } = useSectionActivation(
    'jobs',
    jobsData.length * STEPS_PER_JOB + 2,
  );
  const headingRef = useReveal(step >= 1, 1.2, true);
  const panelRef = useReveal(step >= 2, 0.9, true);

  // Scroll walks along the rail; clicking a station jumps straight to one.
  const [pinnedIndex, setPinnedIndex] = useState(null);
  const scrolledIndex = Math.min(
    jobsData.length - 1,
    Math.max(0, Math.floor((step - 2) / STEPS_PER_JOB)),
  );
  const activeIndex = pinnedIndex === null ? scrolledIndex : pinnedIndex;

  // A manual pick holds until the reader scrolls to a different role.
  useEffect(() => {
    if (pinnedIndex !== null && scrolledIndex !== pinnedIndex) {
      setPinnedIndex(null);
    }
  }, [scrolledIndex]);

  // How far along the roles we are, which picks the scene's constellation. A
  // fraction rather than an index so the run of figures always spans the roles,
  // however many of them there turn out to be.
  useEffect(
    () => setFormationVariant((activeIndex + 1) / jobsData.length),
    [activeIndex, jobsData.length],
  );

  const { frontmatter, html } = jobsData[activeIndex].node;
  const metrics = frontmatter.metrics || [];
  const stack = frontmatter.stack || [];

  // Stations sit at the start of their column, so the run ends on the last one
  // and the fill ends on the active one.
  const columns = jobsData.length;
  const lineEnd = `${((columns - 1) / columns) * 100}%`;
  const fill = `${(activeIndex / columns) * 100}%`;

  return (
    <StyledJobsSection id="jobs" ref={sectionRef}>
      <StyledStage>
        <h2 className="numbered-heading" ref={headingRef}>
          Experience
        </h2>

        <StyledTrack style={{ '--line-end': lineEnd }}>
          <span className="track-fill" style={{ '--fill': fill }} aria-hidden="true" />
          {jobsData.map(({ node }, i) => (
            <li key={node.frontmatter.company} aria-current={activeIndex === i}>
              <button type="button" onClick={() => setPinnedIndex(i)}>
                <p className="station-company">
                  {node.frontmatter.short || node.frontmatter.company}
                </p>
                <p className="station-year">{node.frontmatter.range}</p>
              </button>
            </li>
          ))}
        </StyledTrack>

        <StyledPanel ref={panelRef}>
          <div className="role-body" key={activeIndex}>
            <h3 className="role-title">
              {frontmatter.title}
              <span className="company">
                {' '}
                @{' '}
                <a href={frontmatter.url} className="inline-link" target="_blank" rel="noreferrer">
                  {frontmatter.company}
                </a>
              </span>
            </h3>
            <p className="role-meta">
              {frontmatter.range} · {frontmatter.location}
            </p>

            {metrics.length > 0 && (
              <StyledMetrics>
                {metrics.map(m => (
                  <div key={m.label}>
                    <dt>{m.value}</dt>
                    <dd>{m.label}</dd>
                  </div>
                ))}
              </StyledMetrics>
            )}

            <StyledHighlights dangerouslySetInnerHTML={{ __html: html }} />

            {stack.length > 0 && (
              <StyledStack>
                {stack.map(s => (
                  <li key={s}>{s}</li>
                ))}
              </StyledStack>
            )}
          </div>
        </StyledPanel>
      </StyledStage>
    </StyledJobsSection>
  );
};

export default Jobs;
