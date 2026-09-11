import type { MetadataRoute } from 'next';
import { shop } from '@/lib/catalog';

const disallow = ['/api/', '/atelier/', '/panier/', '/recu/', '/paiement-retour/', '/desinscription/', '/hors-ligne/', '/recherche/'];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: ['/', '/api/mcp'], disallow },
      // Moteurs et assistants IA : mêmes règles, accès explicite.
      { userAgent: 'GPTBot', allow: ['/', '/api/mcp'], disallow },
      { userAgent: 'OAI-SearchBot', allow: ['/', '/api/mcp'], disallow },
      { userAgent: 'ChatGPT-User', allow: ['/', '/api/mcp'], disallow },
      { userAgent: 'ClaudeBot', allow: ['/', '/api/mcp'], disallow },
      { userAgent: 'Claude-SearchBot', allow: ['/', '/api/mcp'], disallow },
      { userAgent: 'PerplexityBot', allow: ['/', '/api/mcp'], disallow },
      { userAgent: 'Google-Extended', allow: ['/', '/api/mcp'], disallow },
      { userAgent: 'Applebot-Extended', allow: ['/', '/api/mcp'], disallow },
      { userAgent: 'Bingbot', allow: ['/', '/api/mcp'], disallow },
    ],
    sitemap: shop.origin + '/sitemap.xml',
    host: shop.origin,
  };
}
