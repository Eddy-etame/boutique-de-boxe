import { variantPrice, type Product } from './catalog';

/** Une taille d'une fiche, jamais une nouvelle page canonique ni un identifiant inventé. */
export const PRODUCT_SIZE_PARAM = 'taille';

export function productVariantPath(p: Pick<Product, 'slug' | 'sizes'>, size?: string | null): string {
  const path = '/produits/' + p.slug + '/';
  return size && p.sizes.includes(size)
    ? path + '?' + new URLSearchParams({ [PRODUCT_SIZE_PARAM]: size }).toString()
    : path;
}

/** Le rendu initial reste identique au serveur ; le navigateur applique ensuite sa taille d'arrivée. */
export function initialProductSize(p: Pick<Product, 'sizes'>, search = ''): string {
  const values = new URLSearchParams(search).getAll(PRODUCT_SIZE_PARAM);
  if (values.length === 1 && p.sizes.includes(values[0])) return values[0];
  return p.sizes.length === 1 ? p.sizes[0] : '';
}

/** Les IDs existants du flux ne changent pas quand on corrige ses adresses d'arrivée. */
export function merchantVariants(p: Product) {
  const sizes = p.sizes.filter((size) => size.length <= 40 && size.toLowerCase() !== p.name.toLowerCase());
  const samePrice = sizes.every((size) => variantPrice(p, size) === p.price);
  const variants: (string | null)[] = sizes.length > 1 && samePrice ? sizes : [null];
  return variants.map((size) => ({
    id: size ? `${p.id}-${size.replace(/[^A-Za-z0-9]+/g, '-')}` : p.id,
    size,
    price: size ? variantPrice(p, size) : p.price,
    path: productVariantPath(p, size),
  }));
}

/** Checksum GS1 : ni GTIN deviné depuis le SKU, ni code tout à zéro. */
export function validGtin(value: string): boolean {
  if (!/^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(value) || /^0+$/.test(value)) return false;
  const digits = value.split('').map(Number);
  const check = digits.pop()!;
  const sum = digits.reverse().reduce((total, digit, index) => total + digit * (index % 2 === 0 ? 3 : 1), 0);
  return (10 - sum % 10) % 10 === check;
}

/**
 * Seules les caractéristiques explicitement nommées GTIN/EAN/MPN font foi. Les champs génériques
 * « Référence », sourceRef et id proviennent aussi d'identifiants revendeur : jamais un MPN par
 * déduction. Sans preuve, on omet identifier_exists au lieu d'affirmer que le fabricant n'a rien
 * attribué. Les identifiants manquants restent à documenter, pas à fabriquer pour Merchant Center.
 */
export function merchantIdentifiers(p: Pick<Product, 'brand' | 'specs'>) {
  const brand = p.brand?.trim();
  const knownBrand = brand && !/pr[ée]ciser|^s[ée]lection\b/i.test(brand) ? brand : undefined;
  const specs = p.specs || {};
  const gtin = [specs.GTIN, specs.EAN, specs['EAN-13'], specs['Code EAN']]
    .map((value) => (value || '').replace(/[\s-]/g, ''))
    .find(validGtin);
  const reference = (specs.MPN || specs['Référence fabricant'] || '').trim();
  const mpn = knownBrand && reference && reference.length <= 70 && !/^(?:n\/?a|inconnu|[àa] pr[ée]ciser|aucun|non renseign[ée])$/i.test(reference)
    ? reference
    : undefined;
  return { brand: knownBrand, gtin, mpn };
}
