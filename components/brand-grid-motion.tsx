'use client';
import { useEffect } from 'react';

/**
 * Les tuiles de marque suivent le pointeur : les trois modèles se décalent à des vitesses différentes
 * (parallaxe), la tuile survolée s'ouvre en éventail. Rien ne bouge au doigt ni en mouvement réduit.
 */
export function BrandGridMotion() {
  useEffect(() => {
    const grid = document.querySelector<HTMLElement>('.brand-grid');
    if (!grid || window.matchMedia('(hover: none)').matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let frame = 0;
    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      const tile = (e.target as HTMLElement).closest<HTMLElement>('.brand-tile');
      if (!tile) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = tile.getBoundingClientRect();
        tile.style.setProperty('--mx', (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
        tile.style.setProperty('--my', (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
      });
    };
    const leave = (e: PointerEvent) => {
      const tile = (e.target as HTMLElement).closest<HTMLElement>('.brand-tile');
      if (!tile) return;
      tile.style.removeProperty('--mx');
      tile.style.removeProperty('--my');
    };
    grid.addEventListener('pointermove', move);
    grid.addEventListener('pointerout', leave);
    return () => {
      cancelAnimationFrame(frame);
      grid.removeEventListener('pointermove', move);
      grid.removeEventListener('pointerout', leave);
    };
  }, []);
  return null;
}
