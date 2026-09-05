import React, { useEffect, useLayoutEffect, useState } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import {
  GALAXY,
  NARROW_BREAKPOINT,
  galaxyArmPoint,
  galaxyToWorld,
  projectToScreen,
} from '@components/scene/portalMetrics';
import Reveal from '@components/reveal';
import { getViewport, onLayoutChange } from '@utils/viewport';
import { usePrefersReducedMotion } from '@hooks';

// useLayoutEffect warns during SSR; there is no viewport to read on the server.
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/* Must match the front the scene runs; see uBuild in sceneCanvas. */
const BUILD_RATE = 1.15;

/**
 * The intro column, as the layout below draws it, plus the widest a label can
 * get. Kept here as numbers because the label placement has to know where the
 * copy is: labels are positioned from world units and so scale with viewport
 * *height*, while the column is in vw and scales with *width*. No fixed set of
 * placements can clear it at every aspect ratio, so the check has to run.
 */
const INTRO = { left: 0.06, width: 0.27, maxWidth: 368 };
const LABEL_MAX_WIDTH = 208; // 13rem
const EDGE_MARGIN = 24;

const introRightEdge = width => width * INTRO.left + Math.min(INTRO.maxWidth, width * INTRO.width);

/**
 * Full-bleed, escaping the padding `main` puts on every section.
 *
 * `100vw` on its own is wrong wherever the browser draws a classic scrollbar —
 * Windows, and so most of Edge — because there `100vw` counts the scrollbar
 * gutter and the stage lands a dozen pixels wider than the page, dragging
 * everything anchored to it half a scrollbar off centre. --scrollbar-width is
 * measured and published by the shared viewport helper, and is 0 wherever
 * scrollbars are overlaid.
 */
const StyledStage = styled.div`
  --bleed: calc(100vw - var(--scrollbar-width, 0px));

  position: sticky;
  top: 0;
  height: 100vh; /* Fallback for Edge before 108. */
  height: 100dvh;
  width: var(--bleed);
  margin-left: calc(50% - var(--bleed) / 2);
  pointer-events: none;

  a,
  button {
    pointer-events: auto;
  }
`;

const StyledHeading = styled.div`
  position: absolute;
  top: 14vh;
  left: 6vw;
`;

/* Sits in the bulge itself, so the brightest part of the disc reads as backlight. */
const StyledCore = styled.div`
  position: absolute;
  transform: translate(-50%, -50%);
  width: max-content;
  text-align: center;
`;

/* The column the disc was shifted right to make room for. */
const StyledIntro = styled.div`
  position: absolute;
  left: 6vw;
  top: 24vh;
  /* Mirrored by INTRO above, which the label placement reads. */
  width: min(23rem, 27vw);

  p {
    color: var(--light-slate);
    font-size: var(--fz-md);
    line-height: 1.55;
    margin: 0 0 16px;

    &:last-child {
      margin-bottom: 0;
    }
  }

  strong {
    color: var(--lightest-slate);
    font-weight: 600;
  }
`;

/**
 * A fact sitting on an arm. The dot is the anchor — it marks the exact point on
 * the spiral the label belongs to — and the label is offset outward from it so
 * the text never sits on top of the arm it is labelling.
 */
const StyledNode = styled.div`
  position: absolute;
  width: max-content;
  max-width: 13rem;
  opacity: 0;
  /* The hidden state's timing is the *exit*: quick, because dispersal is
     something you catch on the way past rather than stop to watch. */
  transition: opacity 0.3s var(--easing), transform 0.3s var(--easing);

  &[data-shown='true'] {
    opacity: 1;
    /* And the shown state's timing is the entrance: slower, to be read. */
    transition: opacity 0.7s var(--easing), transform 0.7s var(--easing);
  }

  .node-label {
    color: var(--lightest-slate);
    font-size: var(--fz-sm);
    line-height: 1.3;
    margin: 0;
  }

  .node-detail {
    color: var(--slate);
    font-family: var(--font-mono);
    font-size: var(--fz-xxs);
    margin: 3px 0 0;
  }

  .node-dot {
    position: absolute;
    top: 0.5em;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background-color: var(--green);
    box-shadow: 0 0 8px 2px var(--green-tint);
  }

  /* Each label leaves the way the arm under it does — outward, away from the
     bulge — so the copy disperses with the galaxy rather than just fading. */
  &[data-side='left'] {
    transform: translate(calc(-100% - 26px), -50%) scale(0.94);
    text-align: right;
    padding-right: 16px;
    .node-dot {
      right: 0;
    }

    &[data-shown='true'] {
      transform: translate(-100%, -50%) scale(1);
    }
  }

  &[data-side='right'] {
    transform: translate(26px, -50%) scale(0.94);
    text-align: left;
    padding-left: 16px;
    .node-dot {
      left: 0;
    }

    &[data-shown='true'] {
      transform: translate(0, -50%) scale(1);
    }
  }
`;

/** Below the breakpoint there is no disc to sit on, so it becomes a list. */
const StyledStack = styled.div`
  .stack-core {
    margin-bottom: 40px;
  }

  .stack-node {
    padding: 12px 0 12px 16px;
    border-left: 1px solid var(--lightest-navy);

    p {
      margin: 0;
    }
    .node-label {
      color: var(--lightest-slate);
      font-size: var(--fz-md);
    }
    .node-detail {
      color: var(--slate);
      font-family: var(--font-mono);
      font-size: var(--fz-xxs);
      margin-top: 4px;
    }
  }
`;

/**
 * Lays a section's facts out along the arms of the galaxy formation.
 *
 * Each node names an arm and a distance along it, and is placed by the same
 * spiral maths the point cloud is built from — so a label is genuinely on its
 * arm rather than approximately near it. They are revealed in radius order, in
 * step with the build front sweeping outward, so the facts arrive as the galaxy
 * that carries them forms.
 *
 * They deliberately do not use the page's shared reveal. That only ever counts
 * up — it cannot un-reveal — and it drifts what it reveals with the cursor,
 * neither of which suits a label anchored to a point cloud that gathers and
 * disperses. A plain CSS transition reverses cleanly and stays put.
 *
 * @param {number} progress 0..1 build progress, the same value handed to the scene.
 * @param {Array} nodes `{ label, detail, arm, t }`.
 */
/**
 * Which way a label's text should read from its dot.
 *
 * Outward from the disc by default, but flipped when that would put the text
 * over the intro column or off the edge of the screen. The dot never moves —
 * it is the thing anchoring the fact to its arm — only the text it carries.
 */
/**
 * Keeps a projected point inside the frame.
 *
 * The arms are laid out in world units, which scale with viewport *height*, so
 * a tall or unusually proportioned window throws the outer nodes past the edge
 * of a screen the maths never consulted. Clamping moves a label a little off
 * its arm, which is much the lesser problem: a fact half off the right edge is
 * simply not readable.
 */
const clampToFrame = ({ x, y }, { width, height }) => ({
  x: Math.min(Math.max(x, LABEL_MAX_WIDTH * 0.25 + EDGE_MARGIN), width - EDGE_MARGIN),
  y: Math.min(Math.max(y, EDGE_MARGIN + 48), height - EDGE_MARGIN - 48),
});

const sideFor = (x, width, centreX) => {
  const preferred = x < centreX ? 'left' : 'right';
  if (preferred === 'left' && x - LABEL_MAX_WIDTH < introRightEdge(width)) {
    return 'right';
  }
  if (preferred === 'right' && x + LABEL_MAX_WIDTH > width - EDGE_MARGIN) {
    return 'left';
  }
  return preferred;
};

const GalaxyField = ({ progress, core, intro, nodes, heading }) => {
  const [viewport, setViewport] = useState(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  // Measured before paint rather than after, so the first frame is already the
  // arrangement this viewport gets. Measuring in an effect renders the stacked
  // fallback first and then swaps, which the reader sees as a jump.
  useIsomorphicLayoutEffect(() => {
    const update = () => setViewport(getViewport());
    update();
    // Layout changes only. Re-placing every label against a phone's live
    // `innerHeight` meant the whole arrangement jumped each time the URL bar
    // moved, which on a narrow screen is every few hundred pixels of scroll.
    return onLayoutChange(update);
  }, []);

  // Ordered by distance out, which is the order the build front reaches them.
  const ordered = [...nodes].sort((a, b) => a.t - b.t);

  // Anchoring copy to a point cloud that gathers and disperses is the motion,
  // not decoration on top of it. With motion turned down there is no cloud to
  // anchor to, so the facts are simply read as a list.
  if (!viewport || prefersReducedMotion || viewport.width < NARROW_BREAKPOINT) {
    return (
      <StyledStack>
        {heading}
        {core && <div className="stack-core">{core}</div>}
        <div className="stack-core">{intro}</div>
        {ordered.map(n => (
          <Reveal key={n.label} active depth={0.7} pinned>
            <div className="stack-node">
              <p className="node-label">{n.label}</p>
              {n.detail && <p className="node-detail">{n.detail}</p>}
            </div>
          </Reveal>
        ))}
      </StyledStack>
    );
  }

  const centre = projectToScreen(galaxyToWorld({ x: 0, z: 0 }));

  const placed = ordered.map(n => {
    const spine = galaxyArmPoint(n.arm, n.t);
    const screen = clampToFrame(projectToScreen(galaxyToWorld(spine)), viewport);
    return {
      ...n,
      screen,
      side: sideFor(screen.x, viewport.width, centre.x),
      // The progress at which the front reaches this node. Inverts the scene's
      // own front exactly, so a label can never appear before the arm carrying
      // it has formed. The front runs rim to centre, so the outermost facts
      // land first and the ones nearest the portrait last.
      at: Math.max(0, (1 - spine.r / GALAXY.outer) / BUILD_RATE),
    };
  });

  return (
    <StyledStage>
      {heading && <StyledHeading>{heading}</StyledHeading>}

      {intro && <StyledIntro>{intro}</StyledIntro>}

      {core && <StyledCore style={{ left: centre.x, top: centre.y }}>{core}</StyledCore>}

      {placed.map(n => (
        <StyledNode
          key={n.label}
          data-side={n.side}
          data-shown={progress >= n.at}
          style={{ left: n.screen.x, top: n.screen.y }}>
          <span className="node-dot" />
          <p className="node-label">{n.label}</p>
          {n.detail && <p className="node-detail">{n.detail}</p>}
        </StyledNode>
      ))}
    </StyledStage>
  );
};

GalaxyField.propTypes = {
  progress: PropTypes.number.isRequired,
  core: PropTypes.node,
  intro: PropTypes.node,
  heading: PropTypes.node,
  nodes: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      detail: PropTypes.string,
      arm: PropTypes.number.isRequired,
      t: PropTypes.number.isRequired,
    }),
  ).isRequired,
};

GalaxyField.defaultProps = { heading: null, intro: null, core: null };

export default GalaxyField;
