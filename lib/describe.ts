import { guides } from './editorial';
/**
 * Description longue et originale de chaque modèle, écrite depuis ses faits :
 * objet, marque, famille, tailles, couleurs, matières, usage. Les tournures
 * varient d’une fiche à l’autre (choix déterministe par identifiant), les faits
 * ne varient jamais. Aucune phrase copiée d’un fournisseur, aucun stock, aucune
 * remise, aucune date.
 */
import { categoryFor, estLourd, livraison, money, shop, tailleUnique, type Product } from './catalog';
import { productObject } from './seo';
import { dansLeRayon, ENFANT } from './rayons';
import { ouncesOf } from './facets';

const pick = <T>(id: string, list: T[], salt = 0): T => {
  let h = salt;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return list[h % list.length];
};
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** « PU / Nylon » → « PU / nylon » : les sigles restent en capitales, le reste passe en minuscules. */
const matiere = (m: string) => m.split(/(\s+|\/|,)/).map((w) => (/^[A-Z0-9À-Ý]{2,}$/.test(w) ? w : w.toLowerCase())).join('');
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

/* ------------------------------------------------------------------------------------------------
 * 20/10/2026 — fiches uniques. L'audit du 19/10 mesurait 57 % de phrases partagées par fiche (médiane) :
 * les phrases-gabarits (usage par famille, « Disciplines : … », entretien, FAQ de livraison) étaient les
 * mêmes sur des centaines de fiches, et les coloris d'un même modèle ne différaient que par leur nom.
 * Désormais chaque phrase porte un fait propre au modèle (son nom court et son coloris, ses
 * caractéristiques, ses tailles, son prix et son rang) ; les phrases de remplissage ont disparu.
 * La syntaxe varie par identifiant, les faits jamais.
 * ---------------------------------------------------------------------------------------------- */

/** Mots d'un coloris ou d'une matière : ce qui suit la dernière virgule du nom se lit alors « en … ». */
const MOTS_COLORIS =
  /^(?:et|noir|noire|blanc|blanche|rouge|bleu|bleue|gris|grise|kaki|rose|marine|bordeaux|orange|vert|verte|jaune|violet|violette|marron|turquoise|or|camo|crème|olive|argent|cerise|roi|ciel|clair|claire|foncé|charbon|fluo|corail|transparent|anthracite|camel|sable|mat|mate|réfléchissant|cuir|coton|mesh|gel|pu|mousse|néoprène|synthétique|plastique|tricolore|tricolores)$/i;

/** Une liste lisible : « cuir, nylon et mousse ». */
const listeFr = (xs: string[]) => (xs.length > 1 ? xs.slice(0, -1).join(', ') + ' et ' + xs[xs.length - 1] : xs[0] || '');

/** Le nom découpé : base (sans le coloris), variante (le coloris ou le motif), objet, marque, modèle. */
export function appellation(p: Product) {
  const sep = p.name.includes(' — ') ? ' — ' : ', ';
  const at = p.name.lastIndexOf(sep);
  const tail = at > 0 ? p.name.slice(at + sep.length).trim() : '';
  const keepTail = Boolean(tail) && tail.length <= 34 && !/^\d/.test(tail);
  const base = keepTail ? p.name.slice(0, at).trim() : p.name.trim();
  const objet = productObject({ ...p, name: base });
  const marque = badBrand(p.brand) ? '' : p.brand;
  let modele = '';
  if (marque) {
    const i = base.toLowerCase().indexOf(marque.toLowerCase());
    if (i >= 0) modele = base.slice(i + marque.length).replace(/^[\s,–-]+/, '').trim();
  }
  const variante = keepTail ? tail : (p.colors || []).length && !/[,—]/.test(p.name) ? listeFr(p.colors || []) : '';
  const couleurSeule = Boolean(variante) && variante.split(/\s+/).every((w) => MOTS_COLORIS.test(w));
  /** « en rouge », « en cuir noir », « (Itachi) » : le coloris dit sans ambiguïté, à la suite du nom. */
  const en = !variante ? '' : couleurSeule ? ` en ${variante}` : ` (${variante})`;
  /** « Twins BGVL3 », sinon le nom sans coloris : la façon courte de désigner ce modèle. */
  const court = marque && modele ? `${marque} ${modele}` : base;
  return { base, objet, marque, modele, variante, en, court };
}

/** « la boxe anglaise et le MMA » : les disciplines du modèle, avec leur article. */
const ARTICLE: Record<string, string> = { 'Boxe anglaise': 'la boxe anglaise', MMA: 'le MMA', 'Muay-thaï': 'le muay-thaï', 'Boxe thaï': 'la boxe thaï', 'Kick-boxing': 'le kick-boxing', 'Jiu-jitsu brésilien': 'le jiu-jitsu brésilien', Grappling: 'le grappling', Karaté: 'le karaté', 'Boxe française': 'la boxe française', Judo: 'le judo', 'Préparation physique': 'la préparation physique', 'Sports de combat': 'les sports de combat' };
const pratiques = (p: Product) => listeFr(disciplinesOf(p).map((d) => ARTICLE[d] || d.toLowerCase()));

/** « Cuir · Nylon » → « cuir et nylon » ; les sigles (PU, EVA) gardent leurs capitales. */
const matieres = (m: string) => listeFr(matiere(m).split(/\s*[·/,]\s*/).filter(Boolean));

/** Les caractéristiques qui décrivent la fabrication, dans l'ordre de la fiche technique. */
const HORS_FABRICATION = /^(Référence|Référence interne|Type|Coloris|Modèle|Gamme|Taille)$/;
function fabrication(p: Product): string[] {
  return Object.entries(p.specs || {})
    .filter(([k, v]) => !HORS_FABRICATION.test(k) && v && v.length <= 80)
    .slice(0, 5)
    .map(([k, v]) => {
      const val = /mati[èe]re|composition|tissu|ext[ée]rieur|doublure|enveloppe/i.test(k)
        ? matieres(v)
        : /^[A-Z0-9]{2,}\b/.test(v)
          ? v
          : v.charAt(0).toLowerCase() + v.slice(1);
      return `${k.toLowerCase()} : ${val}`;
    });
}

const taillesDe = (p: Product) => p.sizes.map((s) => s.split(',')[0].trim()).filter(Boolean);

/** Écart de prix entre les tailles, quand il existe : « de 14,80 € à 21,20 € selon la taille ». */
function ecartDePrix(p: Product): string {
  const prix = (p.variants || []).map((v) => v.price).filter((x) => x > 0);
  if (prix.length < 2) return '';
  const min = Math.min(...prix);
  const max = Math.max(...prix);
  return min === max ? '' : `de ${money(min)} à ${money(max)} selon la taille`;
}

/** Ce que le prix fait de la livraison en point relais : seuil atteint, ou reste à compléter. */
function seuilRelais(p: Product): string {
  return p.price >= shop.livraison.franco
    ? `atteint seul les ${livraison.franco} d’achats qui rendent le point relais gratuit`
    : `laisse ${money(shop.livraison.franco - p.price)} d’achats à compléter pour un point relais offert`;
}

export function longDescription(p: Product): string {
  const a = appellation(p);
  const family = categoryFor(p.category)?.name.toLowerCase() || 'matériel de sports de combat';
  const disciplines = pratiques(p);
  const objet = a.objet.charAt(0).toLowerCase() + a.objet.slice(1);
  // « gants de boxe d’entraînement, famille gants de boxe » : la famille ne se répète pas quand l’objet la dit déjà.
  const dansFamille = objet.startsWith(family.split(' ')[0]) ? '' : `, famille ${family}`;
  const nom = `le modèle ${a.court}${a.en}`;
  const parts: string[] = [];

  // 1. Ce que c'est, nommé avec son coloris d'abord.
  parts.push(
    pick(p.id, [
      `${cap(a.court)}${a.en} : ${objet}${dansFamille}, pour ${disciplines}.`,
      `${cap(nom)} appartient à la famille ${family} (${objet}) ; pratique visée : ${disciplines}.`,
      `${a.variante ? `Coloris ${a.variante} pour ${a.court}` : cap(a.court)} : ${objet}${dansFamille}, pour ${disciplines}.`,
    ]),
  );

  // 2. Sa fabrication, depuis la fiche technique.
  const fab = fabrication(p);
  if (fab.length)
    parts.push(
      pick(
        p.id,
        [
          `Fiche technique du modèle ${a.court}${a.en} — ${fab.join(' ; ')}.`,
          `Côté fabrication, pour ${nom} — ${fab.join(' ; ')}.`,
          `Ce que dit la fiche technique du modèle ${a.court}${a.en} — ${fab.join(' ; ')}.`,
        ],
        1,
      ),
    );

  // 3. Ses tailles réelles, et l'écart de prix entre elles.
  const t = taillesDe(p);
  const ecart = ecartDePrix(p);
  if (t.length > 1)
    parts.push(
      pick(
        p.id,
        [
          `${t.length} tailles pour ${nom} : ${t.join(', ')}${ecart ? ', ' + ecart : ''}.`,
          `${cap(nom)} se décline en ${t.length} tailles (${t.join(', ')})${ecart ? ', ' + ecart : ''}.`,
          `Tailles proposées pour ${a.court}${a.en} : ${t.join(', ')}, soit ${t.length} au choix${ecart ? ', ' + ecart : ''}.`,
        ],
        2,
      ),
    );
  else if (t.length === 1)
    parts.push(/taille unique/i.test(t[0]) ? `${cap(nom)} est proposé en taille unique.` : `Une seule taille pour ${nom} : ${t[0]}.`);
  else if (tailleUnique(p)) parts.push(`Le fournisseur annonce ${nom} en taille unique.`);

  // 4. Le prix, et ce qu'il fait de la livraison.
  if (p.price > 0)
    parts.push(
      estLourd(p)
        ? `${cap(nom)} (${money(p.price)} TTC) se livre à domicile, sur devis, en ${livraison.zone} : écrivez-nous avec ce modèle et votre code postal, la réponse arrive par e-mail.`
        : pick(p.id, [`À ${money(p.price)} TTC, ${nom} ${seuilRelais(p)}.`, `Prix du modèle ${a.court}${a.en} : ${money(p.price)} TTC ; il ${seuilRelais(p)}.`], 3),
    );
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
/**
 * La place du modèle dans sa famille, chiffrée sur le catalogue du jour : son rang de prix parmi les
 * modèles comparables (même famille, même public, accessoires du rayon exclus), le prix médian de ces
 * modèles, sa place dans la gamme de sa marque, ses autres coloris au catalogue et, pour un gant, ce
 * que ses poids permettent. Chaque phrase nomme le modèle et son coloris : aucune ne se répète d'une
 * fiche à l'autre. Aucun avis, aucune vente.
 */
export function placeDansLaFamille(p: Product, all: Product[]): string[] {
  const family = categoryFor(p.category);
  if (!family || p.price <= 0) return [];
  const a = appellation(p);
  const nom = `le modèle ${a.court}${a.en}`;
  const out: string[] = [];
  const enfant = (x: Product) => x.audience === 'enfant' || ENFANT.test(x.name);
  const pairs = all.filter((x) => x.category === p.category && x.price > 0 && dansLeRayon(p.category, x) && enfant(x) === enfant(p));
  if (pairs.length >= 6) {
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
    const compte = (k: number, un: string, plusieurs: string) => (k === 0 ? `aucun n’est ${un}` : k === 1 ? `un seul est ${un}` : `${k} sont ${plusieurs}`);
    out.push(
      pick(p.id, [
        `Face à ${nom}, à ${money(p.price)}, parmi les ${famille}, ${compte(moins, 'moins cher', 'moins chers')} et ${compte(plus, 'plus cher', 'plus chers')} : ${rang}, pour un prix médian de ${money(median)}.`,
        `Parmi les ${famille}, ${compte(moins, 'moins cher', 'moins chers')} et ${compte(plus, 'plus cher', 'plus chers')} que ${nom} : à ${money(p.price)}, ${rang}, pour un prix médian de ${money(median)}.`,
      ], 7),
    );
    if (a.marque) {
      const marque = pairs.filter((x) => x.brand === p.brand).map((x) => x.price).sort((x, y) => x - y);
      const sous = marque.filter((x) => x < p.price).length;
      const dessus = marque.filter((x) => x > p.price).length;
      if (marque.length >= 2 && marque[0] !== marque[marque.length - 1])
        out.push(
          `${a.marque} en propose ${marque.length} dans cette famille, de ${money(marque[0])} à ${money(marque[marque.length - 1])} : ${
            sous === 0 ? `${nom} en est le moins cher` : dessus === 0 ? `${nom} en est le plus cher` : `${nom} en a ${sous} moins cher${sous > 1 ? 's' : ''} et ${dessus} plus cher${dessus > 1 ? 's' : ''}`
          }.`,
        );
      else if (marque.length >= 2) out.push(`${a.marque} en propose ${marque.length} dans cette famille, tous à ${money(marque[0])}, comme ${nom}.`);
      else out.push(`${cap(nom)} est le seul modèle ${a.marque} de la famille « ${family.name} ».`);
    }
  }
  // Les autres coloris du même modèle au catalogue : la liste change d'une fiche à l'autre.
  if (a.variante) {
    const freres = all.filter((x) => x.id !== p.id && x.category === p.category && x.brand === p.brand && appellation(x).base === a.base && appellation(x).variante);
    const autres = [...new Set(freres.map((x) => appellation(x).variante))].filter((v) => v !== a.variante);
    if (autres.length)
      out.push(
        pick(p.id, [
          `${cap(a.court)} existe aussi ${autres.length > 1 ? `en ${autres.length} autres versions` : 'dans une autre version'} : ${autres.join(' / ')} ; cette fiche présente la version ${a.variante}.`,
          `Outre la version ${a.variante}, ${a.court} se trouve au catalogue en ${autres.join(' / ')}.`,
        ], 8),
      );
  }
  if (p.category === 'gants-de-boxe' && !enfant(p)) {
    const oz = ouncesOf(p);
    const usages: string[] = [];
    for (const [poids, usage] of USAGE_OZ) {
      if (!oz.includes(poids)) continue;
      const deja = usages.findIndex((u) => u.startsWith(usage));
      if (deja >= 0) usages[deja] = usages[deja].replace(/ oz\)$/, ` et ${poids} oz)`);
      else usages.push(`${usage} (${poids} oz)`);
    }
    if (usages.length >= 2) out.push(`Les poids proposés pour ${nom} couvrent ${listeFr(usages)}.`);
    else if (usages.length === 1) out.push(`Le poids proposé pour ${nom} sert surtout pour ${usages[0]}.`);
  }
  return out;
}

/** Ce qu'il faut faire après la séance, par famille (infinitifs : rien à accorder au nom du modèle). */
function gestesEntretien(p: Product): string {
  const t = p.name.toLowerCase();
  if (['gants-de-boxe', 'gants-mma'].includes(p.category)) {
    const m = `${p.specs?.['Matières'] || ''} ${p.specs?.['Matière'] || ''} ${p.specs?.['Matière extérieure'] || ''} ${p.name}`.toLowerCase();
    const cuir = /cuir/.test(m) && !/synth|simili|pu\b|polyur/.test(m);
    return `sortir les gants du sac après chaque séance, les laisser sécher ouverts loin d’un radiateur, avec un désodorisant ou du papier journal contre l’humidité, ${cuir ? 'et nourrir le cuir deux ou trois fois par an avec un baume adapté' : 'et nettoyer l’extérieur synthétique au chiffon humide, sans produit gras'}`;
  }
  if (/protège-dents/.test(t)) return 'rincer à l’eau froide après chaque séance, ranger dans une boîte aérée et remplacer dès la première déformation';
  if (p.category === 'protections-boxe') return 'essuyer après chaque séance, laver à la main les parties en tissu, sécher à l’air et ne jamais laisser la protection humide dans le sac';
  if (p.category === 'textile-boxe' || /kimono/.test(t)) return 'laver à 30 °C, à l’envers, sans adoucissant ni sèche-linge';
  if (p.category === 'accessoires-boxe' && /bande|sous-gant|mitaine/.test(t)) return 'laver à 30 °C dans un filet et sécher à plat';
  if (p.category === 'sacs-de-frappe') return 'essuyer la surface après usage, contrôler chaque mois la fixation et les sangles, garder au sec';
  if (p.category === 'chaussures-boxe') return 'réserver à l’intérieur, aérer après la séance et nettoyer la semelle pour garder l’adhérence';
  return 'nettoyer selon la notice du fabricant et laisser sécher à l’air après chaque séance';
}

/** Entretien du modèle : la consigne de la fiche quand elle existe, sinon les gestes de sa famille, nommés pour lui. */
export function careAdvice(p: Product): string {
  const a = appellation(p);
  const mat = p.specs?.['Matières'] || p.specs?.['Matière'] || p.specs?.['Matière extérieure'] || '';
  const sujet = `${a.court}${a.en}${mat ? ` (${matieres(mat)})` : ''}`;
  if (p.care) return `Pour le modèle ${sujet} : ${p.care.charAt(0).toLowerCase()}${p.care.slice(1)}`;
  return pick(p.id, [`Pour le modèle ${sujet} : ${gestesEntretien(p)}.`, `Entretien du modèle ${sujet} : ${gestesEntretien(p)}.`], 9);
}

/** Questions d’une fiche : taille, pratique, prix et expédition, livraison, retour. Chaque réponse nomme le modèle. */
export function productFaq(p: Product): { question: string; answer: string }[] {
  const family = categoryFor(p.category);
  const a = appellation(p);
  // La question nomme le modèle et son coloris (« Twins BGVL3 en rouge »), la réponse le nom complet.
  const short = `${a.court}${a.en}`;
  const nom = `le modèle ${short}`;
  const guideTitle = family?.guide === 'guide-des-tailles' || !family?.guide ? 'Guide des tailles' : guides.find((g) => g.slug === family.guide)?.title || 'Guide des tailles';
  const sizes = taillesDe(p);
  const level = practiceLevel(p).charAt(0).toLowerCase() + practiceLevel(p).slice(1);
  const heavy = estLourd(p);
  const size =
    sizes.length > 1
      ? `${cap(nom)} existe en ${sizes.length} tailles, ${sizes.join(', ')} : choisissez d’après l’usage, écrivez-nous en cas de doute entre deux tailles, et ouvrez le guide « ${guideTitle} »`
      : sizes.length === 1
        ? `${cap(nom)} existe en une seule taille, ${sizes[0]} ; les repères de la famille sont dans le guide « ${guideTitle} »`
        : `Les tailles du modèle ${short} ne sont pas renseignées dans le catalogue, ce qui ne veut pas dire taille unique : écrivez-nous avant de commander, ou ouvrez le guide « ${guideTitle} »`;
  const echange = sizes.length > 1 ? `pour passer d’une taille à l’autre (${sizes.slice(0, 5).join(', ')}${sizes.length > 5 ? '…' : ''}), écrivez-nous avec la référence de la commande` : 'pour un échange, écrivez-nous avec la référence de la commande';
  const ecart = ecartDePrix(p);
  return [
    { question: `${cap(short)} : quelle taille choisir ?`, answer: `${size}.` },
    { question: `${cap(short)} : pour quelle pratique et quel niveau ?`, answer: `${cap(nom)} vise ${pratiques(p)}, ${level === 'tous niveaux' ? 'à tous les niveaux' : 'au niveau ' + level}${p.audience === 'enfant' ? ', en tailles enfant' : ''}.` },
    {
      question: `${cap(short)} : quel prix, et quand est-il expédié ?`,
      answer: heavy
        ? `${cap(nom)} coûte ${money(p.price)} TTC, hors livraison ; en matériel lourd, il se livre sur devis : écrivez-nous avec votre code postal.`
        : `${cap(nom)} coûte ${money(p.price)} TTC${ecart ? ' (' + ecart + ')' : ''}, hors livraison ; payé par carte en ligne, il part sous ${shop.delais.expedition}.`,
    },
    {
      question: `${cap(short)} : comment se passe la livraison ?`,
      answer: heavy
        ? `${cap(nom)} se livre à domicile, sur devis, en ${livraison.zone} : écrivez-nous avec le modèle et votre code postal ; le point relais n’accepte pas les colis lourds.`
        : `Pour ${nom}, livraison en ${livraison.zone} : ${livraison.tarifs}${p.price > 0 ? ` ; à ${money(p.price)}, il ${p.price >= shop.livraison.franco ? 'suffit à rendre le point relais gratuit' : `manque ${money(shop.livraison.franco - p.price)} d’achats pour le point relais offert`}` : ''}.`,
    },
    { question: `${cap(short)} : retour ou échange possibles ?`, answer: `Oui : ${nom} se retourne sous quatorze jours après réception, non utilisé et dans son emballage, à vos frais ; ${echange}.` },
  ];
}
