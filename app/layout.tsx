import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { Header, Footer, Motion } from '@/components/shop-shell';
import { shop } from '@/lib/catalog';
import { siteGraph, KEYWORDS, ATTRIBUTION } from '@/lib/seo';
import { ConsentTracker } from '@/components/consent-tracker';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';
import './shop.css';
import './refinement.css';
import './commerce.css';
import './motion.css';
import './scale.css';
import './wayfinding.css';
import './hero.css';
import type { Viewport } from 'next';

export const metadata: Metadata = {
  metadataBase: new URL(shop.origin),
  title: {
    default: 'Boutique de Boxe | Matériel de boxe, MMA et sports de combat',
    template: '%s | Boutique de Boxe',
  },
  description:
    'Le matériel de boxe, MMA et sports de combat dans le détail. Découvrez les équipements, comparez les modèles et préparez votre séance avec nos guides.',
  keywords: [...KEYWORDS.site.head, ...KEYWORDS.site.body],
  authors: [{ name: shop.name, url: shop.origin }],
  creator: ATTRIBUTION.principalCreator,
  publisher: shop.entity,
  category: 'shopping',
  robots: { index: true, follow: true },
  // Google Search Console : la balise de vérification arrive par variable d’environnement, jamais en dur.
  ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ||
  process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION
    ? {
        verification: {
          ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
            ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
            : {}),
          ...(process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION
            ? {
                other: {
                  'msvalidate.01':
                    process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION,
                },
              }
            : {}),
        },
      }
    : {}),
  openGraph: {
    siteName: shop.name,
    locale: 'fr_FR',
    type: 'website',
    url: shop.origin,
    images: [
      {
        url: '/vignette/x/home.png',
        width: 1200,
        height: 630,
        alt: 'Le matériel préparé pour la séance — Boutique de Boxe',
      },
    ],
  },
  icons: { icon: '/favicon.svg', apple: '/icons/apple-touch-icon.png' },
  manifest: '/manifest.webmanifest',
  twitter: { card: 'summary_large_image' },
  appleWebApp: {
    capable: true,
    title: 'Boutique de Boxe',
    statusBarStyle: 'default',
  },
};
export const viewport: Viewport = {
  themeColor: '#18191e',
  colorScheme: 'light',
  width: 'device-width',
  initialScale: 1,
};

// Exécuté dans le <head>, avant le premier rendu : « pagereveal » part avant l’hydratation.
const VIEW_TRANSITION_GUARD = `(function(){function q(e){var t=e.viewTransition;if(t)[t.ready,t.finished,t.updateCallbackDone].forEach(function(p){if(p)p.catch(function(){})})}addEventListener('pageswap',q);addEventListener('pagereveal',q);addEventListener('unhandledrejection',function(e){var r=e.reason;if(r&&/^(InvalidStateError|AbortError|TimeoutError)$/.test(r.name)&&/transition/i.test(String(r.message))){e.preventDefault();e.stopImmediatePropagation()}})})();`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const consent = (await cookies()).get('bdb_consent')?.value;
  const consentOpen = consent !== 'accepted' && consent !== 'refused';
  return (
    <html lang="fr" data-consent-open={consentOpen ? '' : undefined}>
      <head>
        <link
          rel="preload"
          href="/fonts/barlow-condensed-extrabold.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/manrope-variable.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        {/* Transitions entre pages : l’accord est posé ici, en ligne, et non dans une feuille que le
            navigateur peut recharger (Chrome annule alors la transition en cours). Une transition
            sautée (onglet masqué, fenêtre redimensionnée, page lente) rejette ses promesses alors que
            la page s’affiche normalement : elles sont marquées comme traitées, sans erreur console. */}
        <style>{`@view-transition{navigation:auto}`}</style>
        <script dangerouslySetInnerHTML={{ __html: VIEW_TRANSITION_GUARD }} />
        <noscript>
          <style>{`.consent-veil{display:none!important}html[data-consent-open] body{overflow:auto!important}[data-reveal]{opacity:1!important;transform:none!important;animation:none!important}`}</style>
        </noscript>
      </head>
      <body>
        <a href="#contenu" className="skip-link">
          Aller au contenu
        </a>
        <Header />
        {children}
        <Footer />
        <Motion />
        {/* Carte de consentement et mesure d’audience maison : rien n’est mesuré sans accord. */}
        <ConsentTracker />
        <Analytics />
        {/* Organisation et site : un seul graphe, référencé par le graphe de chaque page. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: siteGraph() }}
        />
      </body>
    </html>
  );
}
