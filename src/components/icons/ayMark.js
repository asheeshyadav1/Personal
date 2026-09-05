/**
 * The AY monogram, in one place.
 *
 * An A and a Y sharing one axis, woven: the A's left leg passes over the Y's
 * left arm, the Y's right arm passes back over the A's right leg, and the Y's
 * stem passes over the A's crossbar. Alternating the crossings is what makes
 * the mark read as two letters locked together instead of one busy glyph.
 *
 * The weave is cut into the geometry rather than painted. Each strand that
 * goes *under* is stored as two segments with a gap where the other strand
 * crosses, sized to that strand's width plus clearance on both sides. Painting
 * it instead — drawing the under-strand whole and hiding the crossing behind a
 * background-coloured casing — needs to know what colour the background is,
 * and this mark is drawn on three different grounds: the nav, the loader's
 * canvas raster, and a favicon plate. A gap needs to know nothing. It also
 * makes draw order irrelevant, which is what lets the loader rasterise these
 * same paths into a single-colour mask and still show the weave.
 *
 * Coordinates are a 100-unit field: apex at (50,8), feet on y=92, the Y's arms
 * opening from y=20 to a junction at (50,58). The crossings land at
 * (34.18,42.97) and (65.82,42.97).
 *
 * This is the display cut. The favicon is a second, heavier cut of the same
 * construction — thicker strokes and wider gaps, drawn by hand into
 * src/images/AY.png — because at sixteen pixels these gaps close up and the
 * weave turns into a smudge. Same mark, sized for its job.
 */

/* The mitred apex runs 13.3 units past the point itself, so the box the mark
   actually occupies starts above y=0. Both are exported because SVG needs the
   viewBox and the loader needs the true bounds to scale against. */
export const AY_VIEW_BOX = '5 -7 90 103';

export const AY_BOUNDS = { x: 6.56, y: -5.34, w: 86.89, h: 99.61 };

/**
 * Butt caps and mitre joins throughout: a flat terminal is what gives the
 * strands their cut-metal ends, and a round cap would fill the weave gaps back
 * in at small sizes.
 */
export const AY_STROKES = [
  // A: left leg, up through the apex, then back down into the right leg,
  // stopping where the Y's arm crosses over it.
  { w: 11, d: 'M12 92 L50 8 L62.68 36.02' },
  // A: the right leg resumes below that crossing.
  { w: 11, d: 'M68.96 49.92 L88 92' },
  // A: crossbar, broken either side of the Y's stem.
  { w: 11, d: 'M21.95 70 L42.8 70' },
  { w: 11, d: 'M57.2 70 L78.05 70' },
  // Y: left arm, stopping where the A's leg crosses over it.
  { w: 10, d: 'M10 20 L28.27 37.36' },
  // Y: the arm resumes, runs through the junction and straight out into the
  // right arm, which stays whole because it wins its crossing.
  { w: 10, d: 'M40.09 48.59 L50 58 L90 20' },
  // Y: stem, whole, so the letter reads as a Y and not a V.
  { w: 10, d: 'M50 58 L50 92' },
];
export default AY_STROKES;
