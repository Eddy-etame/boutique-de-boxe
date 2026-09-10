'use client';

import { useEffect, useMemo, useState, type SyntheticEvent } from 'react';

type ImportItem = {
  id: string;
  name: string;
  sourceUrl: string;
  source: string;
  publication: string;
  issues: string[];
  image: string | null;
  /** Price in integer EUR cents, or null when unconfirmed. */
  price: number | null;
};
type ImportData = {
  items: ImportItem[];
  total: number;
  page: number;
  pages: number;
  /** Global, deduplicated registry counts; independent of the active filters. */
  counts: { collected: number; ready: number; review: number };
};
type Filters = { source: string; state: string; q: string; page: number };
type SourceOption = { value: string; label: string };
type Props = {
  /** Pass the full server-known source list, not just sources on the current page. */
  sources?: SourceOption[];
};
const initialFilters: Filters = { source: '', state: '', q: '', page: 1 };
const defaultSources: SourceOption[] = [
  { value: 'Boxing-Shop', label: 'Boxing-Shop' },
];
const number = new Intl.NumberFormat('fr-FR');
const currency = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
});
const issueLabels: Record<string, { title: string; action: string }> = {
  technical_facts_sparse: {
    title: 'Caractéristiques insuffisantes',
    action:
      'Relever les caractéristiques du modèle exact avant de rédiger sa fiche.',
  },
  price_not_confirmed: {
    title: 'Prix à confirmer',
    action:
      'Vérifier le prix, sa devise et la déclinaison concernée ; une valeur absente ne vaut pas zéro.',
  },
  source_description_incomplete: {
    title: 'Description source incomplète',
    action:
      'Reprendre la fiche source et compléter les informations manquantes.',
  },
  family_requires_review: {
    title: 'Classement à revoir',
    action:
      'Identifier la famille et les pratiques adaptées avant de publier le produit.',
  },
  image_missing: {
    title: 'Visuel manquant',
    action:
      'Retrouver un visuel correspondant à cette référence et conserver son origine.',
  },
  image_dimensions_unverified: {
    title: 'Image à contrôler',
    action:
      'Vérifier le chargement, les dimensions et la correspondance avec la référence.',
  },
  variants_unverified: {
    title: 'Déclinaisons à vérifier',
    action:
      'Relever les tailles et coloris effectivement décrits par la source.',
  },
  duplicate_candidate: {
    title: 'Doublon possible',
    action:
      'Comparer les références fabricant et les déclinaisons avant de fusionner les fiches.',
  },
};
const publicationLabels: Record<
  string,
  { label: string; kind: string; explanation: string }
> = {
  ready: {
    label: 'Prêt à relire',
    kind: 'ready',
    explanation:
      'La normalisation ne signale pas d’anomalie. La fiche et les visuels restent à vérifier avant publication.',
  },
  review: {
    label: 'À compléter',
    kind: 'review',
    explanation:
      'Des éléments identifiés ci-dessous demandent une vérification.',
  },
  published: {
    label: 'Publié',
    kind: 'published',
    explanation:
      'Une fiche a été publiée. Les éventuelles anomalies du relevé source restent visibles ici.',
  },
  archived: {
    label: 'Archivé',
    kind: 'archived',
    explanation:
      'Ce relevé est conservé dans le registre et ne constitue pas une fiche active.',
  },
  rejected: {
    label: 'Écarté',
    kind: 'archived',
    explanation: 'Ce relevé a été écarté de la sélection à publier.',
  },
};

function safeLink(value: string | null | undefined, allowLocal = false) {
  if (!value) return null;
  if (
    allowLocal &&
    /^\/(?:products|assets|media\/catalogue)\/[a-zA-Z0-9/_%.+-]+$/.test(value)
  )
    return value;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}
function host(value: string | null | undefined) {
  if (!value) return 'Origine non renseignée';
  if (value.startsWith('/')) return 'Médiathèque de la boutique';
  try {
    return new URL(value).hostname.replace(/^www\./, '');
  } catch {
    return 'Adresse à vérifier';
  }
}
function ImagePreview({ src }: { src: string | null }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="imports-image">
      {src && !failed ? (
        <img
          src={src}
          width={88}
          height={88}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <span>{src ? 'Image indisponible' : 'Sans visuel'}</span>
      )}
    </div>
  );
}

/** Private, read-only ingestion ledger. Intentionally no publish or delete action. */
export function CatalogueImports({ sources = defaultSources }: Props) {
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [search, setSearch] = useState('');
  const [data, setData] = useState<ImportData>();
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const sourceOptions = useMemo(() => {
    const options = new Map(
      sources.map((source) => [source.value, source.label]),
    );
    for (const item of data?.items || [])
      if (item.source)
        options.set(item.source, options.get(item.source) || item.source);
    if (filters.source && !options.has(filters.source))
      options.set(filters.source, filters.source);
    return [...options].map(([value, label]) => ({ value, label }));
  }, [sources, data, filters.source]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const query = new URLSearchParams({ page: String(filters.page) });
    if (filters.source) query.set('source', filters.source);
    if (filters.state) query.set('state', filters.state);
    if (filters.q) query.set('q', filters.q);
    fetch('/api/admin-imports?' + query, {
      credentials: 'same-origin',
      cache: 'no-store',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
      .then(async (response) => {
        const body = (await response.json()) as ImportData & { error?: string };
        if (!response.ok)
          throw new Error(
            response.status === 401 || response.status === 403
              ? 'Cette liste est réservée à l’administration. Reconnectez-vous pour la consulter.'
              : body.error || 'Le registre est temporairement indisponible.',
          );
        if (
          !Array.isArray(body.items) ||
          !body.counts ||
          !Number.isInteger(body.total) ||
          !Number.isInteger(body.page) ||
          !Number.isInteger(body.pages)
        ) {
          throw new Error(
            'La réponse du registre est incomplète. Réessayez le chargement.',
          );
        }
        if (active) setData(body);
      })
      .catch((reason: unknown) => {
        if (!active || controller.signal.aborted) return;
        setData(undefined);
        setError(
          reason instanceof Error
            ? reason.message
            : 'Le registre est temporairement indisponible.',
        );
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [filters, retry]);

  function updateFilters(next: Filters | ((previous: Filters) => Filters)) {
    setBusy(true);
    setError('');
    setFilters(next);
  }
  function applySearch(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    updateFilters((previous) => ({ ...previous, q: search.trim(), page: 1 }));
  }
  function reset() {
    setSearch('');
    updateFilters({ ...initialFilters });
  }
  const page = data?.page || filters.page;
  const total = data?.total || 0;
  const first = total && data?.items.length ? (page - 1) * 40 + 1 : 0;
  const last = first ? first + (data?.items.length || 0) - 1 : 0;
  const hasFilters = Boolean(filters.q || filters.source || filters.state);

  return (
    <section className="imports-register" aria-labelledby="imports-title">
      <style>{styles}</style>
      <header className="imports-heading">
        <div>
          <p className="imports-eyebrow">CATALOGUE / COLLECTE DES SOURCES</p>
          <h2 id="imports-title">Les références à préparer</h2>
          <p>
            Retrouvez les produits relevés, leur origine et les informations à
            vérifier avant de compléter le catalogue public.
          </p>
        </div>
        <span className="imports-private">Registre privé</span>
      </header>

      <dl
        className="imports-counts"
        aria-label="Totaux du registre, tous filtres confondus"
      >
        <div>
          <dt>Références collectées</dt>
          <dd>{data ? number.format(data.counts.collected) : '—'}</dd>
          <dd className="imports-count-note">
            Relevés conservés dans ce registre.
          </dd>
        </div>
        <div>
          <dt>Prêtes à relire</dt>
          <dd>{data ? number.format(data.counts.ready) : '—'}</dd>
          <dd className="imports-count-note">
            Sans anomalie de normalisation signalée.
          </dd>
        </div>
        <div>
          <dt>À compléter</dt>
          <dd>{data ? number.format(data.counts.review) : '—'}</dd>
          <dd className="imports-count-note">
            Au moins une vérification identifiée.
          </dd>
        </div>
      </dl>
      <p className="imports-scope">
        <strong>Une collecte n’est pas une publication.</strong> Le statut «
        Prêt à relire » ne valide ni les déclinaisons, ni les images, ni la
        rédaction finale. Les prix sont ceux du relevé source, en euros.
      </p>

      <form
        className="imports-filters"
        onSubmit={applySearch}
        aria-label="Filtrer les références collectées"
      >
        <label className="imports-search">
          Nom ou référence
          <span>
            <input
              type="search"
              name="q"
              maxLength={120}
              value={search}
              placeholder="Ex. gants, kimono, référence fabricant…"
              onChange={(event) => setSearch(event.target.value)}
            />
            <button type="submit">Rechercher</button>
          </span>
        </label>
        <label>
          Source
          <select
            value={filters.source}
            onChange={(event) =>
              updateFilters((previous) => ({
                ...previous,
                source: event.target.value,
                page: 1,
              }))
            }
          >
            <option value="">Toutes les sources</option>
            {sourceOptions.map((source) => (
              <option key={source.value} value={source.value}>
                {source.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          État du relevé
          <select
            value={filters.state}
            onChange={(event) =>
              updateFilters((previous) => ({
                ...previous,
                state: event.target.value,
                page: 1,
              }))
            }
          >
            <option value="">Tous les états</option>
            <option value="ready">Prêt à relire</option>
            <option value="review">À compléter</option>
            <option value="published">Publié</option>
            <option value="archived">Archivé</option>
          </select>
        </label>
        {hasFilters && (
          <button type="button" className="imports-reset" onClick={reset}>
            Tout afficher
          </button>
        )}
      </form>

      <div className="imports-results-bar" role="status" aria-live="polite">
        {busy ? (
          <span>Chargement du registre…</span>
        ) : data ? (
          <span>
            {number.format(total)} résultat{total > 1 ? 's' : ''}
            {filters.q ? ` pour « ${filters.q} »` : ''}
            {first ? ` · ${number.format(first)}–${number.format(last)}` : ''}
          </span>
        ) : (
          <span>Registre indisponible</span>
        )}
        <span>40 références par page</span>
      </div>

      {error && (
        <div className="imports-error" role="alert">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => {
              setBusy(true);
              setError('');
              setRetry((value) => value + 1);
            }}
          >
            Réessayer
          </button>
        </div>
      )}

      <div className="imports-list" aria-busy={busy}>
        {!busy && !error && data?.items.length === 0 && (
          <div className="imports-empty">
            <h3>
              {hasFilters
                ? 'Aucun relevé ne correspond à ces filtres.'
                : 'Le registre ne contient pas encore de relevé.'}
            </h3>
            <p>
              {hasFilters
                ? 'Essayez une autre référence ou revenez à l’ensemble de la collecte.'
                : 'Les références apparaîtront ici lorsque leur collecte aura été enregistrée.'}
            </p>
            {hasFilters && (
              <button type="button" onClick={reset}>
                Afficher toute la collecte
              </button>
            )}
          </div>
        )}

        {!busy &&
          !error &&
          data?.items.map((item) => {
            const sourceUrl = safeLink(item.sourceUrl);
            const imageUrl = safeLink(item.image, true);
            const status = publicationLabels[item.publication] || {
              label: 'État à vérifier',
              kind: 'review',
              explanation: `État reçu : ${item.publication || 'non renseigné'}.`,
            };
            const issues = [...new Set(item.issues || [])];
            const unconfirmedPrice =
              issues.includes('price_not_confirmed') ||
              !Number.isSafeInteger(item.price) ||
              (item.price ?? -1) < 0;
            return (
              <article
                key={item.id}
                className="imports-row"
                aria-labelledby={'import-' + item.id}
              >
                <ImagePreview key={imageUrl || item.id} src={imageUrl} />
                <div className="imports-product">
                  <p className="imports-reference">
                    {item.source || 'Source non renseignée'}{' '}
                    <span>· {item.id}</span>
                  </p>
                  <h3 id={'import-' + item.id}>
                    {item.name || 'Nom à renseigner'}
                  </h3>
                  <p className="imports-price">
                    {unconfirmedPrice
                      ? 'Prix à confirmer'
                      : currency.format(item.price! / 100)}
                    <span>{unconfirmedPrice ? '' : ' · prix relevé'}</span>
                  </p>
                  <div className="imports-provenance">
                    {sourceUrl ? (
                      <a
                        href={sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Fiche source <span aria-hidden="true">↗</span>
                        <span className="imports-host">{host(sourceUrl)}</span>
                      </a>
                    ) : (
                      <span>Fiche source : adresse absente ou à vérifier</span>
                    )}
                    {imageUrl ? (
                      <a
                        href={imageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Origine du visuel <span aria-hidden="true">↗</span>
                        <span className="imports-host">{host(imageUrl)}</span>
                      </a>
                    ) : (
                      <span>Visuel : adresse absente ou à vérifier</span>
                    )}
                  </div>
                </div>
                <div className="imports-review">
                  <span
                    className={'imports-badge imports-badge-' + status.kind}
                  >
                    {status.label}
                  </span>
                  <p className="imports-status-explanation">
                    {status.explanation}
                  </p>
                  {issues.length > 0 ? (
                    <details>
                      <summary>
                        {issues.length} point{issues.length > 1 ? 's' : ''} à
                        vérifier
                      </summary>
                      <ul>
                        {issues.map((issue) => {
                          const detail = issueLabels[issue];
                          return (
                            <li key={issue}>
                              <strong>
                                {detail?.title || 'Vérification complémentaire'}
                              </strong>
                              <p>
                                {detail?.action ||
                                  `Consulter le relevé pour comprendre ce signalement : ${issue}.`}
                              </p>
                            </li>
                          );
                        })}
                      </ul>
                    </details>
                  ) : (
                    <p className="imports-no-issue">
                      Aucune anomalie de normalisation signalée.
                    </p>
                  )}
                </div>
              </article>
            );
          })}
      </div>

      {data && data.pages > 1 && (
        <nav
          className="imports-pagination"
          aria-label="Pages du registre des imports"
        >
          <button
            type="button"
            disabled={busy || page <= 1}
            onClick={() =>
              updateFilters((previous) => ({
                ...previous,
                page: Math.max(1, page - 1),
              }))
            }
          >
            ← Précédente
          </button>
          <span>
            Page {number.format(page)} sur {number.format(data.pages)}
          </span>
          <button
            type="button"
            disabled={busy || page >= data.pages}
            onClick={() =>
              updateFilters((previous) => ({
                ...previous,
                page: Math.min(data.pages, page + 1),
              }))
            }
          >
            Suivante →
          </button>
        </nav>
      )}
    </section>
  );
}

const styles = `
.imports-register{--imports-rule:#d5d7cf;--imports-ink:#202820;color:var(--imports-ink);margin-top:32px;max-width:1280px}
.imports-register *{box-sizing:border-box}.imports-register button,.imports-register input,.imports-register select{font:inherit}
.imports-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:24px;border-bottom:2px solid var(--imports-ink);padding-bottom:22px}
.imports-eyebrow{font-size:10px;font-weight:800;letter-spacing:.12em;margin:0 0 12px}.imports-heading h2{font-size:clamp(27px,3vw,40px);line-height:1.08;margin:0 0 12px;letter-spacing:-.035em}.imports-heading p:last-child{max-width:720px;margin:0;font-size:14px;line-height:1.6}
.imports-private{border:1px solid var(--imports-rule);padding:7px 10px;font-size:11px;white-space:nowrap}
.imports-counts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));margin:0;border-bottom:1px solid var(--imports-rule)}.imports-counts>div{padding:21px 20px 18px 0}.imports-counts>div+div{padding-left:24px;border-left:1px solid var(--imports-rule)}.imports-counts dt{font-size:12px;font-weight:700}.imports-counts dd{font-size:36px;line-height:1.2;letter-spacing:-.04em;margin:7px 0}.imports-counts .imports-count-note{font-size:11px;line-height:1.5;letter-spacing:normal;margin:0;color:#596158}
.imports-scope{font-size:12px;line-height:1.6;margin:18px 0 25px;max-width:930px}.imports-scope strong{font-weight:750}
.imports-filters{display:flex;flex-wrap:wrap;align-items:flex-end;gap:12px}.imports-filters label{display:grid;gap:7px;font-size:11px;font-weight:750;min-width:155px}.imports-search{flex:1;min-width:260px!important}.imports-search>span{display:flex}.imports-filters input,.imports-filters select{min-height:44px;border:1px solid #9a9e95;border-radius:0;background:#fff;padding:10px 12px;font-size:13px;width:100%;color:var(--imports-ink)}.imports-search input{min-width:0;border-right:0}.imports-register button{min-height:44px;border:1px solid var(--imports-ink);border-radius:0;background:var(--imports-ink);color:#fff;padding:9px 13px;cursor:pointer;font-size:12px;font-weight:700}.imports-register button:disabled{opacity:.45;cursor:default}.imports-register .imports-reset{background:transparent;color:var(--imports-ink);border-color:var(--imports-rule)}
.imports-register :is(a,button,input,select,summary):focus-visible{outline:3px solid #727c00;outline-offset:3px}.imports-register a{text-underline-offset:3px}
.imports-results-bar{display:flex;justify-content:space-between;gap:15px;font-size:11px;line-height:1.5;padding:19px 0 11px;border-bottom:1px solid var(--imports-rule)}.imports-results-bar>span:last-child{color:#62695e}.imports-list[aria-busy=true]{min-height:150px}
.imports-row{display:grid;grid-template-columns:88px minmax(180px,1fr) minmax(210px,.72fr);gap:22px;padding:23px 0;border-bottom:1px solid var(--imports-rule)}.imports-image{width:88px;height:88px;display:grid;place-items:center;background:#f0f1eb;padding:5px}.imports-image img{object-fit:contain;width:100%;height:100%}.imports-image span{font-size:10px;line-height:1.45;text-align:center;color:#68705f}
.imports-reference{font-size:10px;margin:0 0 7px;font-weight:750}.imports-reference span{font-weight:400;overflow-wrap:anywhere}.imports-product h3{font-size:17px;line-height:1.3;margin:0 0 10px;letter-spacing:-.015em}.imports-price{font-size:13px;font-weight:700;margin:0 0 14px}.imports-price span{font-size:11px;font-weight:400;color:#62695e}.imports-provenance{display:flex;flex-wrap:wrap;gap:12px 20px;font-size:11px;line-height:1.5}.imports-provenance a{color:inherit}.imports-host{display:block;color:#62695e;font-size:10px;overflow-wrap:anywhere}
.imports-review{border-left:1px solid var(--imports-rule);padding-left:22px}.imports-badge{display:inline-block;padding:5px 8px;font-size:10px;font-weight:800;line-height:1.2;border:1px solid transparent}.imports-badge-ready{background:#eef0d0;border-color:#ccd2a1}.imports-badge-review{background:#fff1de;border-color:#ddc39b}.imports-badge-published{background:#e3eee3;border-color:#b6c8b5}.imports-badge-archived{background:#eee;border-color:#ccc}.imports-status-explanation,.imports-no-issue{font-size:11px;line-height:1.55;margin:9px 0;color:#596158}.imports-review summary{font-size:12px;font-weight:700;cursor:pointer;padding:5px 0}.imports-review ul{list-style:none;padding:0;margin:8px 0 0}.imports-review li{margin:0 0 11px}.imports-review li strong{font-size:11px}.imports-review li p{font-size:11px;line-height:1.55;margin:3px 0 0}.imports-no-issue{font-style:italic}
.imports-pagination{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:22px 0}.imports-pagination span{font-size:12px}.imports-register .imports-pagination button{background:transparent;color:var(--imports-ink);border-color:var(--imports-rule)}.imports-error,.imports-empty{padding:28px 0;max-width:680px}.imports-error p,.imports-empty p{font-size:13px;line-height:1.6}.imports-error{color:#7b281e}.imports-empty h3{font-size:20px;margin:0}
@media(max-width:780px){.imports-heading{gap:12px}.imports-heading h2{font-size:29px}.imports-private{font-size:10px}.imports-counts>div{padding:18px 10px 15px 0}.imports-counts>div+div{padding-left:12px}.imports-counts dt{font-size:10px}.imports-counts dd{font-size:29px}.imports-counts .imports-count-note{display:none}.imports-filters label:not(.imports-search){flex:1;min-width:130px}.imports-search{flex-basis:100%}.imports-row{grid-template-columns:72px minmax(0,1fr);gap:14px}.imports-image{width:72px;height:72px}.imports-review{grid-column:2;border:0;padding:0}.imports-product h3{font-size:16px}.imports-price{margin-bottom:10px}.imports-review .imports-status-explanation{max-width:460px}.imports-results-bar{font-size:10px}}
@media(max-width:420px){.imports-heading{display:block}.imports-private{display:inline-block;margin-top:13px}.imports-counts dd{font-size:26px}.imports-row{grid-template-columns:60px minmax(0,1fr);gap:12px}.imports-image{width:60px;height:68px}.imports-search{min-width:0!important}.imports-search>span{width:100%}.imports-search button{padding:9px;font-size:11px}.imports-pagination button{padding:9px!important;font-size:11px}.imports-pagination span{font-size:10px}.imports-results-bar{display:block}.imports-results-bar>span:last-child{display:block;margin-top:4px}}
`;
