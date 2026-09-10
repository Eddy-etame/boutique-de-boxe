'use client';
import { useState } from 'react';
import type { Product } from '@/lib/catalog';
import { variantPrice, money } from '@/lib/catalog';
import { AddToCart } from '@/components/commerce-ui';
import { productCopy as t } from '@/lib/next/copy/product';
import { commerceCopy as c } from '@/lib/next/copy/commerce';

/** Tailles en mots, puis ajout au sac : le prix suit la taille choisie. */
export function Buy({ product }: { product: Product }) {
  const [variant, setVariant] = useState('');
  const sizes = product.sizes;
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {sizes.length > 0 && (
        <div role="group" aria-label={t.sizes} className="ne-options">
          {sizes.map((s) => (
            <button
              key={s}
              type="button"
              className="ne-chip"
              aria-pressed={variant === s}
              onClick={() => setVariant(variant === s ? '' : s)}
            >
              {s}
              {variantPrice(product, s) !== product.price && (
                <span className="ne-muted" style={{ marginLeft: 8 }}>{money(variantPrice(product, s))}</span>
              )}
            </button>
          ))}
        </div>
      )}
      <AddToCart
        product={product}
        variant={variant}
        labels={{ add: t.addToBag, adding: t.added, choose: t.chooseSize, note: c.bag.checkout.hint, check: c.bag.title }}
      />
    </div>
  );
}
