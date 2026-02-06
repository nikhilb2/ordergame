import { useEffect, useState } from "react";

const COLORS = [
  "hsl(45 95% 60%)",
  "hsl(210 90% 55%)",
  "hsl(340 80% 65%)",
  "hsl(150 65% 45%)",
  "hsl(25 95% 60%)",
  "hsl(270 70% 60%)",
];

interface Piece {
  id: number;
  x: number;
  color: string;
  delay: number;
  size: number;
}

export const Confetti = ({ show }: { show: boolean }) => {
  const [pieces, setPieces] = useState<Piece[]>([]);

  useEffect(() => {
    if (show) {
      setPieces(
        Array.from({ length: 30 }, (_, i) => ({
          id: i,
          x: Math.random() * 100,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          delay: Math.random() * 0.5,
          size: 8 + Math.random() * 12,
        }))
      );
      const t = setTimeout(() => setPieces([]), 2500);
      return () => clearTimeout(t);
    }
  }, [show]);

  if (!pieces.length) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="absolute top-0 animate-confetti-fall rounded-sm"
          style={{
            left: `${p.x}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
};
