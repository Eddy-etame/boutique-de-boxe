/**
 * Un titre ou une description ne se coupe jamais au milieu d'un mot (11/11/2026 : « Livraison en Fra », un titre
 * sans son « € »). On écrit les formules de la plus complète à la plus courte ; la première qui tient est la bonne.
 */
export const quiTient = (max: number, ...formules: string[]) => formules.find((t) => t.length <= max) ?? formules[formules.length - 1];
