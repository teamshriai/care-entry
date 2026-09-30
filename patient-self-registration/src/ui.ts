import type { MouseEvent } from 'react';

/**
 * Tracks the cursor inside an element so CSS can render a spotlight at --mx/--my,
 * plus a subtle magnetic tilt at --rx/--ry (used by .choice-card on hover).
 */
export function trackSpotlight(e: MouseEvent<HTMLElement>) {
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  const x = e.clientX - r.left;
  const y = e.clientY - r.top;
  el.style.setProperty('--mx', `${x}px`);
  el.style.setProperty('--my', `${y}px`);

  const px = x / r.width - 0.5;
  const py = y / r.height - 0.5;
  el.style.setProperty('--rx', `${(px * 5).toFixed(2)}deg`);
  el.style.setProperty('--ry', `${(-py * 5).toFixed(2)}deg`);
}
