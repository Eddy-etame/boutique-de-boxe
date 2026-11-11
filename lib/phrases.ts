/**
 * Un titre ou une description ne se coupe jamais au milieu d'un mot (11/11/2026 : « Livraison en Fra », un titre
 * sans son « € »). On écrit les formules de la plus complète à la plus courte ; la première qui tient est la bonne.
 */
export const quiTient = (max: number, ...formules: string[]) => formules.find((t) => t.length <= max) ?? formules[formules.length - 1];

/** Les phrases d'un texte : une fin de phrase, une espace, puis une majuscule, un chiffre ou un guillemet. */
export const phrasesDe = (texte: string) => texte.split(/(?<=[.!?])\s+(?=[\p{Lu}\d«])/u);

/**
 * Un texte écrit à la main et trop long perd ses dernières phrases, jamais la fin d'un mot : trente-six descriptions
 * finissaient par « …prix TTC… » (11/11/2026). Si la première phrase est déjà trop longue, elle se coupe à un mot.
 */
export function phrasesEntieres(texte: string, max: number): string {
  if (texte.length <= max) return texte;
  const phrases = phrasesDe(texte);
  let out = phrases[0];
  for (const p of phrases.slice(1)) {
    if ((out + ' ' + p).length > max) break;
    out += ' ' + p;
  }
  return out.length <= max ? out : texte.slice(0, max - 1).replace(/[\s,;:·—-]+\S*$/, '').trim() + '…';
}
