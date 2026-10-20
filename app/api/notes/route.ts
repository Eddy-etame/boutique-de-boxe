import { db, readCatalog } from '@/lib/database';
import { shop } from '@/lib/catalog';
import { clientIp } from '@/lib/request';
import { champPiegeRempli, estRefus, estRobot, lireDemandeNote, reseauDe } from '@/lib/notes';
import { noter } from '@/lib/notes-sql';
import { appareilDe, cookieAppareil, empreinte, ensureNotes, memoriser } from '@/lib/notes-stockage';

/**
 * POST /api/notes : la note d'un visiteur sur une fiche (20/10/2026). Des étoiles de 1 à 5, sans texte
 * ni compte. Contrôles, dans l'ordre : origine du site, JSON borné à 2 Ko, robots (agent déclaré ou
 * champ piège rempli), modèle existant, entier de 1 à 5, 30 notes par heure et par connexion, puis une
 * note par appareil et par modèle (mise à jour) et trois appareils au plus par connexion et par modèle.
 * Réponse : la nouvelle moyenne visible du modèle.
 */
export const dynamic = 'force-dynamic';

const MERCI = 'Merci, votre note est enregistrée.';
const PAR_HEURE = 30;
const reponse = (value: unknown, status = 200, extra: Record<string, string> = {}) =>
  Response.json(value, {
    status,
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'X-Robots-Tag': 'noindex', ...extra },
  });

/** Le corps lu au plus à `max` octets : une demande plus grosse est refusée avant d'être désérialisée. */
async function lireBorne(request: Request, max: number) {
  const reader = request.body?.getReader();
  if (!reader) throw new SyntaxError('vide');
  const parts: Uint8Array[] = [];
  let taille = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    taille += value.byteLength;
    if (taille > max) {
      await reader.cancel();
      throw new RangeError('trop long');
    }
    parts.push(value);
  }
  const tout = new Uint8Array(taille);
  let i = 0;
  for (const p of parts) {
    tout.set(p, i);
    i += p.byteLength;
  }
  return new TextDecoder().decode(tout);
}

/** Limite par connexion et par heure, sur la table rate_limits commune aux formulaires (clé propre aux notes). */
async function tropDeNotes(reseau: string) {
  const heure = Math.floor(Date.now() / 3600000);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${reseau}:${heure}:notes`));
  const key = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
  const hits = await (await db())
    .prepare('INSERT INTO rate_limits(key,hits,expires) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET hits=rate_limits.hits+1 RETURNING hits')
    .bind(key, (heure + 2) * 3600000)
    .first<number>('hits');
  return (hits || 0) > PAR_HEURE;
}

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin || ![new URL(request.url).origin, shop.origin, shop.intendedDomain].includes(origin))
    return reponse({ error: 'Origine de la demande invalide.' }, 403);
  if (!request.headers.get('content-type')?.includes('application/json')) return reponse({ error: 'Format de demande invalide.' }, 415);
  let data: unknown;
  try {
    data = JSON.parse(await lireBorne(request, 2048));
  } catch (error) {
    return error instanceof RangeError ? reponse({ error: 'Demande trop volumineuse.' }, 413) : reponse({ error: 'Demande illisible.' }, 400);
  }
  // Filtre des robots : rien n'est enregistré, la raison reste au journal.
  const piege = champPiegeRempli(data);
  if (piege || estRobot(request.headers.get('user-agent'))) {
    console.warn('notes : robot écarté,', piege ? 'champ piège rempli' : 'agent de robot');
    return reponse({ error: 'La note n’a pas pu être enregistrée.' }, 400);
  }
  try {
    const catalogue = await readCatalog();
    const demande = lireDemandeNote(data, (id) => catalogue.some((p) => p.id === id));
    if (estRefus(demande)) return reponse({ error: demande.erreur }, demande.statut);
    const reseau = reseauDe(clientIp(request));
    if (await tropDeNotes(reseau)) return reponse({ error: 'Trop de notes rapprochées. Réessayez dans une heure.' }, 429);
    await ensureNotes();
    const appareil = appareilDe(request);
    const resultat = await noter(await db(), {
      produit: demande.produit,
      etoiles: demande.etoiles,
      ip: await empreinte('ip', reseau),
      appareil: await empreinte('appareil', appareil),
    });
    if ('refus' in resultat) return reponse({ error: resultat.refus }, 429);
    memoriser(demande.produit, resultat.moyenne);
    return reponse(
      { ok: true, message: MERCI, etoiles: demande.etoiles, statut: resultat.statut, moyenne: resultat.moyenne },
      resultat.statut === 'nouvelle' ? 201 : 200,
      // Le cookie de l'appareil est posé (ou prolongé) à chaque note : treize mois après la dernière.
      { 'Set-Cookie': cookieAppareil(appareil, new URL(request.url).protocol === 'https:') },
    );
  } catch (error) {
    console.error('notes POST', (error as { code?: string }).code || (error as Error).name, String((error as Error).message || '').slice(0, 160));
    return reponse({ error: 'La note n’a pas pu être enregistrée pour le moment. Réessayez dans un instant.' }, 503);
  }
}
