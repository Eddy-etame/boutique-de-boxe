/**
 * Boxtal : le choix du point relais sur une carte, au panier.
 *
 *   Gratuit : pas d’abonnement, pas de minimum ; Boxtal se paie à l’étiquette, à l’expédition.
 *   Il faut une application de type « Composant carte » créée sur developer.boxtal.com : elle donne
 *   une clé d’accès et une clé secrète. Ces deux clés restent sur le serveur (variables d’environnement
 *   BOXTAL_ACCESS_KEY et BOXTAL_SECRET_KEY) ; le serveur s’en sert pour obtenir un jeton d’une heure,
 *   le seul secret qui descend dans le navigateur, et qui ne sert qu’à afficher la carte.
 *
 *   Sans clés, la boutique le dit honnêtement : la carte arrive avec les ventes. Rien ne casse.
 */
const TOKEN_URL = 'https://api.boxtal.com/iam/account-app/token';
export const BOXTAL_MAP_SCRIPT = 'https://maps.boxtal.com/app/v3/assets/dependencies/@boxtal/parcel-point-map/dist/index.js';

/** Les réseaux affichés sur la carte, dans l’ordre des marqueurs. */
export const RELAY_NETWORKS = [
  { code: 'MONR_NETWORK', name: 'Mondial Relay', color: '#455c29' },
  { code: 'CHRP_NETWORK', name: 'Chronopost', color: '#2b3a67' },
  { code: 'SOGP_NETWORK', name: 'Relais Colis', color: '#8a3b12' },
  { code: 'UPSE_NETWORK', name: 'UPS Access Point', color: '#5b4a1c' },
  { code: 'POFR_NETWORK', name: 'Colissimo', color: '#1f5f8b' },
] as const;

export const boxtalConfigured = () => Boolean(process.env.BOXTAL_ACCESS_KEY && process.env.BOXTAL_SECRET_KEY);

let memo: { accessToken: string; expiresAt: number } | null = null;

/** Un jeton pour la carte (une heure), renouvelé une minute avant sa fin. Null si les clés manquent ou si Boxtal ne répond pas. */
export async function boxtalMapToken(): Promise<{ accessToken: string; expiresIn: number } | null> {
  if (!boxtalConfigured()) return null;
  if (memo && memo.expiresAt - Date.now() > 60000) return { accessToken: memo.accessToken, expiresIn: Math.floor((memo.expiresAt - Date.now()) / 1000) };
  const basic = Buffer.from(`${process.env.BOXTAL_ACCESS_KEY}:${process.env.BOXTAL_SECRET_KEY}`).toString('base64');
  try {
    const r = await fetch(TOKEN_URL, { method: 'POST', headers: { Authorization: 'Basic ' + basic, Accept: 'application/json' }, signal: AbortSignal.timeout(6000) });
    if (!r.ok) {
      console.error('boxtal token', r.status);
      return null;
    }
    const body = (await r.json()) as { accessToken?: string; expiresIn?: number };
    if (!body.accessToken) return null;
    const expiresIn = Number(body.expiresIn) > 0 ? Number(body.expiresIn) : 3600;
    memo = { accessToken: body.accessToken, expiresAt: Date.now() + expiresIn * 1000 };
    return { accessToken: body.accessToken, expiresIn };
  } catch (error) {
    console.error('boxtal token', (error as Error).name);
    return null;
  }
}

/** Le point relais retenu, tel qu’il est gardé sur la commande : de quoi le retrouver et l’écrire sur l’étiquette. */
export type RelayPoint = { code: string; network: string; name: string; address: string; postcode: string; city: string };

const text = (v: unknown, max: number) => (typeof v === 'string' && v.trim().length > 0 && v.length <= max ? v.trim() : null);

/** Valide ce que le navigateur envoie ; null si ce n’est pas un point relais complet. */
export function validateRelayPoint(v: unknown): RelayPoint | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  const code = text(o.code, 60);
  const network = text(o.network, 40);
  const name = text(o.name, 120);
  const address = text(o.address, 200);
  const postcode = typeof o.postcode === 'string' && /^\d{5}$/.test(o.postcode.trim()) ? o.postcode.trim() : null;
  const city = text(o.city, 80);
  if (!code || !network || !name || !address || !postcode || !city) return null;
  if (!/^[A-Za-z0-9_-]+$/.test(code) || !/^[A-Z0-9_]+$/.test(network)) return null;
  return { code, network, name, address, postcode, city };
}

export const networkName = (code: string) => RELAY_NETWORKS.find((n) => n.code === code)?.name || code;

/** Une ligne lisible : « Mondial Relay · Tabac du Centre, 12 rue de Fenouillet, 31200 Toulouse ». */
export function relayLabel(r: RelayPoint) {
  return `${networkName(r.network)} · ${r.name}, ${r.address}, ${r.postcode} ${r.city}`;
}

export function parseRelay(stored: string | null | undefined): RelayPoint | null {
  if (!stored) return null;
  try {
    return validateRelayPoint(JSON.parse(stored));
  } catch {
    return null;
  }
}
