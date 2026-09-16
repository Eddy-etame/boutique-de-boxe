#!/usr/bin/env node
/**
 * Soumet les URL du sitemap à IndexNow (Bing, Yandex, Naver, Seznam) après une
 * mise à jour réelle du site. La clé est publiée dans public/<clé>.txt.
 *
 *   node scripts/indexnow.mjs                      # toutes les URL du sitemap
 *   node scripts/indexnow.mjs /gants-de-boxe/ /guides/debuter-boxe/
 *   SITE_ORIGIN=https://boutique-de-boxe.fr node scripts/indexnow.mjs
 */
const KEY = 'b7d1f0a3e9c24f6b8a5d3c1e7f9b2a4c';
const origin = (
  process.env.SITE_ORIGIN ||
  process.env.NEXT_PUBLIC_SITE_ORIGIN ||
  'https://boutique-de-boxe.fr'
).replace(/\/$/, '');
if (origin !== 'https://boutique-de-boxe.fr')
  throw new Error(
    'IndexNow attend le domaine canonique https://boutique-de-boxe.fr.',
  );
const host = new URL(origin).host;

let urls = process.argv
  .slice(2)
  .map((p) => (p.startsWith('http') ? p : origin + p));
if (!urls.length) {
  const xml = await (await fetch(origin + '/sitemap.xml')).text();
  urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
}
if (urls.some((url) => new URL(url).origin !== origin))
  throw new Error(
    'Le sitemap contient une origine différente du domaine canonique.',
  );
console.log(`${urls.length} URL pour ${host}`);
for (let i = 0; i < urls.length; i += 10000) {
  const batch = urls.slice(i, i + 10000);
  const r = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      host,
      key: KEY,
      keyLocation: `${origin}/${KEY}.txt`,
      urlList: batch,
    }),
  });
  console.log(`lot ${i / 10000 + 1} : ${r.status} ${r.statusText}`);
  if (r.status >= 400) console.log(await r.text());
}
