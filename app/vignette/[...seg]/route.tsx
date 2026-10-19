import { ImageResponse } from 'next/og';
import fs from 'node:fs';
import path from 'node:path';
import { readCatalog } from '@/lib/database';
import { shop } from '@/lib/catalog';
import { cardFor, OG_HEIGHT, OG_WIDTH, type CardKind } from '@/lib/og';
import { empreinte, THUMB_SIZE } from '@/lib/vignette';

/**
 * Vignette sociale d’une page, rendue à la demande avec les polices du site.
 * /vignette/p/<slug>.png fiche · /vignette/c/<slug>.png famille ·
 * /vignette/s/<slug>.png sous-famille · /vignette/g/<slug>.png guide ·
 * /vignette/x/<page>.png accueil, guides, nouveautés, contact, services.
 * /vignette/t/<slug>/<rang>-<empreinte>.webp vignette 168 px d’une photo de galerie (lib/vignette.ts).
 *
 * Les vignettes sociales sont réencodées en PNG à palette (même dessin, nettement plus léger) ;
 * une photo est lue en 8 s et 15 Mo au plus.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PAPER = '#f1f0e9';
const INK = '#20241f';
const TAPE = '#dded76';
const MUTED = '#5d6459';
const RULE = '#ccd0c3';

let fontCache: { name: string; data: Buffer; weight: 400 | 600 | 700 | 800 }[] | null = null;
function fonts() {
  if (fontCache) return fontCache;
  const dir = path.join(process.cwd(), 'assets', 'fonts');
  fontCache = [
    { name: 'Barlow', data: fs.readFileSync(path.join(dir, 'BarlowCondensed-ExtraBold.ttf')), weight: 800 },
    { name: 'Manrope', data: fs.readFileSync(path.join(dir, 'Manrope-400.ttf')), weight: 400 },
    { name: 'Manrope', data: fs.readFileSync(path.join(dir, 'Manrope-600.ttf')), weight: 600 },
    { name: 'Manrope', data: fs.readFileSync(path.join(dir, 'Manrope-700.ttf')), weight: 700 },
  ];
  return fontCache;
}

const heroTitleSize = (t: string) => (t.length > 60 ? 44 : t.length > 42 ? 52 : t.length > 26 ? 62 : 74);
const titleSize = (t: string) => (t.length > 64 ? 46 : t.length > 44 ? 54 : t.length > 28 ? 62 : 72);

type Sharp = {
  resize: (o: object) => Sharp;
  png: (o?: object) => Sharp;
  webp: (o?: object) => Sharp;
  toBuffer: () => Promise<Buffer>;
};
/** module natif chargé à l’exécution depuis node_modules, laissé hors du bundle par le bundler */
async function loadSharp() {
  const mod = (await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ 'sharp')) as { default: (input: Buffer) => Sharp };
  return mod.default;
}

const MAX_PHOTO = 15 * 1024 * 1024;
/** Une photo, lue avec un délai et un plafond : un hôte lent ou un fichier démesuré ne bloque pas la fonction. */
async function readPhoto(url: string, init: RequestInit = {}): Promise<Buffer | null> {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(8000) });
  if (!res.ok || !res.body) return null;
  if (Number(res.headers.get('content-length') || 0) > MAX_PHOTO) return null;
  const chunks: Uint8Array[] = [];
  let size = 0;
  const reader = res.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_PHOTO) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

/** Photo du site (WebP) → PNG en data URL ; en cas d’échec, pas de photo plutôt qu’une erreur. */
async function toPng(url: string): Promise<string | null> {
  try {
    const input = await readPhoto(url, { cache: 'force-cache' });
    if (!input) return null;
    const sharp = await loadSharp();
    const png = await sharp(input).resize({ width: 720, height: 600, fit: 'inside' }).png().toBuffer();
    return `data:image/png;base64,${png.toString('base64')}`;
  } catch (error) {
    lastPhotoError = (error as Error).message;
    console.error('vignette photo', lastPhotoError);
    return null;
  }
}
let lastPhotoError = '';

/** Hôtes des photos de fournisseurs (les mêmes que la CSP `img-src`) : la vignette ne lit rien d’autre. */
const PHOTO_HOSTS = new Set(['api.ecommercio.com', 'ypnjjowtudmpxoqopzta.supabase.co', 'media.cdnws.com']);
const YEAR = 'public, max-age=31536000, s-maxage=31536000, immutable';

/** /vignette/t/<slug>/<rang>-<empreinte>.webp : la photo n° rang de la fiche, réduite à 168 px. */
async function thumbnail(seg: string[], origin: string) {
  const m = seg.length === 3 ? /^(\d{1,2})-([0-9a-z]{6,8})\.webp$/.exec(seg[2]) : null;
  if (!m || !/^[a-z0-9-]{1,200}$/.test(seg[1])) return new Response('Not found', { status: 404 });
  const p = (await readCatalog()).find((x) => x.slug === seg[1]);
  const image = p?.images[Number(m[1])];
  // Une photo remplacée change d’empreinte : l’ancienne adresse ne sert plus d’image.
  if (!p || !image || empreinte(image.src) !== m[2]) return new Response('Not found', { status: 404 });
  const source = image.src.startsWith('/') ? origin + image.small : image.src;
  try {
    if (!image.src.startsWith('/') && !PHOTO_HOSTS.has(new URL(source).hostname)) return new Response('Not found', { status: 404 });
    const input = await readPhoto(source);
    if (!input) throw new Error('photo indisponible');
    const sharp = await loadSharp();
    const webp = await sharp(input).resize({ width: THUMB_SIZE, height: THUMB_SIZE, fit: 'inside', withoutEnlargement: true }).webp({ quality: 74 }).toBuffer();
    return new Response(new Uint8Array(webp), { headers: { 'Content-Type': 'image/webp', 'Cache-Control': YEAR } });
  } catch (error) {
    console.error('vignette galerie', p.slug, (error as Error).message);
    // Hôte du fournisseur indisponible : la photo d’origine plutôt qu’un trou dans la galerie, sans cache.
    return new Response(null, { status: 307, headers: { Location: source, 'Cache-Control': 'no-store' } });
  }
}

/** Même dessin, PNG à palette : la vignette sociale pèse plusieurs fois moins lourd. */
async function compact(response: Response): Promise<Response> {
  if (!response.ok || response.headers.get('Content-Type') !== 'image/png') return response;
  try {
    const sharp = await loadSharp();
    const png = await sharp(Buffer.from(await response.arrayBuffer())).png({ palette: true, quality: 90, effort: 8, compressionLevel: 9 }).toBuffer();
    const headers = new Headers(response.headers);
    headers.delete('Content-Length');
    return new Response(new Uint8Array(png), { status: 200, headers });
  } catch (error) {
    console.error('vignette compression', (error as Error).message);
    return new Response('Vignette indisponible', { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}

export async function GET(request: Request, ctx: { params: Promise<{ seg: string[] }> }) {
  return compact(await render(request, ctx));
}

async function render(request: Request, { params }: { params: Promise<{ seg: string[] }> }): Promise<Response> {
  const { seg } = await params;
  if (seg[0] === 't') return thumbnail(seg, new URL(request.url).origin);
  const kind = seg[0] as CardKind;
  let key = '';
  try {
    key = decodeURIComponent((seg.slice(1).join('/') || '').replace(/\.png$/, ''));
  } catch {
    return new Response('Not found', { status: 404 });
  }
  if (!['p', 'c', 's', 'g', 'x'].includes(kind) || !key) return new Response('Not found', { status: 404 });
  const card = cardFor(kind, key, await readCatalog());
  if (!card) return new Response('Not found', { status: 404 });
  const origin = new URL(request.url).origin;
  // Les photos sont en WebP, que le moteur de rendu ne lit pas : conversion en PNG à la volée.
  const photos = (await Promise.all(card.photos.map((src) => toPng(src.startsWith('http') ? src : origin + src)))).filter((x): x is string => Boolean(x));
  const hasPhoto = photos.length > 0;
  const titleWidth = hasPhoto ? 660 : 1088;

  // Fiche produit : le modèle détouré, en grand, posé sur sa scène. La vignette vend le produit, pas la boutique.
  const cutout = card.cut ? await toPng(origin + card.cut.src) : null;
  if (card.cut && cutout) {
    const cut = card.cut;
    // La scène Ring, comme sur le site : le noir de la salle, un projecteur, un halo de la couleur du modèle.
    const dark = cut.lum < 0.24;
    const n = parseInt(cut.tint.slice(1), 16);
    const glow = cut.vivid ? `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, 0.42)` : 'rgba(255, 255, 255, 0.16)';
    const name = card.title.split(' — ')[0];
    const detail = card.title.includes(' — ') ? card.title.split(' — ').slice(1).join(' — ') : '';
    const sizes = card.facts.find((f) => f.label === 'TAILLES')?.value;
    return new ImageResponse(
      (
        <div style={{ width: OG_WIDTH, height: OG_HEIGHT, background: PAPER, color: INK, display: 'flex', fontFamily: 'Manrope', position: 'relative' }}>
          {/* La scène, à fond perdu sur la droite */}
          <div style={{ position: 'absolute', left: 588, top: 0, width: 612, height: OG_HEIGHT, display: 'flex', background: dark ? '#262b24' : '#1d211c' }} />
          <div style={{ position: 'absolute', left: 588, top: 474, width: 612, height: 156, display: 'flex', background: dark ? '#181c15' : '#141711' }} />
          <div style={{ position: 'absolute', left: 588, top: 0, width: 612, height: OG_HEIGHT, display: 'flex', backgroundImage: `radial-gradient(ellipse 66% 58% at 50% 38%, rgba(255,255,255,${dark ? 0.34 : 0.2}) 0%, rgba(255,255,255,0) 72%)` }} />
          <div style={{ position: 'absolute', left: 588, top: 0, width: 612, height: OG_HEIGHT, display: 'flex', backgroundImage: `radial-gradient(ellipse 52% 46% at 50% 58%, ${glow} 0%, rgba(0,0,0,0) 70%)` }} />
          <div style={{ position: 'absolute', left: 588, top: 540, width: 612, height: 70, display: 'flex', backgroundImage: 'radial-gradient(ellipse 46% 50% at 50% 50%, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 70%)' }} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cutout} alt="" width={cut.mode === 'cadre' ? 600 : 590} height={cut.mode === 'cadre' ? 600 : 590} style={{ position: 'absolute', left: cut.mode === 'cadre' ? 600 : 599, top: cut.mode === 'cadre' ? 30 : 24, objectFit: 'contain' }} />
          <div style={{ position: 'absolute', left: 588, top: 0, width: 6, height: OG_HEIGHT, background: TAPE, display: 'flex' }} />

          {/* La marque */}
          <div style={{ position: 'absolute', left: 56, top: 40, display: 'flex', flexDirection: 'column', fontFamily: 'Barlow', fontSize: 26, lineHeight: 1.05, letterSpacing: 0.5 }}>
            <span>BOUTIQUE</span>
            <span>DE BOXE.</span>
          </div>

          {/* Le modèle */}
          <div style={{ position: 'absolute', left: 56, top: 148, width: 496, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', fontSize: 15, fontWeight: 700, letterSpacing: 1.6, color: MUTED }}>{card.eyebrow}</div>
            <div style={{ display: 'flex', marginTop: 16, fontFamily: 'Barlow', fontSize: heroTitleSize(name), lineHeight: 0.98, letterSpacing: -0.5 }}>{name}</div>
            {detail ? <div style={{ display: 'flex', marginTop: 14, fontSize: 22, fontWeight: 600, color: MUTED, lineHeight: 1.2 }}>{detail}</div> : null}
          </div>

          {/* Le prix, les tailles */}
          <div style={{ position: 'absolute', left: 56, top: 468, width: 496, display: 'flex', alignItems: 'flex-end', gap: 28 }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.4, color: MUTED }}>PRIX PRÉVU</span>
              <span style={{ display: 'flex', marginTop: 4, fontFamily: 'Barlow', fontSize: 58, lineHeight: 1, background: TAPE, padding: '4px 12px 2px' }}>{card.price}</span>
            </div>
            {sizes ? (
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.4, color: MUTED }}>TAILLES</span>
                <span style={{ display: 'flex', marginTop: 6, fontSize: 20, fontWeight: 600, lineHeight: 1.2 }}>{sizes.length > 44 ? sizes.slice(0, 42) + '…' : sizes}</span>
              </div>
            ) : null}
          </div>
          <div style={{ position: 'absolute', left: 56, top: 579, width: 496, height: 1, background: INK, display: 'flex' }} />
          <div style={{ position: 'absolute', left: 56, top: 594, display: 'flex', fontSize: 13, fontWeight: 700, letterSpacing: 1, color: MUTED }}>LIVRAISON DANS TOUTE LA FRANCE · VENTES OUVERTES</div>
        </div>
      ),
      {
        width: OG_WIDTH,
        height: OG_HEIGHT,
        fonts: fonts().map((f) => ({ name: f.name, data: f.data, weight: f.weight, style: 'normal' as const })),
        headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000' },
      },
    );
  }

  return new ImageResponse(
    (
      <div style={{ width: OG_WIDTH, height: OG_HEIGHT, background: PAPER, color: INK, display: 'flex', flexDirection: 'column', fontFamily: 'Manrope', position: 'relative' }}>
        {/* En-tête : marque, filet de ruban, surtitre */}
        <div style={{ position: 'absolute', left: 56, top: 32, display: 'flex', flexDirection: 'column', fontFamily: 'Barlow', fontSize: 26, lineHeight: 1.05, letterSpacing: 0.5 }}>
          <span>BOUTIQUE</span>
          <span>DE BOXE.</span>
        </div>
        <div style={{ position: 'absolute', left: 56, top: 101, width: 103, height: 5, background: TAPE, display: 'flex' }} />
        <div style={{ position: 'absolute', left: 580, top: 44, width: 565, display: 'flex', fontSize: 16, fontWeight: 700, letterSpacing: 1.6, color: MUTED, lineHeight: 1.25 }}>{card.eyebrow}</div>
        <div style={{ position: 'absolute', left: 56, top: 129, width: 1088, height: 2, background: INK, display: 'flex' }} />

        {/* Titre */}
        <div style={{ position: 'absolute', left: 56, top: 158, width: titleWidth, display: 'flex', fontFamily: 'Barlow', fontSize: titleSize(card.title), lineHeight: 0.98, letterSpacing: -0.5 }}>{card.title}</div>

        {/* Photo(s) */}
        {hasPhoto && (
          <div style={{ position: 'absolute', left: 758, top: 133, width: 387, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', background: TAPE, fontSize: 10, fontWeight: 700, letterSpacing: 1.2, padding: '4px 10px', alignSelf: 'flex-start' }}>{card.photoLabel}</div>
            <div style={{ display: 'flex', width: 387, height: 302, background: '#ffffff', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 8 }}>
              {photos.map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={src} alt="" width={photos.length === 1 ? 360 : 118} height={photos.length === 1 ? 286 : 250} style={{ objectFit: 'contain' }} />
              ))}
            </div>
          </div>
        )}

        {/* Faits */}
        <div style={{ position: 'absolute', left: 56, top: 482, width: 1088, display: 'flex', gap: 24 }}>
          {card.facts.map((f) => (
            <div key={f.label} style={{ display: 'flex', flexDirection: 'column', flex: 1, borderTop: `1px solid ${RULE}`, paddingTop: 14 }}>
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.4, color: MUTED }}>{f.label}</span>
              <span style={{ fontSize: 24, fontWeight: 600, marginTop: 6, lineHeight: 1.15 }}>{f.value}</span>
            </div>
          ))}
        </div>

        {/* Pied */}
        <div style={{ position: 'absolute', left: 56, top: 579, width: 1088, height: 1, background: INK, display: 'flex' }} />
        <div style={{ position: 'absolute', left: 56, top: 594, display: 'flex', fontSize: 13, fontWeight: 700, letterSpacing: 1, color: MUTED }}>LIVRAISON DANS TOUTE LA FRANCE</div>
        <div style={{ position: 'absolute', left: 334, top: 595, width: 812, display: 'flex', fontSize: 13, color: MUTED }}>{card.path.length > 86 ? shop.name : card.path}</div>
      </div>
    ),
    {
      width: OG_WIDTH,
      height: OG_HEIGHT,
      fonts: fonts().map((f) => ({ name: f.name, data: f.data, weight: f.weight, style: 'normal' as const })),
      headers: {
        'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000',
        ...(process.env.NODE_ENV !== 'production' && lastPhotoError ? { 'X-Vignette-Photo-Error': lastPhotoError.slice(0, 200) } : {}),
      },
    },
  );
}
