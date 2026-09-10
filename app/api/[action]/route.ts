import { db, isAdmin, readCatalog } from '@/lib/database';

import { validateProduct } from '@/lib/product-input';

import { shop } from '@/lib/catalog';

import { getChatGPTUser } from '@/app/chatgpt-auth';

export const dynamic = 'force-dynamic';

const response = (value: unknown, status = 200) =>
  Response.json(value, {
    status,

    headers: {
      'Cache-Control': 'no-store',

      'X-Content-Type-Options': 'nosniff',
    },
  });

const emailValid = (value: unknown): value is string =>
  typeof value === 'string' &&
  value.length <= 254 &&
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

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

    if (length > 16000) {
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
  const ip = request.headers.get('cf-connecting-ip') || 'local';

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
      'INSERT INTO rate_limits (key,hits,expires) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET hits=hits+1 RETURNING hits',
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

  if (action === 'catalog') return response({ products: await readCatalog() });

  if (action === 'admin') {
    if (!(await isAdmin()))
      return response({ error: 'Accès réservé à l’administration.' }, 403);

    const database = await db();

    const [alerts, contacts, overrides] = await Promise.all([
      database

        .prepare(
          "SELECT a.id,a.email,a.product_id,a.variant,a.created_at,a.unsubscribe_token,COALESCE(o.name,json_extract(c.payload,'$.name')) AS product_name,c.archived AS product_archived FROM alerts a LEFT JOIN catalog_entries c ON c.id=a.product_id LEFT JOIN product_overrides o ON o.product_id=a.product_id ORDER BY a.created_at DESC LIMIT 300",
        )

        .all(),

      database

        .prepare(
          'SELECT id,name,email,message,created_at FROM contacts ORDER BY created_at DESC LIMIT 300',
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
          "SELECT id FROM catalog_entries WHERE archived=1 AND (id=? OR json_extract(payload,'$.slug')=?) LIMIT 1",
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
        data.priceCents > 1000000 ||
        !Number.isInteger(data.internalStock) ||
        data.internalStock < 0 ||
        data.internalStock > 100000 ||
        ![0, 15].includes(data.plannedDiscount)
      )
        return response({ error: 'Vérifiez les champs du produit.' }, 400);

      const user = await getChatGPTUser();

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

      return response({ ok: true });
    }

    if (!['alerts', 'contact', 'unsubscribe'].includes(action))
      return response({ error: 'Ressource introuvable.' }, 404);

    if (!(await limit(request)))
      return response(
        {
          error:
            'Trop de demandes rapprochées. Réessayez dans une heure ou contactez-nous par e-mail.',
        },
        429,
      );

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

      await (
        await db()
      )

        .prepare(
          'INSERT INTO alerts (id,email,product_id,variant,created_at,consent_version,unsubscribe_token) VALUES (?,?,?,?,?,?,?) ON CONFLICT(email,product_id,variant) DO NOTHING',
        )

        .bind(
          crypto.randomUUID(),
          email,
          data.productId,
          data.variant,
          new Date().toISOString(),
          '2026-09-09',
          crypto.randomUUID(),
        )

        .run();

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

    await (
      await db()
    )

      .prepare(
        'INSERT INTO contacts (id,name,email,message,created_at) VALUES (?,?,?,?,?)',
      )

      .bind(
        crypto.randomUUID(),
        data.name.trim(),
        email,
        data.message.trim(),
        new Date().toISOString(),
      )

      .run();

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
  } catch (error) {
    if (error instanceof SyntaxError)
      return response({ error: 'Demande illisible. Réessayez.' }, 400);

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
