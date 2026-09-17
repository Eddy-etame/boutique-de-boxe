// Contrôle de synchronisation avec la boutique du club (boutique.boxingcenter.fr).
// Treize références sont vendues aux deux endroits : prix, tailles et état doivent concorder.
// Le site applique déjà le prix du club à la lecture ; ce script vérifie que les FICHIERS suivent,
// pour que le dépôt, les vignettes et les sauvegardes disent la même chose. Code de sortie 1 en cas d'écart.
//   node scripts/check-club-sync.mjs
import fs from 'node:fs';

const CLUB = 'https://boutique.boxingcenter.fr/api/materiel';
const ours = JSON.parse(fs.readFileSync(new URL('../lib/data/products.json', import.meta.url), 'utf8')).filter((p) => p.id.startsWith('mat-'));
const res = await fetch(CLUB, { signal: AbortSignal.timeout(15000) });
if (!res.ok) {
  console.error('Boutique du club injoignable : HTTP ' + res.status);
  process.exit(2);
}
const club = await res.json();
const byId = new Map(club.products.map((p) => [p.id, p]));
const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, '');
const euro = (c) => (c / 100).toFixed(2).replace('.', ',') + ' €';
const gaps = [];
for (const p of ours) {
  const c = byId.get(p.id);
  if (!c) {
    gaps.push(`${p.id} : absent du catalogue du club`);
    continue;
  }
  if (c.active === false) gaps.push(`${p.id} : inactif au club, publié ici`);
  if (c.price_cents !== p.price) gaps.push(`${p.id} : prix ${euro(p.price)} ici, ${euro(c.price_cents)} au club`);
  const theirs = (c.combinations || []).map((x) => norm(x.label || x.name)).filter(Boolean).sort();
  const mine = (p.sizes || []).map(norm).sort();
  if (theirs.length && theirs.join('|') !== mine.join('|')) gaps.push(`${p.id} : tailles [${p.sizes.join(', ')}] ici, [${(c.combinations || []).map((x) => x.label || x.name).join(', ')}] au club`);
}
for (const c of club.products) if (!ours.some((p) => p.id === c.id)) gaps.push(`${c.id} : vendu au club, absent ici (${c.name})`);
console.log(JSON.stringify({ club: club.products.length, ici: ours.length, releveClub: club.synced_at, ecarts: gaps }, null, 1));
process.exit(gaps.length ? 1 : 0);
