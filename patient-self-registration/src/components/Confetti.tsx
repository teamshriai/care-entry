import { useState } from 'react';
import type { CSSProperties } from 'react';

// One short burst in the design system's own hues, then still — nothing
// loops (DESIGN_SYSTEM §11.3), and reduced motion skips it entirely.
const COLORS = ['var(--color-primary-500)', 'var(--color-tile-teal)', 'var(--color-tile-amber)', 'var(--color-tile-violet)', 'var(--color-chart-2)'];

interface Piece {
  id: number;
  left: number;
  delay: number;
  duration: number;
  color: string;
  rotate: number;
  drift: number;
}

function makePieces(): Piece[] {
  return Array.from({ length: 24 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.3,
    duration: 1.1 + Math.random() * 0.6,
    color: COLORS[i % COLORS.length],
    rotate: Math.random() * 360,
    drift: (Math.random() - 0.5) * 80,
  }));
}

export function Confetti() {
  // Computed once per mount (a lazy initialiser), never during re-renders.
  const [pieces] = useState(makePieces);

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 h-72 overflow-hidden motion-reduce:hidden" aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="absolute top-0 block h-3 w-2 rounded-[2px] opacity-0 motion-safe:animate-[confetti-fall_var(--dur)_var(--ease-smooth)_var(--delay)_both]"
          style={
            {
              left: `${p.left}%`,
              background: p.color,
              rotate: `${p.rotate}deg`,
              '--drift': `${p.drift}px`,
              '--dur': `${p.duration}s`,
              '--delay': `${p.delay}s`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
