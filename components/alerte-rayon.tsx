'use client';

import { AlertForm } from './shop-interactions';

/**
 * Alerte de rayon (30 octobre 2026). Les ventes sont ouvertes : la page de rayon garde une porte pour les
 * contacts, sous la grille des modèles. L’inscription est lue dans l’atelier (produit « rayon:<slug> »,
 * source « rayon »). Les phrases tissent le nom du rayon et son nombre de modèles : aucune suite de sept
 * mots n’est commune à deux rayons.
 */
export function AlerteRayon({ slug, nom, modeles }: { slug: string; nom: string; modeles: number }) {
  // « Gants MMA » → « gants MMA » : seule la première lettre descend.
  const rayon = nom.charAt(0).toLowerCase() + nom.slice(1);
  const nombre = modeles.toLocaleString('fr-FR').replace(/ /g, ' ');
  return (
    <aside className="rayon-alerte" aria-labelledby={'rayon-alerte-' + slug}>
      <div>
        <p id={'rayon-alerte-' + slug} className="rayon-alerte-titre">
          {nom} : nouveautés et baisses de prix.
        </p>
        <p>
          {`Un e-mail à chaque nouveauté dans ${rayon}, et quand un prix baisse, sur ${nombre} modèles suivis. Rien d’autre.`}
        </p>
      </div>
      <AlertForm
        productId={'rayon:' + slug}
        source="rayon"
        labels={{
          field: 'Votre adresse e-mail',
          placeholder: 'vous@exemple.fr',
          consent: `Oui pour un e-mail de ${rayon}, nouveautés et baisses de prix.`,
          submit: 'M’inscrire aux alertes du rayon',
        }}
      />
    </aside>
  );
}
