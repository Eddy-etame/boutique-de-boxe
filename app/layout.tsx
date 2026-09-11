import type { Metadata } from 'next';
import { Header, Footer, Motion } from '@/components/shop-shell';
import { shop } from '@/lib/catalog';
import { siteGraph, KEYWORDS, ATTRIBUTION } from '@/lib/seo';
import './globals.css';
import './shop.css';
import './refinement.css';
import './commerce.css';
import './motion.css';
import './scale.css';
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
  ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ? { verification: { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION } } : {}),
  openGraph: {
    siteName: shop.name,
    locale: 'fr_FR',
    type: 'website',
    url: shop.origin,
    images: [
      {
        url: '/og/home.png',
        width: 1200,
        height: 630,
        alt: 'Le matériel préparé pour la séance — Boutique de Boxe',
      },
    ],
  },
  icons: { icon: '/favicon.svg', apple: '/icons/apple-touch-icon.png' },
  manifest: '/manifest.webmanifest',
  twitter: { card: 'summary_large_image' },
  appleWebApp: { capable: true, title: 'Boutique de Boxe', statusBarStyle: 'default' },
};
export const viewport: Viewport = {
  themeColor: '#18191e',
  colorScheme: 'light',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
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
      </head>
      <body>
        <a href="#contenu" className="skip-link">
          Aller au contenu
        </a>
        <Header />
        {children}
        <Footer />
        <Motion />
        {/* Organisation et site : un seul graphe, référencé par le graphe de chaque page. */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: siteGraph() }} />
      </body>
    </html>
  );
}
