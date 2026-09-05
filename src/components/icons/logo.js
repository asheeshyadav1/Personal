import React from 'react';
import { AY_STROKES, AY_VIEW_BOX } from './ayMark';

/**
 * The nav mark: the woven monogram on its own, no badge around it.
 *
 * The hexagon that used to enclose the initials is gone. It came from the
 * template this site started as, and once the letters interlock they are
 * already a closed shape — putting a container around them cost the mark most
 * of its frame and added an outline carrying no meaning.
 */
const IconLogo = () => (
  <svg id="logo" xmlns="http://www.w3.org/2000/svg" role="img" viewBox={AY_VIEW_BOX}>
    <title>Logo</title>
    <g stroke="currentColor" strokeLinecap="butt" strokeLinejoin="miter" fill="none">
      {AY_STROKES.map(stroke => (
        <path key={stroke.d} d={stroke.d} strokeWidth={stroke.w} />
      ))}
    </g>
  </svg>
);

export default IconLogo;
