import type { NextConfig } from 'next';

/** Fichiers publics : polices et icônes ne changent qu’avec leur nom, photos et
 *  vignettes se rafraîchissent en arrière-plan. Vercel ne les met pas en cache par défaut. */
const YEAR = 'public, max-age=31536000, immutable';
const MONTH = 'public, max-age=2592000, stale-while-revalidate=604800';

// En-têtes de sécurité sur les pages HTML. La CSP autorise le nécessaire :
// runtime Next et JSON-LD en ligne (unsafe-inline), fontes et images du site,
// beacons de mesure et /api en same-origin, le défi anti-robot du formulaire de
// contact (inlett), et les workers same-origin (sw.js, inlett-pow.js). En dev,
// on ajoute unsafe-eval et le socket HMR pour ne pas casser React Refresh.
const isProd = process.env.NODE_ENV === 'production';
const csp = [
  "default-src 'self'",
  "base-uri 'none'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  // La carte des points relais (Boxtal) est un cadre servi par maps.boxtal.com, avec son script.
  "frame-src https://maps.boxtal.com",
  "form-action 'self'",
  // Les vues secondaires des fiches viennent encore des serveurs des fournisseurs (1 854 photos sur deux
  // hôtes ; le premier redirige vers son stockage). Sans ces hôtes, la politique bloquait les galeries.
  // À retirer le jour où ces photos seront servies par le site.
  "img-src 'self' data: https://api.ecommercio.com https://ypnjjowtudmpxoqopzta.supabase.co https://media.cdnws.com",
  "font-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com https://maps.boxtal.com" + (isProd ? '' : " 'unsafe-eval'"),
  "connect-src 'self' https://inlett.vercel.app https://va.vercel-scripts.com https://vitals.vercel-insights.com https://maps.boxtal.com" + (isProd ? '' : ' ws: wss:'),
  "worker-src 'self'",
  "manifest-src 'self'",
  ...(isProd ? ['upgrade-insecure-requests'] : []),
].join('; ');
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(self), usb=(), browsing-topics=()' },
  // Une page d'un autre site qui ouvre la boutique dans une fenêtre perd toute prise sur elle (pas de
  // redirection à distance de l'onglet, pas de fuite par window.opener). « allow-popups » laisse
  // intactes les fenêtres que la boutique ou ses prestataires (carte Boxtal) ouvriraient eux-mêmes.
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
];
// Pour retirer 'unsafe-inline' de script-src, il faudrait un nonce par requête (posé par proxy.ts et
// repris par Next sur ses scripts en ligne) : toutes les pages deviendraient dynamiques, sans cache
// statique ni ISR. Une empreinte (sha256) ne suffit pas : les scripts en ligne de Next changent à
// chaque page. D'ici là, tout JSON écrit dans une page passe par jsonLd() (lib/json-ld.ts).

const nextConfig: NextConfig = {
  // Les gabarits lisent le catalogue complet : borner les workers évite les pics mémoire au build,
  // sans changer le rendu des visiteurs ni la fréquence de mise à jour des prix.
  experimental: { cpus: 2, staticGenerationMaxConcurrency: 1 },
  trailingSlash: true,
  // Le proxy normalise seulement les pages HTML ; les callbacks et POST d'API ne doivent jamais
  // recevoir la redirection automatique de Next.
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
  // Aucune redirection d’hôte (décision du propriétaire) : l’alias Vercel et le domaine servent
  // tous deux le site ; les canonicals, le plan de site et le graphe pointent vers boutique-de-boxe.com.
  async headers() {
    return [
      // Sécurité sur toutes les réponses (l’API garde en plus ses propres en-têtes).
      { source: '/:path*', headers: securityHeaders },
      // CSP sur les pages HTML seulement : /api garde sa CSP propre (reçu en default-src 'none').
      {
        source: '/((?!api/).*)',
        headers: [{ key: 'Content-Security-Policy', value: csp }],
      },
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
