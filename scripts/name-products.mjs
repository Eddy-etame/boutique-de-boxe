#!/usr/bin/env node
/**
 * Noms lisibles pour le catalogue importé (lib/data/imported-products.json).
 *
 * Applique les règles de .research/regles-noms-produits.md : le nom fournisseur
 * (gardé dans `sourceName`) devient « Objet Marque Modèle, variante », le code
 * fournisseur part sur la ligne Référence, les couleurs dans `colors`, les
 * mentions entre parenthèses dans `notes`. Les tailles sont normalisées.
 * Idempotent : repart toujours de `sourceName`.
 *
 *   node scripts/name-products.mjs            # écrit le fichier + le rapport
 *   node scripts/name-products.mjs --dry      # rapport seulement
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(HERE, '..', 'lib', 'data', 'imported-products.json');
const REPORT = path.join(HERE, '..', '..', '.research', 'names-report.md');
const DRY = process.argv.includes('--dry');
/** liant interne d’une mesure composée (« 2,5 cm × 10 m »), jamais coupé par le découpage */
const J = '⁠';

/* ------------------------------------------------------------------ tables */

const NO_BRAND = new Set(['MARQUE À PRÉCISER', 'MARQUE A PRECISER', 'LE COIN DU RING', 'BOXING SHOP', 'SÉLECTION BOUTIQUE DE BOXE', 'AQUA PUNCHING BAG']);
const BRANDS = {
  ELION: 'Elion', FAIRTEX: 'Fairtex', REYES: 'Cleto Reyes', CLETOREYES: 'Cleto Reyes', EVERLAST: 'Everlast',
  WICKEDONE: 'Wicked One', ADIDAS: 'Adidas', NIKE: 'Nike', CENTURY: 'Century', TWINS: 'Twins', SHOCKDOCTOR: 'Shock Doctor',
  VENUM: 'Venum', UNDERARMOUR: 'Under Armour', CHAMPBOXING: 'Champboxing', '8WEAPONS': '8 Weapons', METALBOXE: 'Metal Boxe',
  KWON: 'Kwon', MCDAVID: 'McDavid', RIVAT: 'Rivat', IHM: 'IHM', SVELTUS: 'Sveltus', EXCELLERATOR: 'Excellerator',
  RIVALBOXING: 'Rival', RIVAL: 'Rival', BENLEE: 'BenLee', HAYABUSA: 'Hayabusa', CLEANHUGS: 'Clean Hugs', 'BÕA': 'Bõa', BOA: 'Bõa',
  LEONE1947: 'Leone 1947', DOJOMASTER: 'Dojo Master', TREMBLAY: 'Tremblay', RDX: 'RDX', QPS: 'QPS', IMPACTSPORT: 'Impact Sport',
  UFC: 'UFC', ISBA: 'ISBA', TRAINNINGMASK: 'Training Mask', TRAININGMASK: 'Training Mask', RDBOXING: 'RD Boxing', TAPOUT: 'Tapout',
  KOJITS: 'Kojits', BUDOFIGHT: 'Budofight', SPORTIFRANCE: 'Sportifrance', ATHENA: 'Athena', HAYASHI: 'Hayashi', ACOKU: 'Acoku',
  MOOTO: 'Mooto', RINKAGE: 'Rinkage', TOPTEN: 'Top Ten',
};
const BRAND_ALIASES = {
  'Wicked One': ['wicked one', 'wicked'], 'Cleto Reyes': ['cleto reyes', 'reyes'], Rival: ['rival boxing', 'rival'],
  'Leone 1947': ['leone 1947', 'leone1947', 'leone'], 'Training Mask': ['trainning mask', 'training mask'],
  'Shock Doctor': ['shock doctor'], 'Under Armour': ['under armour'], '8 Weapons': ['8 weapons'], 'Metal Boxe': ['metal boxe', 'metalboxe'],
  'Dojo Master': ['dojo master'], 'Clean Hugs': ['clean hugs'], 'Impact Sport': ['impact sport'], 'RD Boxing': ['rd boxing'],
  'Top Ten': ['top ten'], Elion: ['elion paris', 'elion'],
};
const ACRONYMS = new Set(['MMA', 'JJB', 'JJ', 'BJJ', 'FFB', 'UFC', 'RDX', 'IHM', 'QPS', 'ISBA', 'KO', 'XS', 'XL', 'XXL', 'XXXL', 'AIBA', 'IBA', 'FEKM', 'PU', 'EVA', 'BF', 'VS', 'UA', 'USA', 'HEX', 'TKD', 'SE', 'BOB', 'LED', 'VMA']);
const KNOWN_MODELS = [
  'BGVL3', 'BGVL4', 'BGVL8', 'BGVLA3', 'BGV1', 'BGV6', 'BGV11', 'BGV13', 'BGV14', 'BGV16', 'BGV19', 'BGV24', 'RS11V', 'HB6', 'HB10', 'HB11', 'HB12', 'SP5', 'HG10', 'SGS10', 'CP19',
  'KLP1', 'KPLC2', 'KLPC3', 'KPLC4', 'TP3', 'TP4', 'UC1', 'Speed Tilt 350', 'Wavemaster', 'HEX 6440', 'HEX 651', 'C Gear', '4B Robo', 'Box Hog 2', 'Box Hog 4', 'Box Hog', 'Inflict 3', 'Mat Wizard 5', 'Ultimate V6',
  'Hypersweep', 'Hyperweep', 'HyperKO 2', 'HyperKO', 'Machomai 2', 'Machomai', 'Fury', 'Blue Print', 'Heart of Gold', 'Solid Black', 'Black Acid Jazz', 'White Funky Soul', 'Citrus Green',
  'Metallic', 'Breeze Blue', 'Pharao', 'Offensive', 'Racer', 'Tiger', 'Alma', 'Infinity', 'Draft Grip', 'Squeeze', 'Playmaker Jug',
  'Kontact', 'Shadow', 'Squale 350', 'Squale 450', 'Squale', 'Beaurepaire', 'Alcantara', 'Skintex', 'Elice', 'Raja', 'Rapide', 'Durand',
  'Russel', 'Miko', 'Brickbond', 'Jenny', 'Beastial Wolf', 'Classic', 'Aura', 'Super Sparring', 'High Precision', 'Pro Sparring',
  'L’Élégant', 'L’Extravagant', 'L’Arrogant', 'Élégant', 'Extravagant', 'Arrogant', 'Red City', 'Bad Bear', 'District', 'Matblack', 'South Beach', 'Golden Jubilee', 'Audace',
  'Boost', 'Monochrome', 'Seyant', 'Speedex 18', 'Speedex', 'Havoc Plus', 'Havoc', 'KO', 'Gladiator', 'Origins', 'Competitor', 'Bandido',
  'Squad', 'Power', 'Forest', 'Cactus', 'Magma', 'Dangerous', 'California', 'Norman', 'Sulphur', 'Powel', 'Horace', 'Spark', 'Herd',
  'Block', 'Swift', 'Klaz', 'Street King', 'Fight Week', 'Fight Night 2.0', 'Rio Olympics Edition', 'Evolution', 'Double Braces',
  'Focusmaster', 'Uppercut', '50th Anniversary', '50th', 'Muay Thai', 'Thai Pride', 'Gel Max', 'Pro Gel', 'Ultra', 'Elite', 'Kids', 'Youth',
  'Wakefield', 'Meadown', 'Sparring', 'Combat', 'Olympic', 'Golden', 'Finger', 'MTKick', 'Punch Line', 'Brave', 'Precision',
  'Reflex', 'Compétition', 'Competition', 'Champion', 'Legend', 'Legacy', 'Prime', 'Energy', 'Impact', 'Hexagon', 'Hexa', 'Versaflex 2.0', 'Versys VS.1', 'Versys',
  'Œil au beurre noir', 'Odor Fighter', 'Le Cœur de Guerrier', 'Tennis Elbow', 'Full Contact', 'Team', 'Club', 'Voltaire', 'Hydro Bag', 'BOB XL', 'Big BOB',
  'Training Mask 3.0', 'Professional', 'Pro', 'Velcro', 'Lace 2 Velcro', 'Air', 'Flex', 'Titan', 'Viper', 'Cobra', 'Panther', 'Falcon', 'Uncage', 'Jungle',
  'F1', 'Vintage', 'Valmy', 'Turenne', 'Razor', 'Austin', 'Resurrection', 'F-Day', 'Platinum', 'Redesign', 'Kingdom', 'Strike', 'Big 8', 'Deluxe', 'Kid Kick', 'Powerline',
];
const KNOWN_LOWER = new Map(KNOWN_MODELS.map((m) => [m.toLowerCase().replace(/œ/g, 'oe'), m]));
const CODE_TO_MODEL = { fxv1: 'BGV1', fxv6: 'BGV6', fxv11: 'BGV11', fxv16: 'BGV16', fxbgv19: 'BGV19', fxbgv14sb: 'BGV14', fxbgv14: 'BGV14', fxbgv24: 'BGV24', fxhb6: 'HB6', fxhb10: 'HB10', fxhb11: 'HB11', fxhb12: 'HB12', fxsp5: 'SP5', fxkpl1: 'KLP1', fxkplc2: 'KPLC2', fxklpc3: 'KLPC3', fxkplc4: 'KPLC4', fxtp3: 'TP3', fxtp4: 'TP4' };
const LICENCES = ['One Piece', 'Naruto Shippuden', 'Naruto', 'Dragon Ball Z', 'Dragon Ball', 'Smiley', 'Glory', 'Tom Atencio', 'Marvel', 'Batman', 'Attack on Titan', 'Demon Slayer', 'Hunter x Hunter', 'Jujutsu Kaisen', 'My Hero Academia'];
const CHARACTERS = ['Luffy', 'Zoro', 'Sanji', 'Nami', 'Ace', 'Shanks', 'Law', 'Chopper', 'Sasuke', 'Naruto', 'Kakashi', 'Itachi', 'Akatsuki', 'Gaara', 'Minato', 'Jiraiya', 'Madara', 'Obito', 'Boruto', 'Hinata', 'Sakura', 'Pain', 'Goku', 'Vegeta', 'Gohan', 'Trunks', 'Piccolo', 'Freezer', 'Frieza', 'Cell', 'Majin Buu', 'Buu', 'Broly', 'Beerus', 'Shenron', 'Krillin', 'Kaido', 'Shippuden'];
const FILLER = ['authentic', 'performance', 'premium', 'original', 'exclusive', 'quality', 'top qualité', 'nouveau', 'new', 'collection', 'unisexe', 'unisex', 'pièce', 'de qualité', 'replica', 'edition limitée', 'édition limitée', 'edition limited', 'limited edition', 'seule'];
const COLORS = {
  noir: 'noir', noire: 'noir', noirs: 'noir', black: 'noir', blanc: 'blanc', blanche: 'blanc', blancs: 'blanc', white: 'blanc',
  gris: 'gris', grise: 'gris', grey: 'gris', gray: 'gris', rouge: 'rouge', red: 'rouge', bleu: 'bleu', bleue: 'bleu', blue: 'bleu',
  vert: 'vert', verte: 'vert', green: 'vert', jaune: 'jaune', yellow: 'jaune', rose: 'rose', pink: 'rose', orange: 'orange',
  violet: 'violet', purple: 'violet', marron: 'marron', brown: 'marron', bordeaux: 'bordeaux', burgundy: 'bordeaux', kaki: 'kaki',
  khaki: 'kaki', beige: 'beige', or: 'or', gold: 'or', doré: 'or', argent: 'argent', silver: 'argent', camo: 'camo', camouflage: 'camo',
  fluo: 'fluo', turquoise: 'turquoise', marine: 'bleu marine', navy: 'bleu marine', royal: 'bleu roi', olive: 'olive', ivoire: 'ivoire',
  cuivre: 'cuivre', bronze: 'bronze', transparent: 'transparent', multicolore: 'multicolore', sylver: 'argent', chrome: 'chrome',
  charbon: 'charbon', charcoal: 'charbon', anthracite: 'anthracite', sable: 'sable', sand: 'sable', taupe: 'taupe', corail: 'corail', coral: 'corail',
  lavande: 'lavande', menthe: 'menthe', moutarde: 'moutarde', prune: 'prune', crème: 'crème', creme: 'crème', cream: 'crème', camel: 'camel', cerise: 'cerise',
  indigo: 'indigo', brique: 'brique', réfléchissant: 'réfléchissant', réflechissant: 'réfléchissant', 'blanc-cassé': 'blanc cassé', sky: 'bleu ciel',
};
const COLOR_VALUES = new Set(Object.values(COLORS));
const COLOR_MODS = { clair: 'clair', foncé: 'foncé', fonce: 'foncé', mat: 'mat', light: 'clair', dark: 'foncé', matte: 'mat', jet: 'foncé', heather: 'chiné', chiné: 'chiné', chine: 'chiné', métallisé: 'métallisé', metallise: 'métallisé', vintage: 'vintage' };
const MATERIALS = ['cuir', 'coton', 'vegan', 'gel', 'nylon', 'microfibre', 'skintex', 'alcantara', 'mesh', 'polyester', 'néoprène', 'neoprene', 'mousse', 'synthétique', 'synthetique', 'satin', 'pu', 'plastique', 'napa', 'nappa'];
/** mots courants du nom qui restent en minuscules et qui, placés avant la marque, complètent l’objet */
const QUALIFIERS = new Set(['lacets', 'velcro', 'capuche', 'zippé', 'zippée', 'réversible', 'reversible', 'ajustable', 'lesté', 'lestée', 'professionnel', 'professionel', 'coffret', 'boîte', 'thaï', 'thai', 'anglaise', 'française', 'francaise', 'convertible', 'adulte', 'enfant', 'enfants', 'femme', 'femmes', 'homme', 'hommes', 'sable', 'cuisses', 'tibias', 'pieds', 'poitrine', 'avant-bras', 'manches', 'courtes', 'longues', 'paire', 'mini', 'maxi', 'double', 'simple', 'bandage', 'bandages', 'sac', 'frappe', 'boxe', 'gants', 'protège', 'renforcé', 'renforcée', 'renforcés', 'renforcées', 'pour', 'musculation', 'jambes', 'vélocité', 'pelvienne', 'compétition', 'entraînement', 'plus', 'respirant', 'respirante', 'technique', 'montante', 'montantes', 'intégral', 'intégrale', 'longue', 'long', 'amateur', 'résistance', 'sport', 'jjb', 'mma', 'krav', 'maga', 'junior', 'maintien', 'plafond', 'mural', 'murale', 'pied', 'multi', 'multiboxe', 'rythme', 'rupture', 'roulement', 'billes', 'ressort', 'attache', 'médical', 'médicaux', 'rabattable', 'olympique', 'olympiques', 'modulaire', 'digital', 'manuel', 'spécial', 'karaté', 'travail', 'repos', 'chiffres', 'minuterie', 'sur', 'mesure', 'armes', 'courbé', 'courbée', 'courbés', 'mexicaines', 'mexicaine', 'édition', 'edition', 'collector', 'inspired', 'coquille', 'barre', 'puzzle', 'finition', 'épaisseur', 'sol', 'rail', 'intégré', 'intégrée', 'élastique', 'elastique', 'vegan', 'kung', 'fu', 'ceinture', 'ventrale', 'dorsale', 'cheville', 'poignet', 'genou', 'coude', 'main', 'mains', 'tête', 'avec', 'sans', 'et', 'de', 'du', 'des', 'à', 'au', 'aux', 'en', 'la', 'le', 'les']);
const SIZE_WORDS = /^(small|medium|large|x-?large|xx-?large|xxx-?large|adulte|adultes|junior|juniors|xs|xxs|s|m|l|xl|xxl|xxxl|2xl|3xl|unique)$/i;
const SIZE_RE = /^(\d{1,2}\s?oz|\d{2,3}\s?cm|\d{1,2}\s?ans|\d{2}|taille\s?unique|taille\s?\d|t\d|a\d+l?)$/i;
const NUMBER_RE = /^\d+(?:-\d+)?(?:[.,]\d+)?$/;
const UNIT_WORD = /^(oz|cm|mm|m|kg|kgs|lb|lbs|ml|l|ans|g)$/i;
const UNIT_RE = /^\d+(?:-\d+)?([.,]\d+)?\s?(oz|cm|mm|m|kg|kgs|lb|lbs|ml|l|ans|g)$/i;
const SKU_RE = /^(?=[A-Za-z0-9-]+$)(?=.*\d)(?=.*[A-Za-z])[A-Za-z0-9-]{4,}$/;
const STOP = new Set(['de', 'du', 'des', 'le', 'la', 'les', 'et', 'en', 'pour', 'avec', 'sans', 'à', 'au', 'aux', 'of', 'the', 'and', 'in', 'on', 'x', 'd’', 'l’', 'sur', 'par']);

/** objets : motif en début de nom → forme canonique ; le motif qui couvre le plus de texte gagne */
const OBJECTS = [
  [/^gants? de boxe d[’']entraînement/i, 'Gants de boxe d’entraînement'], [/^gants? d[’']entraînement/i, 'Gants de boxe d’entraînement'],
  [/^gants? de boxe (enfants?|junior|kids?)/i, 'Gants de boxe enfant'], [/^gants? de boxe [àa] lacets/i, 'Gants de boxe à lacets'], [/^gants? de boxe amateur/i, 'Gants de boxe amateur'],
  [/^gants? de (boxe|combat)/i, 'Gants de boxe'], [/^gants? de (mma|mixte)/i, 'Gants MMA'], [/^gants? mma/i, 'Gants MMA'], [/^gants? mmajjb/i, 'Gants MMA JJB'],
  [/^gants? de sac/i, 'Gants de sac'], [/^gants? de compétition/i, 'Gants de boxe de compétition'], [/^gants? de sparring/i, 'Gants de boxe de sparring'],
  [/^gants? de boxe fran[çc]aise/i, 'Gants de boxe française'], [/^gants?( de)? kick[- ]?boxing/i, 'Gants de kick-boxing'], [/^gants? de muay[- ]?tha[iï]/i, 'Gants de boxe thaï'],
  [/^gants?/i, 'Gants'],
  [/^mitaines? de maintien/i, 'Mitaines de maintien'], [/^mitaines?/i, 'Mitaines'], [/^sous[- ]gants?/i, 'Sous-gants'],
  [/^bandes? de boxe/i, 'Bandes de boxe'], [/^bandes? de cr[êe]pe/i, 'Bande de crêpe'], [/^bandes? de r[ée]sistance/i, 'Bande de résistance'], [/^bandes? mexicaines?/i, 'Bandes de boxe mexicaines'], [/^bandes?/i, 'Bandes'],
  [/^finger tape/i, 'Finger tape'], [/^tape pour bandage/i, 'Tape pour bandage'], [/^tape/i, 'Tape'],
  [/^prot[èeé]ges?[- ]dents/i, 'Protège-dents'], [/^prot[èeé]ges?[- ]tibias? (et|&) pieds/i, 'Protège-tibias et pieds'], [/^prot[èeé]ges?[- ]tibias?/i, 'Protège-tibias'],
  [/^prot[èeé]ges?[- ]pieds?/i, 'Protège-pieds'], [/^prot[èeé]ges?[- ]poitrine/i, 'Protège-poitrine'], [/^prot[èeé]ges?[- ]avant[- ]bras/i, 'Protège-avant-bras'],
  [/^prot[èeé]ges?[- ]coudes?/i, 'Protège-coudes'], [/^prot[èeé]ges?[- ]genoux?/i, 'Protège-genoux'], [/^prot[èeé]ges?[- ]cuisses?/i, 'Protège-cuisses'], [/^prot[èeé]ges?[- ]oreilles?/i, 'Protège-oreilles'],
  [/^protections? (des? |d[’'])?avant[- ]bras/i, 'Protège-avant-bras'], [/^protections? pelvienne/i, 'Protection pelvienne'], [/^protections? murale/i, 'Protection murale'], [/^protections?/i, 'Protection'], [/^plastron/i, 'Plastron'],
  [/^coquilles?/i, 'Coquille'], [/^chevill[iè]?[èe]res?/i, 'Chevillères'], [/^genouill[èe]res?/i, 'Genouillères'], [/^coudi[èe]res?/i, 'Coudières'],
  [/^casques? de boxe/i, 'Casque de boxe'], [/^casques? int[ée]gral/i, 'Casque intégral'], [/^casques?/i, 'Casque'],
  [/^shorts? de boxe tha[iï]/i, 'Short de boxe thaï'], [/^shorts? de muay[- ]?tha[iï]/i, 'Short de boxe thaï'], [/^shorts? (de )?boxe anglaise/i, 'Short de boxe anglaise'],
  [/^shorts? (de )?boxe fran[çc]aise/i, 'Short de boxe française'], [/^shorts? (de )?mma/i, 'Short MMA'], [/^fight ?shorts?/i, 'Short MMA'], [/^shorts? de (boxe|combat)/i, 'Short de boxe'], [/^shorts? de sport/i, 'Short de sport'], [/^shorts?/i, 'Short'],
  [/^d[ée]bardeurs? de boxe anglaise/i, 'Débardeur de boxe anglaise'], [/^d[ée]bardeurs? de boxe/i, 'Débardeur de boxe'], [/^d[ée]bardeurs?/i, 'Débardeur'], [/^t[- ]?shirts?/i, 'T-shirt'], [/^tee[- ]?shirts?/i, 'T-shirt'], [/^polos?/i, 'Polo'],
  [/^sweat(shirt)?s? (à |a )?capuche/i, 'Sweat à capuche'], [/^hoodies?/i, 'Sweat à capuche'], [/^sweat(shirt)?s? zipp[ée]s?/i, 'Sweat zippé'], [/^sweat(shirt)?s? sans manches/i, 'Sweat sans manches'], [/^sweat(shirt)?s?/i, 'Sweat'],
  [/^vestes?/i, 'Veste'], [/^jackets?/i, 'Veste'], [/^brassi[èe]res?/i, 'Brassière'], [/^rash[- ]?guards?/i, 'Rashguard'], [/^spats/i, 'Spats'], [/^leggings?/i, 'Legging'],
  [/^pantalons? de kung[- ]?fu/i, 'Pantalon de kung-fu'], [/^pantalons? de jogging/i, 'Pantalon de jogging'], [/^joggings?/i, 'Pantalon de jogging'], [/^pantalons? de boxe fran[çc]aise/i, 'Pantalon de boxe française'],
  [/^pantalons?/i, 'Pantalon'], [/^casquettes?/i, 'Casquette'], [/^bonnets?/i, 'Bonnet'], [/^bob\b/i, 'Bob'], [/^peignoirs? de boxe (à |a )?capuche/i, 'Peignoir de boxe à capuche'], [/^peignoirs? de boxe/i, 'Peignoir de boxe'], [/^peignoirs?/i, 'Peignoir'],
  [/^chaussettes?/i, 'Chaussettes'], [/^serviettes?/i, 'Serviette'], [/^combinaisons? de boxe fran[çc]aise/i, 'Combinaison de boxe française'], [/^combinaisons?/i, 'Combinaison'],
  [/^chaussures? de boxe/i, 'Chaussures de boxe'], [/^chaussures? de lutte/i, 'Chaussures de lutte'], [/^chaussures? multi[- ]?boxe/i, 'Chaussures multiboxe'], [/^chaussures?/i, 'Chaussures'],
  [/^sacs? de frappe sur pied/i, 'Sac de frappe sur pied'], [/^sacs? de frappe/i, 'Sac de frappe'], [/^punching[- ]?ball/i, 'Punching-ball'], [/^punching\b/i, 'Sac de frappe sur pied'], [/^poires? de vitesse/i, 'Poire de vitesse'],
  [/^(mini )?paire de pattes? d[’']ours/i, 'Pattes d’ours'], [/^paire de paos?\b/i, 'Pattes d’ours'], [/^pattes? d[’']ours/i, 'Pattes d’ours'], [/^paos?\b/i, 'Pattes d’ours'], [/^boucliers? de frappe/i, 'Bouclier de frappe'], [/^boucliers?/i, 'Bouclier de frappe'],
  [/^raquettes? de boxe/i, 'Raquettes de boxe'], [/^raquettes?/i, 'Raquettes de boxe'], [/^b[âa]tons? d[’']entraînement/i, 'Bâtons d’entraînement'], [/^b[âa]tons?/i, 'Bâtons d’entraînement'], [/^cibles?/i, 'Cible de frappe'],
  [/^cordes? [àa] sauter/i, 'Corde à sauter'], [/^battle ropes?/i, 'Corde ondulatoire'], [/^cordes? ondulatoires?/i, 'Corde ondulatoire'], [/^portiques?/i, 'Portique'], [/^potences?/i, 'Potence'], [/^stations? d[’']entraînement/i, 'Station d’entraînement'],
  [/^focusmaster/i, 'Station d’entraînement Focusmaster'], [/^ceintures? de frappe/i, 'Ceinture de frappe'], [/^ceintures? de jjb/i, 'Ceinture de JJB'], [/^ceintures?/i, 'Ceinture'],
  [/^sacs? de sport convertible/i, 'Sac de sport convertible'], [/^sacs? de sport/i, 'Sac de sport'], [/^sacs? [àa] dos/i, 'Sac à dos'], [/^sacs? de (boxe|combat)/i, 'Sac de sport'], [/^valises? de boxe/i, 'Valise de boxe'], [/^valises?/i, 'Valise'], [/^sacs?/i, 'Sac'],
  [/^bouteilles?/i, 'Bouteille'], [/^gourdes?/i, 'Gourde'], [/^kimonos? (de )?(jjb|bjj)/i, 'Kimono de JJB'], [/^kimonos? (de )?karat[ée]/i, 'Kimono de karaté'],
  [/^kimonos? (de )?judo/i, 'Kimono de judo'], [/^kimonos?/i, 'Kimono'], [/^dobok/i, 'Dobok'], [/^hakama/i, 'Hakama'], [/^tatamis?/i, 'Tatamis'],
  [/^trousses? de soins?/i, 'Trousse de soins'], [/^reflex balls?/i, 'Balle réflexe'], [/^reflex\b/i, 'Balle réflexe'], [/^balles? r[ée]flexe?/i, 'Balle réflexe'], [/^kit d[’']entraînement/i, 'Kit d’entraînement'],
  [/^élastiques?|^elastiques?/i, 'Élastique'], [/^elastic bands?/i, 'Élastique'], [/^m[ée]d[ée]cine[- ]?balls?/i, 'Medicine-ball'], [/^medicine[- ]?balls?/i, 'Medicine-ball'], [/^haltères?/i, 'Haltères'], [/^kettlebell/i, 'Kettlebell'],
  [/^gilets? lest[ée]s? de sable/i, 'Gilet lesté de sable'], [/^gilets? lest[ée]s?/i, 'Gilet lesté'], [/^gilets?/i, 'Gilet'], [/^haies? de v[ée]locit[ée]/i, 'Haie de vélocité'],
  [/^pinces? de musculations?/i, 'Pince de musculation'], [/^assouplisseurs? de jambes/i, 'Assouplisseur de jambes'], [/^masques? d[’']entraînement/i, 'Masque d’entraînement'], [/^trainn?ing mask/i, 'Masque d’entraînement'], [/^masques?/i, 'Masque'],
  [/^bo[iî]tes? [àa] savon/i, 'Boîte à savon'], [/^bo[iî]tes? pour prot[èeé]ges?[- ]dents/i, 'Boîte pour protège-dents'], [/^bo[iî]tes?/i, 'Boîte'], [/^savons?/i, 'Savon'], [/^s[ée]choirs?/i, 'Séchoir'], [/^semelles?/i, 'Semelles'],
  [/^bracelets?/i, 'Bracelet'], [/^lace 2 velcro/i, 'Convertisseur lacets-velcro'], [/^porte[- ]?cl[éèe]s?/i, 'Porte-clés'], [/^lunettes?/i, 'Lunettes'], [/^montres?/i, 'Montre'],
  [/^gel/i, 'Gel'], [/^spray/i, 'Spray'], [/^cr[èe]mes?/i, 'Crème'], [/^baumes?/i, 'Baume'], [/^huiles?/i, 'Huile'], [/^pansements?/i, 'Pansements'],
  [/^ciseaux? m[ée]dica(l|ux)/i, 'Ciseaux médicaux'], [/^ciseaux?/i, 'Ciseaux'], [/^glaci[èe]res?/i, 'Glacière'], [/^packs? de glace/i, 'Pack de glace'], [/^bandages?/i, 'Bandage'], [/^strap/i, 'Strap'],
  [/^cha[îi]nes? renforc[ée]e/i, 'Chaîne renforcée'], [/^cha[îi]nes?/i, 'Chaîne'], [/^supports?/i, 'Support'], [/^fixations?/i, 'Fixation'], [/^ancrages?/i, 'Ancrage'], [/^attaches? plafond/i, 'Attache plafond'], [/^attaches?/i, 'Attache'], [/^ressorts?/i, 'Ressort'], [/^rotules?/i, 'Rotule'], [/^poids/i, 'Poids'], [/^lests?/i, 'Lest'],
  [/^plateformes?/i, 'Plateforme'], [/^plates?-?formes?/i, 'Plateforme'], [/^bancs?/i, 'Banc'], [/^barres?/i, 'Barre'], [/^disques?/i, 'Disque'], [/^tapis/i, 'Tapis'], [/^racks?/i, 'Rack'], [/^stations? racks?/i, 'Station rack'], [/^leg press/i, 'Presse à cuisses'],
  [/^rings?\b/i, 'Ring'], [/^coins? de ring/i, 'Coins de ring'], [/^demi[- ]cages?/i, 'Demi-cage'], [/^cages?/i, 'Cage'], [/^pads? corner/i, 'Protection d’angle'], [/^mannequins? de frappe/i, 'Mannequin de frappe'], [/^mannequins?/i, 'Mannequin de frappe'], [/^big bob/i, 'Mannequin de frappe Big BOB'], [/^bases? de frappe/i, 'Base de frappe'],
  [/^chronom[èe]tres?/i, 'Chronomètre'], [/^timers?/i, 'Minuteur'], [/^double timers?/i, 'Double minuteur'], [/^compteurs?/i, 'Compteur'], [/^afficheurs?/i, 'Afficheur'], [/^gongs?/i, 'Gong'], [/^cloches?/i, 'Cloche'],
  [/^planches? de rupture/i, 'Planche de rupture'], [/^tanto/i, 'Tanto'], [/^couteaux? d[’']entraînement/i, 'Couteau d’entraînement'], [/^[ée]tuis? pour armes/i, 'Étui pour armes'], [/^[ée]chelles? de rythme/i, 'Échelle de rythme'], [/^kit pump/i, 'Kit pump'],
  [/^l[’']?[ée]l[ée]gant de boxe/i, 'Gants de boxe L’Élégant'], [/^l[’']?extravagant de boxe/i, 'Gants de boxe L’Extravagant'], [/^l[’']?arrogant de boxe/i, 'Gants de boxe L’Arrogant'],
];
const CATEGORY_OBJECT = { 'gants-de-boxe': 'Gants de boxe', 'gants-mma': 'Gants MMA', 'sacs-de-frappe': 'Sac de frappe', 'sacs-de-sport': 'Sac de sport', 'chaussures-boxe': 'Chaussures de boxe' };
const OBJECT_BASE = { 'Gants de boxe d’entraînement': 'Gants de boxe', 'Gants de boxe de compétition': 'Gants de boxe', 'Gants de boxe de sparring': 'Gants de boxe', 'Gants de boxe enfant': 'Gants de boxe', 'Gants de boxe à lacets': 'Gants de boxe', 'Gants de boxe amateur': 'Gants de boxe', 'Station d’entraînement Focusmaster': 'Focusmaster' };

/* ------------------------------------------------------------------ outils */

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const cap = (w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w);
const keyOf = (s) => s.normalize('NFC').toUpperCase().replace(/[^A-Z0-9À-Ý]/g, '');
const sentence = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const clean = (s) => s.replace(/\s+/g, ' ').trim();
const deaccent = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const lowerQualifier = (w) => { const lw = w.toLowerCase(); const base = lw.replace(/(es|s)$/, ''); return QUALIFIERS.has(lw) || QUALIFIERS.has(base) || STOP.has(lw); };
const acro = (w) => (ACRONYMS.has(w.toUpperCase()) ? w.toUpperCase() : w);

/** retire une expression (sans tenir compte des accents ni de la casse) d’un texte, jeton par jeton */
function removePhrase(text, phrase) {
  const words = text.split(' ');
  const target = deaccent(phrase).split(' ');
  let found = false;
  for (let i = 0; i + target.length <= words.length; i++) {
    if (words.slice(i, i + target.length).map((w) => deaccent(w.replace(/[,.]$/, ''))).join(' ') === target.join(' ')) { words.splice(i, target.length); found = true; i--; }
  }
  return { text: clean(words.join(' ')), found };
}

function normalize(raw) {
  let s = raw.normalize('NFC').replace(/\s+/g, ' ').trim();
  s = s.replace(/[®™©]/g, '').replace(/"/g, '').replace(/(\w)'(\w)/g, '$1’$2').replace(/\bL'/g, 'L’');
  s = s.replace(/\s*&\s*/g, ' et ');
  s = s.replace(/entra[iî]n?n?ement/gi, 'entraînement').replace(/prot[èeé]ges? tibias/gi, 'protège-tibias').replace(/prot[ée]g[ée]/gi, 'protège').replace(/platique/gi, 'plastique');
  s = s.replace(/\bcl[èe]s\b/gi, 'clés').replace(/\bboite\b/gi, 'boîte').replace(/mat-?black/gi, 'Matblack').replace(/\b(boxing[- ]?shop|boxingshop|le coin du ring)\b/gi, ' ');
  s = s.replace(/\s*\+\s*/g, ' et ').replace(/multi[- ]?boxes?\b/gi, 'multiboxe').replace(/\bcoeur\b/gi, 'cœur').replace(/\boeil\b/gi, 'œil').replace(/\banniversay\b/gi, 'Anniversary').replace(/\bechelle\b/gi, 'échelle').replace(/\belastique\b/gi, 'élastique').replace(/\brabattabe\b/gi, 'rabattable').replace(/\ba billes\b/gi, 'à billes').replace(/\bm[ée]tal ?boxe\b/gi, 'Metal Boxe');
  s = s.replace(/(\d)[.,](\d)\s?(m|kg|l|cm|mm|ml)\b/gi, (m, a, b, u) => `${a},${b} ${u.toLowerCase()}`);
  s = s.replace(/(\d+(?:,\d+)?)\s?(cm|m|mm)?\s*[x×]\s*(\d+(?:,\d+)?)\s?(cm|m|mm|mètres?|metres?)\b/gi, (m, a, ua, b, ub) => `${a}${J}${(ua || ub).replace(/m[èe]tres?/i, 'm').toLowerCase()}${J}×${J}${b}${J}${ub.replace(/m[èe]tres?/i, 'm').toLowerCase()}`);
  s = s.replace(/(\d+)\s?m[èe]tres?\b/gi, '$1 m');
  s = s.replace(/(\d)\s?(oz|ml|cm|mm|kg|lb)s?\b/gi, (m, d, u) => `${d} ${u.toLowerCase()}`);
  s = s.replace(/\b(\d)m(\d{2})\b/g, '$1,$2 m').replace(/\b(\d+)m\b/g, '$1 m');
  s = s.replace(/(\d+)\s?lb\s?\/\s?(\d+)\s?kg/gi, '$2 kg');
  s = s.replace(/\s*[-–—]\s*\(/g, ' (').replace(/\s+[-–—]\s+/g, ' — ').replace(/([a-zà-ÿ0-9])-\s+/gi, '$1 — ').replace(/\s-(?=[A-Za-z])/g, ' — ');
  return clean(s);
}

function caseModelToken(w) {
  const bare = w.replace(/[^A-Za-zÀ-ÿ0-9]/g, '');
  if (!bare) return w;
  const lw = w.toLowerCase();
  if (ACRONYMS.has(bare.toUpperCase())) return bare.toUpperCase();
  if (KNOWN_LOWER.has(lw.replace(/œ/g, 'oe'))) return KNOWN_LOWER.get(lw.replace(/œ/g, 'oe'));
  if (w.includes(J)) return lw.split(J).join(' ');
  if (UNIT_RE.test(lw) || /^\d+(?:[.,]\d+)?$/.test(lw)) return lw;
  if (/\d/.test(w) && /[a-z]/i.test(w) && bare.length <= 5) return w.toUpperCase();
  if (/\d/.test(w)) return w;
  if (/^[A-Z]{2,3}$/.test(w)) return w;
  if (STOP.has(lw) || lowerQualifier(w)) return lw;
  if (/^[dl]’/i.test(w)) return lw;
  if (w.includes('-')) return w.split('-').map((part) => cap(part.toLowerCase())).join('-');
  return cap(lw);
}

/* ------------------------------------------------------------------ pipeline */

function buildName(p) {
  const rules = [];
  const notes = [];
  let review = false;
  const raw = p.sourceName || p.name;
  let s = normalize(raw);

  s = clean(s.replace(/\(([^)]*)\)/g, (m, inner) => {
    const t = clean(inner);
    if (!t) return ' ';
    if (/^vendu sans/i.test(t) || t.length > 25) { notes.push(sentence(t.toLowerCase().replace(/\.{3,}$/, '').replace(/,(\S)/g, ', $1')) + '.'); rules.push('R7-note'); }
    else if (!SIZE_WORDS.test(t) && !SIZE_RE.test(t) && !UNIT_RE.test(t)) { notes.push(sentence(t.toLowerCase()) + '.'); rules.push('R7-note'); }
    return ' ';
  }));

  const segments = s.split(/\s—\s/).map(clean).filter(Boolean);
  const head = segments.shift() || '';
  const tails = segments;

  // marque
  const brandKey = keyOf(p.brand || '');
  let noBrand = NO_BRAND.has((p.brand || '').toUpperCase().normalize('NFC'));
  let brand = noBrand ? '' : BRANDS[brandKey] || (p.brand || '').split(' ').map((w) => cap(w.toLowerCase())).join(' ');
  let adoptedBrand = '';
  if (noBrand && /pr[ée]ciser/i.test(p.brand || '')) {
    for (const [display, aliases] of Object.entries(BRAND_ALIASES)) for (const a of aliases) if (removePhrase(head, a).found) { brand = display; adoptedBrand = display; noBrand = false; break; }
    if (!brand) for (const display of Object.values(BRANDS)) if (removePhrase(head, display).found) { brand = display; adoptedBrand = display; noBrand = false; break; }
    if (!brand) { review = true; rules.push('R5-brand-missing'); } else rules.push('R5-brand-adopted');
  }
  if ((p.brand || '').toUpperCase() === 'AQUA PUNCHING BAG') rules.push('R5-brand-is-object');
  const aliases = brand ? BRAND_ALIASES[brand] || [brand.toLowerCase()] : [];

  // objet : le motif qui couvre le plus de texte
  let object = '';
  let rest = head;
  let best = null;
  const preMaterials = [];
  let objectCore = '';
  for (const [re, canon] of OBJECTS) { const m = head.match(re); if (m && (!best || m[0].length > best.len)) best = { len: m[0].length, canon }; }
  if (best) { object = best.canon; rest = clean(head.slice(best.len)); rules.push('R6'); }
  objectCore = object;
  // position de la marque dans ce qui reste : tout ce qui la précède et qui est un mot courant complète l’objet
  const restWords = rest.split(' ').filter(Boolean);
  let brandAt = -1;
  for (let i = 0; i < restWords.length && brandAt < 0; i++) for (const a of aliases) { const n = a.split(' ').length; if (restWords.slice(i, i + n).map((w) => deaccent(w.replace(/[,.]$/, ''))).join(' ') === deaccent(a)) { brandAt = i; } }
  if (!object) {
    const fromCat = CATEGORY_OBJECT[p.category];
    if (fromCat && brandAt <= 0) { object = fromCat; objectCore = object; rules.push('R6-cat'); }
    else {
      let cut = brandAt > 0 ? brandAt : 1;
      if (brandAt <= 0) while (cut < restWords.length && (STOP.has(restWords[cut].toLowerCase()) || /^[dl]’/i.test(restWords[cut]))) cut += 2;
      object = sentence(restWords.slice(0, Math.min(cut, restWords.length)).map((w) => acro(w.toLowerCase())).join(' '));
      rest = restWords.slice(Math.min(cut, restWords.length)).join(' ');
      objectCore = object;
      review = true; rules.push('R6-review');
      brandAt = brandAt > 0 ? 0 : -1;
    }
  }
  if (brandAt > 0) {
    const pre = rest.split(' ').slice(0, brandAt);
    if (pre.every((w) => lowerQualifier(w) || /^[dl]’/i.test(w) || ACRONYMS.has(w.toUpperCase()) || MATERIALS.includes(w.toLowerCase()))) {
      const mats = pre.filter((w) => MATERIALS.includes(w.toLowerCase()));
      if (mats.length) preMaterials.push(...mats.map((w) => w.toLowerCase()));
      object = clean(object + ' ' + pre.filter((w) => !MATERIALS.includes(w.toLowerCase())).map((w) => acro(w.toLowerCase())).join(' ')).replace(/ capuche$/, ' à capuche').replace(/(\bpattes d’ours) longue$/, '$1 longues');
      rest = rest.split(' ').slice(brandAt).join(' ');
      rules.push('R6-qualifier');
    }
  }
  let audience = '';
  rest = clean(rest.replace(/^(enfants?|junior|kids?|femmes?|women|hommes?|men)\b/i, (m) => { audience = m.toLowerCase().replace(/s$/, '').replace(/kid|junior/, 'enfant').replace(/women/, 'femme').replace(/^men$/, 'homme'); return ''; }));

  rest = clean(rest.replace(/\bparis\b/gi, ' '));
  let collab = '';
  for (const lic of LICENCES) {
    const re = new RegExp(`\\b${esc(lic)}\\s+x\\s+([a-zà-ÿ0-9]+)|\\b([a-zà-ÿ0-9]+)\\s+x\\s+${esc(lic)}\\b`, 'i');
    const m = rest.match(re);
    if (m) {
      const other = m[1] || m[2] || '';
      const otherDisplay = BRANDS[keyOf(other)] || cap(other.toLowerCase());
      collab = m[1] ? `${lic} × ${otherDisplay}` : `${otherDisplay} × ${lic}`;
      rest = clean(rest.replace(m[0], ' '));
      rules.push('R10');
      break;
    }
  }
  for (const a of aliases) { rest = removePhrase(rest, a).text; for (let t = 0; t < tails.length; t++) tails[t] = removePhrase(tails[t], a).text; }
  let brandDisplay = brand;
  if (brand === 'Venum' && /\bufc\b/i.test(rest + ' ' + tails.join(' '))) { brandDisplay = 'UFC Venum'; rest = clean(rest.replace(/\bufc\b/gi, ' ')); for (let t = 0; t < tails.length; t++) tails[t] = clean(tails[t].replace(/\bufc\b/gi, ' ')); }

  const colors = [];
  const materials = [...preMaterials];
  const characters = [];
  const removedSizes = [];
  const measures = [];
  let reference = '';
  const sizeSet = new Set((p.sizes || []).map((x) => x.toLowerCase()));
  const srcRef = (p.sourceRef || '').toLowerCase().replace(/[-.]/g, '');
  let manches = '';
  const mm = [rest, ...tails].join(' — ').match(/manches?\s+(courtes?|longues?)/i);
  if (mm) manches = 'manches ' + mm[1].toLowerCase().replace(/s?$/, 's');
  const shoes = p.category === 'chaussures-boxe';

  const processSegment = (text, isTail) => {
    const out = [];
    let words = text.replace(/manches?\s+(courtes?|longues?)/gi, ' ').replace(/\s*\/\s*/g, ' / ').split(/\s+/).filter(Boolean);
    // un trait d’union entre un mot et une couleur sépare deux jetons (Raja-Sky, Mat-Navy)
    words = words.flatMap((w) => { if (/\d/.test(w) || !w.includes('-')) return [w]; const parts = w.split('-'); return parts.some((x) => COLORS[x.toLowerCase()] || COLOR_MODS[x.toLowerCase()]) ? parts : [w]; });
    let pendingMod = '';
    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      const lw = w.toLowerCase().replace(/[,.]$/, '');
      if (lw === '/' || (lw === 'et' && isTail)) continue;
      let matched = false;
      for (let len = 4; len >= 1; len--) {
        const phrase = words.slice(i, i + len).join(' ').toLowerCase().replace(/œ/g, 'oe');
        if (KNOWN_LOWER.has(phrase)) { out.push(KNOWN_LOWER.get(phrase)); i += len - 1; matched = true; break; }
      }
      if (matched) continue;
      if (CODE_TO_MODEL[lw]) { out.push(CODE_TO_MODEL[lw]); reference = reference || w; rules.push('R2-model'); continue; }
      const ch2 = words.slice(i, i + 2).join(' ');
      const chHit = CHARACTERS.find((c) => c.toLowerCase() === ch2.toLowerCase()) || CHARACTERS.find((c) => c.toLowerCase() === lw);
      if (chHit && (collab || tails.length || isTail)) { if (!characters.includes(chHit)) characters.push(chHit); if (chHit.includes(' ')) i += 1; continue; }
      const glued = lw.match(/^([a-zà-ÿ]+)\/([a-zà-ÿ]+)$/);
      if (glued && COLORS[glued[1]] && COLORS[glued[2]]) { colors.push(COLORS[glued[1]], COLORS[glued[2]]); continue; }
      const composite = lw.match(/^(noir|blanc|gris|bleu|rouge|vert|rose|kaki|orange|violet)(noir|blanc|gris|bleu|rouge|vert|rose|kaki|orange|or|blanche|grise|bleue|verte)$/);
      if (composite) { colors.push(COLORS[composite[1]], COLORS[composite[2]]); continue; }
      if (COLOR_MODS[lw]) { if (colors.length && !pendingMod) colors[colors.length - 1] += ' ' + COLOR_MODS[lw]; else pendingMod = COLOR_MODS[lw]; continue; }
      if (COLORS[lw]) {
        let c = COLORS[lw];
        if ((lw === 'bleu' || lw === 'blue') && words[i + 1] && /^(marine|navy|roi|royal|ciel|indigo)$/i.test(words[i + 1])) { c = { marine: 'bleu marine', navy: 'bleu marine', roi: 'bleu roi', royal: 'bleu roi', ciel: 'bleu ciel', indigo: 'bleu indigo' }[words[i + 1].toLowerCase()]; i++; }
        if (lw === 'sky' && /^blue$/i.test(words[i + 1] || '')) i++;
        if (pendingMod) { c += ' ' + pendingMod; pendingMod = ''; }
        if (out.length && /^(et|and)$/i.test(out[out.length - 1])) out.pop();
        if (/^(et|and)$/i.test(words[i + 1] || '') && (COLORS[(words[i + 2] || '').toLowerCase()] || COLOR_MODS[(words[i + 2] || '').toLowerCase()])) i++;
        colors.push(c);
        if (shoes && /^\d{3}$/.test(words[i + 1] || '')) i++;
        continue;
      }
      if (MATERIALS.includes(lw)) { materials.push(lw.replace('neoprene', 'néoprène').replace('synthetique', 'synthétique').replace(/^pu$/, 'PU').replace(/^napa$/, 'nappa')); continue; }
      if (UNIT_RE.test(lw) || w.includes(J)) { measures.push(lw); continue; }
      if (NUMBER_RE.test(lw) && UNIT_WORD.test(words[i + 1] || '')) { measures.push(lw + ' ' + words[i + 1].toLowerCase()); i++; continue; }
      if (shoes && /^\d{3}$/.test(lw)) continue;
      if (SIZE_WORDS.test(lw) || SIZE_RE.test(lw) || sizeSet.has(lw)) { removedSizes.push(lw); rules.push('R8'); continue; }
      if (/^(taille|tailles)$/.test(lw) && (SIZE_RE.test((words[i + 1] || '').toLowerCase()) || SIZE_WORDS.test(words[i + 1] || ''))) { removedSizes.push(words[i + 1].toLowerCase()); i++; rules.push('R8'); continue; }
      const bare = w.replace(/[^A-Za-z0-9-]/g, '');
      if (bare && bare.toLowerCase().replace(/[-.]/g, '') === srcRef) { rules.push('R2-sourceRef'); continue; }
      if (bare && SKU_RE.test(bare) && !/^\d+(th|e|er|ème)$/i.test(bare)) { if (!reference) reference = bare; rules.push('R2'); continue; }
      if (/^\d{4,}$/.test(bare)) { if (!reference) reference = bare; rules.push('R2'); continue; }
      if (/^[A-Za-z]\d{1,2}$/.test(bare) && words.length <= 2) { if (!reference) reference = bare.toUpperCase(); rules.push('R2'); continue; }
      const two = lw + ' ' + (words[i + 1] || '').toLowerCase();
      if (FILLER.includes(two)) { i++; rules.push('R7'); continue; }
      if (FILLER.includes(lw)) { rules.push('R7'); continue; }
      if (/^(x|×)$/i.test(lw)) continue;
      if ((lw === 'edition' || lw === 'édition') && /limit/i.test(words[i + 1] || '')) { i++; rules.push('R7'); continue; }
      out.push(w);
    }
    return out;
  };

  const modelTokens = processSegment(rest, false);
  const tailTokens = tails.flatMap((t) => processSegment(t, true));
  modelTokens.push(...tailTokens.filter((t) => !STOP.has(t.toLowerCase())));
  while (modelTokens.length && /^(et|and|x|×)$/i.test(modelTokens[0])) modelTokens.shift();
  while (modelTokens.length && STOP.has(modelTokens[modelTokens.length - 1].toLowerCase())) modelTokens.pop();
  const seenTok = new Set();
  const dedup = modelTokens.filter((w) => { const k = w.toLowerCase(); if (seenTok.has(k) && k.length > 2) return false; seenTok.add(k); return true; });
  let model = clean([...dedup.map(caseModelToken), ...measures.map((m) => m.split(J).join(' '))].join(' '));
  if (!model && !brand && rules.includes('R7')) {
    const kept = normalize(raw).split(/\s+/).find((w) => FILLER.includes(w.toLowerCase()));
    if (kept) { model = cap(kept.toLowerCase()); rules.push('R7-kept'); }
  }

  const uniqColors = [...new Set(colors)];
  if (uniqColors.length >= 3) rules.push('R9-3colors');
  const useful = dedup.filter((t) => t.length >= 3 && !STOP.has(t.toLowerCase()));
  if (!useful.length && !collab && !characters.length && !brand && !measures.length) { review = true; rules.push('R12'); }

  const assemble = (o) => {
    const parts = [o.object];
    if (audience) parts.push(audience);
    if (brandDisplay && !collab) parts.push(brandDisplay);
    if (collab) parts.push(collab);
    if (o.model) parts.push(o.model);
    if (manches) parts.push(manches);
    let n = clean(parts.filter(Boolean).join(' '));
    const variant = [];
    if (o.material && materials.length) variant.push(materials[0]);
    if (characters.length) variant.push(characters[0]);
    if (o.colors) {
      if (uniqColors.length === 1) variant.push(uniqColors[0]);
      else if (uniqColors.length === 2) variant.push(uniqColors.join(' et '));
      else if (o.allColors && uniqColors.length >= 3) variant.push(uniqColors.slice(0, -1).join(', ') + ' et ' + uniqColors[uniqColors.length - 1]);
    }
    if (variant.length) n += ', ' + variant.join(' ');
    return n;
  };
  const shortModel = (m, k) => { const w = m.split(' '); const out = w.slice(0, k); while (out.length > 1 && STOP.has(out[out.length - 1].toLowerCase())) out.pop(); return out.join(' '); };
  const baseObject = OBJECT_BASE[object] || object;
  const shortObject = shortModel(object, 3);
  const steps = [
    { object, model, material: true, colors: true, allColors: !model && !collab },
    { object: objectCore, model, material: true, colors: true },
    { object, model, material: false, colors: true },
    { object, model, material: false, colors: false },
    { object: baseObject, model, material: false, colors: false },
    { object: baseObject, model: shortModel(model, 3), material: false, colors: false },
    { object: shortObject, model: shortModel(model, 2), material: false, colors: false },
  ];
  let name = assemble(steps[0]);
  for (let i = 1; i < steps.length && [...name].length > 70; i++) { name = assemble(steps[i]); rules.push('R11'); }
  if ([...name].length > 70) { review = true; rules.push('R11-review'); }

  let referenceLabel = 'Référence';
  const variantRefs = [...new Set((p.variants || []).map((v) => v.reference).filter(Boolean))];
  const internal = (r) => /^(BS-\d+|GANTS|PROTEGETI|CDR)/i.test(r) || /\s/.test(r.trim()) && !/\d/.test(r) || r.length > 24;
  if (!reference) {
    if (variantRefs.length === 1 && !internal(variantRefs[0])) reference = variantRefs[0];
    else if (p.sourceRef && !internal(p.sourceRef)) reference = p.sourceRef;
    else { reference = p.sourceRef || variantRefs[0] || ''; referenceLabel = 'Référence interne'; rules.push('R13-internal'); }
  }

  const problems = [];
  if (!name || [...name].length > 70) problems.push('longueur');
  const knownCaps = new RegExp('\\b(' + [...ACRONYMS, ...KNOWN_MODELS.filter((m) => /^[A-Z0-9]+$/.test(m))].map(esc).join('|') + ')\\b', 'g');
  const capsWord = name.replace(knownCaps, '').match(/(?<![\p{L}])\p{Lu}{4,}(?![\p{L}])/u);
  if (capsWord) problems.push('capitales:' + capsWord[0]);
  if (/[®™©"]|\s{2}/.test(name)) problems.push('signes');
  if (!rules.includes('R9-3colors') && (name.replace(/\d,\d/g, '0').match(/,/g) || []).length > 1) problems.push('virgules');
  if (brand) { const n = (name.match(new RegExp(`\\b${esc(brand)}\\b`, 'gi')) || []).length; if (n !== 1) problems.push('marque×' + n); }
  if (/boxing[- ]?shop|le coin du ring/i.test(name)) problems.push('fournisseur');
  if (/[,\-×]$|\s(de|et|du|à|pour|avec)$/i.test(name)) problems.push('fin');
  if (problems.length) { review = true; rules.push('R14:' + problems.join('|')); }

  return { name, reference, referenceLabel, colors: uniqColors, notes, review, rules: [...new Set(rules)], adoptedBrand, removedSizes, assemble, steps, uniqColors };
}

/* ------------------------------------------------------------------ tailles */

const SIZE_MAP = { small: 'S', medium: 'M', large: 'L', xlarge: 'XL', 'x-large': 'XL', 'x large': 'XL', 'x/large': 'XL', xxlarge: 'XXL', 'xx-large': 'XXL', xxxlarge: '3XL', '2xl': 'XXL', '3xl': '3XL', xs: 'XS', xxs: 'XXS', s: 'S', m: 'M', l: 'L', xl: 'XL', xxl: 'XXL', unique: 'Taille unique', 'taille unique': 'Taille unique', 'taille unique unisexe': 'Taille unique', 'taille unique adulte': 'Taille unique' };
const sizeToken = (t) => { const k = t.trim().toLowerCase(); return SIZE_MAP[k] || t.trim(); };
const fixSlashSizes = (s) => s.replace(/^x\/l$/i, 'XL').replace(/^xx\/l$/i, 'XXL');
function tidySizeLabel(label, name) {
  const parts = label.split(' · ').map(clean).filter(Boolean);
  if (!parts.length) return { size: '', colors: [] };
  let size = parts[0];
  if (size === name) return { size: '', colors: [] };
  let extra = '';
  size = clean(size.replace(/\(([^)]*)\)/g, (m, inner) => { extra = clean(inner).replace(/(\d+)\s?-\s?(\d+)\s?kgs?/i, '$1 à $2 kg').replace(/junior\s*-?\s*11\s?ans/i, 'moins de 11 ans'); return ' '; }));
  size = size.replace(/^([A-Za-z]+)=(\d+\/\d+)$/, (m, a, b) => { extra = b; return a; }).replace(/^(small|medium|large|x-?large)\s+(\d+\s?\/\s?\d+)$/i, (m, a, b) => { extra = b.replace(/\s/g, ''); return a; });
  if (/^\d+M\d{2}$/i.test(size)) size = size.replace(/^(\d)M(\d{2})$/i, '$1,$2 m');
  size = fixSlashSizes(size).split(/\s*\/\s*/).map(sizeToken).join('/');
  size = size.replace(/(\d+)\s*oz\b/i, '$1 oz').replace(/(\d+)\s*cm\b/i, '$1 cm').replace(/(\d+)\s*ans\b/i, '$1 ans').replace(/\b(\d+)m\b/i, '$1 m').replace(/(\d+)\s?[xX]\s?(\d+)\s?[xX]\s?(\d+)(\s?cm)?/, '$1 × $2 × $3 cm').replace(/\s+/g, ' ');
  size = size.replace(/^taille (\d)$/i, 'Taille $1').replace(/^adulte$/i, 'Adulte').replace(/^junior$/i, 'Junior').replace(/junior\s*-?\s*11\s?ans/i, 'Junior (moins de 11 ans)');
  if (extra) size += ` (${extra})`;
  const cols = parts.slice(1).flatMap((c) => c.split(/\s*(?:\/|\bet\b)\s*/)).map((c) => COLORS[c.trim().toLowerCase()] || (COLOR_VALUES.has(c.trim().toLowerCase()) ? c.trim().toLowerCase() : '')).filter(Boolean);
  // une étiquette qui n’est qu’une couleur reste une variante de couleur
  const onlyColor = Boolean(size) && !/\d/.test(size) && size.split(/[\s/]+/).every((w) => COLORS[w.toLowerCase()] || COLOR_MODS[w.toLowerCase()]);
  if (onlyColor) size = size.split(/\s*\/\s*/).map((c) => c.split(' ').map((w) => COLORS[w.toLowerCase()] || COLOR_MODS[w.toLowerCase()] || w.toLowerCase()).join(' ')).join(' et ');
  return { size, colors: cols, onlyColor };
}

function tidySizes(p, newName) {
  const sizes = p.sourceSizes || p.sizes || [];
  if (!sizes.length) return { sizes: [], extraColors: [], changed: false, labels: [] };
  const sourceName = p.sourceName || p.name;
  const nameLike = (s) => s === sourceName || s === newName || /^tape$/i.test(s) || (s.split(' ').length >= 4 && s.split(' ').filter((w) => /^[A-Za-zÀ-ÿ’']{3,}$/.test(w)).length >= 3);
  if (sizes.length === 1 && nameLike(sizes[0])) return { sizes: [], extraColors: [], changed: true, labels: [''] };
  const parsed = sizes.map((s) => tidySizeLabel(s, sourceName));
  if (parsed.length === 1 && parsed[0].onlyColor) return { sizes: [], extraColors: parsed[0].size.toLowerCase().split(' et ').map((c) => COLORS[c] || c), changed: true, labels: [''] };
  if (parsed.every((x) => x.onlyColor)) {
    const labels = parsed.map((x) => sentence(x.size.toLowerCase()));
    return { sizes: [...new Set(labels)], extraColors: [], changed: true, labels };
  }
  const colorKeys = parsed.map((x) => x.colors.join('/'));
  const sameColor = new Set(colorKeys).size === 1;
  const labels = parsed.map((x) => (sameColor || !x.colors.length ? x.size : `${x.size}, ${x.colors.join(' et ')}`));
  const unique = [...new Set(labels.filter(Boolean))];
  const extraColors = sameColor ? parsed[0].colors : [...new Set(parsed.flatMap((x) => x.colors))];
  if (unique.length !== labels.length) return { sizes: p.sizes || sizes, extraColors: [], changed: false, collision: true };
  return { sizes: unique, extraColors, changed: JSON.stringify(unique) !== JSON.stringify(p.sizes || []), labels };
}

/* ------------------------------------------------------------------ exécution */

const products = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const rows = [];
const stats = { total: products.length, review: 0, changed: 0, sizesChanged: 0, sizesCollision: 0, refInternal: 0, threeColors: 0, brandAdopted: 0, collisionsResolved: 0, collisionsLeft: 0 };
const results = new Map();
for (const p of products) results.set(p.id, buildName({ ...p, sourceName: p.sourceName || p.name }));

const reserved = new Set(JSON.parse(fs.readFileSync(path.join(HERE, '..', 'lib', 'data', 'products.json'), 'utf8')).map((p) => p.name));
const groups = new Map();
for (const p of products) { const n = results.get(p.id).name; groups.set(n, [...(groups.get(n) || []), p]); }
for (const [name, members] of groups) {
  if (members.length < 2 && !reserved.has(name)) continue;
  const tryOption = (fn) => {
    const candidates = members.map((p) => fn(p, results.get(p.id)));
    if (new Set(candidates).size === members.length && candidates.every((c) => c && [...c].length <= 70 && !reserved.has(c))) { members.forEach((p, i) => { results.get(p.id).name = candidates[i]; results.get(p.id).rules.push('collision-resolved'); }); return true; }
    return false;
  };
  const withModel = (r, extra) => r.assemble({ ...r.steps[0], model: clean(`${r.steps[0].model} ${extra}`) });
  const sizeWord = (r) => (r.removedSizes.length ? (SIZE_MAP[r.removedSizes[0]] ? 'taille ' + SIZE_MAP[r.removedSizes[0]] : r.removedSizes[0]) : '');
  const ok =
    tryOption((p, r) => r.assemble({ ...r.steps[0], allColors: true })) ||
    tryOption((p, r) => withModel(r, sizeWord(r))) ||
    tryOption((p, r) => withModel(r, r.reference && !/^(BS-|GANTS|PROTEGETI|CDR)/i.test(r.reference) && !/\s/.test(r.reference) ? r.reference : '')) ||
    tryOption((p, r) => withModel(r, sizeWord(r)) + (r.uniqColors.length >= 3 ? ', ' + r.uniqColors.join(' et ') : ''));
  if (ok) stats.collisionsResolved += members.length;
  else { stats.collisionsLeft += members.length; for (const p of members) { const r = results.get(p.id); r.review = true; r.rules.push('collision'); } }
}

for (const p of products) {
  const before = p.name;
  const sourceName = p.sourceName || p.name;
  const r = results.get(p.id);
  const sourceSizes = p.sourceSizes || p.sizes || [];
  const sz = tidySizes({ ...p, sourceName, sourceSizes }, r.name);
  if (sz.collision) stats.sizesCollision++;
  const colors = [...new Set([...r.colors, ...sz.extraColors])].filter((c) => COLOR_VALUES.has(c) || COLOR_VALUES.has(c.split(' ')[0]));
  rows.push({ id: p.id, before: sourceName, after: r.name, reference: r.reference, label: r.referenceLabel, colors, notes: r.notes, review: r.review, rules: r.rules, sizes: sz.sizes, sizesBefore: p.sizes });
  if (r.review) stats.review++;
  if (r.referenceLabel === 'Référence interne') stats.refInternal++;
  if (r.rules.includes('R9-3colors')) stats.threeColors++;
  if (r.adoptedBrand) stats.brandAdopted++;
  if (before !== r.name) stats.changed++;
  if (sz.changed) stats.sizesChanged++;
  if (!DRY) {
    p.sourceName = sourceName;
    p.name = r.name;
    if (r.adoptedBrand) p.brand = r.adoptedBrand;
    p.colors = colors;
    p.reference = r.reference;
    p.referenceLabel = r.referenceLabel;
    p.review = r.review;
    delete p.nameRules;
    const extraNotes = r.notes.filter((n) => !(p.notes || []).includes(n));
    p.notes = [...(p.notes || []), ...extraNotes];
    if (p.specs) {
      delete p.specs['Référence'];
      delete p.specs['Référence interne'];
      if (r.reference) p.specs = { [r.referenceLabel]: r.reference, ...p.specs };
    }
    p.sourceSizes = sourceSizes;
    if (!sz.collision) {
      p.sizes = sz.sizes;
      if (Array.isArray(p.variants) && sz.labels && sz.labels.length === sourceSizes.length && p.variants.length === sourceSizes.length) {
        p.variants = p.variants.map((v, i) => ({ ...v, label: sz.labels[i] }));
      }
    }
    for (const img of p.images || []) if (img.alt === sourceName || img.alt === before) img.alt = r.name;
    // les textes portent le nom précédent (le nom fournisseur au premier passage) : on remplace ce nom-là, une fois
    if (before !== r.name) for (const k of ['short', 'description', 'seoDescription']) if (typeof p[k] === 'string' && p[k].includes(before)) p[k] = p[k].split(before).join(r.name);
  }
}

if (!DRY) fs.writeFileSync(FILE, JSON.stringify(products, null, 2) + '\n');

const lines = [];
lines.push(`# Rapport des noms — ${new Date().toISOString().slice(0, 10)}\n`);
lines.push('| Compteur | Valeur |\n|---|---|');
for (const [k, v] of Object.entries(stats)) lines.push(`| ${k} | ${v} |`);
lines.push('\n## À relire\n');
for (const r of rows.filter((x) => x.review)) lines.push(`- ${r.id} · ${r.rules.filter((x) => /review|R14|R12|collision$|R5-brand-missing/.test(x)).join(', ')}\n  - avant : ${r.before}\n  - après : ${r.after}`);
lines.push('\n## Tous les noms\n');
lines.push('| id | avant | après | référence | couleurs | tailles |\n|---|---|---|---|---|---|');
for (const r of rows) lines.push(`| ${r.id} | ${r.before.replace(/\|/g, '/')} | ${r.after} | ${r.label === 'Référence interne' ? '(int.) ' : ''}${r.reference} | ${r.colors.join(', ')} | ${r.sizes.join(' / ')} |`);
fs.mkdirSync(path.dirname(REPORT), { recursive: true });
fs.writeFileSync(REPORT, lines.join('\n') + '\n');
console.log(JSON.stringify(stats));
console.log(`rapport : ${REPORT}${DRY ? ' (essai, fichier non modifié)' : ''}`);
