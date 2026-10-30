import type { Product } from './catalog';

/** Primary manufacturer pages checked on 24 October; no inferred sizing for other brands. */
export const MANUFACTURER_SIZING_REVISION = '2026-10-24';
export const MANUFACTURER_SIZING_GUIDES = [
  {
    id: 'fairtex',
    brand: 'Fairtex',
    url: 'https://fr.fairtex.com/pages/size-guide',
    label: 'Le guide des tailles Fairtex',
    summary: 'Le fabricant distingue les gants de boxe, les gants MMA, les vêtements et plusieurs modèles de protège-tibias. Repérez la famille et le code de votre modèle avant de lire un tableau.',
  },
  {
    id: 'metal-boxe',
    brand: 'Metal Boxe',
    url: 'https://metal-boxe.com/pages/guides-des-tailles',
    label: 'Le guide des tailles Metal Boxe',
    summary: 'Le document de la marque rassemble des repères pour les gants, protections, textiles, chaussures et kimonos. Les indications propres au modèle et le règlement actuel de votre discipline restent à vérifier.',
  },
] as const;

/** SP5 only: the same manufacturer's SP3, SP6, SP7 and SP8 use different pad dimensions. */
export const FAIRTEX_SP5 = {
  model: 'SP5',
  source: 'https://www.fairtex.com/pages/fairtex-size-guide',
  rows: [
    { size: 'S', height: '150–160', shin: '34', foot: '14' },
    { size: 'M', height: '160–179', shin: '38', foot: '15' },
    { size: 'L', height: '179–185', shin: '39', foot: '15' },
    { size: 'XL', height: '185–195', shin: '42', foot: '14' },
  ],
} as const;

type SizingProduct = Pick<Product, 'brand' | 'category' | 'name' | 'sizes' | 'sourceRef' | 'reference'>;
export type ManufacturerSizing = {
  id: 'fairtex' | 'metal-boxe';
  brand: string;
  url: string;
  guidePath: string;
  label: string;
  model?: 'SP5';
};

const normalizedBrand = (brand: string) => brand.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
const productText = (p: SizingProduct) => [p.name, p.sourceRef, p.reference].filter(Boolean).join(' ');

/** A relevant brand guide, never a claim that every table fits every model. */
export function manufacturerSizingFor(p: SizingProduct): ManufacturerSizing | null {
  if (!p.sizes.length) return null;
  const brand = normalizedBrand(p.brand);
  const text = productText(p);
  let id: ManufacturerSizing['id'];
  let eligible = false;
  if (brand === 'fairtex') {
    id = 'fairtex';
    eligible = (p.category === 'gants-de-boxe' && p.sizes.some((size) => /\boz\b/i.test(size)))
      || p.category === 'gants-mma'
      || (p.category === 'protections-boxe' && /\b(?:SP[35678]|SPK9)\b/i.test(text))
      || (p.category === 'textile-boxe' && /\bshort|t-shirt|debardeur|débardeur|legging|compression/i.test(p.name));
  } else if (brand === 'metal boxe') {
    id = 'metal-boxe';
    eligible = p.category === 'gants-de-boxe' || p.category === 'gants-mma' || p.category === 'textile-boxe'
      || (p.category === 'protections-boxe' && /casque|tibia|pied|coquille|plastron|poitrine/i.test(p.name))
      || (p.category === 'chaussures-boxe' && /chaussure/i.test(p.name))
      || (p.category === 'arts-martiaux' && /kimono/i.test(p.name));
  } else {
    return null;
  }
  if (!eligible) return null;
  const guide = MANUFACTURER_SIZING_GUIDES.find((entry) => entry.id === id)!;
  const model = id === 'fairtex' && p.category === 'protections-boxe' && /\bSP5\b/i.test(text) ? 'SP5' : undefined;
  return { id, brand: guide.brand, url: guide.url, guidePath: '/guide-des-tailles/#' + (model ? 'fairtex-sp5' : id), label: guide.label, ...(model ? { model } : {}) };
}
