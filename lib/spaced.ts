import { Children, type ReactNode } from 'react';

/* Un blanc entre des éléments frères écrits bout à bout (29/09).
   En JSX, deux éléments sur deux lignes, ou produits par un .map(), sont
   rendus sans aucun blanc. À l'écran le CSS les espace ; le texte que lit un
   moteur les colle : l'extrait Google de /materiel-mma/ disait « Protège-dents
   Casques de boxe » en un seul mot. Un blanc seul entre deux enfants d'une
   boîte flex ou grid n'est pas rendu, et entre deux blocs il est absorbé :
   rien ne bouge à l'écran (prouvé : 0 pixel changé, bureau et téléphone). */
export function spaced(nodes: ReactNode): ReactNode[] {
  const out: ReactNode[] = [];
  Children.toArray(nodes).forEach((n, i) => {
    if (i) out.push(' ');
    out.push(n);
  });
  return out;
}
