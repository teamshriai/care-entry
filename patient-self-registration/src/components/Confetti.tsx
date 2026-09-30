import { useMemo } from 'react';
import './Confetti.css';

const COLORS = ['#f3d78d', '#1f1d1a', '#c99a33', '#b9a894', '#faeecd'];

export function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.3,
        duration: 1.1 + Math.random() * 0.6,
        color: COLORS[i % COLORS.length],
        rotate: Math.random() * 360,
        drift: (Math.random() - 0.5) * 80,
      })),
    []
  );

  return (
    <div className="confetti-wrap" aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            // @ts-expect-error custom property
            '--drift': `${p.drift}px`,
            transform: `rotate(${p.rotate}deg)`,
          }}
        />
      ))}
    </div>
  );
}
