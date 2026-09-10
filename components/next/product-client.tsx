'use client';
import { useState } from 'react';
import { parseSession, useSessionRaw, writeSession } from '@/lib/next/store';
import type { Product } from '@/lib/catalog';

export function ProductMedia({ images, name, missing }: { images: Product['images']; name: string; missing: string }) {
  const [view, setView] = useState(0);
  const current = images[view] ?? images[0];
  if (!current) return <p className="ne-muted">{missing}</p>;
  return (
    <div className="ne-pdp-media">
      <img
        src={current.src}
        alt={current.alt || name}
        width={current.width || 960}
        height={current.height || 960}
        fetchPriority="high"
        style={{ viewTransitionName: 'hero-object' } as React.CSSProperties}
      />
      {images.length > 1 && (
        <div className="ne-pdp-thumbs" role="group" aria-label={name}>
          {images.map((img, i) => (
            <button key={img.src} type="button" aria-pressed={view === i} onClick={() => setView(i)} aria-label={`${name} ${i + 1}`}>
              <img src={img.small} alt="" width={72} height={72} loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** La case « à vérifier avec votre salle » suit dans le sac de séance. */
export function VerifyBox({ id, label }: { id: string; label: string }) {
  const raw = useSessionRaw();
  const session = parseSession(raw);
  const verify: string[] = Array.isArray(session.verify) ? (session.verify as string[]) : [];
  const checked = verify.includes(id);
  return (
    <label className="ne-check">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) =>
          writeSession({
            ...session,
            verify: e.target.checked ? [...new Set([...verify, id])] : verify.filter((v) => v !== id),
          })
        }
      />
      {label}
    </label>
  );
}
