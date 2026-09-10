'use client';
import { useState } from 'react';
import { categories, type Product } from '@/lib/catalog';
export function CatalogEditor({
  product,
  onSaved,
}: {
  product?: Product;
  onSaved: () => Promise<void>;
}) {
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const families = [...new Set(categories.flatMap((c) => c.families))];
  return (
    <details className="catalog-editor">
      <summary>
        {product
          ? 'Toutes les caractéristiques et photos'
          : 'Ajouter une référence au catalogue'}
        <span>+</span>
      </summary>
      <p>
        Renseignez uniquement les informations et photos vérifiées.
        L’enregistrement publie la fiche dans le catalogue, avec le statut «
        Bientôt disponible ».
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget,
            f = new FormData(form);
          setBusy(true);
          setStatus('');
          try {
            const get = (key: string) =>
              (typeof f.get(key) === 'string'
                ? (f.get(key) as string)
                : ''
              ).trim();
            const imageLines = get('images').split('\n').filter(Boolean);
            const name = get('name');
            const specs = Object.fromEntries(
              get('specs')
                .split('\n')
                .filter(Boolean)
                .map((line) => {
                  const i = line.indexOf(':');
                  if (i < 1)
                    throw new Error(
                      'Chaque caractéristique doit suivre : Nom : valeur',
                    );
                  return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
                }),
            );
            const payload = {
              ...product,
              id: get('id'),
              slug: get('slug'),
              name,
              brand: get('brand'),
              category: get('category'),
              price: Math.round(Number(get('price')) * 100),
              short: get('short'),
              description: get('description'),
              audience: get('audience'),
              sourceRef: get('sourceRef'),
              sizes: get('sizes')
                .split(';')
                .map((s) => s.trim())
                .filter(Boolean),
              specs,
              variants: product?.variants?.length ? get('variants').split('\n').filter(Boolean).map(line=>{const [label,price]=line.split('|').map(v=>v.trim());const old=product.variants!.find(v=>v.label===label);if(!old)throw new Error('Conservez le libellé exact de chaque déclinaison tarifée.');return {...old,price:Math.round(Number(price.replace(',','.'))*100)};}) : undefined,
              care: get('care'),
              use: get('use'),
              notes: get('notes').split('\n').filter(Boolean),
              images: imageLines.map((line, i) => ({
                src: line,
                width:product?.images[i]?.width,
                height:product?.images[i]?.height,
                small:
                  product?.images[i]?.src === line
                    ? product.images[i].small
                    : line,
                alt:
                  product?.images[i]?.src === line
                    ? product.images[i].alt
                    : name + (i ? ' — vue ' + (i + 1) : ''),
              })),
            };
            const r = await fetch('/api/admin-catalog', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ product: payload, replace: !!product }),
            });
            const d = (await r.json()) as { error?: string };
            if (!r.ok) throw new Error(d.error);
            setStatus('La fiche est enregistrée.');
            await onSaved();
            if (!product) form.reset();
          } catch (error) {
            setStatus(
              error instanceof Error
                ? error.message
                : 'Enregistrement impossible.',
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        {product?.variants?.length ? <label>Prix de chaque déclinaison (libellé | euros)<textarea name="variants" rows={Math.min(12,product.variants.length)} defaultValue={product.variants.map(v=>v.label+' | '+(v.price/100).toFixed(2)).join('\n')}/><small>Le prix de départ doit être le plus petit tarif ci-dessus. Conservez les libellés exacts.</small></label> : null}
        <div className="admin-fields">
          <label>
            Identifiant interne
            <input
              name="id"
              defaultValue={product?.id}
              readOnly={!!product}
              required
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              placeholder="marque-modele"
            />
          </label>
          <label>
            Adresse de la fiche
            <input
              name="slug"
              defaultValue={product?.slug}
              readOnly={!!product}
              required
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              placeholder="gants-boxe-marque-modele"
            />
          </label>
          <label>
            Référence fabricant
            <input
              name="sourceRef"
              required
              defaultValue={product?.sourceRef}
            />
          </label>
        </div>
        <label>
          Nom complet
          <input
            name="name"
            required
            minLength={3}
            maxLength={180}
            defaultValue={product?.name}
          />
        </label>
        {product?.variants?.length ? <label>Prix de chaque déclinaison (libellé | euros)<textarea name="variants" rows={Math.min(12,product.variants.length)} defaultValue={product.variants.map(v=>v.label+' | '+(v.price/100).toFixed(2)).join('\n')}/><small>Le prix de départ doit être le plus petit tarif ci-dessus. Conservez les libellés exacts.</small></label> : null}
        <div className="admin-fields">
          <label>
            Marque
            <input name="brand" required defaultValue={product?.brand} />
          </label>
          <label>
            Famille
            <select name="category" defaultValue={product?.category}>
              {families.map((f) => (
                <option key={f} value={f}>
                  {categories.find((c) => c.slug === f)?.name ||
                    'Arts martiaux'}
                </option>
              ))}
            </select>
          </label>
          <label>
            Public
            <select
              name="audience"
              defaultValue={product?.audience || 'adulte'}
            >
              {['adulte', 'enfant', 'femme', 'mixte', 'tous'].map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
        </div>
        {product?.variants?.length ? <label>Prix de chaque déclinaison (libellé | euros)<textarea name="variants" rows={Math.min(12,product.variants.length)} defaultValue={product.variants.map(v=>v.label+' | '+(v.price/100).toFixed(2)).join('\n')}/><small>Le prix de départ doit être le plus petit tarif ci-dessus. Conservez les libellés exacts.</small></label> : null}
        <div className="admin-fields">
          <label>
            Prix indicatif (€)
            <input
              name="price"
              required
              type="number"
              min="0"
              max="50000"
              step=".01"
              defaultValue={product ? product.price / 100 : undefined}
            />
          </label>
          <label>
            Déclinaisons séparées par ;
            <input
              name="sizes"
              defaultValue={product?.sizes.join('; ')}
              placeholder="10 oz; 12 oz; 14 oz"
            />
          </label>
        </div>
        <label>
          Description courte / référencement
          <textarea
            name="short"
            required
            minLength={8}
            maxLength={300}
            defaultValue={product?.short}
            rows={2}
          />
        </label>
        <label>
          Description détaillée
          <textarea
            name="description"
            required
            minLength={30}
            maxLength={8000}
            defaultValue={product?.description}
            rows={6}
          />
        </label>
        <label>
          Usage documenté
          <textarea name="use" defaultValue={product?.use} rows={2} />
        </label>
        <label>
          Entretien documenté
          <textarea name="care" defaultValue={product?.care} rows={2} />
        </label>
        <label>
          Caractéristiques — une ligne « Nom : valeur »
          <textarea
            name="specs"
            defaultValue={Object.entries(product?.specs || {})
              .map(([k, v]) => k + ' : ' + v)
              .join('\n')}
            rows={4}
          />
        </label>
        <label>
          Précisions utiles — une par ligne
          <textarea
            name="notes"
            defaultValue={product?.notes.join('\n')}
            rows={2}
          />
        </label>
        <label>
          Photos — une URL HTTPS ou un chemin /products/ par ligne
          <textarea
            name="images"
            required
            defaultValue={product?.images.map((i) => i.src).join('\n')}
            rows={4}
          />
        </label>
        <button className="button button-blue" disabled={busy}>
          {busy ? 'Enregistrement…' : 'Enregistrer la fiche complète ↗'}
        </button>
        <p role="status">{status}</p>
      </form>
      {product && product.id !== 'mat-blade-gold' && (
        <button
          className="text-button"
          onClick={async () => {
            if (
              !window.confirm(
                'Retirer cette fiche du catalogue ? Ses alertes resteront consultables.',
              )
            )
              return;
            const r = await fetch('/api/admin-archive', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: product.id }),
            });
            if (r.ok) {
              setStatus('La fiche est retirée du catalogue.');
              await onSaved();
            } else setStatus('La fiche n’a pas pu être retirée.');
          }}
        >
          Retirer cette fiche du catalogue
        </button>
      )}
    </details>
  );
}
