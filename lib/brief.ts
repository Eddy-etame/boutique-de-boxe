import { QUERY_MAP, SEO_COPY } from '@/lib/seo-copy';
import { categoryFor } from '@/lib/catalog';

/**
 * Couverture des mots-clés du brief, calculée depuis les textes du site (sans requête réseau) :
 * la même règle que l’audit, lisible dans l’atelier à tout moment.
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

export function briefCoverage(): BriefRow[] {
  return QUERY_MAP.map((entry) => {
    const slug = entry.path.replace(/^\/|\/$/g, '');
    const copy = SEO_COPY[slug];
    const q = fold(entry.query);
    const h1 = fold(categoryFor(slug)?.name || '');
    const title = fold(copy?.title || '');
    const eyebrow = fold(copy?.eyebrow || '');
    const description = fold(copy?.description || '');
    const body = fold([eyebrow, h1, ...(copy?.sections || []).flatMap((s) => [s.h2, ...s.paragraphs]), ...(copy?.faq || []).flatMap((f) => [f.question, f.answer])].join(' '));
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
