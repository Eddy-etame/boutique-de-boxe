'use client';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Carte de consentement et mesure d’audience maison.
 *
 * Tant que le visiteur n’a pas répondu, rien n’est mesuré. S’il accepte, un
 * cookie d’identifiant (13 mois) et une session (30 min) permettent de suivre
 * page par page où il entre, ce qu’il regarde, ce qu’il ajoute, où il sort.
 * S’il refuse, aucun cookie de mesure n’est posé. Le choix se change depuis
 * le pied de page.
 */
const CONSENT = 'bdb_consent';
const VID = 'bdb_vid';
const SESSION_MS = 30 * 60 * 1000;

const readCookie = (name: string) => (typeof document === 'undefined' ? '' : document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)'))?.[1] || '');
const writeCookie = (name: string, value: string, days: number) => {
  document.cookie = `${name}=${value}; Path=/; Max-Age=${days * 86400}; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
};
const id = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));

const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => { listeners.add(cb); return () => listeners.delete(cb); };
const notify = () => listeners.forEach((cb) => cb());
const snapshot = () => readCookie(CONSENT);

function session() {
  try {
    const raw = sessionStorage.getItem('bdb_sid');
    const now = Date.now();
    if (raw) {
      const [sid, at] = raw.split('|');
      if (now - Number(at) < SESSION_MS) { sessionStorage.setItem('bdb_sid', `${sid}|${now}`); return { sid, first: false }; }
    }
    const sid = id();
    sessionStorage.setItem('bdb_sid', `${sid}|${now}`);
    return { sid, first: true };
  } catch {
    return { sid: id(), first: true };
  }
}

type Payload = { t: string; p: string; r?: string; d?: Record<string, unknown>; sid: string; vid: string };
let queue: Payload[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
function flush(sync = false) {
  if (!queue.length) return;
  const body = JSON.stringify({ events: queue });
  queue = [];
  if (sync && navigator.sendBeacon) navigator.sendBeacon('/api/analytics', new Blob([body], { type: 'application/json' }));
  else void fetch('/api/analytics', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => undefined);
}
// L'atelier et les pages de connexion ne comptent pas : ce sont les visites de l'equipe.
const PRIVATE = /^\/(atelier|connexion|api)(\/|$)/;
function track(t: string, d?: Record<string, unknown>) {
  if (readCookie(CONSENT) !== 'accepted' || PRIVATE.test(location.pathname)) return;
  const vid = readCookie(VID);
  if (!vid) return;
  const { sid, first } = session();
  queue.push({ t, p: location.pathname, r: t === 'view' ? document.referrer : undefined, d: first && t === 'view' ? { ...d, first: true } : d, sid, vid });
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => flush(), 1500);
}

export function ConsentTracker() {
  const consent = useSyncExternalStore(subscribe, snapshot, () => 'pending');
  const [forced, setForced] = useState(false);
  const pathname = usePathname();
  // La carte s’ouvre tant qu’aucun choix n’est fait ('' côté client, 'pending' au rendu serveur), et depuis le pied de page.
  const open = forced || consent === '';

  useEffect(() => {
    const reopen = () => setForced(true);
    window.addEventListener('boutique:cookies', reopen);
    return () => window.removeEventListener('boutique:cookies', reopen);
  }, []);

  // Une page vue à chaque navigation ; à la sortie, le temps passé et la profondeur de lecture.
  useEffect(() => {
    if (consent !== 'accepted') return;
    const start = Date.now();
    let depth = 0;
    const onScroll = () => {
      const h = document.documentElement.scrollHeight - innerHeight;
      if (h > 0) depth = Math.max(depth, Math.min(100, Math.round(((scrollY + innerHeight) / (h + innerHeight)) * 100)));
    };
    onScroll();
    track('view', { w: innerWidth, h: innerHeight, lang: navigator.language });
    const leave = () => { track('leave', { dwell: Date.now() - start, depth }); flush(true); };
    const onHide = () => { if (document.visibilityState === 'hidden') leave(); };
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('pagehide', leave);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      removeEventListener('scroll', onScroll);
      removeEventListener('pagehide', leave);
      document.removeEventListener('visibilitychange', onHide);
      leave();
    };
  }, [consent, pathname]);

  // Ce que le visiteur fait : liens et boutons, ajouts au panier, formulaires, recherches, filtres.
  useEffect(() => {
    if (consent !== 'accepted') return;
    const onClick = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest?.('a, button');
      if (!el) return;
      const label = (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 80);
      const href = el.getAttribute('href') || '';
      if (el.closest('.consent-card')) return;
      track('click', { label, href, kind: el.tagName === 'A' ? 'lien' : 'bouton', zone: el.closest('header') ? 'entête' : el.closest('footer') ? 'pied' : el.closest('.workbench-hero') ? 'hero' : el.closest('.product-card') ? 'carte' : 'page' });
    };
    const onAdded = () => track('add_to_cart', { source: document.activeElement?.closest?.('.product-card') ? 'carte' : 'fiche' });
    const onSubmit = (e: Event) => {
      const form = e.target as HTMLFormElement;
      if (form.classList.contains('alert-form')) track('alert_submit', { product: form.querySelector<HTMLInputElement>('input[name=productId]')?.value || '' });
      else if (form.closest('.contact-form') || form.querySelector('textarea[name=message]')) track('contact_submit');
    };
    let searchTimer: ReturnType<typeof setTimeout> | null = null;
    const onInput = (e: Event) => {
      const input = e.target as HTMLInputElement;
      if (!input.closest('.catalog') || input.type === 'email') return;
      if (searchTimer) clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        const q = input.value.trim();
        if (q.length >= 2) track('search', { q: q.slice(0, 60), results: document.querySelectorAll('.catalog .product-card').length });
      }, 900);
    };
    const onFilter = (e: Event) => {
      const el = (e.target as Element | null)?.closest?.('[data-slot=select-item]');
      if (el) track('filter', { value: (el.textContent || '').trim().slice(0, 40) });
    };
    document.addEventListener('click', onClick, true);
    document.addEventListener('click', onFilter, true);
    document.addEventListener('submit', onSubmit, true);
    document.addEventListener('input', onInput, true);
    window.addEventListener('boutique:cart-added', onAdded);
    return () => {
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('click', onFilter, true);
      document.removeEventListener('submit', onSubmit, true);
      document.removeEventListener('input', onInput, true);
      window.removeEventListener('boutique:cart-added', onAdded);
    };
  }, [consent]);

  const decide = (value: 'accepted' | 'refused') => {
    writeCookie(CONSENT, value, 365);
    if (value === 'accepted') {
      if (!readCookie(VID)) writeCookie(VID, id(), 395);
    } else {
      document.cookie = `${VID}=; Path=/; Max-Age=0`;
      try { sessionStorage.removeItem('bdb_sid'); } catch { /* stockage indisponible */ }
    }
    setForced(false);
    notify();
    if (value === 'accepted') { track('consent', { value }); flush(); }
  };

  if (!open) return null;
  return (
    <aside className="consent-card" role="dialog" aria-labelledby="consent-title" aria-describedby="consent-text">
      <span className="eyebrow">COOKIES ET MESURE</span>
      <h2 id="consent-title">Nous mesurons votre visite.</h2>
      <p id="consent-text">
        Avec votre accord, un cookie nous dit quelles pages vous regardez, ce que vous ajoutez au panier et où vous vous arrêtez. Cela sert à mieux
        présenter le matériel. Rien n’est vendu ni partagé. Vous changez d’avis quand vous voulez, en bas de page.
      </p>
      <div className="consent-actions">
        <button type="button" className="consent-accept" onClick={() => decide('accepted')}>
          J’accepte
        </button>
        <button type="button" className="consent-refuse" onClick={() => decide('refused')}>
          Refuser
        </button>
      </div>
      <a href="/confidentialite/">Comment vos données sont traitées</a>
    </aside>
  );
}

/** Bouton du pied de page : rouvre la carte pour changer d’avis. */
export function CookiesButton() {
  return (
    <button type="button" className="cookies-button" onClick={() => window.dispatchEvent(new Event('boutique:cookies'))}>
      Cookies
    </button>
  );
}
