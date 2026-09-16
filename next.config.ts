import type { NextConfig } from 'next';
import { shop } from './lib/catalog';

/** Fichiers publics : polices et icônes ne changent qu’avec leur nom, photos et
 *  vignettes se rafraîchissent en arrière-plan. Vercel ne les met pas en cache par défaut. */
const YEAR = 'public, max-age=31536000, immutable';
const MONTH = 'public, max-age=2592000, stale-while-revalidate=604800';

const nextConfig: NextConfig = {
  trailingSlash: true,
  skipTrailingSlashRedirect: true,
  agentRules: false,
  // Le rendu des vignettes lit les polices sur le disque et charge sharp à l’exécution.
  outputFileTracingIncludes: {
    '/vignette/[...seg]': [
      './assets/fonts/*',
      './node_modules/sharp/**/*',
      './node_modules/@img/**/*',
    ],
  },
  serverExternalPackages: ['sharp'],
  // Canonical stable sur .fr ; les aperçus locaux et les autres branches restent accessibles.
  async redirects() {
    return ['www.boutique-de-boxe.fr', 'boutique-de-boxe.vercel.app'].map(
      (host) => ({
        source: '/:path(.*)',
        has: [{ type: 'host' as const, value: host }],
        destination: shop.origin + '/:path*',
        permanent: true,
      }),
    );
  },
  async headers() {
    return [
      {
        source: '/fonts/:path*',
        headers: [{ key: 'Cache-Control', value: YEAR }],
      },
      {
        source: '/icons/:path*',
        headers: [{ key: 'Cache-Control', value: YEAR }],
      },
      {
        source: '/products/:path*',
        headers: [{ key: 'Cache-Control', value: MONTH }],
      },
      {
        source: '/media/:path*',
        headers: [{ key: 'Cache-Control', value: MONTH }],
      },
    ];
  },
};

export default nextConfig;
