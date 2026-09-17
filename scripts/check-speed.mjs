// Budget de vitesse du site en ligne. À lancer après chaque mise en ligne, et avant de dire « c’est rapide ».
//   node scripts/check-speed.mjs                 (alias Vercel)
//   QA_ORIGIN=https://boutique-de-boxe.com node scripts/check-speed.mjs
//
// Le réseau de la machine qui mesure compte dans chaque chiffre : on le retire en mesurant d’abord un
// fichier servi par le bord du réseau (favicon). Ce qui reste est le temps du serveur : c’est lui
// qu’on tient sous budget. Trois mesures par adresse, on garde la médiane. Code de sortie 1 si dépassé.
const origin = process.env.QA_ORIGIN || 'https://boutique-de-boxe.vercel.app';
const BUDGET_MS = { page: 450, api: 400, weightKB: 260 };
const pages = [
  ['/', 'page'],
  ['/gants-de-boxe/', 'page'],
  ['/produits/gants-boxe-blade-metal-boxe-noir-blanc/', 'page'],
  ['/guides/', 'page'],
  ['/faq/', 'page'],
  ['/api/commerce/cart', 'api'],
];

async function ttfb(path) {
  const started = performance.now();
  const res = await fetch(origin + path, { cache: 'no-store', redirect: 'manual' });
  const reader = res.body?.getReader();
  await reader?.read();
  const first = performance.now() - started;
  let bytes = 0;
  if (reader) for (;;) { const c = await reader.read(); if (c.done) break; bytes += c.value.length; }
  return { ms: first, status: res.status, bytes };
}
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

await ttfb('/favicon.svg');
const network = median(await Promise.all([1, 2, 3].map(() => ttfb('/favicon.svg').then((r) => r.ms))));
const rows = [];
let failed = false;
for (const [path, kind] of pages) {
  await ttfb(path); // premier appel : réveille l’instance, non compté
  const runs = [];
  let last;
  for (let i = 0; i < 3; i++) { last = await ttfb(path); runs.push(last.ms); }
  const server = Math.max(0, median(runs) - network);
  const over = server > BUDGET_MS[kind] || (kind === 'page' && last.bytes / 1024 > BUDGET_MS.weightKB);
  failed ||= over || last.status >= 400;
  rows.push({ adresse: path, statut: last.status, 'médiane ms': Math.round(median(runs)), 'serveur ms': Math.round(server), 'budget ms': BUDGET_MS[kind], 'HTML Ko': Math.round(last.bytes / 1024), verdict: over ? 'DÉPASSÉ' : 'ok' });
}
console.log(JSON.stringify({ origine: origin, 'réseau de cette machine ms': Math.round(network), mesures: rows }, null, 1));
process.exit(failed ? 1 : 0);
