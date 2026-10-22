import { QUERY_MAP, SEO_COPY } from '@/lib/seo-copy';
import { categoryFor, getCategoryProducts, type Product } from '@/lib/catalog';
import { subfamilyFor, subfamilyProducts } from '@/lib/subfamilies';
import { guideRayon, guideEnTexte, faits } from '@/lib/guides-rayons';

/**
 * Couverture des mots-clés du brief, calculée depuis les textes du site (sans requête réseau) :
 * la même règle que l’audit, lisible dans l’atelier à tout moment. Les douze pages de tête (20/10)
 * lisent leur guide (lib/guides-rayons.ts), celui que la page affiche ; il faut alors le catalogue.
 */
const fold = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const count = (haystack: string, needle: string) => (needle ? haystack.split(needle).length - 1 : 0);

export type BriefRow = {
  query: string;
  path: string;
  title: boolean;
  heading: boolean;
  description: boolean;
  visible: number;
  answer: boolean;
  footer: boolean;
  ok: boolean;
};

/** Le titre, le H1, le surtitre, la description et le texte d’une page de tête. */
function texteDeTete(slug: string, products: Product[]) {
  const g = guideRayon(slug);
  if (!g) return null;
  const sub = subfamilyFor(slug);
  const cat = categoryFor(slug);
  const items = sub ? subfamilyProducts(sub, products) : cat ? getCategoryProducts(cat, products) : [];
  const c = { f: faits(slug, items), items, all: products };
  const t = guideEnTexte(g, c);
  return {
    title: g.titre(c),
    h1: g.h1,
    eyebrow: g.eyebrow,
    description: g.description(c),
    body: [g.eyebrow, g.h1, g.label(c), g.intro, g.guide.titre, ...t.chapitres, ...t.faq.flatMap((f) => [f.question, f.answer])].join(' '),
  };
}

export function briefCoverage(products: Product[] = []): BriefRow[] {
  return QUERY_MAP.map((entry) => {
    const slug = entry.path.replace(/^\/|\/$/g, '');
    const copy = SEO_COPY[slug];
    const tete = products.length ? texteDeTete(slug, products) : null;
    const q = fold(entry.query);
    const h1 = fold(tete?.h1 || categoryFor(slug)?.name || '');
    const title = fold(tete?.title || copy?.title || '');
    const eyebrow = fold(tete?.eyebrow || copy?.eyebrow || '');
    const description = fold(tete?.description || copy?.description || '');
    const body = fold(tete ? tete.body : [eyebrow, h1, ...(copy?.sections || []).flatMap((s) => [s.h2, ...s.paragraphs]), ...(copy?.faq || []).flatMap((f) => [f.question, f.answer])].join(' '));
    const visible = count(body, q);
    const row = {
      query: entry.query,
      path: entry.path,
      title: title.includes(q),
      heading: h1.includes(q) || eyebrow.includes(q),
      description: description.includes(q),
      visible,
      answer: fold(entry.answer).includes(q),
      footer: true,
    };
    return { ...row, ok: row.title && row.heading && row.description && visible >= 2 && row.answer };
  });
}
