import type { MetadataRoute } from 'next';
import { shop } from '@/lib/catalog';
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/signin-with-chatgpt',
        '/signout-with-chatgpt',
        '/callback',
      ],
    },
    sitemap: shop.origin + '/sitemap.xml',
  };
}
