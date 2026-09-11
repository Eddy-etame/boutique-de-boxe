# Référencement — moteurs de recherche et moteurs de réponse

Mise à jour : 11 septembre 2026. Code : `lib/seo.ts`, `lib/seo-text.ts`. Contrôle : `node scripts/audit-seo.mjs` (serveur local ou `QA_ORIGIN`).

## Ce que lit un robot, page par page

| Page | Titre / H1 portent | Graphe JSON-LD (un seul bloc, nœuds reliés par `@id`) |
|---|---|---|
| Accueil `/` | boutique de boxe, matériel de boxe | WebPage → ItemList des familles ; renvoie à `#organisation` et `#site` |
| Famille `/gants-de-boxe/` | la requête de tête de la famille (`KEYWORDS.categories`) | CollectionPage + ItemList paginée, `about` ancré sur Wikidata |
| Fiche `/produits/…/` | le nom du modèle (objet, marque, modèle, variante) | ItemPage + Product (sku, mpn, brand, color, size, material, category, photos, prix prévu en `additionalProperty`, modèles proches) + ProductGroup des tailles |
| Guide `/guides/…/` | la question du guide | WebPage + Article (auteur et éditeur = la boutique, `wordCount`, `timeRequired`, `about`) + FAQPage |
| Services, contact | la requête de service (`PAGE_KEYWORDS`) | BreadcrumbList |
| Gabarit | — | Organization + OnlineStore (`#organisation` : coordonnées, SIREN, `knowsAbout` ancré) et WebSite (`#site`, SearchAction) |

Aucune offre (`offers`) tant que la vente n’est pas ouverte : un prix prévu n’est pas une proposition de vente. Le jour de l’ouverture, ajouter `offers` (prix, devise, disponibilité, `priceValidUntil`, livraison) dans `productCore` et retirer l’assertion « fake offers » de l’audit.

## Mots-clés

Déclarés dans `lib/seo.ts` (`KEYWORDS`, `PAGE_KEYWORDS`, `productKeywords`). Ils alimentent `<meta name="keywords">` et le champ `keywords` des nœuds WebPage et Article. Règle : un mot-clé de tête doit exister dans le texte visible de la page ; l’audit le vérifie. Aucun texte caché.

## Entités ancrées

Boxe anglaise Q2922870, arts martiaux mixtes Q114466, muay-thaï Q120931, jiu-jitsu brésilien Q189336, kick-boxing Q178678, savate Q271277, sport de combat Q7128792, gants de boxe Q895679, punching-ball Q966668, protège-dents Q11179, corde à sauter Q244158, Toulouse Q7880, Occitanie Q18678265, France Q142. Vérifiés sur l’API Wikidata le 11 septembre 2026. Re-vérifier avant d’en ajouter : un mauvais identifiant affirme que la page parle d’autre chose.

## Fichiers et interfaces pour les agents

| Chemin | Rôle |
|---|---|
| `/llms.txt` | index court et citable, généré depuis les données (familles, comptes, guides, état des ventes) |
| `/llms-full.txt` | contexte complet : chaque modèle (nom, marque, prix prévu, tailles, couleurs, URL), chaque guide avec sa FAQ |
| `/catalogue.json` | flux machine du catalogue, sans offre commerciale, CORS ouvert |
| `/api/mcp` | serveur MCP en lecture seule (JSON-RPC 2.0) : `get_shop_info`, `get_families`, `search_products`, `get_product`, `get_guides`, `get_guide`, `get_content_index`, `get_technical_attribution` |
| `/.well-known/mcp.json` | découverte du serveur MCP |
| `/ai.txt` | règles d’usage pour les IA : ce qui est publié, ce qui est permis, ce qui est interdit (stocks, dates, confusion avec les salles) |
| `/humans.txt` | paternité technique : Eddy Etame Etame, concepteur principal et responsable technique |
| `/.well-known/security.txt` | contact sécurité |
| `/sitemap.xml` | plan du site avec images des fiches, fréquence et priorité |
| `/robots.txt` | tout ouvert aux moteurs et aux robots d’IA nommés ; privé pour l’API, l’atelier, le panier, le reçu ; `/api/mcp` explicitement autorisé |

Ces fichiers servent la citabilité et les outils tiers. Ils ne sont pas présentés comme un facteur de classement Google.

## Passage au domaine final

1. Mettre `NEXT_PUBLIC_SITE_ORIGIN=https://boutique-de-boxe.com` sur Vercel et redéployer : canonical, sitemap, graphes, fichiers agents suivent.
2. Google Search Console et Bing Webmaster Tools : ajouter le domaine, soumettre `/sitemap.xml`.
3. IndexNow : la clé publique est `public/b7d1f0a3e9c24f6b8a5d3c1e7f9b2a4c.txt` ; après chaque mise à jour réelle, `node scripts/indexnow.mjs` soumet les URL du sitemap à Bing, Yandex, Naver et Seznam.
4. Renseigner `SAME_AS` dans `lib/seo.ts` dès qu’un profil officiel existe (Instagram, Facebook, YouTube) : rien n’est inventé d’ici là.
5. À l’ouverture des ventes : `offers` sur chaque Product, `priceValidUntil`, `shippingDetails`, puis Google Merchant Center avec `/catalogue.json` comme base de flux.

## Ce qu’on refuse

Faux avis, notes autoattribuées, pages satellites quasi identiques, texte caché, mention d’une remise ou d’un stock qui n’existe pas, confusion entre la boutique et les salles Boxing Center.

## Les requêtes du cahier des charges

Chaque requête a sa page canonique dans `QUERY_MAP` (`lib/seo-copy.ts`), publiée dans `/llms.txt`, `/ai.txt` et l’outil MCP `get_query_map`. La page porte la requête exacte en tête de titre et dans le surtitre, un texte de fond en H2 et une FAQ visible. Les sous-familles (`lib/subfamilies.ts`) couvrent l’arborescence du cahier des charges avec une page par objet. Ajouter une requête : une entrée dans `SEO_COPY` ou `SUBFAMILIES`, puis `node scripts/audit-seo.mjs`.

## Vignettes sociales à la demande

`/vignette/p/<slug>.png` (fiche), `/vignette/c/<slug>.png` (famille), `/vignette/s/<slug>.png` (sous-famille), `/vignette/g/<slug>.png` (guide), `/vignette/x/<page>.png` (accueil, guides, nouveautés, contact, services). Rendu par `app/vignette/[...seg]/route.tsx` avec `next/og`, les polices de `assets/fonts` et la photo convertie par `sharp`. Aucun fichier à régénérer : le nom, la marque, les tailles et la photo viennent des données à la requête.

## Comment les moteurs de réponse lisent le site

ChatGPT (index Bing + OAI-SearchBot), Perplexity (PerplexityBot), Gemini et les aperçus IA de Google (index Google, Google-Extended), Claude (index Brave + ClaudeBot) partagent les mêmes leviers : une page canonique par requête, une réponse directe en tête de page, des faits datés et attribués, un graphe d’entités sans ambiguïté, des fichiers agents lisibles. Le site les sert tous : `QUERY_MAP` donne la page et la réponse citable ; le graphe ancre l’entité ; `hreflang` x-default dit que la page vaut pour toute la France et au-delà ; Bing et IndexNow sont servis comme Google. Reste à faire côté propriétaire : Search Console et Bing Webmaster Tools sur le domaine final, un profil d’établissement Google, des profils sociaux dans `SAME_AS`.

## Première position sur les mots-clés du brief : ce qui est fait, ce qui reste

Ce que le code garantit, vérifié par `node scripts/audit-seo.mjs` à chaque livraison et lisible à tout moment dans Atelier → Suivi SEO (tableau des mots-clés du brief, `lib/brief.ts`) : pour chacune des 20 requêtes de `QUERY_MAP` (les 18 du brief plus « sac de frappe » et « chaussures de boxe »), la phrase exacte est dans le `<title>`, dans le H1 ou l’accroche, dans la meta description, au moins deux fois dans le texte visible, dans le graphe JSON-LD, et l’accueil y mène par un lien ; chaque page du site porte en pied de page la ligne « Recherches fréquentes » avec les 20 requêtes en toutes lettres vers leur page. Les textes alternatifs des photos portent le nom complet du modèle (famille, marque, coloris).

Ce qu’aucun code ne remplace, dans l’ordre d’effet :

1. **Le domaine.** `boutique-de-boxe.vercel.app` n’a aucune autorité ; un sous-domaine Vercel ne se classe pas en première position. Attacher `boutique-de-boxe.com` (ou le domaine retenu), poser `NEXT_PUBLIC_SITE_ORIGIN` sur ce domaine : canonicals, sitemap, graphe, `llms.txt` et la redirection 301 de l’alias suivent d’eux-mêmes.
2. **Search Console et Bing Webmaster.** Vérifier le domaine (`NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`, `NEXT_PUBLIC_BING_SITE_VERIFICATION`), soumettre `/sitemap.xml`, puis lire les positions moyennes par requête. `node scripts/indexnow.mjs` prévient Bing, Yandex, Naver et Seznam à chaque mise à jour.
3. **Les liens entrants.** Le levier le plus fort est déjà dans la maison : les sites des salles Boxing Center (Portet, Minimes, Saint-Cyprien, Ramonville, L’Union, Tournefeuille) doivent pointer vers la boutique avec les phrases du brief en texte de lien (« vente matériel boxe » → `/boutique-boxe/`, « gants de boxe » → `/gants-de-boxe/`, etc.), depuis leur pied de page et leurs pages matériel. Ensuite : fédérations, clubs partenaires, marques distribuées (Metal Boxe, Elion, Fairtex), annuaires spécialisés.
4. **Les profils.** Renseigner `SAME_AS` (Instagram, Facebook, YouTube, TikTok) dans `lib/seo.ts` pour que l’entité soit reconnue par Google et par les moteurs de réponse.
5. **Le contenu vivant.** Une nouveauté par semaine dans `/nouveautes/`, un guide par mois, des fiches complétées : la fraîcheur est un signal sur les requêtes commerciales.
6. **La vitesse.** Garder le score Core Web Vitals vert après chaque passe de mouvement (photos WebP, polices préchargées, pas de bibliothèque d’animation).
