'use client';

// Le lien « Panier » du header, avec son compteur : présent sur toutes les pages, il ne charge que le
// petit module du panier (components/cart-store.ts), jamais le tunnel de commande.
import { useEffect, useRef } from 'react';
import { ShoppingBag } from 'lucide-react';
import { useCart } from './cart-store';

export function CartLink() {
  const { cart, error } = useCart();
  const count = cart?.items.reduce((total, item) => total + item.quantity, 0);
  const badge = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const onAdded = () => {
      const el = badge.current;
      if (!el) return;
      el.setAttribute('data-bump', 'true');
      const t = setTimeout(() => el.setAttribute('data-bump', 'false'), 500);
      return () => clearTimeout(t);
    };
    window.addEventListener('boutique:cart-added', onAdded);
    return () => window.removeEventListener('boutique:cart-added', onAdded);
  }, []);
  return (
    <a
      className="cart-link"
      href="/panier/"
      aria-label={
        count === undefined
          ? 'Ouvrir le panier'
          : `Panier : ${count} article${count > 1 ? 's' : ''}`
      }
    >
      <ShoppingBag size={19} aria-hidden="true" />
      <span>Panier</span>
      <span ref={badge} className="cart-count" aria-hidden="true" data-bump="false">
        {count ?? (error ? '—' : '…')}
      </span>
    </a>
  );
}
