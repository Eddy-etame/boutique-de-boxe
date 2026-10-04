import { guides } from './editorial';
/**
 * Description longue et originale de chaque modèle, écrite depuis ses faits :
 * objet, marque, famille, tailles, couleurs, matières, usage. Les tournures
 * varient d’une fiche à l’autre (choix déterministe par identifiant), les faits
 * ne varient jamais. Aucune phrase copiée d’un fournisseur, aucun stock, aucune
 * remise, aucune date.
 */
import { categoryFor, money, shop, type Product } from './catalog';
import { productObject } from './seo';
import { dansLeRayon, ENFANT } from './rayons';
import { ouncesOf } from './facets';

const pick = <T>(id: string, list: T[], salt = 0): T => {
  let h = salt;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return list[h % list.length];
};
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const badBrand = (b: string) => !b || /pr[ée]ciser|^Sélection /i.test(b);

/** Niveau de pratique conseillé, déduit du modèle et de la famille. */
export function practiceLevel(p: Product): string {
  const t = (p.name + ' ' + (p.use || '')).toLowerCase();
  if (p.audience === 'enfant' || /\b(enfant|junior|kids?)\b/.test(t)) return 'Enfant et débutant';
  if (/compétition|competition|pro sparring|professional|élite|elite/.test(t)) return 'Confirmé et compétition';
  if (/sparring|à lacets/.test(t)) return 'Pratique régulière, sparring';
  if (/kit|débutant|initiation|premier/.test(t)) return 'Débutant';
  if (['sacs-de-sport', 'accessoires-boxe', 'textile-boxe'].includes(p.category)) return 'Tous niveaux';
  return 'Débutant à confirmé';
}

/** Disciplines lisibles, depuis les données ou la famille. */
export function disciplinesOf(p: Product): string[] {
  const map: Record<string, string> = { boxe: 'Boxe anglaise', 'boxe-anglaise': 'Boxe anglaise', mma: 'MMA', 'muay-thai': 'Muay-thaï', 'boxe-thai': 'Boxe thaï', 'kick-boxing': 'Kick-boxing', jjb: 'Jiu-jitsu brésilien', grappling: 'Grappling', karate: 'Karaté', savate: 'Boxe française', 'boxe-francaise': 'Boxe française', judo: 'Judo', fitness: 'Préparation physique' };
  const fromData = (p.disciplines || []).map((d) => map[d] || cap(d.replace(/-/g, ' ')));
  if (fromData.length) return [...new Set(fromData)];
  const t = p.name.toLowerCase();
  if (/mma/.test(t)) return ['MMA'];
  if (/thaï|thai|muay/.test(t)) return ['Muay-thaï', 'Kick-boxing'];
  if (/jjb|kimono|grappling|rashguard|spats/.test(t)) return ['Jiu-jitsu brésilien', 'Grappling'];
  if (/karat/.test(t)) return ['Karaté'];
  if (/française|savate/.test(t)) return ['Boxe française'];
  if (['gants-de-boxe', 'sacs-de-frappe', 'chaussures-boxe', 'accessoires-boxe'].includes(p.category)) return ['Boxe anglaise'];
  return ['Boxe anglaise', 'Sports de combat'];
}

const USE_BY_FAMILY: Record<string, string[]> = {
  'gants-de-boxe': ['Il sert au sac, aux pattes d’ours et au travail technique ; le poids choisi décide du reste.', 'Au sac ou avec un partenaire, le poids en onces fait la différence : léger pour la vitesse, lourd pour protéger.', 'Le gant se choisit pour la séance que vous faites le plus souvent : sac, technique ou sparring.'],
  'gants-mma': ['Doigts libres pour saisir, paume ouverte pour le sol : il suit les exercices qui mêlent frappes et saisies.', 'Il accompagne le travail au sol comme la frappe debout, avec un rembourrage pensé pour l’entraînement.'],
  'protections-boxe': ['La protection se porte dès qu’il y a contact ; elle doit rester en place quand vous bougez.', 'Elle sert au sparring et aux exercices avec partenaire, quand votre salle la demande.'],
  'textile-boxe': ['Coupe pensée pour bouger : bras levés, jambes fléchies, sans réglage permanent.', 'Un textile qui sèche vite et reste en place pendant la séance.'],
  'accessoires-boxe': ['Un accessoire de chaque séance, à garder dans le sac avec les gants.', 'Il complète la paire de gants et protège ce que le gant ne protège pas.'],
  'sacs-de-frappe': ['Il travaille la puissance, les déplacements et l’endurance, seul ou en cours.', 'Un support de frappe pour la maison ou la salle, à installer selon le poids et la hauteur indiqués.'],
  'chaussures-boxe': ['Elles tiennent le pied dans les pivots et les déplacements, sur ring et sur tatami.', 'Une chaussure ajustée, réservée à l’intérieur, pour les déplacements et les appuis.'],
  'equipement-entrainement': ['Un matériel qui se tient à deux ou qui équipe l’espace : précision, puissance, cardio.', 'Il sert au coach comme au pratiquant qui travaille en binôme.'],
  'sacs-de-sport': ['Il transporte le matériel de séance, humide et volumineux, avec ses compartiments.', 'Un sac pensé pour les gants, les bandes et une tenue de rechange.'],
  'arts-martiaux': ['Une tenue de pratique, à la taille du tableau de la marque, pour le tatami.', 'Il fait partie de la tenue réglementaire de la discipline.'],
};

export function longDescription(p: Product): string {
  const family = categoryFor(p.category)?.name.toLowerCase() || 'matériel de sports de combat';
  const object = productObject(p);
  const brand = badBrand(p.brand) ? '' : p.brand;
  const material = p.specs?.['Matières'] || p.specs?.['Matière'] || p.specs?.['Matière extérieure'] || '';
  const sizes = p.sizes.map((s) => s.split(',')[0]);
  const colors = p.colors || [];
  const disciplines = disciplinesOf(p);
  const level = practiceLevel(p);
  const parts: string[] = [];

  parts.push(
    pick(p.id, [
      `${cap(object)}${brand ? ' signé ' + brand : ''}, dans la famille ${family}.`,
      `${p.name.split(',')[0]} : ${brand ? 'un modèle ' + brand : 'un modèle'} de la famille ${family}.`,
      `Ce modèle appartient à la famille ${family}${brand ? ', chez ' + brand : ''}.`,
    ]),
  );
  parts.push(pick(p.id, USE_BY_FAMILY[p.category] || ['Un matériel de sports de combat, présenté avec ses faits.'], 1));
  parts.push(`Discipline${disciplines.length > 1 ? 's' : ''} : ${disciplines.join(', ')}. Niveau conseillé : ${level.toLowerCase()}.`);
  if (sizes.length > 1) parts.push(pick(p.id, [`Tailles réellement proposées : ${sizes.join(', ')}.`, `Il existe en ${sizes.length} tailles : ${sizes.join(', ')}.`, `Les tailles disponibles sont ${sizes.join(', ')}.`], 2));
  else if (sizes.length === 1) parts.push(`Taille : ${sizes[0]}.`);
  if (colors.length) parts.push(pick(p.id, [`Couleur${colors.length > 1 ? 's' : ''} : ${colors.join(', ')}.`, `Proposé en ${colors.join(' et ')}.`], 3));
  if (material) parts.push(pick(p.id, [`Matières : ${material.toLowerCase()}.`, `Construction : ${material.toLowerCase()}.`], 4));
  if (p.reference && p.referenceLabel === 'Référence') parts.push(`Référence fabricant : ${p.reference}.`);
  parts.push(
    pick(p.id, [
      `Prix prévu à l’ouverture des ventes : ${money(p.price)}, toutes taxes comprises, hors livraison.`,
      `Le prix prévu à l’ouverture est de ${money(p.price)} TTC, livraison en sus.`,
    ], 5),
  );
  parts.push(pick(p.id, ['La vente n’est pas encore ouverte : rien n’est débité ni réservé. Vous pouvez déjà le mettre dans votre panier, enregistrer vos choix et être prévenu.', `En vente le ${shop.ouverture.long} : aucun paiement d’ici là. Laissez votre e-mail pour être prévenu à l’ouverture.`], 6));
  return parts.join(' ');
}

/* Ce que chaque poids de gant fait, pour un adulte (guide « taille et poids des gants de boxe »). */
const USAGE_OZ: [number, string][] = [
  [8, 'la compétition'],
  [10, 'le sac'],
  [12, 'la technique'],
  [14, 'le travail avec partenaire'],
  [16, 'le travail avec partenaire'],
  [18, 'le sparring des gabarits lourds'],
  [20, 'le sparring des gabarits lourds'],
];
const listeFr = (xs: string[]) => (xs.length > 1 ? xs.slice(0, -1).join(', ') + ' et ' + xs[xs.length - 1] : xs[0] || '');

/**
 * La place du modèle dans sa famille, chiffrée sur le catalogue du jour (03/10). C'est le seul texte
 * d'une fiche qu'aucune autre fiche ne peut porter : son rang de prix parmi les modèles comparables
 * (même famille, même public, accessoires du rayon exclus), le prix médian de ces modèles, la gamme
 * de sa marque dans la famille et, pour un gant, ce que ses poids permettent. Aucun avis, aucune vente.
 */
export function placeDansLaFamille(p: Product, all: Product[]): string[] {
  const family = categoryFor(p.category);
  if (!family || p.price <= 0) return [];
  const enfant = (x: Product) => x.audience === 'enfant' || ENFANT.test(x.name);
  const pairs = all.filter((x) => x.category === p.category && x.price > 0 && dansLeRayon(p.category, x) && enfant(x) === enfant(p));
  if (pairs.length < 6) return [];
  const prix = pairs.map((x) => x.price).sort((a, b) => a - b);
  const moins = prix.filter((x) => x < p.price).length;
  const plus = prix.filter((x) => x > p.price).length;
  const median = prix[Math.floor(prix.length / 2)];
  const n = pairs.length;
  const famille = `${n} modèles${enfant(p) ? ' pour enfant' : ''} de la famille « ${family.name} »`;
  const rang =
    moins === 0
      ? 'c’est le prix le plus bas'
      : plus === 0
        ? 'c’est le prix le plus haut'
        : moins < n / 4
          ? 'il se place dans le quart le moins cher'
          : plus < n / 4
            ? 'il se place dans le quart le plus cher'
            : p.price <= median
              ? 'il se place dans la moitié la moins chère'
              : 'il se place dans la moitié la plus chère';
  const out = [`Parmi les ${famille}, ${moins} sont moins chers et ${plus} plus chers : à ${money(p.price)}, ${rang}, pour un prix médian de ${money(median)}.`];
  if (!badBrand(p.brand)) {
    const marque = pairs.filter((x) => x.brand === p.brand).map((x) => x.price).sort((a, b) => a - b);
    if (marque.length >= 2 && marque[0] !== marque[marque.length - 1]) out.push(`${p.brand} en propose ${marque.length} dans cette famille, de ${money(marque[0])} à ${money(marque[marque.length - 1])}.`);
    else if (marque.length >= 2) out.push(`${p.brand} en propose ${marque.length} dans cette famille, tous à ${money(marque[0])}.`);
    else out.push(`C’est le seul modèle ${p.brand} de cette famille.`);
  }
  if (p.category === 'gants-de-boxe' && !enfant(p)) {
    const oz = ouncesOf(p);
    const usages: string[] = [];
    for (const [poids, usage] of USAGE_OZ) {
      const ici = oz.filter((o) => o === poids);
      if (!ici.length) continue;
      const deja = usages.findIndex((u) => u.startsWith(usage));
      if (deja >= 0) usages[deja] = usages[deja].replace(/ oz\)$/, ` et ${poids} oz)`);
      else usages.push(`${usage} (${poids} oz)`);
    }
    if (usages.length >= 2) out.push(`Ses poids couvrent ${listeFr(usages)}.`);
    else if (usages.length === 1) out.push(`Son poids sert surtout pour ${usages[0]}.`);
  }
  return out;
}

/** Conseils d’entretien par famille, quand la fiche n’en porte pas. */
export function careAdvice(p: Product): string {
  if (p.care) return p.care;
  const t = p.name.toLowerCase();
  if (['gants-de-boxe', 'gants-mma'].includes(p.category)) return 'Sortez les gants du sac après chaque séance et laissez-les sécher ouverts, loin d’un radiateur. Un désodorisant ou du papier journal absorbe l’humidité. Le cuir se nourrit deux ou trois fois par an.';
  if (/protège-dents/.test(t)) return 'Rincez à l’eau froide après chaque séance, rangez dans une boîte aérée, remplacez dès qu’il se déforme.';
  if (['protections-boxe'].includes(p.category)) return 'Essuyez après chaque séance, lavez les parties en tissu à la main, séchez à l’air. Ne laissez pas une protection humide dans le sac.';
  if (['textile-boxe'].includes(p.category) || /kimono/.test(t)) return 'Lavage à 30 °C, à l’envers, sans adoucissant ni sèche-linge. Un kimono en coton se lave à froid pour garder sa taille.';
  if (['accessoires-boxe'].includes(p.category)) return 'Les bandes et sous-gants se lavent à 30 °C dans un filet et sèchent à plat.';
  if (['sacs-de-frappe'].includes(p.category)) return 'Essuyez la surface après usage, vérifiez la fixation et les sangles chaque mois, gardez le sac au sec.';
  if (['chaussures-boxe'].includes(p.category)) return 'Réservez-les à l’intérieur, aérez-les après la séance, nettoyez la semelle pour garder l’adhérence.';
  return 'Nettoyez selon la notice du fabricant et laissez sécher à l’air après chaque séance.';
}

/** Questions d’une fiche : taille, pratique, entretien, prix et disponibilité, livraison, retour. Tout vient des faits du modèle. */
export function productFaq(p: Product): { question: string; answer: string }[] {
  const family = categoryFor(p.category);
  // Nom court dans les questions (sans le coloris), nom complet une fois dans la première réponse.
  // Les noms importés portent le coloris après une virgule et peuvent dépasser soixante signes :
  // au-delà de 48, la question dit « ce modèle Cleto Reyes » plutôt que de répéter tout le nom.
  const trimmed = p.name.split(' — ')[0].replace(/,\s[^,]{1,30}$/, '');
  const brand = p.brand && !/pr[ée]ciser|^Sélection /i.test(p.brand) ? p.brand : '';
  const short = trimmed.length <= 48 ? trimmed : 'ce modèle' + (brand ? ' ' + brand : '');
  const guideTitle = family?.guide === 'guide-des-tailles' || !family?.guide ? 'Guide des tailles' : guides.find((g) => g.slug === family.guide)?.title || 'Guide des tailles';
  const sizes = p.sizes.map((s) => s.split(',')[0]);
  const disciplines = disciplinesOf(p);
  const level = practiceLevel(p).charAt(0).toLowerCase() + practiceLevel(p).slice(1);
  const heavy = /sac de frappe|base de frappe|poire|punching|mannequin|bob\b/i.test(p.name + ' ' + p.category);
  const size =
    sizes.length > 1
      ? `${p.name} existe en ${sizes.length} tailles : ${sizes.join(', ')}. Choisissez d’après l’usage, avec le guide « ${guideTitle} » lié sur cette fiche ; en cas de doute entre deux tailles, écrivez-nous depuis la page contact.`
      : sizes.length === 1
        ? `${p.name} existe en une seule taille : ${sizes[0]}. Le guide « ${guideTitle} » donne les repères de la famille.`
        : `Les tailles de ${p.name} ne sont pas encore renseignées dans le catalogue. Cela ne signifie pas que le modèle est en taille unique : vérifiez le guide « ${guideTitle} » ou écrivez-nous avant l’ouverture des ventes.`;
  return [
    { question: `Quelle taille choisir pour ${short} ?`, answer: size },
    { question: `${cap(short)} : pour quelle pratique et quel niveau ?`, answer: `${disciplines.join(', ')}, niveau ${level}. ${p.short}` },
    { question: `Comment entretenir ${short} ?`, answer: careAdvice(p) },
    { question: `${cap(short)} : quel prix, et à partir de quand ?`, answer: `Le prix prévu à l’ouverture est de ${(p.price / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}, TTC hors livraison. Les ventes ouvrent le ${shop.ouverture.long} : laissez votre e-mail sur la fiche pour être prévenu ce matin-là ; vous pouvez déjà enregistrer vos choix depuis le panier.` },
    { question: `${cap(short)} : comment se passe la livraison ?`, answer: heavy ? 'À domicile uniquement, dans toute la France métropolitaine, avec un tarif de matériel lourd indiqué avant validation ; le point relais n’accepte pas les colis lourds.' : `Dans toute la France métropolitaine, en point relais (6,90 €, offerts dès 69 € d’achats) ou à domicile (8,90 €), aux tarifs prévus à l’ouverture.${p.price > 0 ? (p.price < 6900 ? ` À ${money(p.price)}, il reste ${money(6900 - p.price)} d’achats avant la livraison offerte en point relais.` : ` À ${money(p.price)}, ce modèle passe à lui seul le seuil de la livraison offerte en point relais.`) : ''}` },
    { question: `${cap(short)} : retour ou échange possibles ?`, answer: `Oui, dès l’ouverture des ventes : quatorze jours de rétractation, article non porté et dans son emballage.${sizes.length > 1 ? ` Pour passer d’une taille à l’autre (${sizes.slice(0, 5).join(', ')}${sizes.length > 5 ? '…' : ''}), écrivez-nous avec la référence de la commande.` : ' Pour un échange, écrivez-nous avec la référence de la commande.'}` },
  ];
}
