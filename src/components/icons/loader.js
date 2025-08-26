import React from 'react';

const IconLoader = () => (
  <svg id="logo" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <title>Loader Logo</title>
    <g>
      <g id="AY" transform="translate(11.000000, 5.000000)">
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
      <path
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M 50, 5
                  L 11, 27
                  L 11, 72
                  L 50, 95
                  L 89, 73
                  L 89, 28 z"
      />
    </g>
  </svg>
);

export default IconLoader;
