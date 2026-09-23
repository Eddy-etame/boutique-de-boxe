import { db, isAdmin, readCatalog, bustCatalog } from '@/lib/database';

import { validateProduct } from '@/lib/product-input';

import { shop, listItem } from '@/lib/catalog';
import { listingFor } from '@/lib/listing';
import { nearest, suggest } from '@/lib/suggest';

import { getSessionUser } from '@/lib/auth';
import { emailValid, ensureAlertContact, insertAlert, normalisePhone } from '@/lib/alerts';
import { clientIp } from '@/lib/request';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

const refreshCatalogPages = () => {
  bustCatalog();
  // Une édition touche la fiche, ses listes, les marques, l'observatoire et le sitemap.
  revalidatePath('/', 'layout');
};

const response = (value: unknown, status = 200) =>
  Response.json(value, {
    status,

    headers: {
      'Cache-Control': 'no-store',

      'X-Content-Type-Options': 'nosniff',
    },
  });

async function body(request: Request) {
  const formEncoded = request.headers
    .get('content-type')
    ?.includes('application/x-www-form-urlencoded');
  if (
    !formEncoded &&
    !request.headers.get('content-type')?.includes('application/json')
  )
    throw new Error('Format de demande invalide.');

  const origin = request.headers.get('origin');

  if (
    !origin ||
    ![new URL(request.url).origin, shop.origin, shop.intendedDomain].includes(
      origin,
    )
  )
    throw new Error('Origine de la demande invalide.');

  const reader = request.body?.getReader();

  if (!reader) throw new Error('Demande vide.');

  const parts: Uint8Array[] = [];

  let length = 0;

  for (;;) {
    const { done, value } = await reader.read();

    if (done) break;

    length += value.byteLength;

    if (length > (new URL(request.url).pathname.endsWith('/admin-catalog') ? 100000 : 16000)) {
      await reader.cancel();

      throw new Error('Demande trop volumineuse.');
    }

    parts.push(value);
  }

  const all = new Uint8Array(length);

  let cursor = 0;

  for (const p of parts) {
    all.set(p, cursor);

    cursor += p.length;
  }

  const decoded = new TextDecoder().decode(all);
  const data = formEncoded
    ? Object.fromEntries(new URLSearchParams(decoded))
    : JSON.parse(decoded);
  if (formEncoded && data.consent === 'on') data.consent = true;

  if (!data || typeof data !== 'object' || Array.isArray(data))
    throw new Error('Demande invalide.');

  return data;
}

async function limit(request: Request) {
  const ip = clientIp(request);

  const bucket = Math.floor(Date.now() / 3600000);

  const bytes = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(ip + ':' + bucket),
  );

  const key = Array.from(new Uint8Array(bytes))

    .map((n) => n.toString(16).padStart(2, '0'))

    .join('');

  const database = await db();

  await database

    .prepare('DELETE FROM rate_limits WHERE expires < ?')

    .bind(Date.now())

    .run();

  const count = await database

    .prepare(
      'INSERT INTO rate_limits (key,hits,expires) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET hits=rate_limits.hits+1 RETURNING hits',
    )

    .bind(key, (bucket + 2) * 3600000)

    .first<number>('hits');

  return (count || 0) <= 20;
}

export async function GET(
  request: Request,

  { params }: { params: Promise<{ action: string }> },
) {
  const { action } = await params;

  if (action === 'catalog')
    return Response.json(
      { products: await readCatalog() },
      {
        headers: {
          'Cache-Control':
            'public, s-maxage=300, stale-while-revalidate=86400',
          'X-Content-Type-Options': 'nosniff',
        },
      },
    );

  // La liste complète d’une page de catalogue, en forme allégée : demandée par le navigateur au
  // premier geste (recherche, filtre, tri, page), jamais au chargement (lib/listing.ts).
  if (action === 'suggest') {
    // La barre de recherche pendant la frappe (q), ou la page 404 devant une adresse introuvable (path).
    const url = new URL(request.url);
    const q = (url.searchParams.get('q') || '').slice(0, 80);
    const path = (url.searchParams.get('path') || '').slice(0, 200);
    const products = await readCatalog();
    const value = path ? nearest(path, products) : suggest(q, products);
    return Response.json(value, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=86400',
        'X-Content-Type-Options': 'nosniff',
        'X-Robots-Tag': 'noindex',
      },
    });
  }
  if (action === 'catalog-list') {
    const scope = new URL(request.url).searchParams.get('scope') || '';
    const list = /^[a-z0-9-]{1,80}$/.test(scope)
      ? listingFor(scope, await readCatalog())
      : null;
    if (!list) return response({ error: 'Liste introuvable.' }, 404);
    return Response.json(
      { items: list.map(listItem) },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=86400',
          'X-Content-Type-Options': 'nosniff',
          'X-Robots-Tag': 'noindex',
        },
      },
    );
  }

  if (action === 'admin') {
    if (!(await isAdmin()))
      return response({ error: 'Accès réservé à l’administration.' }, 403);

    await ensureAlertContact();
    const database = await db();

    const [alerts, contacts, overrides] = await Promise.all([
      database

        .prepare(
          "SELECT a.id,a.email,a.phone,a.sms_consent,a.source,a.product_id,a.variant,a.created_at,a.unsubscribe_token,COALESCE(o.name,(c.payload::jsonb->>'name')) AS product_name,c.archived AS product_archived FROM alerts a LEFT JOIN catalog_entries c ON c.id=a.product_id LEFT JOIN product_overrides o ON o.product_id=a.product_id ORDER BY a.created_at DESC LIMIT 300",
        )

        .all(),

      database

        .prepare(
          'SELECT id,name,email,message,created_at,relay_status FROM contacts ORDER BY created_at DESC LIMIT 300',
        )

        .all(),

      database.prepare('SELECT * FROM product_overrides').all(),
    ]);

    return response({
      alerts: alerts.results,

      contacts: contacts.results,

      overrides: overrides.results,

      products: await readCatalog(),
    });
  }

  return response({ error: 'Ressource introuvable.' }, 404);
}

export async function POST(
  request: Request,

  { params }: { params: Promise<{ action: string }> },
) {
  const { action } = await params;

  try {
    if (action.startsWith('admin') && !(await isAdmin()))
      return response({ error: 'Accès réservé à l’administration.' }, 403);

    const data = await body(request);

    if (data.website)
      return response(
        { error: 'La demande n’a pas pu être enregistrée.' },
        400,
      );

    if (action === 'admin-catalog') {
      let product;
      try {
        product = validateProduct(data.product);
      } catch (e) {
        return response(
          { error: e instanceof Error ? e.message : 'Produit invalide.' },
          400,
        );
      }

      const catalog = await readCatalog();
      const old = catalog.find((p) => p.id === product.id);
      const database = await db();
      const reserved = await database
        .prepare(
          "SELECT id FROM catalog_entries WHERE archived=1 AND (id=? OR (payload::jsonb->>'slug')=?) LIMIT 1",
        )
        .bind(product.id, product.slug)
        .first();

      if (
        reserved ||
        (old && !data.replace) ||
        catalog.some((p) => p.slug === product.slug && p.id !== product.id) ||
        (old && old.slug !== product.slug)
      )
        return response(
          {
            error:
              'Identifiant ou adresse déjà utilisés. Conservez l’adresse d’une fiche existante.',
          },
          409,
        );

      if (old) product.dateAdded = old.dateAdded;

      const now = new Date().toISOString();
      await database.batch([
        database
          .prepare(
            'INSERT INTO catalog_entries(id,payload,archived,updated_at) VALUES (?,?,0,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,archived=0,updated_at=excluded.updated_at',
          )
          .bind(product.id, JSON.stringify(product), now),
        database
          .prepare(
            'UPDATE product_overrides SET name=?,description=?,price_cents=?,updated_at=? WHERE product_id=?',
          )
          .bind(
            product.name,
            product.description,
            product.price,
            now,
            product.id,
          ),
      ]);
      refreshCatalogPages();
      return request.headers
        .get('content-type')
        ?.includes('application/x-www-form-urlencoded')
        ? new Response(null, {
            status: 303,
            headers: {
              Location: '/confirmation/?objet=' + action,
              'Cache-Control': 'no-store',
            },
          })
        : response({ ok: true }, 201);
    }

    if (action === 'admin-archive') {
      const product = (await readCatalog()).find((p) => p.id === data.id);
      if (!product || product.id === 'mat-blade-gold')
        return response(
          { error: 'Cette référence ne peut pas être retirée.' },
          400,
        );

      await (
        await db()
      )
        .prepare(
          'INSERT INTO catalog_entries(id,payload,archived,updated_at) VALUES (?,?,1,?) ON CONFLICT(id) DO UPDATE SET archived=1,updated_at=excluded.updated_at',
        )
        .bind(product.id, JSON.stringify(product), new Date().toISOString())
        .run();
      refreshCatalogPages();
      return response({ ok: true });
    }

    if (action === 'admin-delete') {
      if (
        !['alerts', 'contacts'].includes(data.kind) ||
        typeof data.id !== 'string' ||
        !/^[0-9a-f-]{36}$/.test(data.id)
      )
        return response({ error: 'Demande invalide.' }, 400);

      await (
        await db()
      )

        .prepare(
          data.kind === 'alerts'
            ? 'DELETE FROM alerts WHERE id=?'
            : 'DELETE FROM contacts WHERE id=?',
        )

        .bind(data.id)

        .run();

      return response({ ok: true });
    }

    if (action === 'admin') {
      const p = (await readCatalog()).find((p) => p.id === data.productId);

      if (
        !p ||
        typeof data.name !== 'string' ||
        data.name.trim().length < 3 ||
        data.name.length > 180 ||
        typeof data.description !== 'string' ||
        data.description.trim().length < 30 ||
        data.description.length > 8000 ||
        !Number.isInteger(data.priceCents) ||
        data.priceCents < 0 ||
        data.priceCents > 5000000 ||
        !Number.isInteger(data.internalStock) ||
        data.internalStock < 0 ||
        data.internalStock > 100000 ||
        ![0, 15].includes(data.plannedDiscount)
      )
        return response({ error: 'Vérifiez les champs du produit.' }, 400);

      if (p.variants?.length && data.priceCents!==p.price) return response({error:'Modifiez les prix de chaque déclinaison dans la fiche complète.'},400);
      const user = await getSessionUser();

      await (
        await db()
      )

        .prepare(
          'INSERT INTO product_overrides (product_id,name,description,price_cents,internal_stock,planned_discount,updated_at,updated_by) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(product_id) DO UPDATE SET name=excluded.name,description=excluded.description,price_cents=excluded.price_cents,internal_stock=excluded.internal_stock,planned_discount=excluded.planned_discount,updated_at=excluded.updated_at,updated_by=excluded.updated_by',
        )

        .bind(
          p.id,
          data.name.trim(),
          data.description.trim(),
          data.priceCents,
          data.internalStock,
          data.plannedDiscount,
          new Date().toISOString(),
          user!.userId,
        )

        .run();

      refreshCatalogPages();
      return response({ ok: true });
    }

    if (!['alerts', 'contact', 'contact-relay', 'unsubscribe'].includes(action))
      return response({ error: 'Ressource introuvable.' }, 404);

    if (!(await limit(request)))
      return response(
        {
          error:
            'Trop de demandes rapprochées. Réessayez dans une heure ou contactez-nous par e-mail.',
        },
        429,
      );

    if (action === 'contact-relay') {
      if (typeof data.id !== 'string' || typeof data.token !== 'string' || !/^[0-9a-f-]{36}$/.test(data.id) || !/^[0-9a-f-]{36}$/.test(data.token) || !['accepted_client','failed','unconfirmed'].includes(data.state)) return response({error:'Demande invalide.'},400);
      await (await db()).prepare("UPDATE contacts SET relay_status=? WHERE id=? AND relay_token=? AND relay_status='unconfirmed'").bind(data.state,data.id,data.token).run();
      return response({ok:true});
    }

    if (action === 'unsubscribe') {
      if (typeof data.token !== 'string' || !/^[0-9a-f-]{36}$/.test(data.token))
        return response({ error: 'Lien de désinscription invalide.' }, 400);

      await (
        await db()
      )

        .prepare('DELETE FROM alerts WHERE unsubscribe_token=?')

        .bind(data.token)

        .run();

      return response({ ok: true });
    }

    if (!emailValid(data.email))
      return response({ error: 'Saisissez une adresse e-mail valide.' }, 400);

    const email = data.email.trim().toLowerCase();

    if (action === 'alerts') {
      await ensureAlertContact();

      // Deuxième temps, facultatif : le numéro pour un SMS le jour de l’ouverture. Il ne s’ajoute
      // qu’à l’inscription qui vient d’être créée (référence rendue une seule fois, à son auteur).
      if (data.ref !== undefined) {
        const phone = normalisePhone(data.phone);
        if (
          typeof data.ref !== 'string' ||
          !/^[0-9a-f-]{36}$/.test(data.ref) ||
          data.smsConsent !== true ||
          !phone
        )
          return response(
            { error: 'Vérifiez le numéro : 06 12 34 56 78 ou +33 6 12 34 56 78.' },
            400,
          );
        const updated = await (await db())
          .prepare("UPDATE alerts SET phone=?, sms_consent=1 WHERE id=? AND email=? AND phone='' RETURNING id")
          .bind(phone, data.ref, email)
          .first<string>('id');
        return updated
          ? response({ ok: true })
          : response({ error: 'Inscription introuvable. Recommencez avec votre e-mail.' }, 404);
      }

      const p = (await readCatalog()).find((p) => p.id === data.productId);

      if (
        data.consent !== true ||
        (!p && data.productId !== 'launch') ||
        typeof data.variant !== 'string' ||
        (p && data.variant && !p.sizes.includes(data.variant)) ||
        data.variant.length > 100
      )
        return response(
          { error: 'Vérifiez la référence et votre consentement.' },
          400,
        );

      const source =
        typeof data.source === 'string' && /^[a-z0-9-]{1,40}$/.test(data.source)
          ? data.source
          : '';
      // La référence n’est rendue qu’à la création : une adresse déjà inscrite ne révèle rien.
      const ref = await insertAlert({ email, productId: data.productId, variant: data.variant, source });

      return request.headers
        .get('content-type')
        ?.includes('application/x-www-form-urlencoded')
        ? new Response(null, {
            status: 303,
            headers: {
              Location: '/confirmation/?objet=' + action,
              'Cache-Control': 'no-store',
            },
          })
        : response(ref ? { ok: true, ref } : { ok: true, already: true }, 201);
    }

    if (
      typeof data.name !== 'string' ||
      data.name.trim().length < 2 ||
      data.name.length > 100 ||
      typeof data.message !== 'string' ||
      data.message.trim().length < 10 ||
      data.message.length > 4000
    )
      return response(
        { error: 'Indiquez votre nom et un message de 10 à 4 000 caractères.' },
        400,
      );

    const database = await db();
    if (data.requestKey && (typeof data.requestKey !== 'string' || !/^[0-9a-f-]{36}$/.test(data.requestKey))) return response({error:'Demande invalide.'},400);
    const previous = data.requestKey ? await database.prepare('SELECT id,name,email,message,relay_token,relay_status FROM contacts WHERE request_key=?').bind(data.requestKey).first<{id:string;name:string;email:string;message:string;relay_token:string;relay_status:string}>() : null;
    if (previous) {
      if (previous.name !== data.name.trim() || previous.email !== email || previous.message !== data.message.trim()) return response({error:'Cette demande a déjà été utilisée.'},409);
      return response({ok:true,id:previous.id,relayToken:previous.relay_token,relayStatus:previous.relay_status});
    }
    const id = crypto.randomUUID();
    const relayToken = crypto.randomUUID();
    await database.prepare('INSERT INTO contacts(id,name,email,message,created_at,request_key,relay_token,relay_status) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(request_key) DO NOTHING').bind(id,data.name.trim(),email,data.message.trim(),new Date().toISOString(),data.requestKey || null,relayToken,data.requestKey?'unconfirmed':'pending').run();
    if (data.requestKey) {
      const winner = await database.prepare('SELECT id,name,email,message,relay_token,relay_status FROM contacts WHERE request_key=?').bind(data.requestKey).first<{id:string;name:string;email:string;message:string;relay_token:string;relay_status:string}>();
      if(winner && winner.id!==id) {
        if(winner.name!==data.name.trim()||winner.email!==email||winner.message!==data.message.trim()) return response({error:'Cette demande a déjà été utilisée.'},409);
        return response({ok:true,id:winner.id,relayToken:winner.relay_token,relayStatus:winner.relay_status});
      }
    }

    return request.headers
      .get('content-type')
      ?.includes('application/x-www-form-urlencoded')
      ? new Response(null, {
          status: 303,
          headers: {
            Location: '/confirmation/?objet=' + action,
            'Cache-Control': 'no-store',
          },
        })
      : response({ ok: true, id, relayToken, relayStatus: 'pending' }, 201);
  } catch (error) {
    if (error instanceof SyntaxError)
      return response({ error: 'Demande illisible. Réessayez.' }, 400);
    console.error('api POST', (error as { code?: string }).code || (error as Error).name, (error as Error).message);

    if (error instanceof Error && /demande|format|origine/i.test(error.message))
      return response({ error: error.message }, 400);

    return response(
      {
        error:
          'L’enregistrement est temporairement indisponible. Vous pouvez nous écrire à boxingcenter31@gmail.com.',
      },
      503,
    );
  }
}
