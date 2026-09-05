import React from 'react';
import PropTypes from 'prop-types';
import { useReveal } from '@hooks';

/**
 * Reveals its single child once the owning section has been activated.
 *
 * Clones the child rather than wrapping it in a div, so it can be dropped
 * around a grid or list item without disturbing the layout — and so it works
 * inside a .map(), where a hook cannot be called directly.
 */
const Reveal = ({ active, depth, pinned, children }) => {
  const ref = useReveal(active, depth, pinned);
  return React.cloneElement(React.Children.only(children), { ref });
};

Reveal.propTypes = {
  active: PropTypes.bool,
  depth: PropTypes.number,
  pinned: PropTypes.bool,
  children: PropTypes.element.isRequired,
};

Reveal.defaultProps = {
  active: false,
  depth: 0.8,
  pinned: false,
};

export default Reveal;
