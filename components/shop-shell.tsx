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
  // L'entête reste collée en haut ; dès que la page défile, elle se décolle (ombre + fond dense).
  useEffect(() => {
    const onScroll = () =>
      document.documentElement.toggleAttribute(
        'data-scrolled',
        window.scrollY > 8,
      );
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
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
        <div className="header-actions">
          <CartLink />
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
      <div className="footer-next">
        <div className="footer-next-heading">
          <span className="eyebrow">
            <i className="tape-mark" aria-hidden="true" /> À VOUS DE CHOISIR
          </span>
          <h2>
            Le prochain round
            <br />
            <em>se prépare ici.</em>
          </h2>
          <p>
            Un modèle en tête ou un sac à compléter ?<br />
            Prenez le chemin qui vous correspond.
          </p>
        </div>
        <nav className="footer-routes" aria-label="Votre prochaine étape">
          <a
            className="footer-route footer-route-primary"
            href="/boutique-boxe/"
          >
            <span className="footer-route-index" aria-hidden="true">
              01
            </span>
            <span>
              <strong>Trouver mon équipement</strong>
              <small>Gants, protections, textile et sacs.</small>
            </span>
            <ArrowUpRight aria-hidden="true" />
          </a>
          <a className="footer-route" href="/#preparer">
            <span className="footer-route-index" aria-hidden="true">
              02
            </span>
            <span>
              <strong>Préparer mon sac</strong>
              <small>Gardez ce que vous avez. Complétez le reste.</small>
            </span>
            <ArrowUpRight aria-hidden="true" />
          </a>
          <a className="footer-route" href="/guides/taille-poids-gants-boxe/">
            <span className="footer-route-index" aria-hidden="true">
              03
            </span>
            <span>
              <strong>Choisir le poids de mes gants</strong>
              <small>Les repères pour comprendre les onces.</small>
            </span>
            <ArrowUpRight aria-hidden="true" />
          </a>
        </nav>
      </div>
      <div className="footer-opening">
        <span>
          <i className="status-dot" aria-hidden="true" />
          <strong>Les ventes arrivent.</strong> Préparez votre sélection dès
          maintenant.
        </span>
        <a href="/#ouverture">
          Être prévenu à l’ouverture <ArrowRight size={18} aria-hidden="true" />
        </a>
      </div>
      <div className="footer-grid">
        <div className="footer-identity">
          <Brand />
          <p className="footer-blurb">
            Matériel de boxe, MMA et arts martiaux. Des modèles à examiner, des
            guides pour choisir. Livraison en France à l’ouverture des ventes.
          </p>
          <a href="/contact/" className="email-link">
            Une question sur le matériel ?{' '}
            <ArrowUpRight size={16} aria-hidden="true" />
          </a>
        </div>
        <nav aria-labelledby="footer-equipment">
          <h3 id="footer-equipment">Votre équipement</h3>
          {categories
            .filter((c) =>
              [
                'gants-de-boxe',
                'gants-mma',
                'protections-boxe',
                'textile-boxe',
                'accessoires-boxe',
                'sacs-de-frappe',
                'chaussures-boxe',
                'equipement-entrainement',
                'sacs-de-sport',
              ].includes(c.slug),
            )
            .map((c) => (
              <a key={c.slug} href={`/${c.slug}/`}>
                {c.name}
              </a>
            ))}
        </nav>
        <nav aria-labelledby="footer-practice">
          <h3 id="footer-practice">Votre pratique</h3>
          <a href="/materiel-boxe/">Boxe anglaise</a>
          <a href="/materiel-mma/">Matériel MMA</a>
          <a href="/boutique-arts-martiaux/">Arts martiaux</a>
          <a href="/materiel-sport-de-combat/">Sports de combat</a>
          <h3 className="footer-subheading">Pour bien choisir</h3>
          <a href="/guides/">Guides d’achat</a>
          <a href="/guide-des-tailles/">Guide des tailles</a>
          <a href="/marques/">Les marques</a>
          <a href="/nouveautes/">Nouveautés</a>
        </nav>
        <nav aria-labelledby="footer-service">
          <h3 id="footer-service">Vos questions</h3>
          <a href="/faq/">Questions fréquentes</a>
          <a href="/livraison/">Livraison et frais prévus</a>
          <a href="/retours/">Retours</a>
          <a href="/contact/">Nous contacter</a>
          <a href="/offres-de-lancement/">Ouverture de la boutique</a>
          <a href="mailto:boxingcenter31@gmail.com" className="footer-contact">
            Nous écrire <ArrowUpRight size={14} aria-hidden="true" />
          </a>
        </nav>
      </div>
      <details className="footer-directory">
        <summary>
          Explorer les recherches par équipement{' '}
          <span aria-hidden="true">+</span>
        </summary>
        <nav className="footer-queries" aria-label="Recherches par équipement">
          {QUERY_MAP.map((q) => (
            <a key={q.query} href={q.path}>
              {q.query}
            </a>
          ))}
        </nav>
      </details>
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
    const prefersStill = () =>
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      document.documentElement.dataset.motion === 'reduce';
    // Les comptes de familles montent jusqu’à leur valeur quand la ligne apparaît : le chiffre se lit en arrivant.
    const counters = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          counters.unobserve(e.target);
          const el = e.target as HTMLElement;
          const target = Number(el.dataset.count || el.textContent || 0);
          if (prefersStill() || !target) continue;
          const start = performance.now();
          const tick = (now: number) => {
            const t = prefersStill() ? 1 : Math.min(1, (now - start) / 900);
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
    document
      .querySelectorAll<HTMLElement>('[data-count]')
      .forEach((el) => counters.observe(el));
    // La photo du hero suit le pointeur, à peine : la pièce prend du relief sans bouger de place.
    const stage = document.querySelector<HTMLElement>('.equipment-inspector');
    const onMove = (e: PointerEvent) => {
      if (!stage || prefersStill() || e.pointerType === 'touch') return;
      const r = stage.getBoundingClientRect();
      stage.style.setProperty(
        '--tx',
        String(((e.clientX - r.left) / r.width - 0.5) * 2),
      );
      stage.style.setProperty(
        '--ty',
        String(((e.clientY - r.top) / r.height - 0.5) * 2),
      );
    };
    const onLeave = () => {
      stage?.style.setProperty('--tx', '0');
      stage?.style.setProperty('--ty', '0');
    };
    stage?.addEventListener('pointermove', onMove);
    stage?.addEventListener('pointerleave', onLeave);
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator)
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    // Un seul élément peut porter « product-hero » : à deux, Chrome annule la transition
    // (InvalidStateError). La photo cliquée ne prend le nom que si l’on part vers sa fiche,
    // et la photo principale de la fiche courante le lui cède.
    let chosen: HTMLImageElement | null = null;
    let chosenPath = '';
    const heroes = () =>
      document.querySelectorAll<HTMLElement>('.gallery-main > img');
    const release = () => {
      if (chosen) chosen.style.viewTransitionName = '';
      chosen = null;
      chosenPath = '';
    };
    const onClick = (e: MouseEvent) => {
      const link = (e.target as Element | null)?.closest?.<HTMLAnchorElement>(
        '.product-card a, .kit-picture a, .session-products a',
      );
      release();
      if (!link) return;
      const card = link.closest('.product-card, .kit-piece') ?? link;
      chosen = card.querySelector('img');
      chosenPath = new URL(link.href, location.href).pathname;
    };
    const onSwap = (e: Event) => {
      const swap = e as Event & {
        viewTransition?: unknown;
        activation?: { entry?: { url?: string | null } | null } | null;
      };
      const to = swap.activation?.entry?.url;
      if (
        !swap.viewTransition ||
        !chosen ||
        !to ||
        new URL(to).pathname !== chosenPath
      )
        return release();
      heroes().forEach((img) => (img.style.viewTransitionName = 'none'));
      chosen.style.viewTransitionName = 'product-hero';
    };
    // Retour arrière servi par le cache du navigateur : la page revient avec les noms posés au départ.
    const onShow = (e: PageTransitionEvent) => {
      if (!e.persisted) return;
      release();
      heroes().forEach((img) => (img.style.viewTransitionName = ''));
    };
    document.addEventListener('click', onClick);
    window.addEventListener('pageswap', onSwap);
    window.addEventListener('pageshow', onShow);
    // Après la carte des cookies, la page rejoue son entrée : animations d’arrivée, révélations visibles, compteurs.
    const replay = () => {
      if (prefersStill()) return;
      const root = document.documentElement;
      root.setAttribute('data-replay', '');
      const visible = Array.from(
        document.querySelectorAll<HTMLElement>('[data-reveal].in-view'),
      ).filter((el) => {
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
          const t = prefersStill() ? 1 : Math.min(1, (now - start) / 900);
          el.textContent = String(
            Math.round(target * (1 - Math.pow(1 - t, 3))),
          );
          if (t < 1) requestAnimationFrame(tick);
        };
        el.textContent = '0';
        requestAnimationFrame(tick);
      });
    };
    window.addEventListener('boutique:replay-entry', replay);
    const revealFocus = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const section = target.closest<HTMLElement>('[data-reveal]');
      if (section) {
        section.classList.add('in-view');
        observer.unobserve(section);
      }
    };
    document.addEventListener('focusin', revealFocus);
    return () => {
      observer.disconnect();
      counters.disconnect();
      stage?.removeEventListener('pointermove', onMove);
      stage?.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('click', onClick);
      window.removeEventListener('pageswap', onSwap);
      window.removeEventListener('pageshow', onShow);
      window.removeEventListener('boutique:replay-entry', replay);
      document.removeEventListener('focusin', revealFocus);
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
            '@id':
              shop.origin +
              (pathname.endsWith('/') ? pathname : pathname + '/') +
              '#breadcrumb',
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
