# Boutique de Boxe

Catalogue français de matériel de boxe, MMA et sports de combat pour SAS Boxing Center.

Application React / Vinext, hébergement Cloudflare via Sites, base D1. Les photographies du catalogue initial proviennent des sources documentées du projet. Les prix restent indicatifs et les ventes réelles ne sont pas ouvertes.

## Développement

Node.js 22.13 ou supérieur, pnpm. Installer avec `pnpm install`, démarrer avec `pnpm dev` et vérifier avec `pnpm build`.

Les migrations versionnées se trouvent dans `drizzle/`. Les variables de service sont configurées dans l’environnement d’hébergement ; ne jamais ajouter de secret au dépôt.

## État du projet

Le suivi détaillé est dans [docs/PROJECT-STATE.md](docs/PROJECT-STATE.md). La refonte, l’élargissement du catalogue et le parcours de paiement simulé sont en cours de réalisation. Le dépôt GitHub conserve le code ; la liaison Sites sert à publier l’aperçu privé.

Toute simulation de paiement doit rester explicitement identifiable et ne doit jamais collecter de coordonnées de carte bancaire réelle.
