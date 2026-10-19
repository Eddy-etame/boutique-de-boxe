/**
 * Données structurées sûres dans un <script type="application/ld+json">.
 *
 * JSON.stringify n'échappe ni « < » ni « > » ni « & » : un nom de produit qui contient
 * « </script> » fermerait la balise et ferait exécuter la suite chez chaque visiteur. Chacun de
 * ces caractères est écrit en séquence \uXXXX, qui reste du JSON valide, lu à l'identique par les
 * moteurs. Les séparateurs de ligne et de paragraphe Unicode (U+2028, U+2029) le sont aussi : ce
 * sont des fins de ligne pour les anciens analyseurs JavaScript.
 *
 * Une seule fonction pour tout le site : chaque JSON écrit dans le HTML passe par elle.
 */
const A_ECHAPPER = /[<>&\u2028\u2029]/g;

export function jsonLd(data: unknown): string {
  return (JSON.stringify(data) ?? 'null').replace(A_ECHAPPER, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
}
