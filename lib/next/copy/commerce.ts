// Textes du sac, de la commande d’essai, du reçu, des inscriptions et de la
// connexion. Les ventes ne sont pas ouvertes : rien n’est payé ni envoyé.
import type { CommerceCopy } from './types';

export const commerceCopy: CommerceCopy = {
  bag: {
    title: 'Votre sac',
    empty: 'Votre sac est vide. Ajoutez un premier modèle depuis le catalogue.',
    lentHint:
      'Vous avez déjà une partie du matériel ? Retirez-la du sac : le total les ignore.',
    remove: 'Retirer du sac',
    quantity: 'Quantité',
    subtotal: 'Sous-total',
    shipping: 'Livraison',
    total: 'Total prévu',
    checkout: {
      label: 'Essayer la commande, sans payer',
      hint: 'Vous voyez chaque étape jusqu’au reçu. Rien n’est payé.',
    },
    keepShopping: 'Revenir au catalogue',
    changed:
      'Le prix ou le contenu de votre sac a changé. Revoyez-le avant de valider.',
  },
  checkout: {
    title: 'Essayer la commande',
    name: 'Votre nom',
    email: 'Votre adresse e-mail',
    delivery: {
      relay: 'Point relais : 6,90 €, offert dès 69 €',
      home: 'À domicile : 8,90 €',
    },
    consent: 'Je comprends que rien n’est payé ni envoyé.',
    outcome: {
      approved: 'Commande acceptée : vous recevez un reçu.',
      declined: 'Commande refusée : votre sac est conservé.',
    },
    submit: {
      label: 'Valider la commande, sans payer',
      hint: 'La réponse choisie s’affiche tout de suite.',
    },
    noPayment:
      'Aucun paiement ici, aucune carte demandée. Choisissez la réponse à essayer, puis validez. Les frais de livraison sont ceux prévus à l’ouverture.',
  },
  receipt: {
    title: 'Votre reçu',
    timeline: {
      placed: 'Commande enregistrée',
      paid: 'Acceptée, sans rien payer',
      declined: 'Refusée, comme vous l’avez demandé',
      email: 'Envoi du reçu par e-mail',
    },
    print: 'Imprimer le reçu',
    download: 'Télécharger le reçu',
    privateNote:
      'Cette page est privée. Elle s’ouvre depuis ce navigateur, pas avec le lien seul. Ce reçu n’est pas une facture.',
  },
  alerts: {
    title: 'Prévenez-moi à l’ouverture',
    email: 'Votre adresse e-mail',
    consent:
      'J’accepte de recevoir un e-mail à l’ouverture des ventes. Je peux me désinscrire en un clic.',
    submit: 'Me prévenir à l’ouverture',
    done: 'C’est noté. Vous recevrez un e-mail dès l’ouverture des ventes.',
    duplicate:
      'Cette adresse est déjà inscrite pour ce modèle. Vous n’avez rien à refaire.',
  },
  contact: {
    title: 'Poser une question',
    name: 'Votre nom',
    email: 'Votre adresse e-mail',
    message: 'Votre question',
    submit: 'Envoyer ma question',
    done: 'Votre question est enregistrée. Nous répondons à l’adresse indiquée.',
    error:
      'Votre question n’a pas pu être enregistrée. Écrivez-nous à boxingcenter31@gmail.com.',
  },
  auth: {
    title: 'Connexion du propriétaire',
    email: 'Votre adresse e-mail',
    submit: 'Recevoir le lien de connexion',
    sent: 'Si cette adresse est celle du propriétaire, un lien vient de partir. Il expire rapidement et ne sert qu’une fois.',
    signout: 'Se déconnecter',
  },
};
