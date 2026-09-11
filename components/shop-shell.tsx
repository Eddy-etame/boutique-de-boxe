'use client';
import { usePathname } from 'next/navigation';
import { QUERY_MAP } from '@/lib/seo-copy';
import { CookiesButton } from './consent-tracker';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { ArrowUpRight, Search, Menu, ArrowRight, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { categories, shop, jsonLd } from '@/lib/catalog';
import { CartLink } from './commerce-ui';
export function Brand() {
  return (
    <a href="/" className="brand" aria-label="Boutique de Boxe, accueil">
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path d="M4 4h27v10H14v20h20V17h10v27H4z" fill="currentColor" />
        <path d="M35 4h9v9h-9z" fill="var(--blue)" />
      </svg>
      <span>
        BOUTIQUE<span>DE BOXE.</span>
      </span>
    </a>
  );
}
export function Header() {
  const [menu, setMenu] = useState(false);
  return (
    <>
      <div className="launch-strip">
        <span className="status-dot" />
        OUVERTURE DES VENTES BIENTÔT · COMMANDE D’ESSAI SANS PAIEMENT
        <a href="/offres-de-lancement/">
          En savoir plus <ArrowUpRight size={13} />
        </a>
      </div>
      <header className="site-header">
        <Brand />
        <nav aria-label="Navigation principale" className="desktop-nav">
          <a href="/materiel-boxe/">Boxe anglaise</a>
          <a href="/materiel-mma/">MMA</a>
          <a href="/boutique-arts-martiaux/">Arts martiaux</a>
          <a href="/guides/" onClick={() => setMenu(false)}>
            Les guides <ArrowUpRight size={13} />
          </a>
        </nav>
        <div className="header-actions"><CartLink />
          <a
            className="icon-button"
            href="/recherche/"
            aria-label="Rechercher un équipement"
          >
            <Search size={21} />
          </a>
          <Dialog open={menu} onOpenChange={setMenu}>
            <DialogTrigger
              className="icon-button menu-trigger"
              aria-label="Ouvrir le menu"
            >
              <Menu size={23} />
            </DialogTrigger>
            <DialogContent className="mobile-menu" showCloseButton={false}>
              <DialogTitle>Le menu</DialogTitle>
              <DialogDescription>
                Matériel, disciplines et guides.
              </DialogDescription>
              <button
                className="icon-button menu-close"
                onClick={() => setMenu(false)}
                aria-label="Fermer le menu"
              >
                <X />
              </button>
              <nav aria-label="Menu mobile">
                {categories.slice(6, 9).map((c) => (
                  <a
                    key={c.slug}
                    href={`/${c.slug}/`}
                    onClick={() => setMenu(false)}
                  >
                    {c.name}
                    <ArrowUpRight />
                  </a>
                ))}
                {categories.slice(0, 6).map((c) => (
                  <a
                    key={c.slug}
                    href={`/${c.slug}/`}
                    onClick={() => setMenu(false)}
                  >
                    {c.name}
                    <ArrowUpRight />
                  </a>
                ))}
                <a href="/guides/" onClick={() => setMenu(false)}>
                  Les guides <ArrowUpRight />
                </a>
                <a href="/contact/" onClick={() => setMenu(false)}>
                  Contact <ArrowUpRight />
                </a>
              </nav>
            </DialogContent>
          </Dialog>
        </div>
      </header>
    </>
  );
}
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-top">
        <div>
          <span className="eyebrow">BOUTIQUE DE BOXE</span>
          <p>
            LIVRAISON DANS
            <br />
            <em>TOUTE LA FRANCE.</em>
          </p>
        </div>
        <a
          className="round-link"
          href="/materiel-sport-de-combat/"
          aria-label="Explorer tout le matériel"
        >
          <ArrowUpRight size={42} />
        </a>
      </div>
      <div className="footer-grid">
        <div>
          <Brand />
          <p className="footer-blurb">
            Gants, protections, textile et sacs pour la boxe, le MMA et les
            sports de combat. Livraison dans toute la France à l’ouverture des
            ventes.
          </p>
        </div>
        <div>
          <h2>Le catalogue</h2>
          {categories.slice(0, 6).map((c) => (
            <a key={c.slug} href={`/${c.slug}/`}>
              {c.name}
            </a>
          ))}
          <a href="/nouveautes/">Nouveautés</a>
        </div>
        <div>
          <h2>Dans votre coin</h2>
          <a href="/guides/">Guides d’achat</a>
          <a href="/guide-des-tailles/">Guide des tailles</a>
          <a href="/#preparer">Préparer ma séance</a>
          <a href="/livraison/">Livraison</a>
          <a href="/retours/">Retours</a>
          <a href="/contact/">Contact</a>
          <a href="/offres-de-lancement/">Ouverture de la boutique</a>
        </div>
        <div>
          <h2>La boutique</h2>
          <a href="/materiel-boxe/">Boxe anglaise</a>
          <a href="/materiel-mma/">Matériel MMA</a>
          <a href="/boutique-arts-martiaux/">Arts martiaux</a>
          <a href="/materiel-sport-de-combat/">Sports de combat</a>
          <a href="mailto:boxingcenter31@gmail.com" className="email-link">
            Nous écrire <ArrowUpRight size={14} />
          </a>
        </div>
      </div>
      {/* Recherches fréquentes : les requêtes du brief, en toutes lettres, vers leur page, sur chaque page du site. */}
      <nav className="footer-queries" aria-label="Recherches fréquentes">
        <span>Recherches fréquentes</span>
        {QUERY_MAP.map((q) => (
          <a key={q.query} href={q.path}>
            {q.query}
          </a>
        ))}
      </nav>
      <div className="footer-bottom">
        <MotionControl />
        <span>© {new Date().getFullYear()} Boutique de Boxe</span>
        <nav aria-label="Informations légales">
          <a href="/mentions-legales/">Mentions légales</a>
          <a href="/conditions-generales-de-vente/">CGV</a>
          <a href="/confidentialite/">Confidentialité</a>
          <CookiesButton />
          <a href="/atelier/">Administration</a>
        </nav>
      </div>
    </footer>
  );
}
export function Motion() {
  const pathname = usePathname();
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('in-view');
            observer.unobserve(e.target);
          }
        }
      },
      { threshold: 0.08 },
    );
    document
      .querySelectorAll(
        'main > section:not(.workbench-hero):not(.page-heading):not(.session-bench), main .product-card:not(.catalog .product-card), main .guide-card, main .equipment-rows > a, main .kit-piece, footer',
      )
      .forEach((e) => {
        if (!e.hasAttribute('data-reveal')) e.setAttribute('data-reveal', '');
      });
    document
      .querySelectorAll('[data-reveal]')
      .forEach((e) => observer.observe(e));
    const stillMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === 'reduce';
    // Les comptes de familles montent jusqu’à leur valeur quand la ligne apparaît : le chiffre se lit en arrivant.
    const counters = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          counters.unobserve(e.target);
          const el = e.target as HTMLElement;
          const target = Number(el.dataset.count || el.textContent || 0);
          if (stillMotion || !target) continue;
          const start = performance.now();
          const tick = (now: number) => {
            const t = Math.min(1, (now - start) / 900);
            const eased = 1 - Math.pow(1 - t, 3);
            el.textContent = String(Math.round(target * eased));
            if (t < 1) requestAnimationFrame(tick);
          };
          el.textContent = '0';
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.6 },
    );
    document.querySelectorAll<HTMLElement>('[data-count]').forEach((el) => counters.observe(el));
    // La photo du hero suit le pointeur, à peine : la pièce prend du relief sans bouger de place.
    const stage = document.querySelector<HTMLElement>('.equipment-inspector');
    const onMove = (e: PointerEvent) => {
      if (!stage || stillMotion || e.pointerType === 'touch') return;
      const r = stage.getBoundingClientRect();
      stage.style.setProperty('--tx', String(((e.clientX - r.left) / r.width - 0.5) * 2));
      stage.style.setProperty('--ty', String(((e.clientY - r.top) / r.height - 0.5) * 2));
    };
    const onLeave = () => {
      stage?.style.setProperty('--tx', '0');
      stage?.style.setProperty('--ty', '0');
    };
    stage?.addEventListener('pointermove', onMove);
    stage?.addEventListener('pointerleave', onLeave);
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator)
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    let chosen: HTMLImageElement | null = null;
    const onClick = (e: MouseEvent) => {
      const link = (e.target as Element | null)?.closest?.(
        '.product-card a, .kit-picture a, .session-products a',
      );
      if (!link) return;
      const card = link.closest('.product-card, .kit-piece') ?? link;
      chosen = card.querySelector('img');
    };
    const onSwap = (e: Event) => {
      const swap = e as Event & { viewTransition?: unknown };
      if (swap.viewTransition && chosen) chosen.style.viewTransitionName = 'product-hero';
    };
    document.addEventListener('click', onClick);
    window.addEventListener('pageswap', onSwap);
    // Après la carte des cookies, la page rejoue son entrée : animations d’arrivée, révélations visibles, compteurs.
    const replay = () => {
      if (stillMotion) return;
      const root = document.documentElement;
      root.setAttribute('data-replay', '');
      const visible = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal].in-view')).filter((el) => {
        const r = el.getBoundingClientRect();
        return r.bottom > 0 && r.top < innerHeight;
      });
      visible.forEach((el) => el.classList.remove('in-view'));
      void document.body.offsetWidth;
      root.removeAttribute('data-replay');
      visible.forEach((el) => el.classList.add('in-view'));
      document.querySelectorAll<HTMLElement>('[data-count]').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.bottom <= 0 || r.top >= innerHeight) return;
        const target = Number(el.dataset.count || 0);
        if (!target) return;
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / 900);
          el.textContent = String(Math.round(target * (1 - Math.pow(1 - t, 3))));
          if (t < 1) requestAnimationFrame(tick);
        };
        el.textContent = '0';
        requestAnimationFrame(tick);
      });
    };
    window.addEventListener('boutique:replay-entry', replay);
    return () => {
      observer.disconnect();
      counters.disconnect();
      stage?.removeEventListener('pointermove', onMove);
      stage?.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('click', onClick);
      window.removeEventListener('pageswap', onSwap);
      window.removeEventListener('boutique:replay-entry', replay);
    };
  }, [pathname]);
  return null;
}
export function Breadcrumb({
  items,
}: {
  items: { label: string; href?: string }[];
}) {
  // Le graphe de chaque page renvoie à ce fil d’Ariane par son @id.
  const pathname = usePathname();
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            '@id': shop.origin + (pathname.endsWith('/') ? pathname : pathname + '/') + '#breadcrumb',
            itemListElement: [{ label: 'Accueil', href: '/' }, ...items].map(
              (x, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                name: x.label,
                ...(x.href ? { item: shop.origin + x.href } : {}),
              }),
            ),
          }),
        }}
      />
      <nav className="breadcrumb" aria-label="Fil d’Ariane">
        <a href="/">Accueil</a>
        {items.map((x, i) => (
          <span key={i}>
            <span aria-hidden="true">/</span>
            {x.href ? (
              <a href={x.href}>{x.label}</a>
            ) : (
              <span aria-current="page">{x.label}</span>
            )}
          </span>
        ))}
      </nav>
    </>
  );
}
export function ArrowLink({
  href,
  children,
  dark = false,
}: {
  href: string;
  children: React.ReactNode;
  dark?: boolean;
}) {
  return (
    <a href={href} className={`button ${dark ? 'button-dark' : ''}`}>
      {children}
      <ArrowRight size={18} />
    </a>
  );
}

function subscribeMotion(callback: () => void) {
  window.addEventListener('boutique-motion', callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener('boutique-motion', callback);
    window.removeEventListener('storage', callback);
  };
}
function motionSnapshot() {
  try {
    return localStorage.getItem('boutique-motion') === 'reduce';
  } catch {
    return false;
  }
}
function MotionControl() {
  const reduced = useSyncExternalStore(
    subscribeMotion,
    motionSnapshot,
    () => false,
  );
  useEffect(() => {
    document.documentElement.dataset.motion = reduced ? 'reduce' : 'system';
  }, [reduced]);
  return (
    <button
      className="motion-control"
      aria-pressed={reduced}
      onClick={() => {
        try {
          localStorage.setItem(
            'boutique-motion',
            reduced ? 'system' : 'reduce',
          );
          window.dispatchEvent(new Event('boutique-motion'));
        } catch {
          document.documentElement.dataset.motion = 'reduce';
        }
      }}
    >
      {reduced ? 'Animations réduites' : 'Réduire les animations'}
    </button>
  );
}
