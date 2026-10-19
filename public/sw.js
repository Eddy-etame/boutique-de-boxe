/* Service worker de Boutique de Boxe.
   Fichiers statiques et photos : cache d’abord. Pages : réseau d’abord, avec la
   dernière copie en secours, puis la page hors-ligne. Jamais de mise en cache des
   appels API, des pages privées (atelier, panier, paiement, liens à jeton ou à
   adresse e-mail) ni d’une réponse marquée no-store.

   Caches bornés (19/10, D32) : 160 fichiers statiques et 40 pages au plus, les plus
   anciens sortent d’abord ; une page gardée plus de 7 jours ne sert plus de secours.
   Version : celle de l’adresse d’enregistrement (/sw.js?v=<build>) quand elle est
   donnée, sinon la constante ci-dessous ; à chaque nouvelle version, les anciens
   caches sont vidés. */
const BUILD = new URL(self.location.href).searchParams.get('v') || '';
const VERSION = 'bdb-v4' + (BUILD ? '-' + BUILD.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40) : '');
const SHELL_CACHE = VERSION + '-shell';
const STATIC_CACHE = VERSION + '-static';
const PAGES_CACHE = VERSION + '-pages';
const CACHES = [SHELL_CACHE, STATIC_CACHE, PAGES_CACHE];
const LIMITS = { [STATIC_CACHE]: 160, [PAGES_CACHE]: 40 };
const PAGE_MAX_AGE = 7 * 86400000;
const SHELL = ['/hors-ligne/', '/favicon.svg', '/icons/icon-192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => !CACHES.includes(k)).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

const STATIC = /^\/(products|media|og|fonts|icons|_next\/static)\//;
const PRIVATE = /^\/(api|admin|atelier|connexion|panier|recu|paiement-retour|merci|desinscription|confirmation)(\/|$)/;
/** Paramètres qui portent un jeton ou une adresse : la page n’est jamais gardée. */
const SENSITIVE = /(^|&)(token|t|email|e|code|id|key)=/i;

/** Garde une copie, puis retire les plus anciennes au-delà de la limite du cache. */
async function keep(cacheName, req, res) {
  const cache = await caches.open(cacheName);
  await cache.put(req, res);
  const limit = LIMITS[cacheName];
  if (!limit) return;
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - limit; i++) await cache.delete(keys[i]);
}
const storable = (res) => res.ok && res.type === 'basic' && !/no-store|private/i.test(res.headers.get('cache-control') || '');

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (PRIVATE.test(url.pathname)) return;

  if (STATIC.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (storable(res)) event.waitUntil(keep(STATIC_CACHE, req, res.clone()).catch(() => undefined));
            return res;
          }),
      ),
    );
    return;
  }

  if (req.mode === 'navigate') {
    const sensitive = SENSITIVE.test(url.search.slice(1));
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (!sensitive && storable(res)) {
            // La date de la copie voyage avec elle : au-delà de 7 jours, elle ne sert plus de secours.
            const headers = new Headers(res.headers);
            headers.set('x-bdb-cached-at', String(Date.now()));
            event.waitUntil(
              res
                .clone()
                .blob()
                .then((body) => keep(PAGES_CACHE, req, new Response(body, { status: res.status, statusText: res.statusText, headers })))
                .catch(() => undefined),
            );
          }
          return res;
        })
        .catch(() =>
          caches.match(req, { cacheName: PAGES_CACHE }).then((hit) => {
            const at = Number(hit?.headers.get('x-bdb-cached-at') || 0);
            return hit && Date.now() - at < PAGE_MAX_AGE ? hit : caches.match('/hors-ligne/');
          }),
        ),
    );
  }
});
