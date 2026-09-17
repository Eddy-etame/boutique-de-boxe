import type { Metadata } from 'next';
import { readCatalog } from '@/lib/database';
import { Breadcrumb } from '@/components/shop-shell';
import { StageLab } from '@/components/stage-lab';
import './labo.css';

/** Banc d’essai interne : hors index, hors plan de site, aucun lien public n’y mène. */
export const metadata: Metadata = {
  title: 'Banc d’essai de la scène produit',
  robots: { index: false, follow: false },
};

// Un échantillon qui couvre les cas difficiles : objets posés, photos portées, modèles
// très clairs, très sombres, très colorés, grands (sacs) et petits (protège-dents).
const FAMILIES: [string, number][] = [
  ['gants-de-boxe', 8],
  ['gants-mma', 3],
  ['protections-boxe', 4],
  ['textile-boxe', 4],
  ['sacs-de-frappe', 2],
  ['chaussures-boxe', 2],
  ['accessoires-boxe', 3],
  ['equipement-entrainement', 2],
];

export default async function LaboPage() {
  const all = (await readCatalog()).filter((p) => p.cut);
  const picked = FAMILIES.flatMap(([family, n]) => {
    const pool = all.filter((p) => p.category === family);
    // Un pas régulier dans la famille plutôt que ses premiers modèles : marques et coloris variés.
    const step = Math.max(1, Math.floor(pool.length / n));
    return Array.from({ length: n }, (_, i) => pool[i * step]).filter(Boolean);
  });
  return (
    <main id="contenu" className="page-wrap">
      <Breadcrumb items={[{ label: 'Banc d’essai' }]} />
      <section className="page-heading">
        <div>
          <span className="eyebrow">INTERNE / LA SCÈNE PRODUIT</span>
          <h1>
            Trois scènes,
            <br />
            deux dispositions.
          </h1>
        </div>
        <p>
          Les mêmes {picked.length} modèles, détourés, sur chaque scène. Choisissez
          à l’œil : la scène retenue habillera la boutique entière, les fiches
          et les vignettes de partage.
        </p>
      </section>
      <StageLab items={picked} />
    </main>
  );
}
