import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Boutique de Boxe',
    short_name: 'Boutique de Boxe',
    description:
      'Matériel de boxe, MMA et sports de combat : gants, bandes, protections, textile et sacs, avec les vraies tailles et les prix prévus.',
    lang: 'fr',
    start_url: '/?source=pwa',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f4f4f1',
    theme_color: '#18191e',
    categories: ['shopping', 'sports'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Gants de boxe', url: '/gants-de-boxe/' },
      { name: 'Les guides d’achat', url: '/guides/' },
      { name: 'Votre panier', url: '/panier/' },
    ],
  };
}
