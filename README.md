# Boutique de Boxe

Catalogue français de matériel de boxe, MMA et sports de combat pour SAS Boxing Center.

Application Next.js 16 hébergée sur Vercel, base Postgres Supabase, connexion administrateur par lien magique Supabase Auth. Les photographies du catalogue initial proviennent des sources documentées du projet. Les prix restent indicatifs et les ventes réelles ne sont pas ouvertes.

## Développement

Node.js 22.13 ou supérieur, pnpm. Installer avec `pnpm install`, démarrer avec `pnpm dev` et vérifier avec `pnpm build`.

Les migrations versionnées se trouvent dans `drizzle/`. Les variables de service sont configurées dans l’environnement d’hébergement ; ne jamais ajouter de secret au dépôt.

## État du projet

Le suivi détaillé est dans [docs/PROJECT-STATE.md](docs/PROJECT-STATE.md). La refonte, l’élargissement du catalogue et le parcours de paiement simulé sont en cours de réalisation. Le dépôt GitHub `Eddy-etame/boutique-de-boxe` est relié à Vercel ; voir [docs/DEPLOY-VERCEL.md](docs/DEPLOY-VERCEL.md).

Toute simulation de paiement doit rester explicitement identifiable et ne doit jamais collecter de coordonnées de carte bancaire réelle.


## Révision catalogue et paiements

La boutique reste en simulation. Le code inclut 1 055 références, un panier persistant, les reçus d’essai et la préparation PayPlug (désactivée par défaut). Voir [l’état complet](docs/PROJECT-STATE.md) et [le raccordement PayPlug](docs/PAYPLUG-WIRING.md). Les clés ne se placent jamais dans le dépôt ; `.env.example` contient uniquement les noms à configurer.

Contrôles locaux : `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm build`, `node scripts/audit-catalog.mjs`, `node --test scripts/test-inlett.mjs scripts/test-payplug-orders.mjs`, `node --experimental-strip-types scripts/test-payplug.mjs`. Avec `pnpm db:local`, `pnpm db:migrate` puis `pnpm dev` : `node scripts/test-api.mjs`, `node scripts/test-commerce.mjs --email-disabled` et `node scripts/audit-seo.mjs`.
