import type { NextConfig } from 'next';

/** Fichiers publics : polices et icônes ne changent qu’avec leur nom, photos et
 *  vignettes se rafraîchissent en arrière-plan. Vercel ne les met pas en cache par défaut. */
const YEAR = 'public, max-age=31536000, immutable';
const MONTH = 'public, max-age=2592000, stale-while-revalidate=604800';

const nextConfig: NextConfig = {
  trailingSlash: true,
  skipTrailingSlashRedirect: true,
  agentRules: false,
  async headers() {
    return [
      { source: '/fonts/:path*', headers: [{ key: 'Cache-Control', value: YEAR }] },
      { source: '/icons/:path*', headers: [{ key: 'Cache-Control', value: YEAR }] },
      { source: '/products/:path*', headers: [{ key: 'Cache-Control', value: MONTH }] },
      { source: '/media/:path*', headers: [{ key: 'Cache-Control', value: MONTH }] },
    ];
  },
};

export default nextConfig;
