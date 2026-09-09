'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="Boutique de Boxe, accueil">
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path d="M4 4h27v10H14v20h20V17h10v27H4z" fill="currentColor" />
        <path d="M35 4h9v9h-9z" fill="var(--blue)" />
      </svg>
      <span>
        BOUTIQUE<span>DE BOXE.</span>
      </span>
    </Link>
  );
}
export function Header() {
  const [menu, setMenu] = useState(false);
  return (
    <>
      <div className="launch-strip">
        <span className="status-dot" />
        LE CATALOGUE S’OUVRE. LES VENTES ARRIVENT.
        <Link href="/offres-de-lancement/">
          En savoir plus <ArrowUpRight size={13} />
        </Link>
      </div>
      <header className="site-header">
        <Brand />
        <nav aria-label="Navigation principale" className="desktop-nav">
          <Link href="/materiel-boxe/">Boxe anglaise</Link>
          <Link href="/materiel-mma/">MMA</Link>
          <Link href="/boutique-arts-martiaux/">Arts martiaux</Link>
          <Link href="/guides/" onClick={() => setMenu(false)}>
            Les guides <ArrowUpRight size={13} />
          </Link>
        </nav>
        <div className="header-actions">
          <Link
            className="icon-button"
            href="/recherche/"
            aria-label="Rechercher un équipement"
          >
            <Search size={21} />
          </Link>
          <Dialog open={menu} onOpenChange={setMenu}>
            <DialogTrigger
              className="icon-button menu-trigger"
              aria-label="Ouvrir le menu"
            >
              <Menu size={23} />
            </DialogTrigger>
            <DialogContent className="mobile-menu" showCloseButton={false}>
              <DialogTitle>Dans votre coin.</DialogTitle>
              <DialogDescription>
                Équipements, pratiques et conseils.
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
                  <Link
                    key={c.slug}
                    href={`/${c.slug}/`}
                    onClick={() => setMenu(false)}
                  >
                    {c.name}
                    <ArrowUpRight />
                  </Link>
                ))}
                {categories.slice(0, 6).map((c) => (
                  <Link
                    key={c.slug}
                    href={`/${c.slug}/`}
                    onClick={() => setMenu(false)}
                  >
                    {c.name}
                    <ArrowUpRight />
                  </Link>
                ))}
                <Link href="/guides/" onClick={() => setMenu(false)}>
                  Les guides <ArrowUpRight />
                </Link>
                <Link href="/contact/" onClick={() => setMenu(false)}>
                  Contact <ArrowUpRight />
                </Link>
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
          <span className="eyebrow">L’ÉQUIPEMENT. LE GESTE. LA SUITE.</span>
          <p>
            À CHAQUE PRATIQUE,
            <br />
            <em>SON ÉQUIPEMENT.</em>
          </p>
        </div>
        <Link
          className="round-link"
          href="/materiel-sport-de-combat/"
          aria-label="Explorer tout le matériel"
        >
          <ArrowUpRight size={42} />
        </Link>
      </div>
      <div className="footer-grid">
        <div>
          <Brand />
          <p className="footer-blurb">
            Le matériel de boxe et de sports de combat, regardé dans le détail.
            Un catalogue en préparation pour les pratiquants de toute la France.
          </p>
        </div>
        <div>
          <h2>Le catalogue</h2>
          {categories.slice(0, 6).map((c) => (
            <Link key={c.slug} href={`/${c.slug}/`}>
              {c.name}
            </Link>
          ))}
          <Link href="/nouveautes/">Nouveautés</Link>
        </div>
        <div>
          <h2>Dans votre coin</h2>
          <Link href="/guides/">Guides d’achat</Link>
          <Link href="/guide-des-tailles/">Guide des tailles</Link>
          <Link href="/#preparer">Préparer ma séance</Link>
          <Link href="/livraison/">Livraison</Link>
          <Link href="/retours/">Retours</Link>
          <Link href="/contact/">Contact</Link>
          <Link href="/offres-de-lancement/">Ouverture de la boutique</Link>
        </div>
        <div>
          <h2>La boutique</h2>
          <Link href="/materiel-boxe/">Boxe anglaise</Link>
          <Link href="/materiel-mma/">Matériel MMA</Link>
          <Link href="/boutique-arts-martiaux/">Arts martiaux</Link>
          <Link href="/materiel-sport-de-combat/">Sports de combat</Link>
          <Link href="mailto:boxingcenter31@gmail.com" className="email-link">
            Nous écrire <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>
      <div className="footer-bottom">
        <MotionControl />
        <span>© {new Date().getFullYear()} Boutique de Boxe</span>
        <nav aria-label="Informations légales">
          <Link href="/mentions-legales/">Mentions légales</Link>
          <Link href="/conditions-generales-de-vente/">CGV</Link>
          <Link href="/confidentialite/">Confidentialité</Link>
          <Link href="/atelier/">Administration</Link>
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
      .querySelectorAll('[data-reveal]')
      .forEach((e) => observer.observe(e));
    return () => observer.disconnect();
  }, [pathname]);
  return null;
}
export function Breadcrumb({
  items,
}: {
  items: { label: string; href?: string }[];
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
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
        <Link href="/">Accueil</Link>
        {items.map((x, i) => (
          <span key={i}>
            <span aria-hidden="true">/</span>
            {x.href ? (
              <Link href={x.href}>{x.label}</Link>
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
    <Link href={href} className={`button ${dark ? 'button-dark' : ''}`}>
      {children}
      <ArrowRight size={18} />
    </Link>
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
