'use client';
import { useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { money, cleanName, type Product } from '@/lib/catalog';
export function EquipmentCompare({ items }: { items: Product[] }) {
  const [left, setLeft] = useState(
    items.find((p) => p.id === 'mat-blade-gold')?.id || items[0]?.id,
  );
  const [right, setRight] = useState(
    items.find((p) => p.id === 'mat-ergo90-14')?.id || items[1]?.id,
  );
  const pair = [
    items.find((p) => p.id === left),
    items.find((p) => p.id === right),
  ].filter(Boolean) as Product[];
  if (pair.length < 2) return null;
  const value = (p: Product, match: RegExp) =>
    Object.entries(p.specs).find(([k]) => match.test(k))?.[1] ||
    'Non précisé dans la fiche';
  const rows = [
    {
      label: 'Poids présentés',
      values: pair.map((p) => p.sizes.join(' / ') || 'À confirmer'),
    },
    {
      label: 'Enveloppe',
      values: pair.map((p) => value(p, /matière|revêtement|extérieur/i)),
    },
    { label: 'Fermeture', values: pair.map((p) => value(p, /fermeture/i)) },
    {
      label: 'Rembourrage',
      values: pair.map((p) => value(p, /rembourrage|mousse/i)),
    },
    { label: 'Prix prévu', values: pair.map((p) => money(p.price)) },
  ];
  return (
    <section className="comparison-section section-pad" id="comparer">
      <header className="editorial-heading">
        <div>
          <span className="eyebrow">COMPARER DEUX GANTS</span>
          <h2>
            Deux gants,
            <br />
            <em>côte à côte.</em>
          </h2>
        </div>
        <p>
          Choisissez deux modèles : poids, matière, fermeture et prix
          s’alignent ligne par ligne.
        </p>
      </header>
      <div className="comparison-table">
        <div className="comparison-intro">
          <span className="tiny-label">GANTS DE BOXE ADULTE</span>
          <p>Changez un modèle pour voir ce qui change.</p>
          <a className="inline-link" href="/guides/choisir-gants-boxe/">
            Comment choisir ↗
          </a>
        </div>
        {pair.map((p, i) => (
          <div className="comparison-product" key={i}>
            <label>
              <span>{i === 0 ? 'Première paire' : 'Deuxième paire'}</span>
              <Select
                value={p.id}
                onValueChange={(v) => (i === 0 ? setLeft : setRight)(String(v))}
              >
                <SelectTrigger
                  aria-label={
                    i === 0
                      ? 'Première paire à comparer'
                      : 'Deuxième paire à comparer'
                  }
                >
                  <SelectValue>{cleanName(p)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {items.map((p) => (
                    <SelectItem value={p.id} key={p.id}>
                      {cleanName(p)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <a href={'/produits/' + p.slug + '/'}>
              <img
                src={p.images[0].small}
                width={480}
                height={480}
                alt={p.images[0].alt}
                loading="lazy"
              />
              <span>
                Voir la fiche <ArrowUpRight size={16} />
              </span>
            </a>
          </div>
        ))}
        {rows.map((r) => (
          <div
            className={
              'comparison-row ' +
              (r.values[0] !== r.values[1] ? 'is-different' : '')
            }
            key={r.label}
          >
            <h3>{r.label}</h3>
            {r.values.map((v, i) => (
              <p key={i}>{v}</p>
            ))}
          </div>
        ))}
      </div>
      <p className="comparison-footnote">
        Une ligne en couleur : les deux gants diffèrent sur ce point. Le poids
        se choisit selon votre entraînement.
      </p>
    </section>
  );
}
