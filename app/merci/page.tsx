import type { Metadata } from 'next';
import { readCatalog } from '@/lib/database';
import { listItem } from '@/lib/catalog';
import { weeklySelection } from '@/lib/hub';
import { Breadcrumb, ArrowLink } from '@/components/shop-shell';
import { ProductCard } from '@/components/shop-interactions';
import { MerciPhone } from '@/components/merci-phone';

/**
 * La page « merci » : après l'inscription à l'alerte d'ouverture (la lettre), la boutique dit merci,
 * propose le mobile en second temps (facultatif, référence à usage unique), puis quatre modèles
 * de la semaine pour continuer la visite. Privée par nature : jamais indexée.
 */
export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Merci, vous êtes inscrit',
  description: 'Votre inscription à l’ouverture des ventes de Boutique de Boxe est enregistrée.',
  robots: { index: false, follow: true },
  alternates: { canonical: '/merci/' },
};
type Props = { searchParams: Promise<Record<string, string | undefined>> };

export default async function MerciPage({ searchParams }: Props) {
  const q = await searchParams;
  const ref = typeof q.ref === 'string' && /^[0-9a-f-]{36}$/.test(q.ref) ? q.ref : '';
  const email = typeof q.email === 'string' && q.email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(q.email) ? q.email : '';
  const already = q.deja === '1';
  const products = await readCatalog();
  const model = typeof q.modele === 'string' ? products.find((p) => p.slug === q.modele) : undefined;
  const picks = weeklySelection('merci', products.filter((p) => p.cut?.mode === 'pose' && p.price > 0)).map(listItem);
  return (
    <main id="contenu" className="page-wrap">
      <Breadcrumb items={[{ label: 'Merci' }]} />
      <section className="merci">
        <span className="eyebrow">{already ? 'DÉJÀ INSCRIT' : 'C’EST NOTÉ'}</span>
        <h1>
          Merci.
          <br />
          {already ? 'Vous étiez déjà de la partie.' : 'Vous serez prévenu le jour J.'}
        </h1>
        <p>
          {already
            ? 'Cette adresse est déjà inscrite : un seul e-mail, le matin de l’ouverture des ventes, rien d’autre.'
            : 'Un seul e-mail, le matin de l’ouverture des ventes' + (model ? `, pour ${model.name}` : '') + '. Rien d’autre, et un lien de désinscription dedans.'}
        </p>
        {ref && email && !already && <MerciPhone email={email} reference={ref} />}
        <div className="merci-next">
          <ArrowLink href={model ? '/produits/' + model.slug + '/' : '/gants-de-boxe/'}>{model ? 'Revoir ' + model.name : 'Voir les gants de boxe'}</ArrowLink>
          <ArrowLink href="/outils/poids-de-gants/">Quel poids de gants pour moi ?</ArrowLink>
          <ArrowLink href="/#preparer">Préparer mon sac de séance</ArrowLink>
        </div>
      </section>
      {picks.length > 0 && (
        <section className="merci-picks">
          <h2>
            En attendant l’ouverture,
            <br />
            quatre modèles de la semaine.
          </h2>
          <div className="product-grid">
            {picks.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
