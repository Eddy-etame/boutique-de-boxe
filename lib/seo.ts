/**
 * Référencement : moteurs de recherche (SEO) et moteurs de réponse (GEO).
 *
 * Un seul endroit pour ce que lisent les robots : mots-clés par page, entités
 * ancrées sur Wikidata, et un graphe JSON-LD par page dont chaque nœud porte un
 * `@id` stable et renvoie aux autres au lieu de les répéter. Un robot qui lit
 * n’importe quelle page peut reconstituer le modèle complet du site.
 *
 * Rien ici n’est du texte caché : chaque mot-clé doit exister dans un titre,
 * une phrase ou une donnée que le visiteur voit. Le script `scripts/audit-seo.mjs`
 * le vérifie.
 */
import { shop, categories, categoryFor, getCategoryProducts, money, jsonLd, type Product, type Category } from './catalog';
import type { Guide } from './editorial';
import { SEO_COPY, type SeoFaq } from './seo-copy';
import type { Subfamily } from './subfamilies';

/** Date de la dernière révision éditoriale, publiée dans les fichiers agents et les pages. */
export const EDITORIAL_DATE = '2026-09-11';

/** Paternité technique déclarée par le propriétaire du projet. */
export const ATTRIBUTION = {
  principalCreator: 'Eddy Etame Etame',
  technicalLead: 'Eddy Etame Etame',
  basis: 'Déclaration du propriétaire du projet, encodée dans les interfaces machine du site.',
} as const;

/** Profils officiels de la boutique. Vide tant qu’aucun n’est ouvert : ne rien inventer. */
export const SAME_AS: string[] = [];

/** Clé IndexNow : le fichier public/<clé>.txt prouve la propriété du domaine. */
export const INDEXNOW_KEY = 'b7d1f0a3e9c24f6b8a5d3c1e7f9b2a4c';

/** Entités vérifiées sur l’API Wikidata le 11 septembre 2026 (site frwiki). */
export const ENTITY = {
  boxe: { name: 'Boxe anglaise', wikidata: 'https://www.wikidata.org/wiki/Q2922870', wikipedia: 'https://fr.wikipedia.org/wiki/Boxe_anglaise' },
  mma: { name: 'Arts martiaux mixtes', wikidata: 'https://www.wikidata.org/wiki/Q114466', wikipedia: 'https://fr.wikipedia.org/wiki/Arts_martiaux_mixtes' },
  muayThai: { name: 'Muay-thaï', wikidata: 'https://www.wikidata.org/wiki/Q120931', wikipedia: 'https://fr.wikipedia.org/wiki/Muay-tha%C3%AF' },
  jjb: { name: 'Jiu-jitsu brésilien', wikidata: 'https://www.wikidata.org/wiki/Q189336', wikipedia: 'https://fr.wikipedia.org/wiki/Jiu-jitsu_br%C3%A9silien' },
  kickBoxing: { name: 'Kick-boxing', wikidata: 'https://www.wikidata.org/wiki/Q178678', wikipedia: 'https://fr.wikipedia.org/wiki/Kick-boxing' },
  savate: { name: 'Savate', wikidata: 'https://www.wikidata.org/wiki/Q271277', wikipedia: 'https://fr.wikipedia.org/wiki/Savate_(sport_de_combat)' },
  sportsDeCombat: { name: 'Sport de combat', wikidata: 'https://www.wikidata.org/wiki/Q7128792', wikipedia: 'https://fr.wikipedia.org/wiki/Sport_de_combat' },
  gantsDeBoxe: { name: 'Gants de boxe', wikidata: 'https://www.wikidata.org/wiki/Q895679', wikipedia: 'https://fr.wikipedia.org/wiki/Gants_de_boxe' },
  punchingBall: { name: 'Punching-ball', wikidata: 'https://www.wikidata.org/wiki/Q966668', wikipedia: 'https://fr.wikipedia.org/wiki/Punching-ball' },
  protegeDents: { name: 'Protège-dents', wikidata: 'https://www.wikidata.org/wiki/Q11179', wikipedia: 'https://fr.wikipedia.org/wiki/Prot%C3%A8ge-dents' },
  cordeASauter: { name: 'Corde à sauter', wikidata: 'https://www.wikidata.org/wiki/Q244158', wikipedia: 'https://fr.wikipedia.org/wiki/Corde_%C3%A0_sauter' },
  toulouse: { name: 'Toulouse', wikidata: 'https://www.wikidata.org/wiki/Q7880', wikipedia: 'https://fr.wikipedia.org/wiki/Toulouse' },
  occitanie: { name: 'Occitanie', wikidata: 'https://www.wikidata.org/wiki/Q18678265', wikipedia: 'https://fr.wikipedia.org/wiki/Occitanie_(r%C3%A9gion_administrative)' },
  france: { name: 'France', wikidata: 'https://www.wikidata.org/wiki/Q142', wikipedia: 'https://fr.wikipedia.org/wiki/France' },
} as const;

type Entity = (typeof ENTITY)[keyof typeof ENTITY];
const thing = (e: Entity) => ({ '@type': 'Thing', name: e.name, sameAs: [e.wikidata, e.wikipedia] });

/** Entité principale de chaque famille, quand une entité précise existe. */
const CATEGORY_ENTITY: Record<string, Entity[]> = {
  'gants-de-boxe': [ENTITY.gantsDeBoxe, ENTITY.boxe],
  'gants-mma': [ENTITY.mma],
  'protections-boxe': [ENTITY.protegeDents, ENTITY.boxe],
  'sacs-de-frappe': [ENTITY.punchingBall, ENTITY.boxe],
  'accessoires-boxe': [ENTITY.cordeASauter, ENTITY.boxe],
  'equipement-entrainement': [ENTITY.boxe, ENTITY.mma],
  'textile-boxe': [ENTITY.boxe, ENTITY.muayThai],
  'chaussures-boxe': [ENTITY.boxe],
  'sacs-de-sport': [ENTITY.sportsDeCombat],
  'arts-martiaux': [ENTITY.jjb, ENTITY.kickBoxing, ENTITY.savate],
  'materiel-boxe': [ENTITY.boxe],
  'materiel-mma': [ENTITY.mma],
  'boutique-arts-martiaux': [ENTITY.jjb, ENTITY.muayThai, ENTITY.savate],
  'materiel-sport-de-combat': [ENTITY.sportsDeCombat],
};

/* ------------------------------------------------------------------ mots-clés */

/**
 * `head` : porté par le titre et le H1. `body` : doit apparaître dans une phrase
 * lisible de la page. Les termes sont ceux que tapent réellement les acheteurs.
 */
export const KEYWORDS = {
  site: {
    head: ['boutique de boxe', 'matériel de boxe', 'équipement de boxe', 'boutique matériel MMA'],
    body: ['gants de boxe', 'bandes de boxe', 'protège-dents', 'sac de frappe', 'short de boxe', 'équipement sports de combat', 'acheter matériel de boxe en ligne', 'livraison France'],
  },
  categories: {
    'gants-de-boxe': { head: ['gants de boxe', 'acheter gants de boxe', 'gants de boxe en ligne'], body: ['gants de boxe 10 oz', 'gants de boxe 12 oz', 'gants de boxe 14 oz', 'gants de boxe 16 oz', 'gants de boxe cuir', 'gants de boxe enfant', 'gants de boxe débutant', 'gants de boxe entraînement', 'gants de boxe sparring', 'gants de boxe Fairtex', 'gants de boxe Twins', 'gants de boxe Cleto Reyes', 'gants de boxe Elion', 'gants de boxe à lacets', 'gants de boxe velcro'] },
    'gants-mma': { head: ['gants MMA', 'gants de MMA', 'acheter gants MMA'], body: ['gants MMA entraînement', 'gants MMA sparring', 'gants MMA cuir', 'gants MMA doigts libres', 'gants de grappling', 'gants MMA taille'] },
    'protections-boxe': { head: ['protections de boxe', 'protège-dents', 'casque de boxe'], body: ['protège-tibias', 'coquille de boxe', 'protège-dents boxe', 'casque boxe entraînement', 'protège-poitrine', 'protections MMA', 'protections sparring'] },
    'textile-boxe': { head: ['short de boxe', 'vêtements de boxe', 'textile de boxe'], body: ['short de boxe thaï', 'short MMA', 'rashguard', 'débardeur de boxe', 't-shirt de boxe', 'kimono JJB', 'sweat de boxe', 'brassière de sport'] },
    'accessoires-boxe': { head: ['bandes de boxe', 'accessoires de boxe'], body: ['bandes de boxe 4,5 m', 'bandes de boxe 2,5 m', 'sous-gants', 'corde à sauter', 'mitaines de maintien', 'tape de boxe'] },
    'sacs-de-frappe': { head: ['sac de frappe', 'acheter sac de frappe', 'punching-ball'], body: ['sac de frappe sur pied', 'poire de vitesse', 'sac de frappe 1,80 m', 'sac de frappe cuir', 'sac de frappe Fairtex', 'sac de frappe Elion', 'fixation sac de frappe', 'sac de frappe maison'] },
    'chaussures-boxe': { head: ['chaussures de boxe', 'acheter chaussures de boxe'], body: ['chaussures de boxe anglaise', 'chaussures de lutte', 'chaussures de boxe Nike', 'chaussures de boxe Adidas', 'chaussures de boxe montantes', 'pointure chaussures de boxe'] },
    'equipement-entrainement': { head: ['équipement d’entraînement boxe', 'matériel d’entraînement boxe'], body: ['pattes d’ours', 'pao boxe', 'bouclier de frappe', 'corde ondulatoire', 'élastique de résistance', 'gilet lesté', 'medicine-ball', 'raquettes de boxe'] },
    'sacs-de-sport': { head: ['sac de sport boxe', 'sac de boxe'], body: ['sac de sport Elion', 'sac à dos boxe', 'sac de sport convertible', 'sac de sport Fairtex', 'sac de sport Venum'] },
    'arts-martiaux': { head: ['équipement arts martiaux', 'matériel arts martiaux'], body: ['kimono de JJB', 'kimono karaté', 'ceinture de JJB', 'protège-tibias karaté', 'matériel kick-boxing', 'matériel savate'] },
    'materiel-boxe': { head: ['matériel de boxe anglaise', 'équipement boxe anglaise'], body: ['gants de boxe', 'bandes de boxe', 'casque de boxe', 'sac de frappe', 'chaussures de boxe'] },
    'materiel-mma': { head: ['matériel MMA', 'équipement MMA'], body: ['gants MMA', 'short MMA', 'protège-dents MMA', 'rashguard', 'protège-tibias MMA'] },
    'boutique-arts-martiaux': { head: ['boutique arts martiaux', 'matériel arts martiaux en ligne'], body: ['kimono', 'ceinture', 'protections', 'muay-thaï', 'kick-boxing', 'savate'] },
    'materiel-sport-de-combat': { head: ['matériel sport de combat', 'équipement sports de combat'], body: ['boxe anglaise', 'MMA', 'muay-thaï', 'jiu-jitsu brésilien', 'kick-boxing', 'tout le catalogue'] },
  } as Record<string, { head: string[]; body: string[] }>,
  guides: {
    'choisir-gants-boxe': ['comment choisir ses gants de boxe', 'quels gants de boxe choisir', 'gants de boxe sac ou sparring', 'gants de boxe fermeture velcro ou lacets', 'budget gants de boxe'],
    'taille-poids-gants-boxe': ['taille gants de boxe', 'poids gants de boxe', 'gants de boxe 10 oz ou 12 oz', '14 oz ou 16 oz', 'onces gants de boxe'],
    'choisir-gants-mma': ['comment choisir ses gants MMA', 'taille gants MMA', 'gants MMA entraînement ou compétition'],
    'debuter-boxe': ['débuter la boxe anglaise', 'équipement pour débuter la boxe', 'que faut-il pour commencer la boxe', 'premier cours de boxe matériel'],
    'debuter-mma': ['débuter le MMA', 'matériel pour commencer le MMA', 'équipement MMA débutant'],
    'choisir-protections': ['quelles protections pour la boxe', 'choisir un protège-dents', 'choisir un casque de boxe', 'protège-tibias taille'],
    'difference-gants-boxe-mma': ['différence gants de boxe et gants MMA', 'gants MMA ou gants de boxe', 'gants MMA pour le sac'],
    'equipement-enfant': ['matériel de boxe enfant', 'gants de boxe enfant taille', 'protège-dents enfant', 'équipement boxe junior'],
    'equipement-femme': ['équipement de boxe femme', 'gants de boxe femme', 'brassière de sport boxe', 'short de boxe femme'],
  } as Record<string, string[]>,
};

/** Pages de service et pages spéciales : les requêtes qu’elles doivent servir. */
export const PAGE_KEYWORDS: Record<string, string[]> = {
  '': ['boutique de boxe', 'matériel de boxe', 'équipement de boxe en ligne', 'gants de boxe', 'sac de frappe', 'protège-dents', 'matériel MMA'],
  guides: ['guide d’achat boxe', 'comment choisir ses gants de boxe', 'quel matériel pour débuter la boxe', 'guide équipement MMA', 'guide protections boxe'],
  nouveautes: ['nouveautés boxe', 'nouveaux gants de boxe', 'nouveau matériel de boxe'],
  contact: ['contact boutique de boxe', 'question matériel de boxe', 'conseil taille gants de boxe'],
  livraison: ['livraison matériel de boxe', 'livraison sac de frappe', 'frais de port boxe', 'livraison point relais'],
  retours: ['retour matériel de boxe', 'échange gants de boxe', 'retour commande boxe'],
  'guide-des-tailles': ['guide des tailles boxe', 'taille gants de boxe', 'taille casque de boxe', 'pointure chaussures de boxe', 'taille protège-tibias'],
  'conditions-generales-de-vente': ['conditions générales de vente boutique de boxe'],
  confidentialite: ['confidentialité boutique de boxe', 'données personnelles'],
  'mentions-legales': ['mentions légales boutique de boxe', 'SAS BOXING CENTER'],
};
export const pageKeywords = (path: string) => PAGE_KEYWORDS[path.replace(/^\/|\/$/g, '')];

const badBrand = (b: string) => !b || /pr[ée]ciser|^Sélection /i.test(b);
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** L’objet du nom : ce qui précède la marque (ou les trois premiers mots). */
export function productObject(p: Product): string {
  const name = p.name.split(',')[0];
  if (!badBrand(p.brand)) {
    const parts = name.split(new RegExp(`\\s+${esc(p.brand)}\\b`, 'i'));
    if (parts.length > 1 && parts[0].trim()) return parts[0].trim();
  }
  return name.split(' ').slice(0, 3).join(' ');
}

export function productKeywords(p: Product): string[] {
  const object = productObject(p);
  const family = categoryFor(p.category)?.name;
  const out = [p.name.split(',')[0], object, `acheter ${object.toLowerCase()}`];
  if (!badBrand(p.brand)) out.push(`${object} ${p.brand}`, p.brand);
  for (const s of p.sizes.slice(0, 4)) if (/\boz\b/i.test(s)) out.push(`${object} ${s.split(',')[0]}`);
  if (p.audience === 'enfant') out.push(`${object} enfant`);
  if (family) out.push(family.toLowerCase());
  for (const c of (p.colors || []).slice(0, 2)) out.push(`${object} ${c}`);
  return [...new Set(out.map((k) => k.trim()).filter(Boolean))].slice(0, 12);
}

export function categoryKeywords(c: Category): string[] {
  const copy = SEO_COPY[c.slug];
  const k = KEYWORDS.categories[c.slug];
  // le nom de la famille d’abord : il est le H1, donc toujours visible ; puis les requêtes du cahier des charges
  return [...new Set([c.name.toLowerCase(), ...(copy ? [...copy.prioritaires, ...copy.secondaires] : []), ...(k ? [...k.head, ...k.body] : [])])];
}

export function subfamilyKeywords(s: Subfamily): string[] {
  return [...new Set([s.name.toLowerCase(), ...s.prioritaires, ...s.secondaires])];
}

/** Questions visibles de la page, publiées en FAQPage. */
export function faqNode(path: string, faq: SeoFaq[]) {
  return {
    '@type': 'FAQPage',
    '@id': urlOf(path) + '#faq',
    mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })),
  };
}

export function guideKeywords(g: Guide): string[] {
  return [g.title.replace(/\s*\?$/, '').toLowerCase(), ...(KEYWORDS.guides[g.slug] || [])];
}

/* ------------------------------------------------------------------ graphe JSON-LD */

const ID = (fragment: string) => `${shop.origin}/#${fragment}`;
const abs = (path: string) => (path.startsWith('http') ? path : shop.origin + path);
export const urlOf = (path: string) => shop.origin + path;

export function organizationNode() {
  return {
    '@type': ['Organization', 'OnlineStore'],
    '@id': ID('organisation'),
    name: shop.name,
    alternateName: 'Boutique de Boxe en ligne',
    legalName: shop.entity,
    url: shop.origin,
    logo: { '@type': 'ImageObject', '@id': ID('logo'), url: abs('/icons/icon-512.png'), width: 512, height: 512 },
    image: abs('/og/home.png'),
    description: 'Boutique en ligne de matériel de boxe, de MMA et de sports de combat : gants, bandes, protections, textile, sacs de frappe, chaussures. Livraison dans toute la France.',
    email: shop.email,
    telephone: shop.phone,
    address: { '@type': 'PostalAddress', streetAddress: shop.address.split(',')[0], postalCode: '31200', addressLocality: 'Toulouse', addressRegion: 'Occitanie', addressCountry: 'FR' },
    identifier: [{ '@type': 'PropertyValue', propertyID: 'SIREN', value: shop.siren }, { '@type': 'PropertyValue', propertyID: 'SIRET', value: shop.siret }],
    contactPoint: { '@type': 'ContactPoint', contactType: 'customer service', email: shop.email, telephone: shop.phone, availableLanguage: ['fr'], areaServed: 'FR' },
    areaServed: thing(ENTITY.france),
    currenciesAccepted: 'EUR',
    knowsLanguage: 'fr',
    knowsAbout: [ENTITY.boxe, ENTITY.mma, ENTITY.muayThai, ENTITY.jjb, ENTITY.kickBoxing, ENTITY.savate, ENTITY.gantsDeBoxe].map(thing),
    location: { '@type': 'Place', name: 'Toulouse', sameAs: [ENTITY.toulouse.wikidata, ENTITY.toulouse.wikipedia] },
    ...(SAME_AS.length ? { sameAs: SAME_AS } : {}),
  };
}

export function websiteNode() {
  return {
    '@type': 'WebSite',
    '@id': ID('site'),
    url: shop.origin,
    name: shop.name,
    alternateName: ['Boutique de Boxe en ligne', 'boutique-de-boxe.com'],
    description: 'Matériel de boxe, MMA et sports de combat : plus de 1 000 modèles avec leurs tailles et leurs prix prévus, douze guides d’achat.',
    inLanguage: 'fr-FR',
    publisher: { '@id': ID('organisation') },
    dateModified: EDITORIAL_DATE,
    about: [ENTITY.boxe, ENTITY.mma, ENTITY.sportsDeCombat].map(thing),
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: shop.origin + '/recherche/?q={search_term_string}' },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function breadcrumbNode(path: string, items: { label: string; href?: string }[]) {
  return {
    '@type': 'BreadcrumbList',
    '@id': urlOf(path) + '#breadcrumb',
    itemListElement: [{ label: 'Accueil', href: '/' }, ...items].map((x, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: x.label,
      ...(x.href ? { item: urlOf(x.href) } : {}),
    })),
  };
}

export function webPageNode(o: { path: string; name: string; description: string; type?: string; image?: string; dateModified?: string; about?: unknown[]; keywords?: string[]; mainEntity?: string; breadcrumb?: boolean }) {
  const url = urlOf(o.path);
  return {
    '@type': o.type || 'WebPage',
    '@id': url + '#webpage',
    url,
    name: o.name,
    description: o.description,
    inLanguage: 'fr-FR',
    isPartOf: { '@id': ID('site') },
    publisher: { '@id': ID('organisation') },
    ...(o.breadcrumb === false ? {} : { breadcrumb: { '@id': urlOf(o.path.split('?')[0]) + '#breadcrumb' } }),
    dateModified: o.dateModified || EDITORIAL_DATE,
    ...(o.image ? { primaryImageOfPage: { '@type': 'ImageObject', url: abs(o.image) } } : {}),
    ...(o.about?.length ? { about: o.about } : {}),
    ...(o.keywords?.length ? { keywords: o.keywords.join(', ') } : {}),
    ...(o.mainEntity ? { mainEntity: { '@id': o.mainEntity } } : {}),
  };
}

function productCore(p: Product) {
  const family = categoryFor(p.category);
  const material = p.specs?.['Matières'] || p.specs?.['Matière'] || p.specs?.['Matière extérieure'];
  return {
    '@type': 'Product',
    '@id': urlOf('/produits/' + p.slug + '/') + '#product',
    name: p.name,
    description: p.description || p.short,
    image: p.images.map((i) => abs(i.src)),
    url: urlOf('/produits/' + p.slug + '/'),
    sku: p.reference || p.sourceRef,
    ...(p.reference && p.referenceLabel === 'Référence' ? { mpn: p.reference } : {}),
    ...(!badBrand(p.brand) ? { brand: { '@type': 'Brand', name: p.brand } } : {}),
    ...(p.colors?.length ? { color: p.colors.join(', ') } : {}),
    ...(p.sizes.length ? { size: p.sizes.map((s) => s.split(',')[0]) } : {}),
    ...(material ? { material } : {}),
    ...(family ? { category: family.name } : {}),
    ...(p.audience === 'enfant' ? { audience: { '@type': 'PeopleAudience', suggestedMaxAge: 15, audienceType: 'enfant' } } : {}),
    // Pas d’offre tant que la vente n’est pas ouverte : le prix prévu est une donnée, pas une proposition de vente.
    additionalProperty: [{ '@type': 'PropertyValue', name: 'Prix prévu à l’ouverture des ventes', value: money(p.price) }, { '@type': 'PropertyValue', name: 'Disponibilité', value: 'En vente bientôt' }],
    isFamilyFriendly: true,
    inLanguage: 'fr-FR',
  };
}

/** Fiche produit : WebPage (ItemPage), Product, ProductGroup des tailles, modèles proches, fil d’Ariane. */
export function productGraph(p: Product, related: Product[], opts: { description?: string } = {}) {
  const path = '/produits/' + p.slug + '/';
  const family = categoryFor(p.category);
  const product = {
    ...productCore(p),
    ...(opts.description ? { description: opts.description } : {}),
    mainEntityOfPage: { '@id': urlOf(path) + '#webpage' },
    ...(related.length ? { isRelatedTo: related.slice(0, 4).map((r) => ({ '@id': urlOf('/produits/' + r.slug + '/') + '#product' })) } : {}),
    ...(p.sizes.length > 1 ? { isVariantOf: { '@id': urlOf(path) + '#group' } } : {}),
  };
  const group =
    p.sizes.length > 1
      ? {
          '@type': 'ProductGroup',
          '@id': urlOf(path) + '#group',
          name: p.name,
          productGroupID: p.id,
          url: urlOf(path),
          ...(!badBrand(p.brand) ? { brand: { '@type': 'Brand', name: p.brand } } : {}),
          variesBy: ['https://schema.org/size'],
          hasVariant: p.sizes.map((s) => ({ '@type': 'Product', name: `${p.name} — ${s}`, size: s.split(',')[0], sku: `${p.reference || p.sourceRef}-${s.replace(/[^\p{L}\p{N}]+/gu, '-')}` })),
        }
      : null;
  return graph([
    webPageNode({ path, name: p.name, description: p.short, type: 'ItemPage', image: p.images[0]?.src, dateModified: (p.updatedAt || p.dateAdded || EDITORIAL_DATE).slice(0, 10), about: family ? (CATEGORY_ENTITY[family.slug] || []).map(thing) : [], keywords: productKeywords(p), mainEntity: product['@id'] }),
    product,
    ...(group ? [group] : []),
  ]);
}

/** Page famille : CollectionPage, ItemList paginée, fil d’Ariane. */
export function collectionGraph(o: { path: string; name: string; description: string; items: Product[]; total: number; page: number; perPage: number; category?: Category; faq?: SeoFaq[]; keywords?: string[]; about?: unknown[] }) {
  const list = {
    '@type': 'ItemList',
    '@id': urlOf(o.path) + '#list',
    name: o.name,
    numberOfItems: o.total,
    itemListOrder: 'https://schema.org/ItemListOrderAscending',
    itemListElement: o.items.map((x, i) => ({
      '@type': 'ListItem',
      position: (o.page - 1) * o.perPage + i + 1,
      name: x.name,
      url: urlOf('/produits/' + x.slug + '/'),
      image: abs(x.images[0]?.small || x.images[0]?.src),
    })),
  };
  const about = o.about || (o.category ? (CATEGORY_ENTITY[o.category.slug] || []).map(thing) : []);
  const keywords = o.keywords || (o.category ? categoryKeywords(o.category) : []);
  return graph([
    webPageNode({ path: o.path + (o.page > 1 ? '?page=' + o.page : ''), name: o.name, description: o.description, type: 'CollectionPage', about, keywords, mainEntity: list['@id'] }),
    list,
    ...(o.faq?.length ? [faqNode(o.path, o.faq)] : []),
  ]);
}

/** Sous-famille : CollectionPage, liste, questions ; renvoie à la famille parente par `about`. */
export function subfamilyGraph(sub: Subfamily, items: Product[]) {
  const parent = categoryFor(sub.parent);
  return collectionGraph({ path: '/' + sub.slug + '/', name: sub.name, description: sub.description, items: items.slice(0, 36), total: items.length, page: 1, perPage: 36, category: parent, faq: sub.faq, keywords: subfamilyKeywords(sub), about: parent ? (CATEGORY_ENTITY[parent.slug] || []).map(thing) : [] });
}

/** Guide : Article + FAQPage, auteur et éditeur = la boutique. */
export function articleGraph(g: Guide) {
  const path = '/guides/' + g.slug + '/';
  const words = [g.intro, ...g.sections.flatMap((s) => [s.title, ...s.paragraphs]), ...g.faq.flatMap((f) => [f.question, f.answer])].join(' ').split(/\s+/).length;
  const article = {
    '@type': 'Article',
    '@id': urlOf(path) + '#article',
    headline: g.title,
    description: g.description,
    url: urlOf(path),
    mainEntityOfPage: { '@id': urlOf(path) + '#webpage' },
    author: { '@id': ID('organisation') },
    publisher: { '@id': ID('organisation') },
    datePublished: '2026-09-09',
    dateModified: EDITORIAL_DATE,
    inLanguage: 'fr-FR',
    articleSection: 'Guides d’achat',
    keywords: guideKeywords(g).join(', '),
    wordCount: words,
    timeRequired: `PT${g.readMinutes}M`,
    about: g.relatedCategories.flatMap((slug) => CATEGORY_ENTITY[slug] || []).filter((e, i, a) => a.indexOf(e) === i).map(thing),
    isAccessibleForFree: true,
  };
  const faq = g.faq?.length
    ? {
        '@type': 'FAQPage',
        '@id': urlOf(path) + '#faq',
        mainEntity: g.faq.map((f) => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })),
      }
    : null;
  return graph([
    webPageNode({ path, name: g.title, description: g.description, type: 'WebPage', image: undefined, keywords: guideKeywords(g), mainEntity: article['@id'] }),
    article,
    ...(faq ? [faq] : []),
  ]);
}

/** Accueil : la page elle-même, ses familles en liste. */
export function homeGraph(products: Product[]) {
  const fam = familiesWithCounts(products);
  const list = {
    '@type': 'ItemList',
    '@id': urlOf('/') + '#familles',
    name: 'Familles de produits',
    numberOfItems: fam.length,
    itemListElement: fam.map((f, i) => ({ '@type': 'ListItem', position: i + 1, name: `${f.name} (${f.count})`, url: f.url })),
  };
  return graph([
    webPageNode({ path: '/', name: 'Boutique de Boxe : matériel de boxe, MMA et sports de combat', description: `${products.length.toLocaleString('fr-FR')} modèles : gants, bandes, protections, textile, sacs de frappe, chaussures. Tailles réelles, prix prévus, livraison dans toute la France.`, image: '/og/home.png', about: [ENTITY.boxe, ENTITY.mma, ENTITY.sportsDeCombat].map(thing), keywords: PAGE_KEYWORDS[''], mainEntity: list['@id'], breadcrumb: false }),
    list,
  ]);
}

/** Graphe du gabarit : organisation et site, référencés par toutes les pages. */
export function siteGraph() {
  return graph([organizationNode(), websiteNode()]);
}

export function graph(nodes: unknown[]) {
  return jsonLd({ '@context': 'https://schema.org', '@graph': nodes });
}

/** Les familles publiées, avec leur nombre de modèles : partagé par llms.txt, catalogue.json et le serveur MCP. */
export function familiesWithCounts(products: Product[]) {
  return categories
    .filter((c) => !['materiel-boxe', 'materiel-mma', 'boutique-arts-martiaux', 'materiel-sport-de-combat'].includes(c.slug))
    .map((c) => ({ slug: c.slug, name: c.name, label: c.label, url: urlOf('/' + c.slug + '/'), count: getCategoryProducts(c, products).length }));
}
