import type { Product } from './catalog';

/**
 * Règle de prix du propriétaire (17 septembre 2026), dans ses mots : 15 % sous le prix des autres
 * boutiques, mais jamais une remise sur une remise. « Taking it down 15% after it has been taken
 * down by 30%, that's actually kind of a lot. We cannot go with that. »
 *
 *   1. Références du club (identifiants « mat- ») : le prix de la boutique du club, promotions
 *      comprises, jamais en dessous (lib/club-sync.ts). Cette règle ne les touche pas.
 *   2. Prix relevé déjà en promotion chez la boutique d’origine : on s’aligne, sans baisser encore.
 *   3. Prix relevé au tarif normal : 15 % en dessous.
 *   4. Un prix saisi dans l’atelier est final.
 *
 * L’import n’a gardé qu’un prix par référence, sans dire s’il était en promotion. On le reconnaît à
 * sa terminaison : un tarif normal finit en ,00 ,50 ,90 ,95 ,99… ; un prix remisé finit n’importe
 * comment (181,30 = 259 − 30 % ; 9,79 = 13,99 − 30 %). Sur 1 023 prix importés : 906 tarifs
 * normaux, 117 prix remisés dont 112 s’expliquent par une remise ronde sur un tarif normal. Dans le
 * doute, on ne baisse pas. Les fichiers gardent le prix relevé ; la règle s’applique à la lecture.
 */
export const REDUCTION = 0.15;
const RETAIL_ENDINGS = new Set([0, 49, 50, 80, 90, 95, 99]);

/** Le prix relevé ressemble-t-il à un tarif normal (et non à un prix déjà remisé) ? */
export const isRegularPrice = (cents: number) => RETAIL_ENDINGS.has(cents % 100);

export function ourPrice(publicCents: number): number {
  if (!Number.isFinite(publicCents) || publicCents <= 0 || !isRegularPrice(publicCents)) return publicCents;
  const target = publicCents * (1 - REDUCTION);
  // À partir de 50 €, le prix finit en ,90, au plus près sous la cible (au plus 2 % de baisse en plus) ;
  // en dessous, au pas de 10 centimes : arrondir un petit prix à ,90 le ferait baisser de près de 19 %.
  if (target >= 5000) return Math.floor((target - 90) / 100) * 100 + 90;
  return Math.max(10, Math.floor(target / 10) * 10);
}

export const followsClub = (id: string) => id.startsWith('mat-');

export function withOurPrice<T extends Product>(p: T): T {
  if (followsClub(p.id)) return p;
  return {
    ...p,
    price: ourPrice(p.price),
    variants: p.variants?.map((v) => ({ ...v, price: ourPrice(v.price) })),
  };
}
