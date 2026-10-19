import { payplugGet, payplugPost } from '@/lib/payplug-orders';
export const dynamic = 'force-dynamic';
// Une création peut enchaîner relecture, abandon, relecture puis création (4 × 12 s au plus) : la fonction
// ne doit pas être coupée au milieu, ce qui laisserait la tentative « en préparation ».
export const maxDuration = 60;
type Context = { params: Promise<{ action: string }> };
const unavailable = () =>
  Response.json(
    { error: 'Le service PayPlug est temporairement indisponible.' },
    {
      status: 503,
      headers: {
        'Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    },
  );
export async function GET(request: Request, { params }: Context) {
  try {
    return await payplugGet(request, (await params).action);
  } catch {
    return unavailable();
  }
}
export async function POST(request: Request, { params }: Context) {
  try {
    return await payplugPost(request, (await params).action);
  } catch {
    return unavailable();
  }
}
