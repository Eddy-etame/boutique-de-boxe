import type { Metadata } from 'next';
import Home from '@/components/home';
import { readCatalog } from '@/lib/database';
import { homeGraph, PAGE_KEYWORDS } from '@/lib/seo';
import { HOME_FAQ } from '@/lib/seo-copy';
import { livraison } from '@/lib/catalog';
// Six heures (30/10/2026) : à 60 s, chaque page redevenait périmée entre deux passages d’un robot et se
// régénérait en rafale (18 réponses de 2 à 14 s sur 882 mesurées ce jour-là) ; une modification du
// catalogue appelle déjà revalidatePath('/', 'layout'), une note modérée revalide sa fiche.
export const revalidate = 21600;

/** Le titre de l’accueil : la requête de l’accueil d’abord, comme la première ligne du H1. */
const TITRE = 'Boutique de boxe, MMA et sports de combat en ligne';
/** « 1 042 » : insécable U+00A0, comme les prix (lib/catalog.ts, money). */
const nombre = (n: number) => n.toLocaleString('fr-FR').replace(/ /g, ' ');
/**
 * La description de l’accueil, calculée sur le catalogue du jour : le nombre de modèles, le nombre de marques
 * (toutes, pas seulement celles qui ont leur page ; « ELION » et « Elion » comptent pour une ; ni « marque à
 * préciser » ni la sélection maison) et la livraison avec ses seuils, lus dans lib/catalog.ts. Rien n’est écrit
 * en dur : un modèle ajouté dans l’atelier change la phrase à la minute (revalidate).
 */
function descriptionAccueil(items: { brand: string }[]) {
  const marques = new Set(
    items
      .map((p) => (p.brand || '').trim())
      .filter((b) => b && !/pr[ée]ciser|^Sélection /i.test(b))
      .map((b) => b.toLowerCase()),
  ).size;
  return `${nombre(items.length)} modèles pour la boxe, le MMA et les arts martiaux, ${nombre(marques)} marques, prix TTC. Livraison en ${livraison.zone} : point relais ${livraison.relais}, offert dès ${livraison.franco}.`;
}

export async function generateMetadata(): Promise<Metadata> {
  const items = await readCatalog();
  return {
    title: { absolute: TITRE },
    description: descriptionAccueil(items),
    alternates: { canonical: '/', languages: { 'fr-FR': '/', 'x-default': '/' } },
    keywords: PAGE_KEYWORDS[''],
  };
}
export default async function Page() {
  const items = await readCatalog();
  return (
    <>
      <Home items={items} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: homeGraph(items, HOME_FAQ) }} />
    </>
  );
}
