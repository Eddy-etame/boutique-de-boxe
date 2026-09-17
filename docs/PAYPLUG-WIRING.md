# Raccordement PayPlug — Boutique de Boxe

**Consigne actuelle — 17 septembre 2026 :** `COMMERCE_MODE=simulation` dans `.env.local`, `.env.vercel` et `.env.example`. Origine publique préparée : `https://www.boutique-de-boxe.com`. Les essais du 11 septembre ci-dessous sont historiques ; ils ne décrivent plus le mode local actuel. Aucun paiement ni appel PayPlug n’a été effectué pendant cette passe. Vérifier DNS, HTTPS, callbacks et IPN après le déploiement avant tout nouvel essai autorisé.

État au 11 septembre 2026, tard : **la boutique reste en simulation pour le public**, aucun débit réel n’est autorisé (verrou `LIVE_PAYMENT_RELEASED = false`). Le **test bac à sable** a été exécuté en local, à la demande du propriétaire, avec la clé de test du compte PayPlug de box-plus :

- La clé `sk_test_…` a été recopiée depuis `Plannings/box-plus/.env.colleague` (seul fichier de box-plus qui la porte ; `.env` de box-plus ne contient que Stripe) vers `.env.local` et `.env.vercel` de la boutique, tous deux ignorés par Git. Elle n’a jamais été affichée ni journalisée.
- **Défaut de production trouvé et corrigé** (commit `7eed892`) : l’écriture du paiement vérifié utilisait `MAX(refunded_cents, ?)`, propre à SQLite ; Postgres le refuse, si bien que chaque création, notification ou rapprochement finissait « à rapprocher du portail ». Le faux moteur des tests, écrit en SQLite, masquait le défaut. L’expression est portable et le test le connaît.
- Vérifié sur le compte de test : création hébergée → `pending` avec l’adresse `https://secure.payplug.com/pay/test/…`, statut relu et vérifié, notification IPN acceptée pour le bon identifiant (`{"received":true}`), refusée pour un identifiant étranger (400), rapprochement par identifiant relevé dans le portail (200). Trois tentatives de test existent en base locale (`payment_attempts`), toutes `pending`.
- **Attribution** : tout paiement créé avec cette clé apparaît dans le portail PayPlug du compte **box-plus**, en mode TEST, avec `metadata.integration = boutique-de-boxe`, `order_id` et `attempt_id` de la tentative, et la description « Boutique de Boxe · essai … ». C’est ainsi que l’on distingue les paiements de la boutique de ceux de box-plus tant que les deux partagent un compte. Le propriétaire prévoit un compte marchand distinct pour la boutique : il suffira de remplacer les clés.
- **Comment les messages arrivent** : PayPlug appelle `notification_url` en POST avec `{ id, object: "payment", is_live }` seulement ; la boutique ne croit jamais ce corps, elle relit le paiement par l’API et vérifie identifiant, montant, devise, mode test et métadonnées. Le `return_url` ramène le visiteur sur `/paiement-retour/?id=<tentative>` qui relit le statut au serveur. Le portail enregistre le code de réponse de la notification (`notification.response_code`).
- **Ce qui n’a pas été fait** : le paiement lui-même (saisie d’une carte de test), laissé au propriétaire ; voir « Finir le test » ci-dessous.

## Finir le test

1. Lors de l’essai du 11 septembre, le serveur tournait avec `COMMERCE_MODE=payplug_test`, la clé de test et `PAYPLUG_PUBLIC_BASE_URL=https://boutique-de-boxe.vercel.app` (ancienne origine de test, remplacée par `.fr` le 16 septembre). Ouvrir Atelier → Réglages PayPlug, préparer un essai, payer sur la page PayPlug avec une carte de test : `4242 4242 4242 4242` (accepté), `4000 0000 0000 0051` (refusé), `3787 0081 0990 001` (3-D Secure) ; toute date future et tout CVC. Le retour arrive sur le site en ligne (qui ignore, car en simulation) : relire alors le statut dans l’atelier local, il passe à « Paiement de test confirmé ».
2. Pour le tour complet (retour et notification sur le même site), poser sur Vercel `COMMERCE_MODE=payplug_test`, `PAYPLUG_TEST_SECRET_KEY` et `PAYPLUG_PUBLIC_BASE_URL` (déjà prêts dans `.env.vercel`), redéployer, faire le même essai depuis l’atelier en ligne, puis **remettre `COMMERCE_MODE=simulation`**. Le panier public reste simulé dans les deux cas.



## Ce qui est préparé

- Réglages privés dans **Atelier → Réglages PayPlug** : présence des clés, mode, version d’API, URL des retours, éléments manquants et 50 dernières tentatives. Les secrets ne sont jamais renvoyés au navigateur.
- Adaptateur serveur `lib/payplug.ts`, inspiré des contrôles de box-plus et vérifié contre l’API officielle. Paiement hébergé chez PayPlug : aucun numéro de carte n’est collecté par la boutique.
- Parcours PayPlug **de test**, réservé à l’administrateur et désactivé par défaut : panier réel du site, coordonnées de test, montant calculé au serveur, redirection vers la page PayPlug et vérification serveur au retour.
- Table Postgres `payment_attempts`, séparée des commandes simulées. Instantané des articles, déclinaisons, prix, coordonnées et montant ; unicité de la tentative et de la version du panier.
- Une réponse perdue ne crée pas automatiquement un deuxième paiement. L’atelier permet de rapprocher un identifiant relevé dans le portail PayPlug d’une tentative interrompue.
- Notification IPN : récupération authentifiée du paiement auprès de PayPlug ; vérification exacte de l’identifiant, du montant en centimes, de l’EUR, du mode test/réel et des métadonnées de liaison à la tentative. Les informations de paiement reçues directement du navigateur ou du corps de notification ne font pas foi.
- Un retour navigateur, une autorisation seule ou un paiement différé ne déclenchent pas une confirmation de paiement. Les remboursements sont signalés pour vérification ; aucune expédition automatique n’existe.
- Verrou serveur `LIVE_PAYMENT_RELEASED = false`. Même une clé de production et `COMMERCE_MODE=payplug_live` ne permettent pas d’encaisser dans cette version.

## Variables et secrets

| Nom | Valeur actuelle / attendue | Utilisation |
| --- | --- | --- |
| `COMMERCE_MODE` | `simulation` (également valeur par défaut) | Conserver cette valeur maintenant. `payplug_test` ouvrira uniquement le test administrateur après raccordement. |
| `PAYPLUG_TEST_SECRET_KEY` | Clé `sk_test_…` du compte box-plus, posée en local et dans `.env.vercel` le 11 septembre 2026 | Secret du compte PayPlug de test. Ne pas utiliser une clé réelle ici ; à remplacer par la clé du compte propre à la boutique quand il existera. |
| `PAYPLUG_LIVE_SECRET_KEY` | Vide maintenant | Réservée à une future activation explicite. Sa seule présence n’active rien. |
| `PAYPLUG_API_VERSION` | `2019-08-06` | Version explicitement prise en charge et testée. Une autre valeur est refusée. |
| `PAYPLUG_PUBLIC_BASE_URL` | `https://www.boutique-de-boxe.com` | Sert à construire les retours et notifications ; ne vient jamais de l’en-tête Host ou d’une saisie client. Doit figurer dans la liste stricte des origines autorisées de l’adaptateur. |
| `ADMIN_EMAIL` | Adresse du propriétaire, variable Vercel | Accès à l’atelier et aux tests PayPlug. |
| `RESEND_API_KEY` | À configurer si Resend est retenu | Envoi transactionnel des reçus de simulation ; indépendant de PayPlug. |
| `MAIL_FROM` | À configurer sur un domaine expéditeur vérifié | Exemple de forme : `Boutique de Boxe <reçus@votre-domaine-verifie.fr>` ; ne pas utiliser cet exemple tel quel. |
| `DATABASE_URL` | Chaîne du pooler Supabase (port 6543) | Stockage des paniers, demandes, commandes simulées et tentatives PayPlug. Ce n’est pas une URL de base à placer dans un secret. |

Le fichier `.env.example` contient des noms et valeurs de référence sans secret. En local, les secrets se placent dans **`.env.local`**, ignoré par Git ; sur Vercel, dans Settings → Environment Variables (voir DEPLOY-VERCEL.md). Ne pas mettre de clé dans `NEXT_PUBLIC_*`, dans le catalogue, dans un formulaire ou dans Git. Ne pas modifier les secrets de box-plus.

Les origines autorisées dans l’adaptateur sont `https://www.boutique-de-boxe.com` et `https://www.boutique-de-boxe.com` uniquement ; une ancienne variable d’environnement n’élargit plus cette liste. Cette liste est une restriction technique ; elle ne prouve pas que le domaine personnalisé est connecté. Un changement de domaine nécessite de vérifier son contrôle, son HTTPS, puis de mettre à jour la liste et les canonicals ensemble.

## Routes préparées

| Route | Fonction |
| --- | --- |
| `GET /api/payplug/settings` | État privé de la configuration, jamais les valeurs des clés. |
| `POST /api/payplug/create` | Création hébergée de test ; administrateur, origine valide, panier à jour et consentement de test obligatoires. |
| `GET /api/payplug/status?id=<tentative>` | Statut privé revérifié auprès de PayPlug. |
| `POST /api/payplug/reconcile` | Rapprochement administrateur avec un paiement existant, sans nouvelle création. |
| `POST /api/payplug/ipn?attempt=<tentative>` | Notification serveur ; le paramètre est un indice de recherche, jamais une preuve d’authenticité. |
| `/paiement-retour/?id=<tentative>` | Retour/cancel hébergé : relit le statut au serveur ; `cancel=1` n’annule pas un paiement déjà confirmé. |

## Ce qui reste avant un vrai test PayPlug

1. Confirmer le compte marchand Boxing Center à utiliser et fournir sa clé **de test** dans les secrets de cette boutique. Les fonctionnalités et limites du compte restent à vérifier dans le portail.
2. Fournir une origine HTTPS réellement joignable par PayPlug. **Un aperçu Vercel protégé par mot de passe bloquerait les IPN ; utiliser un déploiement dont `/api/payplug/ipn` est public.** Il faut un environnement de test dont cette route est publiquement accessible, ou une configuration d’accès compatible vérifiée. Ne pas élargir l’accès au site automatiquement.
3. Appliquer les migrations Postgres sur Supabase (`pnpm db:migrate`, voir DEPLOY-VERCEL.md) ; la table `payment_attempts` fait partie de la migration initiale `0000_slim_masque.sql`. La seconde conserve un marqueur de remboursement pour empêcher une notification ancienne d’effacer un besoin de vérification. Vérifier leur application sur la base Postgres liée au déploiement Vercel.
4. Renseigner `PAYPLUG_PUBLIC_BASE_URL`, puis passer **explicitement** `COMMERCE_MODE` à `payplug_test` dans cet environnement de test. Vérifier les réglages de l’atelier. Le panier public restera simulé.
5. Effectuer un test complet avec les cartes de test documentées par PayPlug : succès, refus, annulation du retour, authentification 3-D Secure si présentée, retour avant/après IPN, notification répétée, réponse de création interrompue et rapprochement manuel. Vérifier les états Postgres et le portail, ainsi que l’absence de double paiement.
6. Revenir à `COMMERCE_MODE=simulation` après la recette tant que l’ouverture des ventes n’a pas été demandée.

**Les tests locaux avec réponses PayPlug simulées ne remplacent pas ce test sur le compte marchand.** Le test distant a été exécuté le 11 septembre 2026 jusqu’à la page de paiement (voir l’état en tête) ; la saisie de carte et le tour complet en ligne restent à faire.

## Ce qui reste avant des encaissements réels

L’activation réelle est une étape distincte, pas un simple collage de clé. Après autorisation d’ouverture :

- Terminer et vérifier stocks vendables par déclinaison, réservation/libération atomiques, tarifs définitifs, taxes applicables, transporteurs, choix du relais, frais de matériel lourd et traitement logistique. Le catalogue actuel et les frais du panier restent indicatifs ; aucun stock n’est réservé.
- Finaliser le parcours client avec coordonnées de livraison réelles et conditions de vente applicables ; valider le domaine, le compte PayPlug marchand et l’accessibilité durable de l’IPN.
- Raccorder le mode réel au parcours public et à des commandes commerciales distinctes, retirer le verrou de code dans une modification revue, et définir les procédures d’échec, de remboursement, de litige et de rapprochement. Le remboursement automatique, Oney, les paiements fractionnés, l’enregistrement de cartes et les abonnements ne sont pas activés.
- Définir facturation et conservation des commandes commerciales ; le reçu de simulation actuel n’est pas une facture. Brancher l’e-mail transactionnel et contrôler réellement la réception sur une boîte autorisée.
- Tester cette version en mode PayPlug de test avant d’ajouter la clé réelle et d’autoriser le mode réel. Le serveur doit toujours distinguer `is_live`, récupérer le paiement auprès de PayPlug et vérifier les montants exacts.

Le mécanisme 4× de box-plus (incluant certains traitements d’abonnements et prélèvements) n’a pas été transposé à la vente de matériel de cette boutique. Une future demande de paiement fractionné nécessitera un raccordement adapté et une vérification des options du compte.

## E-mails de simulation

Le reçu peut être consulté, imprimé et téléchargé après une simulation approuvée. L’envoi par e-mail attend le fournisseur et le domaine expéditeur. L’adaptateur Resend expose `unconfigured`, `pending`, `sending`, `accepted`, `failed` et `unconfirmed` ; **accepted signifie accepté par le prestataire, pas livré dans la boîte**. Une interruption est rapprochée des journaux avant renvoi. Inlett traite le formulaire de contact ; sa documentation ne garantit pas un reçu détaillé personnalisable.

## Références

- [API PayPlug officielle](https://docs.payplug.com/api/)
- [Référence REST](https://docs.payplug.com/api/apiref.html)
- Référence locale lue : `Boxing Center/Plannings/box-plus/storefront/lib/payplug.js` et ses contrôles de liaison du paiement. Aucun secret lu ou recopié.

Les résultats de validation, le déploiement et l’état général du catalogue restent consignés dans `docs/PROJECT-STATE.md`.
