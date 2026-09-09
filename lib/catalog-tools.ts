import type { Product } from './catalog';
export const normalizeSearch = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/(\d)\s*oz/g, '$1 oz')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
export function matchesSearch(p: Product, query: string) {
  const haystack = normalizeSearch(
    [p.name, p.brand, p.short, p.category, p.sizes.join(' '), p.sourceRef].join(
      ' ',
    ),
  );
  return normalizeSearch(query)
    .split(' ')
    .filter(Boolean)
    .every((t) => haystack.includes(t));
}
type Tool = {
  name: string;
  description: string;
  inputSchema: object;
  annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
  execute: (input: unknown) => unknown;
};
type ModelContext = {
  registerTool: (
    tool: Tool,
    options: { signal: AbortSignal },
  ) => void | Promise<void>;
};
export function registerCatalogTools(
  items: Product[],
  setQuery: (query: string) => void,
) {
  const ctx = (document as Document & { modelContext?: ModelContext })
    .modelContext;
  if (!ctx?.registerTool) return;
  const controller = new AbortController();
  const tool: Tool = {
    name: 'filter_catalogue',
    description:
      'Filtrer le catalogue visible par mots-clés. Retourne les références correspondantes ; ne réserve rien et ne souscrit aucune alerte.',
    inputSchema: {
      type: 'object',
      properties: { query: { type: 'string', maxLength: 120 } },
      required: ['query'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, untrustedContentHint: false },
    async execute(input) {
      if (
        !input ||
        typeof input !== 'object' ||
        Array.isArray(input) ||
        Object.keys(input).some((k) => k !== 'query') ||
        typeof (input as { query?: unknown }).query !== 'string' ||
        (input as { query: string }).query.length > 120
      )
        throw new Error('query doit être un texte de 120 caractères maximum.');
      const query = (input as { query: string }).query;
      setQuery(query);
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      return {
        query,
        products: items
          .filter((p) => matchesSearch(p, query))
          .map((p) => ({
            name: p.name,
            path: '/produits/' + p.slug + '/',
            priceIndicativeEUR: p.price / 100,
            status: 'Bientôt disponible',
          })),
      };
    },
  };
  try {
    void Promise.resolve(
      ctx.registerTool(tool, { signal: controller.signal }),
    ).catch(() => {});
  } catch {}
  return () => controller.abort();
}
