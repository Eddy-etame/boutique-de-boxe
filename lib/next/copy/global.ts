// Textes communs à toutes les pages de la nouvelle édition.
// Espace insecable (U+00A0) avant les deux-points, le point-virgule, le point d exclamation, le point d interrogation et l euro.
import type { GlobalCopy } from './types';

export const globalCopy: GlobalCopy = {
  tagline: 'Matériel de boxe, MMA et sports de combat',
  edition: {
    current: 'Édition actuelle',
    next: 'Nouvelle édition',
    switchTo: (name: string) => {
      const label = name.charAt(0).toLowerCase() + name.slice(1);
      const article = /^[aeiouyàâéèêëîïôöùûü]/i.test(label) ? 'l’' : 'la ';
      return `Passer à ${article}${label}`;
    },
  },
  nav: {
    catalogue: 'Tout le matériel',
    guides: 'Les guides',
    bag: 'Votre sac',
    contact: 'Contact',
    search: 'Rechercher un produit',
    menu: 'Ouvrir le menu',
    close: 'Fermer le menu',
  },
  footer: {
    about:
      'Ici, vous trouvez du matériel de boxe et de sports de combat.',
    legalLinks: 'Informations légales',
    contact: 'Nous écrire',
    sales: 'La vente ouvre bientôt. Rien n’est débité aujourd’hui.',
  },
  status: {
    soon: 'En vente bientôt',
    pricePlanned: 'Prix prévu à l’ouverture',
    verifyWithGym: 'À vérifier avec votre entraîneur',
    inBag: 'Je l’ai déjà',
  },
  units: {
    oz: 'oz',
    cm: 'cm',
    kg: 'kg',
  },
  errors: {
    generic: 'Un problème est survenu. Réessayez dans un instant.',
    network: 'La connexion a échoué. Vérifiez votre réseau, puis réessayez.',
  },
  a11y: {
    skip: 'Aller au contenu',
    mainMenu: 'Menu principal',
    live: 'Mises à jour de la page',
  },
};
