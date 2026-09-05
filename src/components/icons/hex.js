import React from 'react';
import { AY_STROKES, AY_VIEW_BOX } from './ayMark';

/**
 * The mark's shadow, sitting behind the nav logo.
 *
 * This used to be the filled hexagon the initials sat inside. With the badge
 * dropped it is a second copy of the monogram instead, offset on hover so the
 * mark appears to lift off its own shadow — the same gesture the hexagon gave,
 * now made out of the letters themselves. Dimmed by the nav rather than here,
 * so the colour stays in one place.
 */
const IconHex = () => (
  <svg id="hex" xmlns="http://www.w3.org/2000/svg" role="img" viewBox={AY_VIEW_BOX}>
    <title>Hexagon</title>
    <g stroke="currentColor" strokeLinecap="butt" strokeLinejoin="miter" fill="none">
      {AY_STROKES.map(stroke => (
        <path key={stroke.d} d={stroke.d} strokeWidth={stroke.w} />
      ))}
    </g>
  </svg>
);

export default IconHex;
