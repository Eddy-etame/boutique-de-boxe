import { unsubscribeAll } from '@/lib/newsletter';

/**
 * La désinscription « en une action » (en-tête List-Unsubscribe-Post) : le webmail envoie un POST
 * sans page ; on désinscrit toute l'adresse sur le jeton et on répond 200. Un GET (un clic humain
 * sur le même lien) mène à la page de désinscription, qui demande confirmation.
 */
export const dynamic = 'force-dynamic';
const token = (request: Request) => {
  const t = new URL(request.url).searchParams.get('token') || '';
  return /^[0-9a-f-]{36}$/.test(t) ? t : '';
};

export async function GET(request: Request) {
  const t = token(request);
  return new Response(null, { status: 303, headers: { Location: t ? `/desinscription/?token=${t}&tout=1` : '/desinscription/', 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  const t = token(request);
  if (!t) return new Response('Lien invalide', { status: 400, headers: { 'Cache-Control': 'no-store' } });
  await unsubscribeAll(t);
  return new Response(null, { status: 200, headers: { 'Cache-Control': 'no-store' } });
}
