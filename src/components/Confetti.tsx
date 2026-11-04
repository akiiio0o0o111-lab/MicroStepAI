import { useEffect, useRef } from 'react';

interface Piece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vrot: number;
  color: string;
  size: number;
}

const COLORS = ['#4f46e5', '#e0e7ff', '#10b981', '#f59e0b', '#ec4899', '#06b6d4'];

export function Confetti({ trigger }: { trigger: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const piecesRef = useRef<Piece[]>([]);
  const rafRef = useRef<number | null>(null);
  const triggerRef = useRef(trigger);

  useEffect(() => {
    if (trigger === triggerRef.current && trigger === 0) return;
    triggerRef.current = trigger;
    if (trigger === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = (canvas.width = window.innerWidth);
    const H = (canvas.height = window.innerHeight);

    const newPieces: Piece[] = [];
    const count = trigger > 9000 ? 140 : 60; // big burst for completion
    for (let i = 0; i < count; i++) {
      newPieces.push({
        x: W / 2 + (Math.random() - 0.5) * 200,
        y: H / 3 + (Math.random() - 0.5) * 100,
        vx: (Math.random() - 0.5) * 10,
        vy: Math.random() * -12 - 4,
        rot: Math.random() * Math.PI,
        vrot: (Math.random() - 0.5) * 0.3,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: Math.random() * 8 + 5,
      });
    }
    piecesRef.current = newPieces;

    const animate = () => {
      ctx.clearRect(0, 0, W, H);
      const pieces = piecesRef.current;
      for (let i = pieces.length - 1; i >= 0; i--) {
        const p = pieces[i];
        p.vy += 0.35;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vrot;
        if (p.y > H + 20) {
          pieces.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      }
      if (pieces.length > 0) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, W, H);
        rafRef.current = null;
      }
    };
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [trigger]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-50"
      aria-hidden
    />
  );
}
