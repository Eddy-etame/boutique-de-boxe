'use client';
import { useEffect, useState } from 'react';

/**
 * Le sac de séance : un seul objet qui suit sur toutes les pages.
 * Il compte les pièces gardées dans la sélection de séance et les articles du panier.
 */
export function bagCount(): number {
  let count = 0;
  try {
    const session = JSON.parse(sessionStorage.getItem('boutique-session') || '{}');
    if (Array.isArray(session.kept)) count += session.kept.length;
  } catch {}
  try {
    const cart = JSON.parse(localStorage.getItem('boutique-cart-count') || '0');
    if (typeof cart === 'number') count += cart;
  } catch {}
  return count;
}

export function BagLink({ label }: { label: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const update = () => setCount(bagCount());
    update();
    window.addEventListener('boutique:session', update);
    window.addEventListener('boutique:cart', update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener('boutique:session', update);
      window.removeEventListener('boutique:cart', update);
      window.removeEventListener('storage', update);
    };
  }, []);
  return (
    <a className="ne-bag" href="/panier/" aria-label={`${label}${count ? ` : ${count}` : ''}`}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M6 8h12l1 12H5L6 8Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M9 8V6a3 3 0 0 1 6 0v2" stroke="currentColor" strokeWidth="2" />
      </svg>
      {label}
      {count > 0 && <b aria-hidden="true">{count}</b>}
    </a>
  );
}
