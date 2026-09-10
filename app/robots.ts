import type { MetadataRoute } from 'next';
import { shop } from '@/lib/catalog';

const disallow = ['/api/', '/atelier/', '/panier/', '/recu/', '/paiement-retour/', '/desinscription/', '/hors-ligne/', '/recherche/'];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow },
      // Moteurs et assistants IA : mêmes règles, accès explicite.
      { userAgent: 'GPTBot', allow: '/', disallow },
      { userAgent: 'OAI-SearchBot', allow: '/', disallow },
      { userAgent: 'ChatGPT-User', allow: '/', disallow },
      { userAgent: 'ClaudeBot', allow: '/', disallow },
      { userAgent: 'Claude-SearchBot', allow: '/', disallow },
      { userAgent: 'PerplexityBot', allow: '/', disallow },
      { userAgent: 'Google-Extended', allow: '/', disallow },
      { userAgent: 'Applebot-Extended', allow: '/', disallow },
      { userAgent: 'Bingbot', allow: '/', disallow },
    ],
    sitemap: shop.origin + '/sitemap.xml',
    host: shop.origin,
  };
}
