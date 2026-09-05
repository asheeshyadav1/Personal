module.exports = {
  email: 'aky7@sfu.ca',

  socialMedia: [
    {
      name: 'GitHub',
      url: 'https://github.com/asheeshyadav1',
    },
    {
      name: 'Linkedin',
      url: 'https://www.linkedin.com/in/asheesh-yadav-907491234/',
    },
  ],

  navLinks: [
    {
      name: 'About',
      url: '/#about',
    },
    {
      name: 'Experience',
      url: '/#jobs',
    },
    {
      name: 'Work',
      url: '/#projects',
    },
    {
      name: 'Contact',
      url: '/#contact',
    },
  ],

  /* Kept in step with src/styles/variables.js, which is the source of truth
     for the running page. These are the few places a colour is needed outside
     CSS: the web app manifest, and Gatsby's traced-SVG image placeholders. */
  colors: {
    green: '#cfe3ff',
    navy: '#0a0e14',
    darkNavy: '#04070c',
  },

  srConfig: (delay = 200, viewFactor = 0.25) => ({
    origin: 'bottom',
    distance: '20px',
    duration: 500,
    delay,
    rotate: { x: 0, y: 0, z: 0 },
    opacity: 0,
    scale: 1,
    easing: 'cubic-bezier(0.645, 0.045, 0.355, 1)',
    mobile: true,
    reset: false,
    useDelay: 'always',
    viewFactor,
    viewOffset: { top: 0, right: 0, bottom: 0, left: 0 },
  }),
};
