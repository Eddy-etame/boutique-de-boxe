'use client';

// Les boutons d’ajout au panier (fiche, carte de liste, sac de séance) : sans le tunnel de commande.
// Un modèle « sur devis » (estLourd) ne s’ajoute jamais au panier : il mène à la demande de devis.
import { useId, useState } from 'react';
import { ArrowUpRight, Check, Plus } from 'lucide-react';
import { devisHref, estLourd, money, shop, type Product } from '@/lib/catalog';
import { mutateCart, readCart, type ApiFailure } from './cart-store';

export type AddToCartLabels = { add?: string; adding?: string; choose?: string; note?: string; check?: string };
export function AddToCart({
  product,
  variant = '',
  labels = {},
}: {
  product: Product;
  variant?: string;
  labels?: AddToCartLabels;
}) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const helpId = useId();
  const valid = product.sizes.length
    ? product.sizes.includes(variant)
    : variant === '';

  // Matériel lourd : sur devis, une seule chose à dire et un seul chemin, jamais le panier.
  if (estLourd(product))
    return (
      <div className="add-to-cart">
        <a className="button button-dark cart-devis" href={devisHref}>
          Demander le devis de livraison <ArrowUpRight size={19} aria-hidden="true" />
        </a>
        <p className="commerce-caption">Sur devis : écrivez-nous avec le modèle et votre code postal.</p>
      </div>
    );

  async function add() {
    if (!valid || busy) return;
    setBusy(true);
    setStatus('');
    setError('');
    try {
      await mutateCart({
        action: 'add',
        productId: product.id,
        variant,
        quantity: 1,
      });
      setStatus(
        `${product.name}${variant ? ` · ${variant}` : ''} ajouté au panier.`,
      );
      window.dispatchEvent(new Event('boutique:cart-added'));
    } catch (e) {
      const failure = e as ApiFailure;
      setError(
        failure.uncertain
          ? 'L’ajout n’a pas pu être confirmé. Vérifiez votre panier avant d’ajouter à nouveau ce modèle.'
          : failure.message || 'Ajout impossible.',
      );
      if (failure.uncertain || failure.status === 409)
        void readCart().catch(() => undefined);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="add-to-cart">
      <button
        type="button"
        className="button button-dark cart-add"
        disabled={busy || !valid}
        onClick={add}
        aria-describedby={helpId}
      >
        {busy ? (labels.adding ?? 'Ajout en cours…') : (labels.add ?? 'Ajouter au panier')}
        <Plus size={19} aria-hidden="true" />
      </button>
      <p id={helpId} className="commerce-caption">
        {!valid
          ? (labels.choose ?? 'Choisissez une taille pour ajouter ce modèle.')
          : (labels.note ?? (shop.ventesOuvertes ? 'Paiement par carte au moment de commander.' : 'Dans vos choix : rien n’est payé, on vous prévient à l’ouverture.'))}
      </p>
      {error && (
        <p role="alert" className="commerce-error">
          {error} <a href="/panier/">{labels.check ?? 'Vérifier le panier'}</a>
        </p>
      )}
      <div className="cart-added" role="status" aria-live="polite">
        {status && (
          <>
            <p>
              <Check size={16} aria-hidden="true" /> {status}
            </p>
            <a href="/panier/">
              Préparer mon panier <ArrowUpRight size={16} aria-hidden="true" />
            </a>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Le sac de séance part au panier en un geste : une taille par modèle quand il y en a
 * plusieurs, puis un seul bouton pour tout ce qui manque encore.
 */
export function PackAdd({
  items: all,
}: {
  items: { product: Product; label: string }[];
}) {
  // Un modèle sur devis ne part jamais au panier, même dans un sac complet.
  const items = all.filter(({ product }) => !estLourd(product));
  const [variants, setVariants] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const groupId = useId();
  const variantOf = (product: Product) =>
    product.sizes.length > 1
      ? variants[product.id] || ''
      : (product.sizes[0] ?? '');
  const missing = items.filter(
    ({ product }) => product.sizes.length > 1 && !variants[product.id],
  );
  const total = items.reduce((sum, { product }) => sum + product.price, 0);
  const count = (n: number) => `${n} modèle${n > 1 ? 's' : ''} ajouté${n > 1 ? 's' : ''}`;

  async function addAll() {
    if (busy || missing.length) return;
    setBusy(true);
    setStatus('');
    setError('');
    let added = 0;
    try {
      // L’un après l’autre : le panier garde une révision, deux ajouts simultanés se marcheraient dessus.
      for (const { product } of items) {
        await mutateCart({
          action: 'add',
          productId: product.id,
          variant: variantOf(product),
          quantity: 1,
        });
        added += 1;
        window.dispatchEvent(new Event('boutique:cart-added'));
      }
      setStatus(count(added) + ' au panier.');
    } catch (e) {
      const failure = e as ApiFailure;
      setError(
        (added ? count(added) + ', puis un arrêt : ' : '') +
          (failure.uncertain
            ? 'l’ajout n’a pas pu être confirmé. Vérifiez votre panier avant de recommencer.'
            : failure.message || 'ajout impossible.'),
      );
      if (failure.uncertain || failure.status === 409)
        void readCart().catch(() => undefined);
    } finally {
      setBusy(false);
    }
  }

  if (!items.length) return null;
  return (
    <div className="pack-add" role="group" aria-labelledby={groupId}>
      <p id={groupId} className="pack-add-title">
        Tout le sac, en une fois
      </p>
      <div className="pack-add-sizes">
        {items.map(({ product, label }) =>
          product.sizes.length > 1 ? (
            <label key={product.id}>
              <span>{label}</span>
              <select
                value={variants[product.id] || ''}
                onChange={(e) =>
                  setVariants((v) => ({ ...v, [product.id]: e.target.value }))
                }
              >
                <option value="">Taille…</option>
                {product.sizes.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <span key={product.id} className="pack-add-fixed">
              <span>{label}</span>
              <b>{product.sizes[0] || 'Taille unique'}</b>
            </span>
          ),
        )}
      </div>
      <button
        type="button"
        className="button button-blue pack-add-button"
        onClick={addAll}
        disabled={busy || missing.length > 0}
        aria-describedby={missing.length ? groupId + '-help' : undefined}
      >
        {busy
          ? 'Ajout en cours…'
          : 'Ajouter ' +
            (items.length > 1 ? 'les ' + items.length + ' modèles' : 'ce modèle') +
            ' au panier · ' +
            money(total)}
      </button>
      {missing.length > 0 && (
        <p id={groupId + '-help'} className="pack-add-help">
          Choisissez une taille pour :{' '}
          {missing.map(({ label }) => label.toLowerCase()).join(', ')}.
        </p>
      )}
      <p role="status" className="form-status">
        {status}
        {status && (
          <>
            {' '}
            <a href="/panier/">Voir le panier</a>
          </>
        )}
      </p>
      {error && (
        <p role="alert" className="form-status">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Ajout rapide depuis une carte : un modèle sans taille part au panier en un
 * geste ; un modèle à tailles ouvre le choix sur place, puis part au panier.
 */
export function QuickAdd({ product }: { product: Product }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState('');
  const [done, setDone] = useState('');
  const [error, setError] = useState('');
  const sizes = product.sizes;
  const oneSize = sizes.length <= 1;

  async function add(variant: string) {
    if (busy) return;
    setBusy(variant || '·');
    setError('');
    try {
      await mutateCart({ action: 'add', productId: product.id, variant, quantity: 1 });
      setDone(variant || '·');
      setOpen(false);
      window.dispatchEvent(new Event('boutique:cart-added'));
      setTimeout(() => setDone(''), 2200);
    } catch (e) {
      setError((e as ApiFailure).message || 'Ajout impossible.');
    } finally {
      setBusy('');
    }
  }

  // Sur devis : pas de « + », le chemin vers la demande de devis.
  if (estLourd(product))
    return (
      <a className="quick-devis" href={devisHref} aria-label={`${product.name} : livraison sur devis, demander le devis`}>
        Sur devis
      </a>
    );

  return (
    <div className={'quick-add' + (open ? ' is-open' : '')} role="group" aria-label="Ajout rapide au panier">
      <button
        type="button"
        className="quick-add-button"
        onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
        aria-label={oneSize ? `Ajouter ${product.name} au panier` : `Choisir une taille et ajouter ${product.name} au panier`}
        aria-expanded={oneSize ? undefined : open}
        disabled={Boolean(busy)}
        onClick={() => (oneSize ? add(sizes[0] || '') : setOpen((o) => !o))}
      >
        {done ? <Check size={18} aria-hidden="true" /> : <Plus size={18} aria-hidden="true" />}
      </button>
      {!oneSize && open && (
        <div className="quick-add-sizes" role="group" aria-label={`Tailles de ${product.name}`}>
          <span>Taille</span>
          {sizes.map((s) => (
            <button key={s} type="button" disabled={Boolean(busy)} onClick={() => add(s)} onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}>
              {busy === s ? '…' : s.split(',')[0]}
            </button>
          ))}
        </div>
      )}
      <span className="quick-add-status" role="status" aria-live="polite">
        {done ? 'Ajouté au panier' : error}
      </span>
    </div>
  );
}
