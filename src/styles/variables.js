import { css } from 'styled-components';

const variables = css`
  :root {
    /* Palette: see src/components/scene/palettes.js — that file is the source
       of truth, and these are the values for DEFAULT_PALETTE, inlined here so a
       normal page load paints the right colours before any JS runs. Preview
       another with ?palette=<key>.

       Variable names are kept from the original navy/green theme so every
       consumer keeps working — read them as roles: --navy = page background,
       --green = accent. The darks sit in a narrow range and carry a faint cast
       rather than being true grey, which is what holds the matte finish. */
    --dark-navy: #04070c;
    --navy: #0a0e14;
    --light-navy: #141b23;
    --lightest-navy: #232d38;
    --navy-shadow: rgba(0, 3, 10, 0.7);
    --dark-slate: #4c5866;
    --slate: #8492a3;
    --light-slate: #a8b5c4;
    --lightest-slate: #ccd7e4;
    --white: #eef4fb;
    --green: #cfe3ff;
    --green-tint: rgba(207, 227, 255, 0.1);
    --pink: #b9c9e0;
    --blue: #9fc0e8;

    /* Consumed by the scene's scrim and matte overlays. */
    --scrim-rgb: 10, 14, 20;
    --matte-lift: 30, 42, 56;
    --matte-deep: 2, 4, 8;

    --font-sans: 'Calibre', 'Inter', 'San Francisco', 'SF Pro Text', -apple-system, system-ui,
      sans-serif;
    --font-mono: 'SF Mono', 'Fira Code', 'Fira Mono', 'Roboto Mono', monospace;

    --fz-xxs: 12px;
    --fz-xs: 13px;
    --fz-sm: 14px;
    --fz-md: 16px;
    --fz-lg: 18px;
    --fz-xl: 20px;
    --fz-xxl: 22px;
    --fz-heading: 32px;

    --border-radius: 4px;
    --nav-height: 72px;
    --nav-scroll-height: 60px;

    --tab-height: 42px;
    --tab-width: 120px;

    --easing: cubic-bezier(0.645, 0.045, 0.355, 1);
    --transition: all 0.25s cubic-bezier(0.645, 0.045, 0.355, 1);

    --hamburger-width: 30px;

    --ham-before: top 0.1s ease-in 0.25s, opacity 0.1s ease-in;
    --ham-before-active: top 0.1s ease-out, opacity 0.1s ease-out 0.12s;
    --ham-after: bottom 0.1s ease-in 0.25s, transform 0.22s cubic-bezier(0.55, 0.055, 0.675, 0.19);
    --ham-after-active: bottom 0.1s ease-out,
      transform 0.22s cubic-bezier(0.215, 0.61, 0.355, 1) 0.12s;
  }
`;

export default variables;
