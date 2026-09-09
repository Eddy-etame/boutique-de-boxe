import { categories, type Product } from './catalog';
export function validateProduct(input: unknown): Product {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new Error('Produit invalide.');
  const p = input as Record<string, unknown>;
  const text = (key: string, min: number, max: number) => {
    const v = p[key];
    if (typeof v !== 'string' || v.trim().length < min || v.length > max)
      throw new Error('Champ produit invalide : ' + key);
    return v.trim();
  };
  const id = text('id', 3, 100),
    slug = text('slug', 3, 140);
  if (
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
  )
    throw new Error('Identifiant ou URL invalide.');
  const category = text('category', 3, 80);
  const families = new Set(categories.flatMap((c) => c.families));
  if (!families.has(category)) throw new Error('Famille invalide.');
  if (
    !Number.isInteger(p.price) ||
    Number(p.price) < 0 ||
    Number(p.price) > 1000000
  )
    throw new Error('Prix invalide.');
  if (
    !Array.isArray(p.sizes) ||
    p.sizes.length > 40 ||
    p.sizes.some((s) => typeof s !== 'string' || s.length > 60 || !s.trim())
  )
    throw new Error('Déclinaisons invalides.');
  if (!Array.isArray(p.images) || !p.images.length || p.images.length > 8)
    throw new Error('Ajoutez de 1 à 8 photos.');
  const imageUrl = (v: unknown) => {
    if (typeof v !== 'string' || v.length > 1800)
      throw new Error('URL image invalide.');
    if (/^\/products\/[a-z0-9-]+-(480|960)\.webp$/.test(v)) return v;
    let u: URL;
    try {
      u = new URL(v);
    } catch {
      throw new Error('URL image invalide.');
    }
    if (
      u.protocol !== 'https:' ||
      u.username ||
      u.password ||
      !/\.(webp|png|jpe?g)(?:$|\?)/i.test(u.pathname + u.search)
    )
      throw new Error('Utilisez une image HTTPS JPG, PNG ou WebP.');
    return v;
  };
  const images = p.images.map((i) => {
    if (!i || typeof i !== 'object') throw new Error('Photo invalide.');
    const x = i as Record<string, unknown>;
    if (typeof x.alt !== 'string' || x.alt.length > 250 || !x.alt.trim())
      throw new Error('Décrivez chaque photo.');
    return {
      src: imageUrl(x.src),
      small: imageUrl(x.small || x.src),
      width: 960,
      height: 960,
      alt: x.alt.trim(),
    };
  });
  if (
    !p.specs ||
    typeof p.specs !== 'object' ||
    Array.isArray(p.specs) ||
    Object.keys(p.specs).length > 30 ||
    Object.entries(p.specs).some(
      ([k, v]) =>
        !k || k.length > 80 || typeof v !== 'string' || v.length > 600,
    )
  )
    throw new Error('Caractéristiques invalides.');
  if (
    !Array.isArray(p.notes) ||
    p.notes.length > 8 ||
    p.notes.some((n) => typeof n !== 'string' || n.length > 800)
  )
    throw new Error('Notes invalides.');
  const audience = text('audience', 3, 30);
  if (!['adulte', 'enfant', 'femme', 'mixte', 'tous'].includes(audience))
    throw new Error('Public invalide.');
  return {
    id,
    slug,
    name: text('name', 3, 180),
    brand: text('brand', 2, 100),
    category,
    price: Number(p.price),
    short: text('short', 20, 300),
    description: text('description', 30, 8000),
    care: typeof p.care === 'string' ? p.care.slice(0, 1800) : '',
    use: typeof p.use === 'string' ? p.use.slice(0, 1800) : '',
    sizes: [...new Set(p.sizes.map((s) => s.trim()))],
    specs: p.specs as Record<string, string>,
    images,
    notes: p.notes as string[],
    audience,
    status: 'upcoming',
    sourceRef: text('sourceRef', 2, 100),
    dateAdded: new Date().toISOString().slice(0, 10),
  };
}
