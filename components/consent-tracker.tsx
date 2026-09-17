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

const readCookie = (name: string) =>
  typeof document === 'undefined'
    ? ''
    : document.cookie.match(
        new RegExp('(?:^|;\\s*)' + name + '=([^;]+)'),
      )?.[1] || '';
const writeCookie = (name: string, value: string, days: number) => {
  document.cookie = `${name}=${value}; Path=/; Max-Age=${days * 86400}; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
};
const id = () =>
  crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
const notify = () => listeners.forEach((cb) => cb());
const snapshot = () => {
  const value = readCookie(CONSENT);
  return value === 'accepted' || value === 'refused' ? value : '';
};

function session() {
  try {
    const raw = sessionStorage.getItem('bdb_sid');
    const now = Date.now();
    if (raw) {
      const [sid, at] = raw.split('|');
      if (now - Number(at) < SESSION_MS) {
        sessionStorage.setItem('bdb_sid', `${sid}|${now}`);
        return { sid, first: false };
      }
    }
    const sid = id();
    sessionStorage.setItem('bdb_sid', `${sid}|${now}`);
    return { sid, first: true };
  } catch {
    return { sid: id(), first: true };
  }
}

type Payload = {
  t: string;
  p: string;
  r?: string;
  d?: Record<string, unknown>;
  sid: string;
  vid: string;
};
let queue: Payload[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
// Le serveur a dit « trop de demandes » : on se tait dix minutes au lieu d’insister.
let mutedUntil = 0;
function flush(sync = false) {
  if (!queue.length) return;
  if (Date.now() < mutedUntil) {
    queue = [];
    return;
  }
  const body = JSON.stringify({ events: queue });
  queue = [];
  if (sync && navigator.sendBeacon)
    navigator.sendBeacon(
      '/api/analytics',
      new Blob([body], { type: 'application/json' }),
    );
  else
    void fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    })
      .then((r) => {
        if (r.status === 429) mutedUntil = Date.now() + 600000;
      })
      .catch(() => undefined);
}
// L'atelier et les pages de connexion ne comptent pas : ce sont les visites de l'equipe.
const PRIVATE = /^\/(atelier|connexion|api)(\/|$)/;
function track(t: string, d?: Record<string, unknown>) {
  if (readCookie(CONSENT) !== 'accepted' || PRIVATE.test(location.pathname))
    return;
  const vid = readCookie(VID);
  if (!vid) return;
  const { sid, first } = session();
  queue.push({
    t,
    p: location.pathname,
    r: t === 'view' ? document.referrer : undefined,
    d: first && t === 'view' ? { ...d, first: true } : d,
    sid,
    vid,
  });
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => flush(), 1500);
}

export function ConsentTracker() {
  const consent = useSyncExternalStore(subscribe, snapshot, () => 'pending');
  const [forced, setForced] = useState(false);
  const pathname = usePathname();
  // La carte s’ouvre tant qu’aucun choix n’est fait : rendue dès le serveur ('pending'), cachée par le CSS
  // quand html[data-consent-open] manque (choix déjà fait), et rouverte depuis le pied de page.
  const open = forced || consent === '' || consent === 'pending';

  // Tant que la carte est ouverte, la barre d’achat des fiches reste rentrée (html[data-consent-open]).
  useEffect(() => {
    // Le vrai cookie, pas l’instantané d’hydratation : un visiteur ayant déjà choisi ne voit jamais le voile.
    document.documentElement.toggleAttribute(
      'data-consent-open',
      forced || snapshot() === '',
    );
    return () => document.documentElement.removeAttribute('data-consent-open');
  }, [open, forced]);

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
      if (h > 0)
        depth = Math.max(
          depth,
          Math.min(
            100,
            Math.round(((scrollY + innerHeight) / (h + innerHeight)) * 100),
          ),
        );
    };
    onScroll();
    track('view', { w: innerWidth, h: innerHeight, lang: navigator.language });
    // Un départ par absence réelle, pas un par changement d’onglet : dix allers-retours en une minute
    // envoyaient dix « départs » pour une seule page vue et faussaient les durées de l’atelier.
    let lastLeave = 0;
    const leave = (minGap = 3000) => {
      const now = Date.now();
      if (lastLeave && now - lastLeave < minGap) return;
      lastLeave = now;
      track('leave', { dwell: now - start, depth });
      flush(true);
    };
    const onHide = () => {
      if (document.visibilityState === 'hidden') leave(30000);
    };
    const onPageHide = () => leave();
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('pagehide', onPageHide);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      removeEventListener('scroll', onScroll);
      removeEventListener('pagehide', onPageHide);
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
      const label = (el.getAttribute('aria-label') || el.textContent || '')
        .trim()
        .slice(0, 80);
      const href = el.getAttribute('href') || '';
      if (el.closest('.consent-card')) return;
      track('click', {
        label,
        href,
        kind: el.tagName === 'A' ? 'lien' : 'bouton',
        zone: el.closest('header')
          ? 'entête'
          : el.closest('footer')
            ? 'pied'
            : el.closest('.workbench-hero')
              ? 'hero'
              : el.closest('.product-card')
                ? 'carte'
                : 'page',
      });
    };
    const onAdded = () =>
      track('add_to_cart', {
        source: document.activeElement?.closest?.('.product-card')
          ? 'carte'
          : 'fiche',
      });
    const onSubmit = (e: Event) => {
      const form = e.target as HTMLFormElement;
      if (form.classList.contains('alert-form'))
        track('alert_submit', {
          product:
            form.querySelector<HTMLInputElement>('input[name=productId]')
              ?.value || '',
        });
      else if (
        form.closest('.contact-form') ||
        form.querySelector('textarea[name=message]')
      )
        track('contact_submit');
    };
    let searchTimer: ReturnType<typeof setTimeout> | null = null;
    const onInput = (e: Event) => {
      const input = e.target as HTMLInputElement;
      if (!input.closest('.catalog') || input.type === 'email') return;
      if (searchTimer) clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        const q = input.value.trim();
        if (q.length >= 2)
          track('search', {
            q: q.slice(0, 60),
            results: document.querySelectorAll('.catalog .product-card').length,
          });
      }, 900);
    };
    const onFilter = (e: Event) => {
      const el = (e.target as Element | null)?.closest?.(
        '[data-slot=select-item]',
      );
      if (el)
        track('filter', { value: (el.textContent || '').trim().slice(0, 40) });
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

  // La carte prend le focus à l’ouverture ; la page derrière est floutée et ne défile pas.
  useEffect(() => {
    if (!open || (snapshot() && !forced)) return;
    const previous = document.activeElement as HTMLElement | null;
    const veil = document.querySelector('.consent-veil');
    const background = Array.from(document.body.children).filter(
      (el): el is HTMLElement =>
        el instanceof HTMLElement &&
        el !== veil &&
        !['SCRIPT', 'STYLE', 'LINK'].includes(el.tagName),
    );
    const inertBefore = background.map((el) => el.inert);
    background.forEach((el) => {
      el.inert = true;
    });
    document
      .querySelector<HTMLButtonElement>('.consent-accept')
      ?.focus({ preventScroll: true });
    const keep = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusables = Array.from(
        document.querySelectorAll<HTMLElement>(
          '.consent-card button, .consent-card a',
        ),
      );
      if (!focusables.length) return;
      const first = focusables[0],
        last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', keep);
    return () => {
      document.removeEventListener('keydown', keep);
      background.forEach((el, index) => {
        el.inert = inertBefore[index];
      });
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [open, forced]);

  const decide = (value: 'accepted' | 'refused') => {
    writeCookie(CONSENT, value, 365);
    if (value === 'accepted') {
      if (!readCookie(VID)) writeCookie(VID, id(), 395);
    } else {
      document.cookie = `${VID}=; Path=/; Max-Age=0`;
      try {
        sessionStorage.removeItem('bdb_sid');
      } catch {
        /* stockage indisponible */
      }
    }
    setForced(false);
    notify();
    if (value === 'accepted') {
      track('consent', { value });
      flush();
    }
    // Le voile tombe, puis la page rejoue son entrée : le visiteur ne découvre jamais une page immobile.
    window.setTimeout(
      () => window.dispatchEvent(new Event('boutique:replay-entry')),
      60,
    );
  };

  if (!open) return null;
  return (
    <div className="consent-veil">
      <aside
        className="consent-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="consent-title"
        aria-describedby="consent-text"
      >
        <span className="eyebrow">COOKIES ET MESURE D’AUDIENCE</span>
        <h2 id="consent-title">Avant d’entrer.</h2>
        <p id="consent-text">
          Avec votre accord, un cookie nous dit quelles pages vous regardez, ce
          que vous ajoutez au panier et où vous vous arrêtez. Cela sert à mieux
          présenter le matériel. Rien n’est vendu ni partagé. Vous changez
          d’avis quand vous voulez, en bas de page.
        </p>
        <button
          type="button"
          className="consent-accept"
          onClick={() => decide('accepted')}
        >
          J’accepte et j’entre
        </button>
        <div className="consent-actions">
          <button
            type="button"
            className="consent-refuse"
            onClick={() => decide('refused')}
          >
            Continuer sans mesure
          </button>
          <a href="/confidentialite/">Comment vos données sont traitées</a>
        </div>
      </aside>
    </div>
  );
}

/** Bouton du pied de page : rouvre la carte pour changer d’avis. */
export function CookiesButton() {
  return (
    <button
      type="button"
      className="cookies-button"
      onClick={() => window.dispatchEvent(new Event('boutique:cookies'))}
    >
      Cookies
    </button>
  );
}
