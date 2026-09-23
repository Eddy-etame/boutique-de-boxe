import { guides } from './editorial';
/**
 * Description longue et originale de chaque modèle, écrite depuis ses faits :
 * objet, marque, famille, tailles, couleurs, matières, usage. Les tournures
 * varient d’une fiche à l’autre (choix déterministe par identifiant), les faits
 * ne varient jamais. Aucune phrase copiée d’un fournisseur, aucun stock, aucune
 * remise, aucune date.
 */
import { categoryFor, money, type Product } from './catalog';
import { productObject } from './seo';

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
  parts.push(pick(p.id, ['La vente n’est pas encore ouverte : rien n’est débité ni réservé. Vous pouvez essayer la commande sans payer et laisser votre e-mail pour être prévenu.', 'En vente bientôt : aucun stock ni paiement pour l’instant. Laissez votre e-mail pour être prévenu à l’ouverture.'], 6));
  return parts.join(' ');
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
    { question: `Pour quelle pratique et quel niveau ?`, answer: `${disciplines.join(', ')}, niveau ${level}. ${p.short}` },
    { question: `Comment entretenir ${short} ?`, answer: careAdvice(p) },
    { question: `Quel est le prix, et quand sera-t-il disponible ?`, answer: `Le prix prévu à l’ouverture est de ${(p.price / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}, TTC hors livraison. Les ventes ne sont pas encore ouvertes : laissez votre e-mail sur la fiche pour être prévenu le jour J ; vous pouvez déjà essayer la commande sans payer.` },
    { question: `Comment est-il livré ?`, answer: heavy ? 'À domicile uniquement, dans toute la France métropolitaine, avec un tarif de matériel lourd indiqué avant validation ; le point relais n’accepte pas les colis lourds.' : 'Dans toute la France métropolitaine, en point relais (6,90 €, offerts dès 69 € d’achats) ou à domicile (8,90 €), aux tarifs prévus à l’ouverture.' },
    { question: `Peut-on le retourner ou l’échanger ?`, answer: 'Oui, dès l’ouverture des ventes : quatorze jours de rétractation, article non porté et dans son emballage ; pour un échange de taille, écrivez-nous avec la référence de la commande.' },
  ];
}
