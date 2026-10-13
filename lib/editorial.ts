import seed from './data/guides.json';
export const guides = seed;
export type Guide = (typeof seed)[number];
/** Les guides du lancement datent du 9 septembre 2026 ; ceux écrits ensuite portent leur date (« published »). */
export const guidePublished = (g: Guide): string => ('published' in g && typeof g.published === 'string' ? g.published : '2026-09-09');
/** La date en toutes lettres : « 3 octobre 2026 ». */
export const dateEnLettres = (iso: string) => new Date(iso + 'T12:00:00Z').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const EN_LETTRES = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf', 'vingt'];
/** Le nombre de guides, en toutes lettres : il ne se périme plus quand on en ajoute un. */
export const guidesEnLettres = () => EN_LETTRES[guides.length] || String(guides.length);
export type Service = {
  title: string;
  description: string;
  eyebrow: string;
  sections: { title: string; paragraphs: string[] }[];
  /** Questions visibles en bas de page, publiées en FAQPage pour les moteurs et les assistants. */
  faq?: { question: string; answer: string }[];
};
export const services: Record<string, Service> = {
  faq: {
    title: 'Questions fréquentes : commande, livraison, tailles, retours',
    description: 'Les réponses de Boutique de Boxe : commande et paiement par carte, livraison dans toute la France, tailles et onces, retours sous 14 jours, matériel lourd sur devis, données.',
    eyebrow: 'QUESTIONS FRÉQUENTES',
    sections: [
      {
        title: 'Tout ce qu’on nous demande avant de commander.',
        paragraphs: [
          'Les ventes de Boutique de Boxe sont ouvertes depuis le 13 octobre 2026 : le catalogue est complet, avec les tailles réelles et les prix TTC, et le panier se paie par carte. Voici les réponses aux questions que vous nous posez le plus, par e-mail comme en salle.',
        ],
      },
    ],
    faq: [
      { question: 'Peut-on commander en ligne ?', answer: 'Oui, depuis le 13 octobre 2026. Choisissez vos modèles et vos tailles, indiquez la livraison, acceptez les conditions générales de vente, puis payez par carte sur la page sécurisée de PayPlug. Un e-mail confirme la commande.' },
      { question: 'Les prix affichés sont-ils définitifs ?', answer: 'Oui : ce sont les prix de vente, toutes taxes comprises, hors livraison. Le prix payé est celui affiché au moment de la commande ; les frais de livraison s’ajoutent au panier avant le paiement, jamais après.' },
      { question: 'Quand ma commande part-elle ?', answer: 'Sous 7 jours ouvrés après le paiement, et la livraison arrive au plus tard 30 jours après la commande. Si un modèle manque, nous vous écrivons avant tout envoi, et vous êtes remboursé si vous le souhaitez.' },
      { question: 'Livrez-vous partout en France ?', answer: 'Dans toute la France continentale, à domicile ou en point relais : 6,90 € en point relais, offerts dès 69 € d’achats, et 8,90 € à domicile. Pour la Corse et l’outre-mer, écrivez-nous. Le matériel lourd, comme les sacs de frappe ou les portiques, se livre sur devis.' },
      { question: 'Comment choisir la taille de mes gants ?', answer: 'Par l’usage, pas par la main : 10 oz pour le sac, 12 oz pour la technique, 14 à 16 oz avec un partenaire. Les onces sont un poids de rembourrage. Le guide des tailles et le guide des onces détaillent chaque cas, gants, textile, chaussures et enfants compris.' },
      { question: 'Puis-je retourner ou échanger un article ?', answer: 'Oui : vous avez quatorze jours après la réception pour vous rétracter, sans avoir à vous justifier. L’article revient non utilisé, dans son emballage, à vos frais ; vous êtes remboursé sous quatorze jours, livraison initiale comprise. Pour un échange de taille, écrivez-nous avec le numéro de commande.' },
      { question: 'Le paiement est-il sécurisé ?', answer: 'Oui. Le paiement passe par PayPlug, établissement de paiement français agréé : la carte est saisie sur sa page sécurisée, jamais sur la boutique, qui ne conserve aucun numéro de carte.' },
      { question: 'Quelles marques trouve-t-on ?', answer: 'Metal Boxe, Elion, Fairtex, Twins, Cleto Reyes, Adidas, Everlast, Venum, Manto, Athena Fightwear, Century, Shock Doctor, Under Armour, entre autres, chacune avec ses références fabricant.' },
      { question: 'Y a-t-il du matériel pour les enfants ?', answer: 'Oui : gants du 4 au 8 oz, protège-dents et casques enfant, packs de démarrage, kimonos M0 à M4. Chaque fiche indique si le modèle est prévu pour un enfant.' },
      { question: 'Équipez-vous les clubs, les coachs et les salles ?', answer: 'Oui. Pour un équipement de club ou une commande groupée, écrivez-nous via la page contact avec les quantités et les tailles : nous répondons par e-mail avec une proposition.' },
      { question: 'Que faites-vous de mes données ?', answer: 'Vos coordonnées servent à traiter et livrer votre commande, et, si vous l’acceptez, à vous écrire. La mesure d’audience n’est activée qu’avec votre accord, sans outil tiers. La politique de confidentialité détaille durées et droits, dont l’effacement.' },
      { question: 'Comment vous joindre ?', answer: 'Par la page contact, ou par e-mail à boxingcenter31@gmail.com, en rappelant le numéro de commande (BDB-…) s’il y en a un. Nous répondons par e-mail, en général sous un jour ouvré.' },
    ],
  },
  livraison: {
    faq: [
      { question: 'Quels sont les frais de livraison ?', answer: 'Point relais : 6,90 €, offerts dès 69 € d’achats. Domicile : 8,90 €. Le montant s’affiche dans le panier avant le paiement. Le matériel lourd (sacs de frappe, bases et mannequins, portiques, potences) se livre sur devis.' },
      { question: 'Livrez-vous en dehors de la France continentale ?', answer: 'La commande en ligne livre la France continentale. Pour la Corse, l’outre-mer, Monaco ou l’étranger, écrivez-nous depuis la page contact : vous recevez une proposition par e-mail.' },
      { question: 'Quels sont les délais de livraison ?', answer: 'La commande part sous 7 jours ouvrés après le paiement, et arrive au plus tard 30 jours après la commande. Si un délai ne peut pas être tenu, nous vous écrivons avant, et vous pouvez annuler la commande et être remboursé.' },
      { question: 'Comment commander un sac de frappe ?', answer: 'Sur devis : écrivez-nous avec le modèle et votre code postal. Un sac de 45 kg ou un portique ne voyage pas comme un colis ordinaire ; le devis donne le prix et le délai de livraison à domicile, et vous décidez ensuite.' },
    ],
    title: 'Livraison en France',
    description:
      'Livraison de Boutique de Boxe : point relais 6,90 € offert dès 69 €, domicile 8,90 €, expédition sous 7 jours ouvrés, matériel lourd sur devis.',
    eyebrow: 'LES CONDITIONS / LIVRAISON',
    sections: [
      {
        title: 'Votre matériel, jusqu’à votre porte.',
        paragraphs: [
          'Chaque commande payée en ligne est préparée et expédiée sous 7 jours ouvrés, puis livrée au plus tard 30 jours après la commande. Le montant de la livraison s’affiche dans le panier avant le paiement, et un e-mail confirme la commande.',
        ],
      },
      {
        title: 'France continentale',
        paragraphs: [
          'Point relais : 6,90 €, offerts dès 69 € d’achats. Livraison à domicile : 8,90 €. Quand la carte des points relais n’est pas affichée, le point le plus proche de votre adresse vous est confirmé par e-mail avant l’expédition.',
        ],
      },
      {
        title: 'Sacs de frappe et matériel lourd',
        paragraphs: [
          'Les sacs de frappe, bases et mannequins de frappe, portiques, potences et cages ne passent pas au paiement en ligne : ils se livrent à domicile, sur devis. Écrivez-nous avec le modèle et votre code postal ; le devis indique le prix et le délai, et rien n’est dû avant votre accord.',
        ],
      },
      {
        title: 'Corse, outre-mer et étranger',
        paragraphs: [
          'Ces destinations se traitent sur demande, par e-mail, avec une proposition de livraison avant toute commande.',
        ],
      },
    ],
  },
  retours: {
    faq: [
      { question: 'Quel est le délai pour retourner un article ?', answer: 'Quatorze jours à compter de la réception : c’est le délai légal de rétractation, sans justification à donner. L’article revient non utilisé, dans son état et son emballage d’origine.' },
      { question: 'Comment échanger une taille ?', answer: 'Écrivez-nous depuis la page contact avec le numéro de commande (BDB-…) et la taille souhaitée : nous organisons l’échange par e-mail.' },
      { question: 'Qui paie les frais de retour ?', answer: 'Le client, en cas de rétractation. Un article défectueux ou non conforme est repris aux frais de la boutique, au titre de la garantie légale de conformité.' },
      { question: 'Quand suis-je remboursé ?', answer: 'Sous quatorze jours après votre rétractation, sur la carte utilisée, livraison initiale comprise (au tarif standard). Le remboursement peut attendre la réception de l’article ou la preuve de son envoi.' },
    ],
    title: 'Retours et échanges',
    description:
      'Retours chez Boutique de Boxe : 14 jours pour changer d’avis, formulaire de rétractation, échange de taille, remboursement sous 14 jours, garanties légales.',
    eyebrow: 'LES CONDITIONS / RETOURS',
    sections: [
      {
        title: 'Quatorze jours pour changer d’avis.',
        paragraphs: [
          'Vous disposez de quatorze jours à compter de la réception de la commande pour vous rétracter, sans donner de motif. Prévenez-nous par e-mail à boxingcenter31@gmail.com, avec le numéro de commande, ou en renvoyant le formulaire de rétractation joint à l’e-mail de confirmation et reproduit dans les conditions générales de vente.',
        ],
      },
      {
        title: 'Le retour',
        paragraphs: [
          'Renvoyez l’article dans les quatorze jours qui suivent votre message, à vos frais, non utilisé, dans son état et son emballage d’origine ; vous pouvez l’essayer comme en magasin. Pour des raisons d’hygiène, un protège-dents ou une coquille descellé après la livraison ne peut pas être repris. L’adresse de retour vous est donnée par e-mail.',
        ],
      },
      {
        title: 'Le remboursement',
        paragraphs: [
          'Toutes les sommes versées, livraison initiale au tarif standard comprise, sont remboursées sous quatorze jours après votre rétractation, sur la carte utilisée pour payer. Le remboursement peut attendre la réception de l’article ou la preuve de son expédition.',
        ],
      },
      {
        title: 'Un article défectueux ?',
        paragraphs: [
          'Écrivez-nous avec une photo et le numéro de commande. Un défaut de conformité est couvert par la garantie légale de deux ans : réparation ou remplacement, à défaut remboursement, sans frais pour vous. La garantie des vices cachés s’applique aussi. Le détail figure dans les conditions générales de vente.',
        ],
      },
    ],
  },
  'a-propos': {
    title: 'À propos de la boutique',
    description: 'Qui édite Boutique de Boxe, ce que la boutique vend, comment le catalogue, les prix et les guides sont établis, et comment nous joindre. SAS BOXING CENTER, Toulouse.',
    eyebrow: 'LA BOUTIQUE / À PROPOS',
    sections: [
      {
        title: 'Qui tient la boutique',
        paragraphs: [
          'Boutique de Boxe est éditée par la SAS BOXING CENTER, société au capital de 1 500 €, immatriculée au RCS de Toulouse sous le numéro 821 817 889. Son siège est au 12 rue de Fenouillet, 31200 Toulouse. Le directeur de la publication est Sébastien DUTILH.',
          'Boutique de Boxe est une boutique en ligne indépendante, ouverte à tous les pratiquants : elle ne propose ni cours ni planning, et vend en ligne depuis le 13 octobre 2026.',
        ],
      },
      {
        title: 'Ce que la boutique vend',
        paragraphs: [
          'Du matériel de boxe et de sports de combat, et rien d’autre : gants, bandes, protections, textile, sacs de frappe, chaussures, matériel d’entraînement, sacs de sport et tenues d’arts martiaux. Plus de 1 000 modèles, chacun avec les tailles et la référence de son fabricant.',
        ],
      },
      {
        title: 'Comment le catalogue est établi',
        paragraphs: [
          'Une fiche reprend les tailles que la marque propose réellement, sans conversion d’une marque à l’autre. Le prix affiché est le prix de vente TTC, toutes taxes comprises.',
          'Tant que la vente n’est pas ouverte, la boutique n’affiche ni stock, ni remise, ni avis client, ni « meilleures ventes » : nous ne publions pas ce que nous ne pouvons pas prouver.',
        ],
      },
      {
        title: 'Les guides et les chiffres',
        paragraphs: [
          'Les guides d’achat nomment leurs sources en bas de page. L’observatoire des prix publie chaque semaine le prix le plus bas, le prix médian et le prix le plus haut de chaque famille, calculés sur le catalogue ; ses données se téléchargent. Les pages par ville s’appuient sur le Recensement des équipements sportifs du ministère des Sports.',
        ],
      },
      {
        title: 'Nous joindre',
        paragraphs: [
          'Par la page contact, par e-mail à boxingcenter31@gmail.com ou par téléphone au 09 54 14 74 72. La réponse arrive par e-mail, en général sous un jour ouvré.',
        ],
      },
    ],
  },
  'mentions-legales': {
    title: 'Mentions légales',
    description:
      'Éditeur Boutique de Boxe : SAS BOXING CENTER, coordonnées, immatriculation et informations relatives au site.',
    eyebrow: 'LE SITE / ÉDITEUR',
    sections: [
      {
        title: 'Éditeur',
        paragraphs: [
          'SAS BOXING CENTER, au capital social de 1 500 €. Siège social : 12 rue de Fenouillet, 31200 Toulouse, France. SIREN : 821 817 889. SIRET : 821 817 889 00016. RCS Toulouse B 821 817 889.',
        ],
      },
      {
        title: 'Publication et contact',
        paragraphs: [
          'Directeur de la publication : Sébastien DUTILH. Courriel : boxingcenter31@gmail.com. Téléphone : 09 54 14 74 72. Boutique de Boxe est une boutique en ligne nationale de matériel de sports de combat, éditée par la SAS BOXING CENTER.',
        ],
      },
      {
        title: 'Hébergement',
        paragraphs: [
          'Le site est hébergé par Vercel Inc., 440 N Barranca Avenue #4133, Covina, CA 91723, États-Unis. Les données du catalogue et des demandes sont stockées chez Supabase Inc., dans la région Europe de l’Ouest (Londres).',
        ],
      },
      {
        title: 'Contenus et photographies',
        paragraphs: [
          'Les marques et noms de produits appartiennent à leurs titulaires respectifs. Les photographies représentent les modèles présentés ; les précisions de taille figurent sur leurs fiches. Pour signaler une erreur ou exercer un droit sur un contenu, contactez l’éditeur en précisant la page concernée.',
        ],
      },
      {
        title: 'Vente en ligne',
        paragraphs: [
          'Les ventes sont ouvertes depuis le 13 octobre 2026. Les commandes sont régies par les conditions générales de vente publiées sur le site ; le paiement par carte est opéré par PayPlug, établissement de paiement agréé.',
        ],
      },
    ],
  },
  'conditions-generales-de-vente': {
    title: 'Conditions générales de vente',
    description:
      'Conditions générales de vente de Boutique de Boxe : commande, prix TTC, paiement PayPlug, livraison, rétractation de 14 jours, garanties légales, médiation.',
    eyebrow: 'LES CONDITIONS / CGV DU 13 OCTOBRE 2026',
    sections: [
      {
        title: '1. Objet et acceptation',
        paragraphs: [
          'Ces conditions générales de vente (version du 13 octobre 2026) régissent les ventes de matériel de boxe et de sports de combat conclues en ligne sur www.boutique-de-boxe.com entre la SAS BOXING CENTER et toute personne physique agissant à des fins non professionnelles (le client). Le client les accepte en cochant la case prévue avant de payer ; la version acceptée est enregistrée avec la commande. Elles prévalent sur tout autre document.',
        ],
      },
      {
        title: '2. Le vendeur',
        paragraphs: [
          'SAS BOXING CENTER, au capital de 1 500 €, siège social 12 rue de Fenouillet, 31200 Toulouse, immatriculée au RCS de Toulouse sous le numéro 821 817 889 (SIRET 821 817 889 00016). Boutique de Boxe est sa boutique en ligne. Contact : boxingcenter31@gmail.com, 09 54 14 74 72.',
        ],
      },
      {
        title: '3. Les produits',
        paragraphs: [
          'Chaque fiche présente les caractéristiques essentielles du produit : marque, matière, poids, tailles proposées par le fabricant, couleurs et usage. Les photographies représentent le modèle présenté. Les tailles suivent la grille de chaque fabricant ; le guide des tailles aide au choix, et la boutique répond par e-mail à toute question avant l’achat.',
        ],
      },
      {
        title: '4. Les prix',
        paragraphs: [
          'Les prix sont indiqués en euros, toutes taxes comprises, hors frais de livraison. Les frais de livraison s’affichent dans le panier avant le paiement. Le prix applicable est celui affiché au moment de la commande.',
        ],
      },
      {
        title: '5. La commande',
        paragraphs: [
          'Le client choisit ses produits et leurs tailles, puis indique ses coordonnées et le mode de livraison. Un récapitulatif présente les produits, les quantités, les frais de livraison et le total TTC. Après acceptation des présentes conditions, le bouton « Commander et payer » vaut commande avec obligation de paiement et ouvre la page de paiement sécurisée de PayPlug.',
          'Le contrat est conclu à la confirmation du paiement. Un e-mail de confirmation, envoyé à l’adresse indiquée, reprend le récapitulatif de la commande, les présentes conditions et le formulaire de rétractation. La commande est archivée par le vendeur et consultable sur demande.',
          'Le matériel lourd ou encombrant (sacs de frappe, bases et mannequins de frappe, portiques, potences, cages) n’est pas vendu par le panier en ligne : il fait l’objet d’un devis de livraison par e-mail, accepté par le client avant toute commande. La commande en ligne livre la France continentale ; la Corse, l’outre-mer et l’étranger se traitent sur demande.',
        ],
      },
      {
        title: '6. Le paiement',
        paragraphs: [
          'Le paiement se fait par carte bancaire (CB, Visa, Mastercard) sur la page sécurisée de PayPlug, établissement de paiement agréé, avec authentification 3-D Secure le cas échéant. Le montant est débité à la validation du paiement. Le vendeur ne reçoit ni ne conserve aucune donnée de carte. Une commande dont le paiement est refusé n’est pas conclue.',
        ],
      },
      {
        title: '7. Disponibilité',
        paragraphs: [
          'Les produits sont proposés dans la limite des stocks du vendeur et de ses fournisseurs. Si un produit commandé se révèle indisponible, le client en est informé par e-mail dans les meilleurs délais et peut choisir un produit équivalent ou le remboursement des sommes versées pour ce produit, au plus tard quatorze jours après le paiement.',
        ],
      },
      {
        title: '8. La livraison',
        paragraphs: [
          'Frais : point relais 6,90 €, offerts dès 69 € d’achats ; domicile 8,90 €. La commande est expédiée sous 7 jours ouvrés après le paiement et livrée au plus tard 30 jours après la conclusion du contrat. En cas de dépassement, le client peut, après avoir enjoint le vendeur de livrer dans un délai supplémentaire raisonnable, résoudre le contrat par écrit et être remboursé dans les conditions des articles L. 216-6 et suivants du Code de la consommation.',
          'Le risque de perte ou d’endommagement est transféré au client lorsqu’il prend physiquement possession des produits. Le client est invité à vérifier le colis à réception et à signaler toute anomalie au transporteur et au vendeur.',
        ],
      },
      {
        title: '9. Le droit de rétractation',
        paragraphs: [
          'Le client dispose de quatorze jours à compter de la réception des produits pour se rétracter, sans avoir à motiver sa décision. Il notifie sa décision par une déclaration dénuée d’ambiguïté, par e-mail à boxingcenter31@gmail.com ou au moyen du formulaire ci-dessous.',
          'Le client renvoie les produits sans retard excessif et au plus tard quatorze jours après sa notification, à ses frais, à l’adresse indiquée par le vendeur. Il peut les essayer comme en magasin ; sa responsabilité n’est engagée qu’en cas de dépréciation résultant de manipulations autres que celles nécessaires pour établir la nature, les caractéristiques et le bon fonctionnement des produits.',
          'Le vendeur rembourse la totalité des sommes versées, frais de livraison initiaux compris (à hauteur du tarif standard), au plus tard quatorze jours après la notification, par le même moyen de paiement. Il peut différer le remboursement jusqu’à la récupération des produits ou la preuve de leur expédition.',
          'Conformément à l’article L. 221-28 du Code de la consommation, le droit de rétractation ne peut être exercé pour les biens descellés par le client après la livraison et qui ne peuvent être renvoyés pour des raisons d’hygiène ou de protection de la santé, tels qu’un protège-dents ou une coquille dont l’emballage scellé a été ouvert.',
          'Formulaire de rétractation (à compléter et renvoyer uniquement si vous souhaitez vous rétracter) — À l’attention de SAS BOXING CENTER, Boutique de Boxe, 12 rue de Fenouillet, 31200 Toulouse, boxingcenter31@gmail.com : Je vous notifie par la présente ma rétractation du contrat portant sur la vente du bien ci-dessous. Commandé le / reçu le. Numéro de commande. Nom du consommateur. Adresse du consommateur. Signature du consommateur (uniquement en cas de notification sur papier). Date.',
        ],
      },
      {
        title: '10. Les garanties légales',
        paragraphs: [
          'Le vendeur répond des défauts de conformité existant lors de la délivrance des produits (articles L. 217-1 et suivants du Code de la consommation). Le client dispose de deux ans à compter de la délivrance pour obtenir la mise en œuvre de la garantie légale de conformité ; pendant ce délai, il n’a à établir que l’existence du défaut, non sa date d’apparition. Il obtient la réparation ou le remplacement du produit, sans frais, ou, à défaut, une réduction du prix ou la résolution du contrat. Ces droits s’exercent auprès du vendeur, par e-mail.',
          'Le client bénéficie également de la garantie contre les vices cachés des articles 1641 à 1649 du Code civil, pendant deux ans à compter de la découverte du vice : il peut alors choisir entre la résolution de la vente et une réduction du prix.',
        ],
      },
      {
        title: '11. Réclamations et médiation',
        paragraphs: [
          'Toute réclamation s’adresse au service client : boxingcenter31@gmail.com ou 09 54 14 74 72, en rappelant le numéro de commande. Une réponse est apportée par e-mail sous quinze jours au plus.',
          'Conformément aux articles L. 611-1 et suivants du Code de la consommation, le client peut recourir gratuitement à un médiateur de la consommation après une réclamation écrite restée sans solution. Le nom et les coordonnées du médiateur dont relève Boutique de Boxe sont en cours de désignation et seront indiqués dans cet article ; le client peut dans l’intervalle les demander au service client.',
        ],
      },
      {
        title: '12. Données personnelles et droit applicable',
        paragraphs: [
          'Les données nécessaires au traitement de la commande sont utilisées conformément à la politique de confidentialité du site. Les présentes conditions sont soumises au droit français. En cas de litige, et à défaut de solution amiable, le client peut saisir la juridiction du lieu de son domicile ou toute autre juridiction compétente selon les règles légales.',
        ],
      },
    ],
  },
  confidentialite: {
    title: 'Vos données personnelles',
    description:
      'Cookies de mesure, données de contact et d’alerte de disponibilité : ce que Boutique de Boxe enregistre, combien de temps, et vos droits.',
    eyebrow: 'LE SITE / CONFIDENTIALITÉ',
    sections: [
      {
        title: 'Cookies et mesure d’audience',
        paragraphs: [
          'À votre première visite, une carte vous demande si vous acceptez un cookie de mesure. Si vous acceptez, la boutique enregistre elle-même, sans outil tiers, les pages que vous regardez, le temps passé, les modèles ajoutés au panier, les recherches et les formulaires envoyés. Ces données servent à mieux présenter le matériel. Aucune adresse IP n’est conservée.',
          'L’hébergeur du site, Vercel, compte par ailleurs les pages vues sans cookie ni identifiant conservé : ce comptage ne permet pas de vous reconnaître d’une visite à l’autre et ne dépend pas de votre choix.',
          'Le cookie d’identifiant dure treize mois, le cookie de choix un an. Si vous refusez, aucun cookie de mesure n’est posé et rien n’est enregistré. Vous changez d’avis à tout moment par le lien « Cookies » en bas de page. Le panier et la connexion à l’atelier utilisent des cookies strictement nécessaires, sans mesure.',
        ],
      },
      {
        title: 'Qui traite vos données ?',
        paragraphs: [
          'SAS BOXING CENTER, 12 rue de Fenouillet, 31200 Toulouse, est responsable des traitements du site. Pour toute demande concernant vos données : boxingcenter31@gmail.com, à l’attention de Sébastien DUTILH.',
        ],
      },
      {
        title: 'Contacts et alertes',
        paragraphs: [
          'Le formulaire de contact collecte votre nom, votre e-mail et votre message afin de répondre à votre demande, sur la base de l’intérêt légitime de l’éditeur à traiter les sollicitations reçues. L’alerte collecte votre e-mail, le produit et éventuellement la taille demandée, sur la base de votre consentement. Ces données ne sont pas vendues.',
        ],
      },
      {
        title: 'Destinataires et conservation',
        paragraphs: [
          'L’équipe autorisée de la boutique peut consulter les demandes. L’hébergement repose sur Vercel (rendu en France) et la base de données sur Supabase (Union européenne). Des traitements peuvent avoir lieu hors de l’Union européenne dans le cadre des garanties contractuelles des prestataires. Les demandes sont conservées pendant leur traitement, puis revues et supprimées lorsqu’elles ne sont plus nécessaires. Les inscriptions aux alertes sont supprimées en cas de retrait du consentement.',
        ],
      },
      {
        title: 'Commandes et paiement',
        paragraphs: [
          'Quand vous commandez, vos nom et prénom, e-mail, adresse de livraison, téléphone s’il est donné, les produits, les montants et la version des conditions de vente acceptées sont enregistrés pour exécuter le contrat (préparation, livraison, service client, garanties), puis conservés le temps requis par les obligations comptables et légales (dix ans pour les pièces comptables).',
          'Le paiement est traité par PayPlug, établissement de paiement agréé, qui reçoit les données nécessaires à la transaction ; la boutique ne voit ni ne conserve aucun numéro de carte. Les e-mails de commande partent par un service d’envoi transactionnel. Ces prestataires agissent pour le compte de la boutique.',
        ],
      },
      {
        title: 'Panier et choix enregistrés',
        paragraphs: [
          'Le panier utilise un cookie technique de 30 jours. Il contient un identifiant aléatoire ; les produits et quantités sont conservés côté serveur. La préparation de séance mémorise uniquement vos choix dans l’onglet en cours.',
          'Quand vous enregistrez vos choix, votre prénom, votre e-mail, les modèles du panier et leur montant prévu sont conservés pour vous prévenir de l’ouverture des ventes, sur la base de votre consentement ; votre mobile, avec l’accord pour un SMS, et votre code postal le sont aussi si vous les laissez. Aucun numéro de carte n’est collecté. Le lien de désinscription de chaque message efface ces données ; vous pouvez aussi en demander la suppression à Boxing Center.',
          'Le formulaire de contact peut transmettre votre demande à Inlett après son enregistrement dans la boutique. Une demande enregistrée ou acceptée par un prestataire d’envoi ne garantit pas la livraison de l’e-mail.',
        ],
      },
      {
        title: 'Sécurité et mesure d’audience',
        paragraphs: [
          'Le service limite les demandes répétées au moyen d’une empreinte technique temporaire de l’adresse réseau. La navigation et les formulaires restent utilisables sans outil publicitaire. Aucun service Google Analytics n’est activé dans cette version.',
        ],
      },
      {
        title: 'Exercer vos droits',
        paragraphs: [
          'Vous pouvez demander l’accès, la rectification ou la suppression de vos données, ainsi que le retrait de votre consentement aux alertes, en écrivant à boxingcenter31@gmail.com. Selon la situation, vous disposez aussi de droits à la limitation, à l’opposition et à la portabilité. Chaque message d’alerte devra comporter un lien de désinscription. Vous pouvez adresser une réclamation à la CNIL : cnil.fr.',
        ],
      },
    ],
  },
  'guide-des-tailles': {
    title: 'Tailles, poids et ajustement',
    description:
      'Comprendre les onces des gants de boxe et vérifier l’ajustement des gants MMA, textiles, chaussures et équipements enfant.',
    eyebrow: 'LES REPÈRES / AJUSTEMENT',
    sections: [
      {
        title: 'Les onces ne sont pas une taille de main.',
        paragraphs: [
          'Le nombre en oz indique le poids du gant. Il ne décrit pas à lui seul sa coupe intérieure. Deux modèles de même poids peuvent laisser une place différente aux doigts et au pouce. Vérifiez le poids demandé par votre club, puis essayez la paire avec les bandes que vous porterez.',
        ],
      },
      {
        title: 'Gants MMA et protections',
        paragraphs: [
          'Les tailles S, M ou L dépendent du modèle. Mesurez la main selon la méthode du fabricant lorsqu’elle est fournie et comparez avec son propre tableau. Une équivalence universelle risquerait de vous orienter vers une coupe inadaptée.',
        ],
      },
      {
        title: 'Textile et chaussures',
        paragraphs: [
          'Référez-vous au guide de la marque pour le modèle retenu. Prenez les mesures demandées et tenez compte de la coupe. Pour les chaussures, vérifiez aussi la largeur et l’aisance avec vos chaussettes habituelles.',
        ],
      },
      {
        title: 'Pour les enfants',
        paragraphs: [
          'Les tranches d’âge sont des repères commerciaux. La morphologie, le confort et les consignes de l’encadrant doivent guider le choix. Ne prenez pas une protection trop grande dans l’espoir de la faire durer davantage.',
        ],
      },
    ],
  },
  'offres-de-lancement': {
    title: 'Les ventes sont ouvertes',
    description:
      'Boutique de Boxe vend en ligne depuis le 13 octobre 2026 : paiement par carte, livraison dans toute la France, 14 jours pour changer d’avis.',
    eyebrow: 'LE LANCEMENT / C’EST OUVERT',
    sections: [
      {
        title: 'Le catalogue est en vente.',
        paragraphs: [
          'Depuis le 13 octobre 2026, chaque modèle se commande en ligne, avec ses caractéristiques, ses photos et son prix TTC. Le paiement se fait par carte sur la page sécurisée de PayPlug ; la commande part sous 7 jours ouvrés.',
        ],
      },
      {
        title: 'Sans remise annoncée, sans engagement caché.',
        paragraphs: [
          'Aucune remise de lancement n’est annoncée. La livraison en point relais est offerte dès 69 € d’achats, et vous avez quatorze jours après réception pour changer d’avis.',
        ],
      },
    ],
  },
};
