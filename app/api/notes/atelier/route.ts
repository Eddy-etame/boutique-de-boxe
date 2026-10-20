import { revalidatePath } from 'next/cache';
import { adminEmail, db, readCatalog } from '@/lib/database';
import { cleanName, shop } from '@/lib/catalog';
import { estRefus, lireDemandeRetrait } from '@/lib/notes';
import { moyenneEnBase, notesAtelier, retablir, retirer } from '@/lib/notes-sql';
import { ensureNotes, memoriser } from '@/lib/notes-stockage';

/**
 * Les notes des produits dans l'atelier (20/10/2026), administration seulement.
 * GET : les 500 notes les plus récentes, avec leur modèle et leur statut.
 * POST : retirer une note (motif obligatoire, conservé) ou rétablir une note retirée ; la fiche du
 * modèle est régénérée aussitôt.
 */
export const dynamic = 'force-dynamic';

const reponse = (value: unknown, status = 200) =>
  Response.json(value, {
    status,
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'X-Robots-Tag': 'noindex, nofollow' },
  });

export async function GET() {
  if (!(await adminEmail())) return reponse({ error: 'Accès réservé à l’administration.' }, 403);
  try {
    await ensureNotes();
    const [{ notes, visibles, retirees }, catalogue] = await Promise.all([notesAtelier(await db()), readCatalog()]);
    const ids = new Set(notes.map((n) => n.product_id));
    const produits = Object.fromEntries(catalogue.filter((p) => ids.has(p.id)).map((p) => [p.id, { nom: cleanName(p), slug: p.slug }]));
    return reponse({ notes, visibles, retirees, produits });
  } catch (error) {
    console.error('notes atelier GET', (error as { code?: string }).code || (error as Error).name);
    return reponse({ error: 'Les notes sont momentanément illisibles.' }, 503);
  }
}

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin || ![new URL(request.url).origin, shop.origin, shop.intendedDomain].includes(origin))
    return reponse({ error: 'Origine de la demande invalide.' }, 403);
  const par = await adminEmail();
  if (!par) return reponse({ error: 'Accès réservé à l’administration.' }, 403);
  let data: unknown;
  try {
    const texte = await request.text();
    if (texte.length > 4000) return reponse({ error: 'Demande trop volumineuse.' }, 413);
    data = JSON.parse(texte);
  } catch {
    return reponse({ error: 'Demande illisible.' }, 400);
  }
  const demande = lireDemandeRetrait(data);
  if (estRefus(demande)) return reponse({ error: demande.erreur }, demande.statut);
  try {
    await ensureNotes();
    const database = await db();
    const produit =
      demande.action === 'retirer'
        ? await retirer(database, { id: demande.id, motif: demande.motif, precision: demande.precision, par })
        : await retablir(database, demande.id);
    if (!produit)
      return reponse({ error: demande.action === 'retirer' ? 'Cette note est déjà retirée, ou n’existe plus.' : 'Cette note est déjà visible, ou n’existe plus.' }, 409);
    const moyenne = await moyenneEnBase(database, produit);
    memoriser(produit, moyenne);
    // La fiche publie aussitôt la nouvelle moyenne (et son aggregateRating), sans attendre la minute.
    const slug = (await readCatalog()).find((p) => p.id === produit)?.slug;
    if (slug) revalidatePath('/produits/' + slug + '/');
    return reponse({ ok: true, produit, moyenne });
  } catch (error) {
    console.error('notes atelier POST', (error as { code?: string }).code || (error as Error).name);
    return reponse({ error: 'La modification n’a pas pu être enregistrée. Réessayez.' }, 503);
  }
}
