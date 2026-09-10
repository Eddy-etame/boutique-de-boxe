import type { Metadata } from 'next';
import { Header, Footer, Motion } from '@/components/shop-shell';
import { shop, jsonLd } from '@/lib/catalog';
import './globals.css';
import './shop.css';
import './refinement.css';
import './commerce.css';
import './motion.css';


export const metadata: Metadata = {
  metadataBase: new URL(shop.origin),
  title: {
    default: 'Boutique de Boxe | Matériel de boxe, MMA et sports de combat',
    template: '%s | Boutique de Boxe',
  },
  description:
    'Le matériel de boxe, MMA et sports de combat dans le détail. Découvrez les équipements, comparez les modèles et préparez votre séance avec nos guides.',
  robots: { index: true, follow: true },
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
  icons: { icon: '/favicon.svg' },
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
      </head>
      <body>
        <a href="#contenu" className="skip-link">
          Aller au contenu
        </a>
        <Header />
        {children}
        <Footer />
        <Motion />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLd({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: shop.name,
              url: shop.origin,
              inLanguage: 'fr-FR',
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLd({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              '@id': `${shop.origin}/#organisation`,
              name: shop.name,
              legalName: shop.entity,
              url: shop.origin,
              email: shop.email,
              telephone: '+33954147472',
              address: {
                '@type': 'PostalAddress',
                streetAddress: '12 rue de Fenouillet',
                postalCode: '31200',
                addressLocality: 'Toulouse',
                addressCountry: 'FR',
              },
            }),
          }}
        />
      </body>
    </html>
  );
}
