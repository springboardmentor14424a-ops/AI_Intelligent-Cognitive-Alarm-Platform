import { useEffect, useRef, useState } from "react";

/**
 * Animates a numeric value from 0 to `end` over `duration` ms.
 * Respects prefers-reduced-motion by snapping instantly.
 */
export function useCountUp(end, duration = 1200) {
  const [value, setValue] = useState(0);
  const frame = useRef(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      setValue(end);
      return;
    }

    const start = performance.now();
    const from = 0;

    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(from + (end - from) * eased));
      if (progress < 1) {
        frame.current = requestAnimationFrame(tick);
      }
    }

    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [end, duration]);

  return value;
}
