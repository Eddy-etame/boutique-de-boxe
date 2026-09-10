# Passation — Boutique de Boxe

Dossier opérationnel mis à jour le 10 septembre 2026. Voir la section Validation finale pour les derniers contrôles et le déploiement. Les demandes de contact, adresses des inscrits et tokens privés ne doivent pas être copiés dans ce document.

## Périmètre et résultat

Catalogue national Boutique de Boxe édité par **SAS BOXING CENTER**, identité dédiée, **19 produits**, **9 guides**, catégories et services. Prix indicatifs et statuts « Bientôt disponible » ; aucun achat, paiement ou réservation. La remise cible de 15 % reste interne.

**V2 annulée. Le client gère Google Search Console pour l’indexation et le SEO naturel. Aucun Google Analytics activé.**

| Élément            | État établi                                                                                        | Limite ou suite                                                                    |
| ------------------ | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Pages et SEO       | 49 URLs, 49 titles uniques, 49 descriptions uniques, 97 liens internes vérifiés                    | Contrôle de l’environnement testé ; indexation Google non déduite.                 |
| Produits           | 19 modèles documentés et descriptions originales enrichies                                         | Ajouter uniquement des faits et images vérifiés.                                   |
| Guides             | 9 articles couvrant les intentions du PDF                                                          | Version entièrement en vouvoiement intégrée dans le catalogue éditorial.           |
| Administration     | Ajout/édition complète, photos, caractéristiques, déclinaisons, texte court SEO, retrait persistés | Enregistrer publie immédiatement la fiche en phase catalogue.                      |
| Sitemap            | Suit le catalogue effectif et ses retraits                                                         | Vérifier domaine et URLs finales après raccordement.                               |
| Contacts / alertes | Persistance, doublons et retrait contrôlés                                                         | Aucun e-mail automatique expédié par l’application.                                |
| Origine configurée | https://boutique-de-boxe.etame-eddy01.chatgpt.site                                                 | Version hébergée privée pour consultation ; le domaine public reste à raccorder.   |
| Domaine client     | https://boutique-de-boxe.com cible connue                                                          | Raccordement DNS/TLS et bascule canonical à vérifier.                              |
| Search Console     | Opération prise en charge par le client                                                            | Remettre sitemap et constats HTTP ; état d’indexation à mesurer.                   |
| Analytics          | Aucun Google Analytics actif                                                                       | Ne pas annoncer sessions, événements GA ou attribution des demandes à une requête. |

## Preuves de validation

Le rapport .research/seo-qa-final.json, produit par site/scripts/audit-seo.mjs, contient les 49/49/49/97 résultats ci-dessus. Le script contrôle également les réponses 200 des URLs du sitemap sans changement de chemin, un H1 par page, canonical du même chemin, Product sans faux Offer, BreadcrumbList hors accueil, liens internes, 404, noindex de recherche/administration/désinscription et référence au sitemap dans robots.txt.

L’agent principal confirme **16 tests API passés** via site/scripts/test-api.mjs : refus anonyme et d’en-têtes visiteur/administrateur forgés ; accès du propriétaire local ; origine, consentement et variante ; alerte persistée et doublon évité ; contact ; modification visible publiquement puis restauration ; désinscription ; suppression de contact ; corps trop volumineux ; ajout/édition/retrait de produit et sitemap ; limite de fréquence 429. Le script cible le serveur local et des données synthétiques. Il ne remplace pas le contrôle du compte autorisé et de l’infrastructure réellement déployée.

Les validations réalisées et leurs limites sont détaillées dans la section finale. La navigation au clavier n’a pas fait l’objet d’un parcours exhaustif.

## Matrice finale des mots-clés

La propriété désigne la page principale à renforcer pour l’intention, sans interdire une occurrence naturelle ou un lien ailleurs. Aucun volume ni classement n’est inventé.

| Page propriétaire                  | Intention principale                      | Variantes et rôle                                                                                       |
| ---------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| /                                  | boutique boxe                             | Boutique de Boxe, boutique sport de combat France, enseigne nationale ; pas de doublon /boutique-boxe/. |
| /materiel-boxe/                    | matériel boxe                             | Vente matériel boxe, équipement boxe anglaise, matos boxe ; catalogue explicitement précommercial.      |
| /gants-de-boxe/                    | gants boxe                                | Gants de boxe, vente gants de boxe ; sélection des modèles et poids.                                    |
| /gants-mma/                        | gants MMA                                 | Modèles, marques et tailles réelles ; comparaison de catalogue.                                         |
| /materiel-mma/                     | matériel MMA                              | Équipement MMA, protections et tenues selon la séance.                                                  |
| /materiel-sport-de-combat/         | matériel sport de combat                  | Équipement sports de combat, matériel clubs/coachs ; intention équipement.                              |
| /boutique-arts-martiaux/           | boutique arts martiaux                    | Matériel arts martiaux, JJB, kimonos, grappling.                                                        |
| /protections-boxe/                 | protections boxe                          | Protège-dents, protège-tibias pieds, protection sports de combat.                                       |
| /accessoires-boxe/                 | accessoires boxe                          | Bandes, cordes, pattes d’ours et autres accessoires réellement présents.                                |
| /textile-boxe/                     | textile boxe                              | Tenue de boxe, débardeur, ensemble enfant, rashguard.                                                   |
| /sacs-de-frappe/                   | sacs de frappe                            | Sac de frappe boxe, dimensions, suspension et installation.                                             |
| /nouveautes/                       | nouveautés équipement boxe                | Ajouts réels au catalogue, sans fausse disponibilité.                                                   |
| /offres-de-lancement/              | ouverture Boutique de Boxe                | Informations de lancement, aucune remise ou date inventée.                                              |
| /guides/                           | guides d’achat boxe et MMA                | Sommaire des décisions et accès aux articles propriétaires.                                             |
| /guide-des-tailles/                | tailles équipement boxe/MMA               | Hub transversal gants, textiles, chaussures et enfants ; renvoi vers le guide des onces.                |
| /guides/choisir-gants-boxe/        | comment choisir ses gants de boxe         | Usage, ajustement, fermeture, matières et budget ; liens vers catégorie et onces.                       |
| /guides/taille-poids-gants-boxe/   | taille et poids des gants de boxe         | Différences 10/12/14/16 oz ; deux exemples du brief réunis sans tableau universel.                      |
| /guides/choisir-gants-mma/         | comment choisir ses gants MMA             | Construction, taille et format d’exercice.                                                              |
| /guides/debuter-boxe/              | équipement pour débuter la boxe           | Matériel indispensable en boxe anglaise, première séance, prêt du club.                                 |
| /guides/debuter-mma/               | matériel pour commencer le MMA            | Équipement débutant et exigences de salle ; pas de liste obligatoire universelle.                       |
| /guides/choisir-protections/       | quelles protections pour sports de combat | Ajustement, usages et consignes fabricant.                                                              |
| /guides/difference-gants-boxe-mma/ | différence gants boxe et MMA              | Comparaison des usages et renvoi aux deux catégories.                                                   |
| /guides/equipement-enfant/         | matériel de boxe pour enfant              | Premiers cours, déclinaisons réelles, confort et encadrant.                                             |
| /guides/equipement-femme/          | équipement de boxe et combat pour femme   | Morphologie, coupe et besoins ; pas de catalogue dupliqué et recoloré.                                  |
| /produits/{slug}/                  | nom exact du modèle et marque             | Référence, taille/poids/coloris attestés ; une URL par modèle.                                          |
| /contact/, /livraison/, /retours/  | service de la boutique                    | Contact réel, frais indicatifs et phase actuelle.                                                       |
| Pages juridiques                   | éditeur et fonctionnement                 | Faits cohérents, sans bourrage de mots-clés commerciaux.                                                |

Recherche, filtres, administration et désinscription ne sont pas des destinations SEO concurrentes. Les guides mènent vers catégories/fiches pertinentes et les fiches vers les décisions de choix. Les mots généraux « sport de combat » et « arts martiaux » sont contextualisés par l’équipement ; aucune encyclopédie artificielle n’est créée pour les répéter. Les ALT décrivent les images.

## Circuit d’import et de gestion du catalogue

### Préparer une nouvelle référence

1. Conserver la source et sa date/révision. Le lot initial box-plus a été lu après le pull demandé à **e1d7e3d0ba170b526def06b69fff12e246246190**. Les registres product-audit/ et benchmark-products/ conservent références, variantes et provenance des médias.
2. Vérifier modèle, marque, référence, famille, tailles/coloris, photos et caractéristiques. Résoudre les contradictions ou laisser la précision inconnue absente. Aucun stock, ancienne promotion, retrait en club, garantie du revendeur ou engagement fournisseur ne doit être transféré.
3. Rédiger texte court SEO, description, usage et entretien documenté en vouvoiement. Définir un ID et un slug uniques et stables, ainsi qu’un prix indicatif. Le statut reste « Bientôt disponible ».
4. Préparer les médias autorisés, cadrés et optimisés. Vérifier les chemins/URLs acceptés et le modèle représenté. Une image ne prouve pas que chaque variante montrée sera vendue.
5. Dans **/atelier/ → Ajouter une référence au catalogue**, renseigner la fiche et ses caractéristiques, déclinaisons et chemins/URLs d’images. **L’enregistrement publie immédiatement** : finaliser les preuves et le texte avant de valider.
6. Vérifier la nouvelle fiche, sa catégorie, ses métadonnées, ses images, la recherche et sa présence au sitemap. Consigner l’ajout et remettre les changements d’URL au client pour son suivi Search Console.

L’interface assure la gestion complète par référence ; aucun import automatique d’un flux fournisseur ou téléversement de fichiers image n’est présumé. Pour un lot important, préparer un fichier de travail contrôlé puis utiliser le circuit applicatif validé, sans remplacer directement la base ni écraser les modifications en production.

### Modifier ou retirer une référence

L’administration édite les photos, caractéristiques, déclinaisons, texte court SEO, description, usage, entretien et prix. L’ID et le slug existants sont conservés. Les valeurs internes de stock et remise ne deviennent pas une offre publique.

Le catalogue effectif combine le fichier initial site/lib/data/products.json, les entrées persistées de catalog_entries et les modifications de product_overrides. Les ajouts et retraits persistés priment sur le fichier initial ; les modifications de nom/description/prix sont ensuite superposées. Un nouvel import du fichier initial ne doit pas effacer ce travail. Vérifier les informations réellement rendues après toute importation.

Le retrait d’une référence est persistant et modifie le sitemap. Les identifiants et adresses retirés restent réservés ; ils ne peuvent pas être réattribués à un autre modèle. Les alertes conservent le nom de leur référence retirée. Avant de retirer une URL déjà utilisée, traiter ses liens entrants et décider de son devenir ; ne pas prétendre qu’une redirection est créée automatiquement. Pour une nouvelle famille, adapter la taxonomie et les liens du site dans le cycle Sites du projet, sans multiplier les catégories vides.

Contrôles de référence : site/scripts/audit-seo.mjs et site/scripts/test-api.mjs, sur l’environnement prévu par ces scripts. Ils doivent être rejoués après les changements qui affectent leurs fonctions ; le nombre d’URLs attendu évolue avec le catalogue.

### Contacts et alertes

L’administration affiche les 300 demandes les plus récentes. Les compteurs correspondent à cette liste, pas à un total historique illimité. Les contacts se traitent depuis la messagerie habituelle de l’éditeur. Chaque inscription possède un lien individuel de désinscription à inclure dans le message correspondant. Aucun envoi automatique n’est actif.

La suppression retire les données d’une demande ; elle n’est pas un simple marquage « traité ». Ne pas copier les adresses, messages ou tokens dans les documents de passation ou les registres de recherche.

## Domaine, e-mail et mesure : suites externes

**Domaine.** Raccorder boutique-de-boxe.com, vérifier DNS/TLS et réponses HTTP, puis aligner shop.origin, canonicals, sitemap, Open Graph, URLs structurées et liens de retrait. Définir le comportement de l’origine d’hébergement secondaire afin de conserver une origine principale cohérente. Remettre l’URL du sitemap du domaine final au client.

**E-mail.** Les inscriptions sont enregistrées, les désinscriptions fonctionnent, mais l’application n’expédie aucun message automatique. Pour l’activer ultérieurement : raccorder un service et son domaine d’expédition, reprendre l’objet exact du consentement, intégrer le retrait individuel et tester avec une adresse interne autorisée. Une alerte produit ne devient pas une campagne générale.

**Administration en production.** Le 10 septembre, le compte propriétaire connecté à ChatGPT a ouvert /atelier/ et chargé les 19 références et les listes de demandes depuis la base hébergée. ADMIN_EMAIL est configuré comme secret. Aucun identifiant privé n’est conservé dans cette passation.

**Search Console, gérée par le client.** Le client vérifie sa propriété et soumet le sitemap après publication/raccordement. Suivre par date, page et requête : état d’indexation, impressions, clics, CTR et position moyenne. Les clics Google ne sont pas un nombre de sessions toutes sources. Compléter séparément avec les contacts et alertes réellement enregistrés, sans attribution inventée.

| Date/période                     | URL ou requête | Indexation GSC | Impressions | Clics | CTR | Position moyenne | Modification publiée | Contacts/alertes |
| -------------------------------- | -------------- | -------------- | ----------- | ----- | --- | ---------------- | -------------------- | ---------------- |
| Premier relevé réel à renseigner | —              | —              | —           | —     | —   | —                | —                    | —                |

Aucune propriété GSC vérifiée, position, tendance ou collecte GA n’est déclarée dans ce tableau vide. L’onglet « Suivi SEO » de l’administration prépare l’accès aux repères ; il ne constitue pas une connexion automatique à Search Console.

## Avant les ventes réelles

Confirmer fournisseurs et stock, transporteur et frais définitifs, remise justifiable, paiement, commandes, facturation, retours, garanties, médiation et service client. Mettre à jour conditions et données structurées lorsque l’offre devient réelle. Aucun de ces éléments n’est à simuler dans la phase catalogue.

Sources de reprise : decisions.md, open-questions.md, legal-facts.md, seo-evidence.md, seo-qa.json, registres produits et scripts cités. qa-checklist.md reste un instantané historique antérieur ; ses anciennes absences sont remplacées par les preuves plus récentes lorsqu’elles existent.

## Validation finale et direction

- Build de production réussi les 9 et 10 septembre 2026. TypeScript et lint passent. Les images sont servies en WebP 480/960 px ; les polices sont locales.
- Revue dans le navigateur : accueil 1440×1000 et 390×844, fiche et galerie mobile, zoom, index/article de guides, navigation mobile, état vide avec budget/famille, réinitialisation, alerte puis lecture dans l’administration, absence de débordement et d’image cassée sur l’accueil mobile. Le bouton de réduction des animations a été vérifié par lecture du style calculé (`animation: none`).
- WebMCP `filter_catalogue` : inscription du contrat, entrée valide « gants boxe », entrée invalide numérique rejetée, « protège dents » et cohérence de la liste visible vérifiées dans un contexte compatible.
- Les 16 tests API incluent aussi le POST natif du contact sans JavaScript (redirection 303 après persistance). Les données synthétiques ne sont pas transférées dans la base hébergée.
- Lint : composants et hooks non modifiés du catalogue shadcn exclus ; TypeScript continue à vérifier les imports. La recommandation Next/Image est désactivée car les médias sont optimisés localement avec dimensions et srcset. Les rôles ARIA explicites valides sont conservés. La recommandation next/link est aussi désactivée : un défaut de liaison des exports du bundle de production Vinext cassait sa navigation ; les liens HTML natifs assurent maintenant une navigation serveur complète.
- Contrôle de la version hébergée du 10 septembre : navigation réelle accueil → menu mobile → catégorie → fiche produit réussie ; aucune nouvelle erreur ou alerte console sur ce parcours. Menu à 11 destinations, zoom à deux niveaux et fermeture Échap avec retour du focus vérifiés. Le cadrage du zoom a été ajusté pour supprimer la grande marge verticale sur téléphone.
- Dernière revue du 10 septembre : corrections de la synchronisation des éditeurs rapide/complet, de la réservation des identités archivées et des libellés d’alertes après retrait. Le test API du catalogue couvre aussi ces deux cas d’archivage. Le navigateur a vérifié les deux sens d’édition : un brouillon périmé est remplacé après la sauvegarde de l’autre formulaire ; les données originales ont ensuite été restaurées.
- +1 retenu : « Dans votre coin », une sélection par séance dont les familles et la justification changent ensemble. Le cas MMA enfant dit explicitement quand aucune référence vérifiée ne peut être proposée. Aucune prétention d’invention mondiale.
- Références : rythme éditorial, lecture de l’objet et comparaison utile ; banque locale et 10 sources fraîches documentées dans le registre privé. Pas de certification de niveau Sdes références depuis leurs seuls HTML.
- Limites de mesure : pas de test sur appareil Android physique ni de mesure terrain Core Web Vitals ; pas de classement Google ou d’indexation déduit du code. L’envoi d’e-mails et le raccordement du domaine restent des connexions externes.

## Exploitation locale

Le projet exécutable est `site/`. Installer avec `pnpm install`, puis `pnpm dev` ; l’administration locale utilise le compte de test Sites après clic sur le lien de connexion. `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm build` assurent les contrôles de source. Les scripts `node scripts/test-api.mjs` et `node scripts/audit-seo.mjs` ciblent le serveur local sur 3000 ; ne pas lancer le test de mutation contre la production.

Les migrations sont dans `drizzle/`. Les bases locale et hébergée sont distinctes. Les secrets de production se configurent dans Sites, jamais dans Git. `.openai/hosting.json` conserve uniquement l’identifiant Site et le nom logique DB.
