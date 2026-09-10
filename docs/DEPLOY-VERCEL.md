# Déploiement Vercel + Supabase — Boutique de Boxe

État au 10 septembre 2026. L’application est un projet **Next.js 16** ; la base est **Postgres Supabase** ; l’administrateur se connecte par **lien magique Supabase Auth**. Plus aucun composant Cloudflare (D1, wrangler) ni OpenAI Sites.

## 1. Supabase — une fois

1. Projet dédié à la boutique (créé le 10 septembre). Ne pas partager le projet box-plus.
2. **Authentication → URL Configuration** :
   - Site URL : `https://boutique-de-boxe.com` (ou l’URL Vercel tant que le domaine n’est pas raccordé).
   - Redirect URLs : `https://boutique-de-boxe.com/api/auth/callback`, `https://www.boutique-de-boxe.com/api/auth/callback`, l’URL Vercel `/api/auth/callback`, et `http://localhost:3000/api/auth/callback` pour le poste de travail.
3. **Authentication → Providers → Email** : laisser « Enable email provider » actif ; « Confirm email » peut rester actif, le lien magique crée le compte du propriétaire à la première connexion.
4. **Settings → Database → Connection string** :
   - *Transaction pooler* (port 6543) → valeur de `DATABASE_URL` sur Vercel.
   - *Direct connection* (port 5432) → uniquement pour `pnpm db:migrate` depuis un poste.
5. La clé **service_role** n’est utilisée nulle part par la boutique. Si elle a circulé hors du tableau de bord, la régénérer (Settings → API).

## 2. Migrations

Depuis `site/`, avec la connexion directe dans l’environnement du terminal PowerShell (jamais dans Git) :

```powershell
$env:DATABASE_URL = "<connexion directe port 5432>"
pnpm db:migrate
```

Les migrations sont dans `drizzle/` (`0000_slim_masque.sql` crée les huit tables). Les anciennes migrations D1 sont archivées dans `drizzle-d1-archive/` et ne s’appliquent plus.

## 3. Vercel — projet

1. Importer le dépôt GitHub `Eddy-etame/boutique-de-boxe`. **Root Directory : `site`.** Framework détecté : Next.js. Node 22.
2. Variables d’environnement (Production et Preview) :

| Variable | Valeur |
| --- | --- |
| `DATABASE_URL` | Chaîne du pooler Supabase (port 6543) |
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé anon (publique) |
| `ADMIN_EMAIL` | Adresse du propriétaire, seule autorisée dans l’atelier |
| `NEXT_PUBLIC_SITE_ORIGIN` | `https://boutique-de-boxe.com` en production ; l’URL Vercel sur les aperçus si l’on veut des canonicals d’aperçu |
| `COMMERCE_MODE` | `simulation` |
| `PAYPLUG_API_VERSION` | `2019-08-06` |
| `PAYPLUG_PUBLIC_BASE_URL`, `PAYPLUG_TEST_SECRET_KEY`, `PAYPLUG_LIVE_SECRET_KEY` | Vides tant que PayPlug n’est pas raccordé (voir PAYPLUG-WIRING.md) |
| `RESEND_API_KEY`, `MAIL_FROM` | Vides ; aucun fournisseur de reçus retenu |

3. Déployer. Chaque `git push origin main` redéploie la production.
4. Domaine : ajouter `boutique-de-boxe.com` et `www` dans Vercel → Domains, puis suivre les enregistrements DNS indiqués. Mettre `NEXT_PUBLIC_SITE_ORIGIN` sur le domaine final et ajouter les Redirect URLs Supabase correspondantes.

## 4. Connexion administrateur

`/atelier/` affiche un champ e-mail. Seule l’adresse `ADMIN_EMAIL` reçoit un lien ; toute autre adresse obtient la même réponse neutre sans envoi. Le lien ouvre `/api/auth/callback` puis l’atelier. Déconnexion : `POST /api/auth/signout`. En développement, `GET /api/auth/dev-login` pose le cookie du propriétaire local utilisé par `scripts/test-api.mjs`.

## 5. Poste de travail

```powershell
pnpm install
pnpm db:local        # Postgres embarqué sur 127.0.0.1:54329, base `boutique`
pnpm db:migrate      # avec DATABASE_URL de .env.local
pnpm dev             # http://localhost:3000
```

`.env.local` (ignoré par Git) contient `DATABASE_URL` locale et les deux valeurs publiques Supabase. Contrôles : `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm build`, `node scripts/audit-catalog.mjs`, `node --test scripts/test-inlett.mjs scripts/test-payplug-orders.mjs`, `node --experimental-strip-types scripts/test-payplug.mjs`, puis avec le serveur local : `node scripts/test-api.mjs`, `node scripts/test-commerce.mjs --email-disabled`, `node scripts/audit-seo.mjs`.

## 6. Ce qui a changé dans le code lors du portage

- `db/index.ts` : client `postgres` + adaptateur reproduisant l’API D1 (`prepare/bind/first/all/run/batch`) ; les marqueurs `?` deviennent `$n` ; `batch` s’exécute dans une transaction.
- `db/schema.ts` : mêmes tables en `pg-core` ; `expires` et `expires_at` en `bigint`.
- `lib/auth.ts` : session Supabase ; cookie `__sites_local_auth` uniquement en développement. `app/chatgpt-auth.ts` supprimé.
- `lib/request.ts` : adresse client (`x-real-ip`, puis `cf-connecting-ip` des tests, puis `x-forwarded-for`).
- Requêtes : `json_extract` → `payload::jsonb->>'…'` ; `SET hits=hits+1` → `SET hits=rate_limits.hits+1` (ambiguïté Postgres) ; validation de commande verrouillée par `SELECT … FOR UPDATE` sur le panier.
- `lib/catalog.ts` : origine du site depuis `NEXT_PUBLIC_SITE_ORIGIN`, défaut `https://boutique-de-boxe.com`.
- `next.config.ts` : `trailingSlash` conservé, `skipTrailingSlashRedirect` pour ne pas rediriger les routes API en 308.
