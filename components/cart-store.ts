// Le panier dans le navigateur : une seule file d’attente par onglet, partagée par le lien du header,
// les boutons d’ajout et la page panier. Module à part (19/10/2026) : le header le charge sur chaque
// page sans emporter le tunnel de commande (components/commerce-ui.tsx).
// lib/commerce est serveur : seuls ses types s’importent ici.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Cart } from '@/lib/commerce';

export const CART_EVENT = 'boutique:cart-changed';
export const CART_BUSY_EVENT = 'boutique:cart-busy';
export const API = '/api/commerce/';

export type ApiFailure = Error & { status?: number; uncertain?: boolean; restart?: boolean };

export async function request<T>(
  action: string,
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(action.startsWith('/') ? action : `${API}${action}`, {
      method: body === undefined ? 'GET' : 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers:
        body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: signal ?? AbortSignal.timeout(25_000),
    });
  } catch {
    throw Object.assign(
      new Error(
        'La réponse n’a pas pu être confirmée. Vos informations sont conservées.',
      ),
      { uncertain: body !== undefined },
    ) as ApiFailure;
  }
  const data = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null;
  if (!response.ok || data === null) {
    throw Object.assign(
      new Error(data?.error || 'Le service est momentanément indisponible.'),
      {
        status: response.status,
        // Le serveur demande une nouvelle tentative (création PayPlug morte) : nouvelle clé, même commande.
        restart: (data as { restart?: unknown } | null)?.restart === true,
        uncertain:
          body !== undefined &&
          (response.status >= 500 || response.status === 408 || response.ok),
      },
    ) as ApiFailure;
  }
  return data;
}

// One browser-tab queue avoids overlapping read/modify/write requests from several
// product buttons. Every published count comes from the server response.
let cachedCart: Cart | null = null;
let pendingRead: Promise<Cart> | null = null;
let mutationQueue: Promise<unknown> = Promise.resolve();
let cartRevision = 0;
let cartBusy = 0;

function publishCart(cart: Cart) {
  cachedCart = cart;
  window.dispatchEvent(new CustomEvent<Cart>(CART_EVENT, { detail: cart }));
}

export async function readCart(): Promise<Cart> {
  if (pendingRead) return pendingRead;
  const revision = cartRevision;
  pendingRead = request<Cart>('cart')
    .then((cart) => {
      // A GET begun before a mutation may not overwrite its newer response.
      if (revision === cartRevision) publishCart(cart);
      return revision === cartRevision ? cart : (cachedCart ?? cart);
    })
    .finally(() => {
      pendingRead = null;
    });
  return pendingRead;
}

export function mutateCart(body: unknown): Promise<Cart> {
  cartBusy++;
  window.dispatchEvent(
    new CustomEvent<number>(CART_BUSY_EVENT, { detail: cartBusy }),
  );
  const operation = mutationQueue
    .catch(() => undefined)
    .then(async () => {
      cartRevision++;
      const cart = await request<Cart>('cart', body);
      publishCart(cart);
      return cart;
    });
  mutationQueue = operation;
  return operation.finally(() => {
    cartBusy--;
    window.dispatchEvent(
      new CustomEvent<number>(CART_BUSY_EVENT, { detail: cartBusy }),
    );
  });
}

export function useCart() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const mounted = useRef(false);
  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const value = await readCart();
      if (mounted.current) setCart(value);
    } catch (e) {
      if (mounted.current)
        setError(e instanceof Error ? e.message : 'Panier indisponible.');
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    const changed = (event: Event) => {
      setCart((event as CustomEvent<Cart>).detail);
      setError('');
      setLoading(false);
    };
    const busyChanged = (event: Event) =>
      setBusy((event as CustomEvent<number>).detail > 0);
    window.addEventListener(CART_EVENT, changed);
    window.addEventListener(CART_BUSY_EVENT, busyChanged);
    void readCart()
      .then((value) => {
        if (mounted.current) setCart(value);
      })
      .catch((e) => {
        if (mounted.current)
          setError(e instanceof Error ? e.message : 'Panier indisponible.');
      })
      .finally(() => {
        if (mounted.current) setLoading(false);
      });
    return () => {
      mounted.current = false;
      window.removeEventListener(CART_EVENT, changed);
      window.removeEventListener(CART_BUSY_EVENT, busyChanged);
    };
  }, [refresh]);
  return { cart, error, loading, busy, refresh };
}
