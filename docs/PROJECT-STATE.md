# État actuel — Boutique de Boxe

Mise à jour : 10 septembre 2026, après-midi. Cette section décrit le chantier actuel ; les journaux datés plus bas constituent l’historique.

### Décisions du propriétaire, 10 septembre après-midi

Panier et paiement simulé demandés par le propriétaire (le brief les excluait). Photos et prix des boutiques sources autorisés ; conserver toutes les photos des produits tarifés. Publier d’abord cette version à 1 055 références, importer le gel à 1 230 ensuite. Crawl Le Coin du Ring repris (un collecteur). E-mails via Inlett, pas Resend. Base de données à migrer vers Supabase, sans wrangler ; périmètre d’hébergement à confirmer. Contrôles rejoués sur cette version : lint, TypeScript, audit catalogue, 78 + 19 + 10 tests, 18 contrôles commerce, 1 088 URL rendues avec métadonnées uniques.

## Version en cours de validation

Le panier public reste en **simulation**. Aucun paiement réel ni expédition n’est activé. Le raccordement PayPlug est préparé et verrouillé ; les variables et étapes restantes figurent dans [PAYPLUG-WIRING.md](PAYPLUG-WIRING.md).

### Réalisé dans le code

- Nouvelle présentation de l’accueil centrée sur l’objet et la préparation de séance : inspection du gant, six sélections explicites boxe/MMA, pièces déjà possédées déduites du sac, comparaison de caractéristiques et passage vers les fiches avec contexte.
- Guides enrichis par des décisions propres à chaque sujet, photographies réelles et sources. Trois familles ajoutées : chaussures de boxe/lutte, équipement d’entraînement et sacs de sport. Pagination serveur à 36 produits, liens par page et rejet des numéros invalides.
- **1 055 références** intégrées : 19 précédentes et 1 036 importées, dont 910 Boxing-Shop et 126 Le Coin du Ring. **3 754 déclinaisons tarifées**. Les 13 articles physiques du dépôt box-plus étaient déjà inclus parmi les 19 ; les abonnements et essais n’ont pas été transformés en articles d’équipement.
- Source box-plus mise à jour par `git pull --ff-only` avant extraction, jusqu’au commit `75aff7597f07592a4f18a21d8b88199803135622`. Aucun secret repris.
- Registre privé de **1 436 relevés** avec provenance, anomalies, état de publication et recherche. Les textes sources bruts restent hors de l’application ; descriptions publiques rédigées à partir des faits. Les prix ou variantes ambigus restent à examiner.
- Photos principales locales WebP aux dimensions contrôlées, galeries source conservées. **1 088 cartes de partage distinctes** (1 055 produits et 33 pages), 1200 × 630, vérifiées sans erreur de texte ou de génération. Les vues secondaires distantes ne sont pas toutes optimisées ou vérifiées localement.
- Panier D1 avec cookie HttpOnly, choix de déclinaison, quantités, calcul serveur, protection contre écrasement concurrent et rotation des sessions expirées. Paiement simulé approuvé/refusé, tentative réutilisable sans double commande, reçu privé imprimable/téléchargeable.
- Envoi du reçu préparé via Resend, statuts honnêtes et protection contre doubles envois. **Fournisseur et domaine expéditeur non configurés ; aucune livraison d’e-mail vérifiée.**
- Formulaire raccordé au contrat Inlett fourni : sauvegarde D1, preuve de travail dans un Worker, déduplication, gestion des réponses incertaines et annulation des tâches à la fermeture. Le statut du relais est visible dans les contacts privés ; aucun envoi réel de test n’a été effectué.
- PayPlug : réglages privés, parcours hébergé de test réservé à l’administrateur, retour serveur, IPN vérifiée par récupération authentifiée du paiement, association stricte aux montants/tentatives, rapprochement manuel, conservation des remboursements à vérifier. Le mode par défaut est simulation ; la clé réelle seule ne peut pas ouvrir les encaissements.
- Migrations D1 0002 à 0005 préparées et appliquées localement. L’hôte devra les appliquer lors de la publication de cette version.
- GitHub relié à `Eddy-etame/boutique-de-boxe` ; `origin` pointe vers GitHub, `sites` vers le dépôt d’hébergement. Le dépôt applicatif se trouve dans `site/`.

### Vérifications effectuées

- Build et lint réussis avant le dernier gel des données ; nouvelle validation finale en cours.
- Contrat du catalogue : 1 055 produits, 3 754 déclinaisons, aucune erreur du validateur utilisé par l’éditeur et le panier.
- API locale existante : 16 contrôles réussis. Panier/commande simulée : 18 contrôles réussis ; contrôle complémentaire de la rotation des sessions et des prix par déclinaison à effectuer après la dernière correction.
- Inlett : 43 tests isolés réussis, zéro TODO. PayPlug : 19 tests de l’adaptateur et 35 tests d’orchestration/interface réussis. SQLite : 10 tests sur les migrations et la requête réelle de règlement/remboursement, réussis. Tous ces tests PayPlug/Inlett utilisent des réponses fictives ; aucun paiement ou e-mail externe.
- Les tests reproductibles se trouvent dans `scripts/`. `test-commerce.mjs --email-disabled` nécessite un serveur local dont le service e-mail est désactivé. `test-payplug-sqlite.py` utilise une base éphémère en mémoire.
- Le contrôle visuel final, l’audit HTTP de toutes les pages et la publication de cette révision restent à terminer ; ne pas assimiler les anciens contrôles hébergés à la validation de cette nouvelle version.

### Ce qui reste ouvert

1. Terminer le contrôle visuel bureau/mobile du nouveau parcours, l’audit SEO rendu et la publication privée. L’hébergement actuellement publié est encore la version antérieure tant que la publication n’est pas confirmée ci-dessous.
2. Terminer la collecte du Coin du Ring : 2 420 URL produits ont été découvertes, mais l’ensemble n’est pas encore importé. Son délai public de collecte est respecté ; les packs à plusieurs groupes d’options doivent conserver leur véritable logique avant publication. Les pages Boxing-Shop (1 060) sont collectées ; certaines exigent encore une revue de contenu ou de variantes. DragonSports répond 403 aux accès publics essayés et n’a pas été contourné. **La demande de reprise de tous les catalogues sources n’est donc pas achevée.**
3. Configurer le fournisseur d’e-mail et un domaine d’expédition, puis vérifier un reçu sur une boîte autorisée. Inlett ne remplace pas un service de reçus détaillés documenté.
4. Configurer puis tester PayPlug seulement lorsque le propriétaire le demande. L’aperçu actuel reste privé (un propriétaire, aucun groupe ou invité externe lors de la vérification) : il faut vérifier l’accès des serveurs PayPlug à l’IPN avant toute recette distante.
5. Finaliser la gestion éditoriale et des médias dans le backoffice, les statuts de traitement/export des demandes et une mesure d’audience adaptée. Les produits, imports, demandes, simulations et réglages de paiement disposent déjà d’interfaces ; cela ne constitue pas encore la gestion de toutes les pages/médias prévue au brief.
6. Domaine `boutique-de-boxe.com`, propriété Search Console et indexation à confirmer par le propriétaire. Les canonicals utilisent l’origine Sites réellement disponible. Aucun trafic, classement, Core Web Vitals terrain ou résultat d’indexation n’est inventé.

Aucun score « Baffled Bar 100 % » ou affirmation « impossible de faire mieux » n’est justifié tant que ces points et la revue visuelle finale restent ouverts.

---

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


## Passe critique demandée après livraison — 10 septembre 2026

Ce verdict remplace toute lecture de « livrée » comme « Baffled Bar atteinte ». Le catalogue est publié et utilisable ; une refonte ciblée et des fonctions d’exploitation restent à réaliser. Ce tour est un audit, sans modification applicative ni nouveau déploiement.

### Estimation honnête

Les chiffres suivants sont des estimations de pilotage, pas des mesures de qualité automatiques ni des résultats Google : environ **70 % de couverture opérationnelle de la phase 1** (fourchette 65–75 %) ; environ **20 % de la Baffled Bar**. Cette seconde note est un jugement exigeant sur la singularité et la finition : la structure existe, mais la mise en scène, la motion, les détails éditoriaux et la preuve de performance restent insuffisants.

| Chantier | Avancement estimé | Acquis | Écart restant |
|---|---:|---|---|
| Catalogue et parcours de base | 85–90 % | 19 produits, 9 guides, recherche/filtres, fiches, alertes et contact persistés | Assortiment limité, curation par séance et relations entre produits trop mécaniques |
| Préparation SEO technique | 80–85 % | URLs, titres/descriptions uniques, canonical, sitemap, schémas, maillage | OG incomplet, URL image structurée externe erronée, fraîcheur des hubs, tests à élargir |
| Utilité et singularité éditoriales | Environ 70 % | Informations produit sourcées en registre et textes originaux | Répétitions, peu de preuves visibles, guides trop textuels, critères de choix insuffisamment illustrés |
| Backoffice permettant de tout piloter | 55–65 % | Éditeur produits et boîte de demandes | Pages/guides/catégories, médiathèque, brouillons, traitement des demandes, tableaux réels |
| Analytics réellement raccordés | 0 % | Choix Search Console confié au client ; structure de relevé dans la passation | Collecte de visites/événements, tableau et import/connexion GSC absents |
| Domaine public/indexation | Non achevé | Aperçu privé opérationnel | Raccordement et ouverture publique, puis indexation et mesure réelle |

La note du backoffice concerne le nouveau sens « tout gérer », plus large que la seule ligne produits/prix/stock du PDF. Les paiements, commandes, factures, transporteurs et stocks fournisseurs sont explicitement reportés à la phase 2 (PDF p.13). La V2 comparative reste annulée.

### Constats par regard critique

- **Hater / originalité.** Le grand titre condensé noir/bleu, les rectangles gris, les numéros décoratifs et les flèches se répètent. Le résultat reste compatible avec un modèle de boutique premium pour beaucoup d’autres produits. Des phrases comme « Quelques grammes. De vraies questions. » et « La précision commence ici. » sonnent trop fabriquées. Les photos sont réelles ; le problème est la composition et la cadence éditoriale, pas une prétendue détection d’images IA.
- **Direction artistique.** Accueil parcouru intégralement sur bureau 1440×1000 : hiérarchie lisible, mais peu de changements d’échelle ou de mise en scène après le hero. Les trois contrôles du hero changent une photo/un texte ; aucune inspection reliée visuellement au détail évoqué. Sources : components/home.tsx:22–180 ; components/shop-interactions.tsx:81–148.
- **Motion.** Le mouvement principal est un fondu/déplacement vertical de 22 px en 0,75 s et un fondu d’arrivée ; quelques survols complètent le tout. Il manque une orchestration qui aide à inspecter, choisir et comparer le matériel. Sources : app/shop.css:1382–1405 ; components/shop-shell.tsx:180–199. La navigation serveur fonctionne, mais aucune transition visuelle de page spécifique n’est construite.
- **Visiteur mobile.** Le guide /guides/debuter-mma/ a été inspecté sur téléphone simulé : pas de débordement horizontal (largeur de contenu et document égales à 375 px dans ce panneau). Les longs blocs restent lisibles mais manquent d’illustrations et de résumés utiles. Sur l’accueil, les résultats du choix de séance viennent longtemps après les commandes ; le changement de sélection n’est pas immédiatement visible à l’écran.
- **Pratiquant / coach.** « Dans votre coin » est un point de départ utile, mais la sélection prend le premier produit dans chaque famille admissible. Le parcours MMA première séance conserve le débardeur Training : sa pertinence n’est pas établie par une règle de compatibilité détaillée. Le mécanisme n’atteint pas encore le +1 revendiqué. Sources : components/shop-interactions.tsx:351–386. Les guides n’affichent pas les liens de preuve présents dans les données et n’ont pas de relecture experte attestée.
- **Google et aperçus de partage.** Les fondamentaux sont en place, mais les dix catégories réutilisent exactement leur introduction dans « Comment choisir ? » (app/[...slug]/page.tsx:353,363). Les catégories/guides n’émettent pas d’image OG dans les réponses vérifiées localement (même fichier:88–106). Une URL image HTTPS acceptée dans l’admin devient malformée dans Product JSON-LD à cause de shop.origin + i.src (:306). Les dates des URLs hors produits restent fixées au 9 septembre (app/sitemap.ts:8–25). Le mot « sous-gants » apparaît dans la description de la catégorie accessoires sans référence autonome correspondante (lib/catalog.ts:112).
- **Gérant / exploitation.** Il existe un éditeur de références et une boîte de réception, pas un CMS complet. Pas de téléversement d’image, de statut brouillon, de gestion éditoriale, de traitement/recherche/export des demandes, d’envoi et d’historique d’e-mails. L’onglet SEO explique la mesure mais n’affiche aucune collecte réelle. De plus, une erreur de base renvoie silencieusement le catalogue initial et peut réafficher des produits retirés (lib/database.ts:62–64) : il faut une politique de dégradation explicite.

### Preuves et limites de ce tour

Relecture complète des 15 pages du brief par le second auditeur ; audit du code SEO et des réponses locales de catégories/guides par un auditeur indépendant ; accueil parcouru de haut en bas dans le navigateur hébergé ; guide débuter MMA choisi hors du dernier chantier visuel et parcouru ; contrôle mobile ; choix MMA réellement cliqué. Aucun nouvel avertissement ou erreur console observé pendant ce parcours. Les 16 tests API et le build restent les preuves du tour de livraison, pas des tests prétendument rejoués ici. Aucun classement, trafic, vitesse 4G, test sur appareil peu puissant ou Core Web Vitals terrain n’est déduit de ces observations.

Corrections déjà livrées au tour précédent : navigation native après défaut Vinext, synchronisation des deux éditeurs, réservation des identités archivées, libellés d’alertes retirées, cadrage du zoom. Les nouveaux constats ci-dessus restent ouverts ; ils ne sont pas présentés comme corrigés.

### Direction recommandée pour dépasser le modèle actuel

**Le matériel préparé pour la séance.** Garder la rigueur du catalogue, reconstruire l’expérience autour des objets réels et du choix : présentation de pièces avec échelle et texture, annotations attachées à une fermeture ou une zone montrée, comparaisons de caractéristiques vérifiées, sélections explicitement éditées par contexte, repères de choix dessinés dans les guides. Chaque sous-page doit apporter une décision propre plutôt qu’un bloc introductif répété.

Motion : transitions brèves et tendues pour sélectionner ; déplacements qui relient la commande au résultat ; inspection plus lente pour lire une matière ; progression au scroll réservée aux moments explicatifs. À tester avec mouvement réduit et sur téléphone. Ajouter des effets seuls ne corrige ni la curation ni le texte.

Référence supplémentaire observée ce tour : https://teenage.engineering/products/ep-133 — narration et vue matérielle de l’objet, inspectées dans le navigateur et dans la page source le 10 septembre. Les dimensions du panneau de cette référence étaient celles de bureau ; aucune validation mobile/performance ni certification S ne lui est attribuée. On explore cette couche d’explication du produit ; ses photos, sa campagne Muhammad Ali et son apparence ne sont pas à reprendre. L’URL On /explore a redirigé vers /shop dans la lecture Web ; elle n’est pas retenue comme nouvelle preuve de motion.

Ordre recommandé : corriger les défauts de vérité/SEO/stock dégradé ; renforcer la direction artistique, la curation et les interactions de choix ; valider la nouvelle expérience ; puis compléter le backoffice et raccorder la mesure. La condition du client (« si plus aucune amélioration significative ») n’est pas atteinte aujourd’hui.

### Backoffice et analytics de l’étape suivante

Un seul espace de travail : produits/déclinaisons, médias, catégories, guides/pages, demandes/alertes, référencement et tableau de mesure. Prévoir brouillon/aperçu/publication, récupération des retraits, statuts de traitement, recherche/export, envois avec consentement et historique. Les fonctionnalités commerciales de phase 2 restent séparées.

Mesurer les vues de fiches, usages de recherche/filtres, passages guide→produit, alertes réellement enregistrées et contacts réellement enregistrés. Distinguer les visites du site des impressions/clics/requêtes Search Console. Le choix d’un fournisseur, ses accès et les éventuelles règles de consentement devront être résolus à ce moment ; aucun service n’est déclaré raccordé dans ce tour.
