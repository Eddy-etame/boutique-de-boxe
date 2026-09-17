import { categoryFor, getCategoryProducts, type Product } from './catalog';
import { SUBFAMILIES, subfamilyProducts } from './subfamilies';
import { brandFor } from './brands';

/**
 * La liste complète d’une page de catalogue, dans son ordre « notre sélection ».
 *
 * La page n’envoie au navigateur que les 36 cartes affichées ; la liste entière n’est demandée
 * (GET /api/catalog-list?scope=…) que lorsque le visiteur cherche, filtre, trie ou change de page.
 * Avec la liste entière dans le HTML, « matériel de boxe » pesait plus d’un mégaoctet.
 */
export function listingFor(scope: string, products: Product[]): Product[] | null {
  const cat = categoryFor(scope);
  if (cat) return getCategoryProducts(cat, products);
  if (scope === 'nouveautes') return [...products].reverse();
  if (scope === 'recherche') return products;
  if (scope.startsWith('marque-')) return brandFor(scope.slice(7), products)?.products ?? null;
  const sub = SUBFAMILIES.find((s) => s.slug === scope);
  return sub ? subfamilyProducts(sub, products) : null;
}
