# Raccordement PayPlug — Boutique de Boxe

État au 10 septembre 2026 : **la boutique reste en simulation**. Aucune clé PayPlug n’a été copiée depuis box-plus, aucun appel de création de paiement PayPlug n’a été effectué, et aucun débit réel n’est autorisé. Le parcours public conserve le panier, le paiement simulé et le reçu d’essai.

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
| `PAYPLUG_TEST_SECRET_KEY` | Vide maintenant ; future clé `sk_test_…` | Secret du compte PayPlug de test autorisé. Ne pas utiliser une clé réelle ici. |
| `PAYPLUG_LIVE_SECRET_KEY` | Vide maintenant | Réservée à une future activation explicite. Sa seule présence n’active rien. |
| `PAYPLUG_API_VERSION` | `2019-08-06` | Version explicitement prise en charge et testée. Une autre valeur est refusée. |
| `PAYPLUG_PUBLIC_BASE_URL` | Origine HTTPS exacte de cette boutique | Sert à construire les retours et notifications ; ne vient jamais de l’en-tête Host ou d’une saisie client. |
| `ADMIN_EMAIL` | Adresse du propriétaire, variable Vercel | Accès à l’atelier et aux tests PayPlug. |
| `RESEND_API_KEY` | À configurer si Resend est retenu | Envoi transactionnel des reçus de simulation ; indépendant de PayPlug. |
| `MAIL_FROM` | À configurer sur un domaine expéditeur vérifié | Exemple de forme : `Boutique de Boxe <reçus@votre-domaine-verifie.fr>` ; ne pas utiliser cet exemple tel quel. |
| `DATABASE_URL` | Chaîne du pooler Supabase (port 6543) | Stockage des paniers, demandes, commandes simulées et tentatives PayPlug. Ce n’est pas une URL de base à placer dans un secret. |

Le fichier `.env.example` contient des noms et valeurs de référence sans secret. En local, les secrets se placent dans **`.env.local`**, ignoré par Git ; sur Vercel, dans Settings → Environment Variables (voir DEPLOY-VERCEL.md). Ne pas mettre de clé dans `NEXT_PUBLIC_*`, dans le catalogue, dans un formulaire ou dans Git. Ne pas modifier les secrets de box-plus.

Les origines autorisées dans l’adaptateur sont `NEXT_PUBLIC_SITE_ORIGIN` (si défini) et `https://boutique-de-boxe.com` / `https://www.boutique-de-boxe.com`. Cette liste est une restriction technique ; elle ne prouve pas que le domaine personnalisé est connecté. Un changement de domaine nécessite de vérifier son contrôle, son HTTPS, puis de mettre à jour la liste et les canonicals ensemble.

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
3. Appliquer les migrations Postgres sur Supabase (`pnpm db:migrate`, voir DEPLOY-VERCEL.md) ; la table `payment_attempts` fait partie de la migration initiale `0000_slim_masque.sql`. La seconde conserve un marqueur de remboursement pour empêcher une notification ancienne d’effacer un besoin de vérification. Les migrations sont incluses au build Sites ; vérifier leur application lors du prochain déploiement.
4. Renseigner `PAYPLUG_PUBLIC_BASE_URL`, puis passer **explicitement** `COMMERCE_MODE` à `payplug_test` dans cet environnement de test. Vérifier les réglages de l’atelier. Le panier public restera simulé.
5. Effectuer un test complet avec les cartes de test documentées par PayPlug : succès, refus, annulation du retour, authentification 3-D Secure si présentée, retour avant/après IPN, notification répétée, réponse de création interrompue et rapprochement manuel. Vérifier les états D1 et le portail, ainsi que l’absence de double paiement.
6. Revenir à `COMMERCE_MODE=simulation` après la recette tant que l’ouverture des ventes n’a pas été demandée.

**Les tests locaux avec réponses PayPlug simulées ne remplacent pas ce test sur le compte marchand.** Aucun test distant PayPlug n’a été exécuté à ce stade.

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
