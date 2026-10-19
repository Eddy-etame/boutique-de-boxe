import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { listItem } from '@/lib/catalog';
import { readCatalog } from '@/lib/database';
import { matchesSearch } from '@/lib/catalog-tools';
import { catalogPage, PAGE_SIZE } from '@/lib/pagination';
import { Breadcrumb } from '@/components/shop-shell';
import { Catalog } from '@/components/shop-interactions';
import { slugMetadata } from '../[...slug]/metadata';

/**
 * Résultats de recherche (non indexés) : la page arrive déjà filtrée par la saisie de l’entête
 * (?q=), sans attendre le script. Elle lit la requête, donc elle a sa propre route, rendue à chaque
 * visite, pour que le catalogue, lui, reste statique.
 */
type Props = { searchParams: Promise<Record<string, string | undefined>> };
export function generateMetadata(): Promise<Metadata> {
  return slugMetadata(['recherche']);
}
export default async function RecherchePage({ searchParams }: Props) {
  const q = await searchParams;
  const query = (q.q || '').slice(0, 80).trim();
  const products = await readCatalog();
  const data = query ? products.filter((p) => matchesSearch(p, query)) : products;
  const currentPage = catalogPage(q.page, data.length);
  if (currentPage === null) notFound();
  return (
    <main id="contenu" className="page-wrap">
      <Breadcrumb items={[{ label: 'Recherche' }]} />
      <section className="page-heading">
        <div>
          <span className="eyebrow">LE CATALOGUE / INDEX</span>
          <h1>{query ? `« ${query} »` : 'Rechercher'}</h1>
        </div>
        <div>
          <div className="label">Tous les modèles.</div>
          <p>
            {query
              ? `${data.length} ${data.length === 1 ? 'modèle répond' : 'modèles répondent'} à « ${query} ». Affinez avec les filtres, ou changez de mot.`
              : 'Tous les modèles du catalogue, avec leurs tailles et leurs prix de vente TTC.'}
          </p>
        </div>
      </section>
      <Catalog
        items={data.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map(listItem)}
        total={data.length}
        scope="recherche"
        initialQuery={query}
        initialPage={currentPage}
        showFamilies
      />
    </main>
  );
}
