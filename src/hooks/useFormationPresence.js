import { useEffect, useState } from 'react';
import { setFormationProgress, setFormationDispersing } from '@components/scene/sceneStore';
import { useMotionPreference } from './usePrefersReducedMotion';

/**
 * Drives a formation's assembly from where its sticky stage sits in its own
 * scroll range.
 *
 * The value runs to 1 while the stage holds the viewport and back to 0 as it
 * begins to leave, so the formation gathers as the reader arrives and comes
 * apart as they go — every time, and the same in both directions.
 *
 * Measured against the section's own rect rather than the scene's active
 * section. The scene picks whichever section is nearest the viewport centre,
 * which for a stage this tall only changes hands long after the stage itself
 * has scrolled out of the frame — the formation would still be sitting there
 * fully built while the reader was most of the way into the next section.
 *
 * Coming together and flying apart are given different durations, and different
 * paths — see uDisperse in the glow shader. Assembly is a thing to watch;
 * dispersal is a thing to catch out of the corner of your eye on the way past.
 *
 * The eased value is a pure function of the raw one, so a reader who reverses
 * mid-animation gets a smooth turn rather than a jump.
 *
 * @param {object} ref the section element, whose height is the scroll range.
 * @param {number} enter milliseconds to assemble.
 * @param {number} exit milliseconds to disperse.
 * @param {number} from stage position at which it starts gathering, as a
 *   fraction of the pinned range — negative is before the stage has pinned.
 * @param {number} until position at which it starts coming apart, early enough
 *   that it has finished by the time the stage unpins.
 * @param {number} buckets how finely the returned value is quantised.
 */
const useFormationPresence = (
  ref,
  { enter = 2000, exit = 900, from = -0.15, until = 0.68, buckets = 24 } = {},
) => {
  const [progress, setProgress] = useState(0);
  const { prefersReducedMotion, resolved } = useMotionPreference();

  useEffect(() => {
    // This writes to the scene's shared state, so it must not act on the
    // motion preference before that preference has actually been read. The
    // reduced-motion branch below parks the formation at fully-assembled, and
    // running it on the pre-resolution assumption left the galaxy holding the
    // frame from the very first paint: the hero's ring saw a formation already
    // in possession of the scene and correctly stood down, so the page opened
    // on About's galaxy instead of the portal.
    if (!resolved) {
      return undefined;
    }

    if (prefersReducedMotion) {
      setProgress(1);
      setFormationProgress(1);
      return undefined;
    }

    const el = ref.current;
    if (!el) {
      return undefined;
    }

    let frameId = null;
    let last = null;
    let raw = 0;
    let target = 0;

    // The store is shared, and this hook is now the thing that owns it. State
    // it up from scratch rather than inheriting whatever was last written.
    setFormationProgress(0);
    setFormationDispersing(0);

    /** Where the stage sits in its pinned range: 0 as it pins, 1 as it lets go. */
    const stagePosition = () => {
      const rect = el.getBoundingClientRect();
      const travel = Math.max(rect.height - window.innerHeight, 1);
      return -rect.top / travel;
    };

    const loop = now => {
      // Clamped: returning to a backgrounded tab must not jump the animation.
      const dt = last === null ? 16 : Math.min(now - last, 50);
      last = now;

      const rate = dt / (target > raw ? enter : exit);
      raw = target > raw ? Math.min(target, raw + rate) : Math.max(target, raw - rate);

      const eased = raw * raw * (3 - 2 * raw);
      setFormationProgress(eased);
      setProgress(current =>
        Math.round(current * buckets) === Math.round(eased * buckets)
          ? current
          : Math.round(eased * buckets) / buckets,
      );

      // Park the loop once settled; the next scroll wakes it again.
      if (raw === target) {
        frameId = null;
        last = null;
        return;
      }
      frameId = requestAnimationFrame(loop);
    };

    const wake = () => {
      if (frameId === null) {
        frameId = requestAnimationFrame(loop);
      }
    };

    const retarget = () => {
      const at = stagePosition();
      const next = at >= from && at <= until ? 1 : 0;
      if (next !== target) {
        target = next;
        setFormationDispersing(target === 1 ? 0 : 1);
        wake();
      }
    };

    let pending = null;
    const onScroll = () => {
      if (pending === null) {
        pending = requestAnimationFrame(() => {
          pending = null;
          retarget();
        });
      }
    };

    retarget();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (pending !== null) {
        cancelAnimationFrame(pending);
      }
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
      }
    };
  }, [ref, enter, exit, from, until, buckets, prefersReducedMotion, resolved]);

  return progress;
};

export default useFormationPresence;
