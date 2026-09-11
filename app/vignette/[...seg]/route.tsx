import { ImageResponse } from 'next/og';
import fs from 'node:fs';
import path from 'node:path';
import { readCatalog } from '@/lib/database';
import { shop } from '@/lib/catalog';
import { cardFor, OG_HEIGHT, OG_WIDTH, type CardKind } from '@/lib/og';

/**
 * Vignette sociale d’une page, rendue à la demande avec les polices du site.
 * /vignette/p/<slug>.png fiche · /vignette/c/<slug>.png famille ·
 * /vignette/s/<slug>.png sous-famille · /vignette/g/<slug>.png guide ·
 * /vignette/x/<page>.png accueil, guides, nouveautés, contact, services.
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

const titleSize = (t: string) => (t.length > 64 ? 46 : t.length > 44 ? 54 : t.length > 28 ? 62 : 72);

/** Photo du site (WebP) → PNG en data URL ; en cas d’échec, pas de photo plutôt qu’une erreur. */
async function toPng(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { cache: 'force-cache' });
    if (!res.ok) return null;
    // module natif chargé à l’exécution depuis node_modules, laissé hors du bundle par le bundler
    const mod = (await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ 'sharp')) as { default: (input: Buffer) => { resize: (o: object) => { png: () => { toBuffer: () => Promise<Buffer> } } } };
    const sharp = mod.default;
    const png = await sharp(Buffer.from(await res.arrayBuffer())).resize({ width: 720, height: 600, fit: 'inside' }).png().toBuffer();
    return `data:image/png;base64,${png.toString('base64')}`;
  } catch (error) {
    lastPhotoError = (error as Error).message;
    console.error('vignette photo', lastPhotoError);
    return null;
  }
}
let lastPhotoError = '';

export async function GET(request: Request, { params }: { params: Promise<{ seg: string[] }> }) {
  const { seg } = await params;
  const kind = seg[0] as CardKind;
  const key = decodeURIComponent((seg.slice(1).join('/') || '').replace(/\.png$/, ''));
  if (!['p', 'c', 's', 'g', 'x'].includes(kind) || !key) return new Response('Not found', { status: 404 });
  const card = cardFor(kind, key, await readCatalog());
  if (!card) return new Response('Not found', { status: 404 });
  const origin = new URL(request.url).origin;
  // Les photos sont en WebP, que le moteur de rendu ne lit pas : conversion en PNG à la volée.
  const photos = (await Promise.all(card.photos.map((src) => toPng(src.startsWith('http') ? src : origin + src)))).filter((x): x is string => Boolean(x));
  const hasPhoto = photos.length > 0;
  const titleWidth = hasPhoto ? 660 : 1088;

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
