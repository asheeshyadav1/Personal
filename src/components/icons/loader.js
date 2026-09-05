import React from 'react';

/**
 * The loader mark, for readers whose browser gives us no 2D canvas.
 *
 * Just the initials — the canvas resolves into the same thing. There is no
 * badge shape around them, so the viewBox is cropped to the letters and they
 * fill whatever box this is given.
 */
const IconLoader = () => (
  <svg id="logo" xmlns="http://www.w3.org/2000/svg" viewBox="16 29 50 39">
    <title>Loader Logo</title>
    {/* Letter A */}
    <g
      stroke="currentColor"
      strokeWidth="6.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none">
      <path d="M20 64 L29 33.3" />
      <path d="M29 33.3 L38 64" />
      <path d="M25 49.5 L33 49.5" />
    </g>
    {/* Letter Y, filled and stroked so its weight matches the A */}
    <path
      d="M44 33.3 L48.5 33.3 L53 45 L57.5 33.3 L62 33.3 L55.5 50 L55.5 64 L50.5 64 L50.5 50 Z"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="3.4"
      strokeLinejoin="round"
    />
  </svg>
);

export default IconLoader;
