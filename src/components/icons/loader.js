import React from 'react';
import { AY_STROKES, AY_VIEW_BOX } from './ayMark';

/**
 * The loader mark, for readers whose browser gives us no 2D canvas.
 *
 * The same monogram the canvas resolves into, drawn plainly. It is cropped to
 * the letters, so it fills whatever box the loader gives it.
 */
const IconLoader = () => (
  <svg id="logo" xmlns="http://www.w3.org/2000/svg" viewBox={AY_VIEW_BOX}>
    <title>Loader Logo</title>
    <g stroke="currentColor" strokeLinecap="butt" strokeLinejoin="miter" fill="none">
      {AY_STROKES.map(stroke => (
        <path key={stroke.d} d={stroke.d} strokeWidth={stroke.w} />
      ))}
    </g>
  </svg>
);

export default IconLoader;
