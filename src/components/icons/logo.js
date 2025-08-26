import React from 'react';

const IconLogo = () => (
  <svg id="logo" xmlns="http://www.w3.org/2000/svg" role="img" viewBox="0 0 84 96">
    <title>Logo</title>
    <g transform="translate(-8.000000, -2.000000)">
      <g transform="translate(11.000000, 5.000000)">
        <polygon
          id="Shape"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points="39 0 0 22 0 67 39 90 78 68 78 23"
        />
        {/* Letter A */}
        <g
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none">
          {/* Left leg of A */}
          <path d="M17 61 L26 30.3" />
          {/* Right leg of A */}
          <path d="M26 30.3 L35 61" />
          {/* Crossbar of A */}
          <path d="M22 46.5 L30 46.5" />
        </g>
        {/* Letter Y */}
        <path
          d="M41 30.3 L45.5 30.3 L50 42 L54.5 30.3 L59 30.3 L52.5 47 L52.5 61 L47.5 61 L47.5 47 L41 30.3 Z"
          fill="currentColor"
        />
      </g>
    </g>
  </svg>
);

export default IconLogo;
