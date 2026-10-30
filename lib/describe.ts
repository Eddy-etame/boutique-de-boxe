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

/** Révision du contenu des fiches : retrait des niveaux et usages déduits sans preuve du modèle. */
export const PRODUCT_EVIDENCE_REVISION = '2026-10-24';

const pick = <T>(id: string, list: T[], salt = 0): T => {
  let h = salt;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return list[h % list.length];
};
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const badBrand = (b: string) => !b || /pr[ée]ciser|^Sélection /i.test(b);

/** Un niveau explicitement renseigné, jamais une déduction depuis un nom de gamme ou l'âge. */
export function practiceLevel(p: Product): string | null {
  const declarations = [p.specs?.['Niveau conseillé'], p.specs?.['Niveau de pratique'], p.specs?.Niveau];
  return declarations.map((level) => level?.trim()).find(Boolean) || null;
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
 * 20/10/2026 — fiches uniques et lisibles. L'audit du 19/10 mesurait 57 % de phrases partagées par
 * fiche : les phrases-gabarits (usage par famille, « Disciplines : … », entretien, FAQ de livraison)
 * étaient les mêmes sur des centaines de fiches. Chaque phrase dit maintenant un fait du modèle
 * (fiche technique, tailles, prix et rang, gamme de la marque, autres coloris, seuil du relais
 * offert). Le nom complet n'est écrit qu'une fois, dans la première phrase de la description ;
 * ensuite le texte reprend le modèle comme on parle : « les Blade », « ces gants », « ce short »,
 * accordé grâce à la table GENRES. La syntaxe varie par identifiant, les faits jamais.
 * ---------------------------------------------------------------------------------------------- */

/** Mots d'un coloris ou d'une matière : ce qui suit la dernière virgule du nom se lit alors « en … ». */
const MOTS_COLORIS =
  /^(?:et|noir|noire|blanc|blanche|rouge|bleu|bleue|gris|grise|kaki|rose|marine|bordeaux|orange|vert|verte|jaune|violet|violette|marron|turquoise|or|camo|crème|olive|argent|cerise|roi|ciel|clair|claire|foncé|charbon|fluo|corail|transparent|anthracite|camel|sable|mat|mate|réfléchissant|cuir|coton|mesh|gel|pu|mousse|néoprène|synthétique|plastique|tricolore|tricolores)$/i;

const MATIERES_DU_NOM = /^(?:cuir|coton|mesh|gel|pu|mousse|néoprène|synthétique|plastique)$/i;

/** Une liste lisible : « cuir, nylon et mousse ». */
const listeFr = (xs: string[]) => (xs.length > 1 ? xs.slice(0, -1).join(', ') + ' et ' + xs[xs.length - 1] : xs[0] || '');
const minuscule = (s: string) => (/^[A-ZÀ-Ý][a-zà-ÿ’'-]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s);

/** « la boxe anglaise et le MMA » : les disciplines du modèle, avec leur article. */
const ARTICLE: Record<string, string> = { 'Boxe anglaise': 'la boxe anglaise', MMA: 'le MMA', 'Muay-thaï': 'le muay-thaï', 'Boxe thaï': 'la boxe thaï', 'Kick-boxing': 'le kick-boxing', 'Jiu-jitsu brésilien': 'le jiu-jitsu brésilien', Grappling: 'le grappling', Karaté: 'le karaté', 'Boxe française': 'la boxe française', Judo: 'le judo', 'Préparation physique': 'la préparation physique', 'Sports de combat': 'les sports de combat' };
const pratiques = (p: Product) => listeFr(disciplinesOf(p).map((d) => ARTICLE[d] || d.toLowerCase()));

/**
 * Les mots communs d'une fiche technique, seuls à passer en minuscules (« Mousse triple densité » →
 * « mousse triple densité ») ; un nom propre ou une technologie de marque (WindTec, Skintex, EVA)
 * garde sa casse.
 */
const COMMUNS = new Set(
  'cuir synthétique simili mousse nylon polyester coton élasthanne lycra spandex gel plastique acier caoutchouc néoprène silicone latex mesh microfibre polyuréthane polyamide viscose laine bois métal aluminium vinyle toile satin velours tissu textile triple double simple densité haute basse auto-agrippant auto-agrippante auto-agrippants lacets lacet zip attaché attachés libre courtes longues courte longue sans avec et paire unité sable eau air fibre verre carbone injectée injecté moulée moulé multicouche renforcé renforcée bande large étroite fine épaisse souple rigide ouverte fermée intégrale amovible réglable élastique éponge doublure intérieur extérieur standard'
    .split(' '),
);
function communes(v: string): string {
  return v
    .split(/(\s+|·|\/|,)/)
    .map((w) => (COMMUNS.has(w.toLowerCase()) ? w.toLowerCase() : w))
    .join('');
}
/** « Cuir · Nylon » → « cuir et nylon ». */
const matieres = (m: string) => listeFr(communes(m).split(/\s*[·/,]\s*/).filter(Boolean));

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
  const couleur = Boolean(variante) && variante.split(/\s+/).every((w) => MOTS_COLORIS.test(w));
  /** La teinte seule, sans la matière : « cuir noir » → « noir » ; « cuir » → rien. */
  const teinte = couleur ? variante.split(/\s+/).filter((w) => !MATIERES_DU_NOM.test(w)).join(' ').replace(/^et\s+|\s+et$/g, '') : '';
  /** « en rouge », « en cuir noir », « (Itachi) » : le coloris dit sans ambiguïté, à la suite du nom. */
  const en = !variante ? '' : couleur ? ` en ${variante}` : ` (${variante})`;
  /** « Twins BGVL3 », sinon le nom sans coloris. */
  const court = marque && modele ? `${marque} ${modele}` : base;
  return { base, objet, marque, modele, variante, couleur, teinte, en, court };
}

/* Genre et nombre du nom de l'objet, pour reprendre le modèle sans répéter son nom : « ces gants »,
 * « ce short », « cette coquille », « les Blade », « la Ferry ». Le premier motif qui convient au début
 * du nom gagne ; sinon le nom de la famille ; sinon « ce modèle ». */
type Genre = { nom: string; f: boolean; pl: boolean };
const g = (nom: string, f: boolean, pl: boolean): Genre => ({ nom, f, pl });
const GENRES: [RegExp, Genre][] = [
  [/^bandes? de r[ée]sistance/i, g('bande de résistance', true, false)],
  [/^gants?\b/i, g('gants', false, true)],
  [/^mitaines?/i, g('mitaines', true, true)],
  [/^sous-gants?/i, g('sous-gants', false, true)],
  [/^bandes?\b/i, g('bandes', true, true)],
  [/^(?:finger )?tape|^bandages?/i, g('tape', false, false)],
  [/^prot[eè]ge-dents/i, g('protège-dents', false, false)],
  [/^prot[eè]ge-tibias/i, g('protège-tibias', false, true)],
  [/^prot[eè]ge-pieds/i, g('protège-pieds', false, true)],
  [/^prot[eè]ge-cuisses/i, g('protège-cuisses', false, true)],
  [/^prot[eè]ge-avant-bras/i, g('protège-avant-bras', false, true)],
  [/^prot[eè]ge-oreilles/i, g('protège-oreilles', false, true)],
  [/^casques?\b/i, g('casque', false, false)],
  [/^coquilles?/i, g('coquille', true, false)],
  [/^plastron/i, g('plastron', false, false)],
  [/^chevill[eè]res/i, g('chevillères', true, true)],
  [/^genouill[eè]res/i, g('genouillères', true, true)],
  [/^coudi[eè]res/i, g('coudières', true, true)],
  [/^ceintures? de frappe/i, g('ceinture de frappe', true, false)],
  [/^ceintures?\b/i, g('ceinture', true, false)],
  [/^boucliers?/i, g('bouclier', false, false)],
  [/^valise/i, g('valise', true, false)],
  [/^vestes?/i, g('veste', true, false)],
  [/^brassi[eè]res?/i, g('brassière', true, false)],
  [/^bracelets?/i, g('bracelet', false, false)],
  [/^strap/i, g('strap', false, false)],
  [/^support/i, g('support', false, false)],
  [/^bo[iî]tes?/i, g('boîte', true, false)],
  [/^shorts?\b/i, g('short', false, false)],
  [/^t-shirts?|^tee-shirts?/i, g('t-shirt', false, false)],
  [/^d[ée]bardeurs?/i, g('débardeur', false, false)],
  [/^rashguards?/i, g('rashguard', false, false)],
  [/^leggings?|^collants?/i, g('legging', false, false)],
  [/^sweat|^hoodie|^pull/i, g('sweat', false, false)],
  [/^pantalons?|^joggings?|^survêtements?/i, g('pantalon', false, false)],
  [/^bob\b/i, g('bob', false, false)],
  [/^casquettes?/i, g('casquette', true, false)],
  [/^bonnets?/i, g('bonnet', false, false)],
  [/^chaussettes/i, g('chaussettes', true, true)],
  [/^ensembles?/i, g('ensemble', false, false)],
  [/^kimonos?/i, g('kimono', false, false)],
  [/^dobok/i, g('dobok', false, false)],
  [/^hakama/i, g('hakama', false, false)],
  [/^chaussures?|^bottines?/i, g('chaussures', true, true)],
  [/^semelles/i, g('semelles', true, true)],
  [/^sacs? à dos/i, g('sac à dos', false, false)],
  [/^sacs? de frappe/i, g('sac', false, false)],
  [/^sacs?\b/i, g('sac', false, false)],
  [/^poires?/i, g('poire', true, false)],
  [/^bases?/i, g('base', true, false)],
  [/^mannequins?/i, g('mannequin', false, false)],
  [/^portiques?/i, g('portique', false, false)],
  [/^potences?/i, g('potence', true, false)],
  [/^(?:demi-)?cages?/i, g('cage', true, false)],
  [/^rotules?/i, g('rotule', true, false)],
  [/^cha[iî]nes?/i, g('chaîne', true, false)],
  [/^attaches?|^fixations?/i, g('fixation', true, false)],
  [/^ressorts?/i, g('ressort', false, false)],
  [/^stations?/i, g('station', true, false)],
  [/^cibles?/i, g('cible', true, false)],
  [/^pattes? d/i, g('pattes d’ours', true, true)],
  [/^raquettes?/i, g('raquettes', true, true)],
  [/^b[âa]tons?/i, g('bâtons', false, true)],
  [/^cordes?/i, g('corde', true, false)],
  [/^[ée]lastiques?/i, g('élastique', false, false)],
  [/^medicine/i, g('medicine-ball', false, false)],
  [/^balles?/i, g('balle', true, false)],
  [/^gongs?/i, g('gong', false, false)],
  [/^minuteurs?|^compteurs?|^afficheurs?|^double minuteur/i, g('appareil', false, false)],
  [/^halt[eè]res/i, g('haltères', false, true)],
  [/^gilets?/i, g('gilet', false, false)],
  [/^tatamis/i, g('tatamis', false, true)],
  [/^tapis/i, g('tapis', false, false)],
  [/^racks?/i, g('rack', false, false)],
  [/^presses?/i, g('presse', true, false)],
  [/^kits?/i, g('kit', false, false)],
  [/^packs?|^lots?/i, g('pack', false, false)],
  [/^masques?/i, g('masque', false, false)],
  [/^haies?/i, g('haie', true, false)],
  [/^pinces?/i, g('pince', true, false)],
  [/^[ée]chelles?/i, g('échelle', true, false)],
  [/^coins?/i, g('coins', false, true)],
  [/^protections?/i, g('protection', true, false)],
  [/^bouteilles?/i, g('bouteille', true, false)],
  [/^gourdes?/i, g('gourde', true, false)],
  [/^porte-cl[ée]s/i, g('porte-clés', false, false)],
  [/^savons?|^sprays?|^s[ée]choirs?/i, g('produit', false, false)],
  [/^trousses?/i, g('trousse', true, false)],
  [/^ciseaux/i, g('ciseaux', false, true)],
  [/^planches?/i, g('planche', true, false)],
  [/^tanto|^couteaux?/i, g('couteau', false, false)],
  [/^[ée]tuis?/i, g('étui', false, false)],
];
const PAR_FAMILLE: Record<string, Genre> = {
  'gants-de-boxe': g('gants', false, true),
  'gants-mma': g('gants', false, true),
  'protections-boxe': g('protection', true, false),
  'textile-boxe': g('vêtement', false, false),
  'chaussures-boxe': g('chaussures', true, true),
  'sacs-de-frappe': g('sac', false, false),
  'sacs-de-sport': g('sac', false, false),
};
const MODELE = g('modèle', false, false);
function genreDe(p: Product, objet: string): Genre {
  for (const [re, x] of GENRES) if (re.test(objet) || re.test(p.name)) return x;
  return PAR_FAMILLE[p.category] || MODELE;
}
const voyelle = (s: string) => /^[aeiouyéèêàâîïôûœ]/i.test(s);

/** Les reprises d'un modèle, accordées : démonstratif, nom du modèle, pronom, accords. */
function reprises(p: Product) {
  const a = appellation(p);
  const G = genreDe(p, a.objet);
  const v = (sing: string, plur: string) => (G.pl ? plur : sing);
  const acc = (m: string) => m + (G.f ? 'e' : '') + (G.pl ? 's' : '');
  const ce = (G.pl ? 'ces ' : G.f ? 'cette ' : voyelle(G.nom) ? 'cet ' : 'ce ') + G.nom;
  // Le nom du modèle seul (« les BGVL3 », « le Black Acid Jazz ») quand il est court et commence par une capitale.
  const nomSeul = a.modele && a.modele.length <= 28 && /^[A-Z0-9À-Ý]/.test(a.modele) && !/^\d+(?:[.,]\d+)?\s*(?:m|cm|kg|ml|l|oz)\b/i.test(a.modele) ? a.modele : '';
  const le = nomSeul ? (G.pl ? 'les ' : voyelle(nomSeul) ? 'l’' : G.f ? 'la ' : 'le ') + nomSeul : ce;
  const il = G.pl ? (G.f ? 'elles' : 'ils') : G.f ? 'elle' : 'il';
  /** « les Blade », « le Black Acid Jazz », « la casquette Ferry » : l'article défini devant le nom. */
  const leNom = (x: string) => (G.pl ? 'les ' : voyelle(x) ? 'l’' : G.f ? 'la ' : 'le ') + x;
  const de = (x: string) => (x.startsWith('les ') ? 'des ' + x.slice(4) : x.startsWith('le ') ? 'du ' + x.slice(3) : 'de ' + x);
  return { a, G, v, acc, ce, le, il, de, leNom };
}

/** Les caractéristiques de fabrication, dans l'ordre de la fiche technique ; le coloris d'abord. */
const HORS_FABRICATION = /^(Référence|Référence interne|Type|Coloris|Modèle|Gamme|Taille)$/;
function fabrication(p: Product): string[] {
  const a = appellation(p);
  const coloris = a.teinte ? a.teinte : p.specs?.Coloris ? communes(p.specs.Coloris).toLowerCase() : '';
  const out = coloris ? [`coloris : ${coloris}`] : [];
  for (const [k, v] of Object.entries(p.specs || {})) {
    if (HORS_FABRICATION.test(k) || !v || v.length > 80 || out.length >= 5) continue;
    const val = /mati[èe]re|composition|tissu|ext[ée]rieur|doublure|enveloppe/i.test(k) ? matieres(v) : communes(v);
    out.push(`${k.toLowerCase()} : ${val}`);
  }
  return out;
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

/** Les autres coloris du même modèle au catalogue (même famille, même marque, même nom sans coloris). */
function autresColoris(p: Product, all: Product[]): string[] {
  const a = appellation(p);
  if (!a.variante) return [];
  const freres = all.filter((x) => x.id !== p.id && x.category === p.category && x.brand === p.brand && appellation(x).base === a.base);
  return [...new Set(freres.map((x) => appellation(x).variante).filter((v) => v && v !== a.variante))];
}

/** « à la boxe anglaise et aux sports de combat ». */
const aPratiques = (p: Product) => pratiques(p).replace(/(^|, | et )(les?|la) /g, (_m, sep: string, art: string) => sep + (art === 'le' ? 'au ' : art === 'les' ? 'aux ' : 'à la '));

export function longDescription(p: Product): string {
  const { a, v, ce, le, il, de, leNom } = reprises(p);
  const family = categoryFor(p.category)?.name.toLowerCase() || 'matériel de sports de combat';
  const objet = minuscule(a.objet);
  const horsFamille = !objet.toLowerCase().startsWith(family.split(' ')[0]);
  const nomComplet = `${a.base}${a.en}`;
  const parts: string[] = [];

  // 1. La seule phrase qui écrit le nom complet, coloris compris.
  parts.push(
    pick(p.id, [
      `${cap(leNom(minuscule(nomComplet)))} ${v('se destine', 'se destinent')} ${aPratiques(p)}${horsFamille ? ` ; ${il} ${v('fait', 'font')} partie de la famille ${family}` : ''}.`,
      `Pour ${pratiques(p)}, voici ${leNom(minuscule(nomComplet))}${horsFamille ? `, de la famille ${family}` : ''}.`,
    ]),
  );

  // 2. La fabrication, depuis la fiche technique, et les tailles réelles dans la même phrase.
  const fab = fabrication(p);
  const t = taillesDe(p);
  const ecart = ecartDePrix(p);
  if (t.length > 1) fab.push(`${t.length} tailles : ${t.join(', ')}${ecart ? ` (${ecart})` : ''}`);
  else if (t.length === 1 && !/taille unique/i.test(t[0])) fab.push(`taille : ${t[0]}`);
  const unique = (t.length === 1 && /taille unique/i.test(t[0])) || (!t.length && tailleUnique(p));
  if (unique) fab.push('taille unique');
  if (fab.length === 1 && fab[0].startsWith('coloris')) parts.push(`${cap(fab[0])}.`);
  else if (fab.length)
    parts.push(
      pick(p.id, [`Fiche technique ${de(le)} — ${fab.join(' ; ')}.`, `Côté fabrication — ${fab.join(' ; ')}.`, `Ce que dit la fiche technique — ${fab.join(' ; ')}.`, `${cap(ce)} en quelques faits — ${fab.join(' ; ')}.`], 1),
    );

  // 4. Le prix, et ce qu'il fait de la livraison.
  if (p.price > 0)
    parts.push(
      estLourd(p)
        ? `Matériel lourd : livraison à domicile sur devis, en ${livraison.zone} ; écrivez-nous avec ce modèle et votre code postal.`
        : p.price >= shop.livraison.franco
          ? pick(p.id, [`À ${money(p.price)} TTC, le point relais est offert dès ce seul achat.`, `Prix : ${money(p.price)} TTC, de quoi recevoir la commande en point relais sans frais.`], 3)
          : pick(p.id, [`À ${money(p.price)} TTC, il reste ${money(shop.livraison.franco - p.price)} d’achats avant le point relais offert.`, `Prix : ${money(p.price)} TTC ; le point relais devient gratuit avec ${money(shop.livraison.franco - p.price)} d’achats de plus.`], 3),
    );
  return parts.join(' ');
}
/**
 * La place du modèle dans sa famille, chiffrée sur le catalogue du jour : son rang de prix parmi les
 * modèles comparables (même famille, même public, accessoires du rayon exclus), le prix médian, sa
 * place dans la gamme de sa marque et ses autres coloris au catalogue. Les onces présentes sur la
 * fiche ne suffisent pas à établir un usage ou une homologation. Aucun avis, aucune vente.
 */
export function placeDansLaFamille(p: Product, all: Product[]): string[] {
  const family = categoryFor(p.category);
  if (!family || p.price <= 0) return [];
  const { a, G, v, le } = reprises(p);
  const out: string[] = [];
  const enfant = (x: Product) => x.audience === 'enfant' || ENFANT.test(x.name);
  const pairs = all.filter((x) => x.category === p.category && x.price > 0 && dansLeRayon(p.category, x) && enfant(x) === enfant(p));
  const compte = (k: number, un: string, plusieurs: string) => (k === 0 ? `aucun n’est ${un}` : k === 1 ? `un seul est ${un}` : `${k} sont ${plusieurs}`);
  const autres = autresColoris(p, all);
  if (autres.length)
    out.push(
      pick(p.id, [
        `${cap(le)} ${v('existe', 'existent')} aussi en ${autres.join(' / ')} ; cette fiche présente ${a.teinte ? 'le coloris' : 'la version'} ${a.variante}.`,
        `Autres ${a.teinte ? 'coloris' : 'versions'} au catalogue : ${autres.join(' / ')} ; ici, ${a.teinte ? 'le' : 'la version'} ${a.variante}.`,
      ], 8),
    );
  if (pairs.length >= 6) {
    const prix = pairs.map((x) => x.price).sort((x, y) => x - y);
    const moins = prix.filter((x) => x < p.price).length;
    const plus = prix.filter((x) => x > p.price).length;
    const median = prix[Math.floor(prix.length / 2)];
    const n = pairs.length;
    const rang =
      moins === 0
        ? 'c’est le prix le plus bas'
        : plus === 0
          ? 'c’est le prix le plus haut'
          : moins < n / 4
            ? 'ce prix se place dans le quart le moins cher'
            : plus < n / 4
              ? 'ce prix se place dans le quart le plus cher'
              : p.price <= median
                ? 'ce prix se place dans la moitié la moins chère'
                : 'ce prix se place dans la moitié la plus chère';
    let gamme = '';
    if (a.marque) {
      const marque = pairs.filter((x) => x.brand === p.brand).map((x) => x.price).sort((x, y) => x - y);
      const sous = marque.filter((x) => x < p.price).length;
      const dessus = marque.filter((x) => x > p.price).length;
      if (marque.length >= 2 && marque[0] !== marque[marque.length - 1])
        gamme = ` ; ${a.marque} en propose ${marque.length}, de ${money(marque[0])} à ${money(marque[marque.length - 1])}, et ${
          sous === 0
            ? `${le} ${v('en est', 'en sont')} ${G.pl ? 'les' : G.f ? 'la' : 'le'} moins ${cherAccorde(G)}`
            : dessus === 0
              ? `${le} ${v('en est', 'en sont')} ${G.pl ? 'les' : G.f ? 'la' : 'le'} plus ${cherAccorde(G)}`
              : `${sous} de ses modèles ${sous > 1 ? 'coûtent' : 'coûte'} moins cher, ${dessus} plus cher`
        }`;
      else if (marque.length >= 2) gamme = ` ; ${a.marque} en propose ${marque.length}, tous à ${money(marque[0])}`;
      else gamme = ` ; c’est le seul modèle ${a.marque} de la famille`;
    }
    out.push(
      pick(p.id, [
        `Parmi les ${n} modèles${enfant(p) ? ' pour enfant' : ''} de la famille « ${family.name} », ${compte(moins, 'moins cher', 'moins chers')} et ${compte(plus, 'plus cher', 'plus chers')} : à ${money(p.price)}, ${rang}, pour un prix médian de ${money(median)}${gamme}.`,
        `À ${money(p.price)}, ${rang} parmi les ${n} modèles${enfant(p) ? ' pour enfant' : ''} de la famille « ${family.name} » (prix médian : ${money(median)})${gamme}.`,
      ], 7),
    );
  }
  return out;
}
const cherAccorde = (G: Genre) => (G.f ? 'chère' : 'cher') + (G.pl ? 's' : '');

/** Ce qu'il faut faire après la séance, par famille (infinitifs : rien à accorder). */
function gestesEntretien(p: Product): string {
  const t = p.name.toLowerCase();
  if (['gants-de-boxe', 'gants-mma'].includes(p.category)) {
    const m = `${p.specs?.['Matières'] || ''} ${p.specs?.['Matière'] || ''} ${p.specs?.['Matière extérieure'] || ''} ${p.name}`.toLowerCase();
    const cuir = /cuir/.test(m) && !/synth|simili|pu\b|polyur/.test(m);
    return `les sortir du sac après chaque séance, les laisser sécher ouverts loin d’un radiateur, avec un désodorisant ou du papier journal contre l’humidité, ${cuir ? 'et nourrir le cuir deux ou trois fois par an avec un baume adapté' : 'et nettoyer l’extérieur synthétique au chiffon humide, sans produit gras'}`;
  }
  if (/protège-dents/.test(t)) return 'rincer à l’eau froide après chaque séance, ranger dans une boîte aérée et remplacer dès la première déformation';
  if (p.category === 'protections-boxe') return 'essuyer après chaque séance, laver à la main les parties en tissu, sécher à l’air, et ne jamais laisser une protection humide dans le sac';
  if (p.category === 'textile-boxe' || /kimono/.test(t)) return 'laver à 30 °C, à l’envers, sans adoucissant ni sèche-linge';
  if (p.category === 'accessoires-boxe' && /bande|sous-gant|mitaine/.test(t)) return 'laver à 30 °C dans un filet et sécher à plat';
  if (p.category === 'sacs-de-frappe') return 'essuyer la surface après usage, contrôler chaque mois la fixation et les sangles, garder au sec';
  if (p.category === 'chaussures-boxe') return 'réserver à l’intérieur, aérer après la séance et nettoyer la semelle pour garder l’adhérence';
  return 'nettoyer selon la notice du fabricant et laisser sécher à l’air après chaque séance';
}

/** Entretien : la consigne propre à la fiche quand elle existe, sinon les gestes de sa famille, avec la matière. */
export function careAdvice(p: Product): string {
  if (p.care) return p.care;
  const { ce, de } = reprises(p);
  const mat = p.specs?.['Matières'] || p.specs?.['Matière'] || p.specs?.['Matière extérieure'] || '';
  const sujet = `${ce}${mat ? ` en ${matieres(mat)}` : ''}`;
  return pick(p.id, [`Pour ${sujet} : ${gestesEntretien(p)}.`, `Entretien ${de(sujet)} : ${gestesEntretien(p)}.`], 9);
}

/**
 * Questions d’une fiche : taille, pratique, prix et expédition, livraison, retour. Les questions se
 * posent comme un client les poserait (« Quelle taille choisir pour les Blade ? ») ; les réponses
 * tiennent aux faits du modèle. `all` (le catalogue) ajoute les autres coloris à la réponse sur l'échange.
 */
export function productFaq(p: Product, all: Product[] = []): { question: string; answer: string }[] {
  const family = categoryFor(p.category);
  const { G, v, acc, ce, le, il, de } = reprises(p);
  const guideTitle = family?.guide === 'guide-des-tailles' || !family?.guide ? 'Guide des tailles' : guides.find((x) => x.slug === family.guide)?.title || 'Guide des tailles';
  const sizes = taillesDe(p);
  const level = practiceLevel(p);
  const heavy = estLourd(p);
  const ecart = ecartDePrix(p);
  const autres = autresColoris(p, all);
  const pron = (x: string) => x.replace(/^(\S+)/, (verbe) => `${verbe}-${il}`);
  const size =
    sizes.length > 1
      ? `${sizes.length} tailles : ${sizes.join(', ')} ; choisissez d’après l’usage, écrivez-nous en cas de doute entre deux tailles, et ouvrez le guide « ${guideTitle} ».`
      : sizes.length === 1
        ? `${/taille unique/i.test(sizes[0]) ? 'Taille unique' : `Une seule, ${sizes[0]}`} ; les repères de la famille sont dans le guide « ${guideTitle} ».`
        : `Les tailles ne sont pas renseignées dans le catalogue, ce qui ne veut pas dire taille unique : écrivez-nous avant de commander, ou ouvrez le guide « ${guideTitle} ».`;
  const changer = [sizes.length > 1 ? `de taille (${sizes.slice(0, 5).join(', ')}${sizes.length > 5 ? '…' : ''})` : '', autres.length ? `de coloris (${autres.slice(0, 4).join(', ')}${autres.length > 4 ? '…' : ''})` : ''].filter(Boolean);
  const seuil =
    p.price >= shop.livraison.franco ? `à ${money(p.price)}, le point relais est offert dès ce seul achat` : `à ${money(p.price)}, il manque ${money(shop.livraison.franco - p.price)} d’achats pour l’avoir offert`;
  // Sans taille renseignée, la question n'a de sens que pour ce qui se porte (gants, protections, textile, chaussures, kimonos).
  const sePorte = ['gants-de-boxe', 'gants-mma', 'protections-boxe', 'textile-boxe', 'chaussures-boxe', 'arts-martiaux'].includes(p.category);
  return [
    ...(sizes.length || sePorte ? [{ question: pick(p.id, [`Quelle taille choisir pour ${le} ?`, `Comment choisir la taille ${de(le)} ?`, `${cap(ce)} : quelles tailles ?`], 11), answer: size }] : []),
    {
      question: pick(p.id, level
        ? [`Pour quelle pratique et quel niveau ?`, `À qui ${v('s’adresse', 's’adressent')} ${ce} ?`, `Pour quel niveau ${v('est', 'sont')} ${acc('pensé')} ${ce} ?`]
        : ['Pour quelle pratique ?', `À quelle pratique ${v('est', 'sont')} ${acc('destiné')} ${ce} ?`, `Quelles disciplines pour ${ce} ?`], 12),
      answer: `${cap(le)} ${v('vise', 'visent')} ${pratiques(p)}${level ? ` ; niveau indiqué sur la fiche : ${level}` : ''}${p.audience === 'enfant' ? ' ; modèle enfant' : ''}.`,
    },
    {
      question: pick(p.id, [`Combien ${v('coûte', 'coûtent')} ${le}, et sous quel délai ?`, `Quel prix, et quand ${pron(v('part', 'partent'))} ?`], 13),
      answer: heavy
        ? `${money(p.price)} TTC, hors livraison ; en matériel lourd, la livraison se fait sur devis : écrivez-nous avec votre code postal.`
        : `${money(p.price)} TTC${ecart ? ' (' + ecart + ')' : ''}, hors livraison ; après le paiement par carte, ${il} ${v('part', 'partent')} sous ${shop.delais.expedition}.`,
    },
    {
      question: heavy ? 'Comment se passe la livraison du matériel lourd ?' : pick(p.id, ['Comment se passe la livraison ?', `Quels frais de port pour ${ce} ?`, 'Le point relais est-il offert ?'], 14),
      answer: heavy
        ? `À domicile, sur devis, en ${livraison.zone} : écrivez-nous avec le modèle et votre code postal ; le point relais n’accepte pas les colis lourds.`
        : `En ${livraison.zone} : ${livraison.tarifs} ; ${seuil}.`,
    },
    {
      question: pick(p.id, [`Peut-on retourner ou échanger ${ce} ?`, 'Retour ou échange possibles ?', `Et si ${le} ne ${v('convient', 'conviennent')} pas ?`], 15),
      answer: `Retour possible sous quatorze jours après réception, ${acc('non utilisé')} et dans ${G.pl ? 'leur' : 'son'} emballage, à vos frais${changer.length ? ` ; pour changer ${changer.join(' ou ')}, écrivez-nous avec la référence de la commande` : ' ; pour un échange, écrivez-nous avec la référence de la commande'}.`,
    },
  ];
}
