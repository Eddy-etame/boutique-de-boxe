import { db, ensureSchema } from './database';
import { NOTES_MANQUE, NOTES_SCHEMA, moyennesEnBase } from './notes-sql';
import type { Moyenne } from './notes';

/**
 * Les notes des produits côté serveur (20/10/2026) : schéma, empreintes salées, cookie d'appareil et
 * moyennes en mémoire pour les fiches. La logique SQL est dans lib/notes-sql.ts.
 */

/**
 * La table naît par le mécanisme commun (lib/database.ts, ensureSchema) : une lecture du catalogue
 * système par instance, CREATE et ALTER seulement s'il manque quelque chose, avec lock_timeout.
 * Appelée par l'envoi d'une note et par l'atelier, jamais par le rendu d'une fiche.
 * Le même SQL est dans drizzle/0007_notes_des_produits.sql, à passer une fois par le propriétaire.
 */
export const ensureNotes = () => ensureSchema('product_ratings', NOTES_MANQUE, NOTES_SCHEMA);

const hex = (buf: ArrayBuffer) => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');

/**
 * La clé des empreintes : NOTES_SEL quand le propriétaire l'a posée, sinon une clé tirée de
 * DATABASE_URL, un secret du serveur qui n'est jamais écrit dans la base. Une fuite de la table seule
 * ne permet donc pas de retrouver une adresse en essayant toutes les IPv4.
 */
let cle: Promise<CryptoKey> | null = null;
const cleEmpreintes = () =>
  (cle ??= crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode('bdb-notes:' + (process.env.NOTES_SEL || process.env.DATABASE_URL || '')),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  ));
/** Empreinte salée (HMAC-SHA-256) d'une adresse réseau ou d'un identifiant d'appareil. */
export async function empreinte(nature: 'ip' | 'appareil', valeur: string) {
  return hex(await crypto.subtle.sign('HMAC', await cleEmpreintes(), new TextEncoder().encode(nature + ':' + valeur)));
}

/**
 * L'appareil : un identifiant aléatoire de 128 bits dans un cookie technique, posé au moment où le
 * visiteur note (strictement nécessaire à « une note par appareil », donc sans consentement préalable),
 * HttpOnly, lié à l'hôte en HTTPS (__Host-), treize mois. Seule son empreinte va en base.
 */
const COOKIE = '__Host-bdb-note';
const COOKIE_LOCAL = 'bdb-note';
const DUREE = 395 * 86400;
export function appareilDe(request: Request): string {
  const lu = /(?:^|;\s*)(?:__Host-bdb-note|bdb-note)=([A-Za-z0-9_-]{22})(?:;|$)/.exec(request.headers.get('cookie') || '')?.[1];
  if (lu) return lu;
  const octets = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...octets)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export const cookieAppareil = (id: string, https: boolean) =>
  `${https ? COOKIE : COOKIE_LOCAL}=${id}; Path=/; Max-Age=${DUREE}; HttpOnly; SameSite=Lax${https ? '; Secure' : ''}`;

/**
 * Les moyennes visibles de tous les modèles, gardées une minute par instance (comme le catalogue) :
 * une fiche régénérée toutes les minutes ne coûte pas une requête de plus. Table absente (aucune note
 * encore) ou base injoignable : rien n'est affiché, la fiche ne tombe jamais pour une note.
 */
const TTL = 60000;
declare global {
  // eslint-disable-next-line no-var
  var __notesMemo: { at: number; data: Map<string, Moyenne> } | undefined;
}
export async function moyennes(): Promise<Map<string, Moyenne>> {
  const memo = globalThis.__notesMemo;
  if (memo && Date.now() - memo.at < TTL) return memo.data;
  let data: Map<string, Moyenne>;
  try {
    data = await moyennesEnBase(await db());
  } catch (error) {
    const code = (error as { code?: string }).code || '';
    if (code !== '42P01') console.error('notes : moyennes indisponibles', code, String((error as Error).message || '').slice(0, 120));
    data = memo?.data ?? new Map();
  }
  globalThis.__notesMemo = { at: Date.now(), data };
  return data;
}
/** La moyenne visible d'un modèle, ou null : ce que la fiche affiche et publie en JSON-LD. */
export async function moyenneDuModele(produit: string): Promise<Moyenne | null> {
  return (await moyennes()).get(produit) ?? null;
}
/** Après une note ou un retrait, cette instance voit la nouvelle moyenne sans attendre la minute. */
export function memoriser(produit: string, moyenne: Moyenne | null) {
  const memo = globalThis.__notesMemo;
  if (!memo) return;
  if (moyenne) memo.data.set(produit, moyenne);
  else memo.data.delete(produit);
}
