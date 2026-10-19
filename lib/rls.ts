import type { D1Database } from '@/db';

/**
 * Sécurité par ligne (RLS) des tables créées au premier usage (19/10).
 *
 * Supabase ouvre par défaut le schéma public à son API REST (clés anon et authenticated) : une table
 * sans RLS y est lisible et modifiable par quiconque détient la clé anon. Activée sans aucune règle,
 * la RLS ferme cette API ; le serveur, lui, passe par la connexion Postgres directe (DATABASE_URL),
 * propriétaire des tables, que la RLS n'arrête pas — comme pour les tables des migrations.
 *
 * Idempotent et sans verrou inutile : on ne lance ALTER TABLE (verrou exclusif) que sur les tables
 * qui existent et n'ont pas encore la RLS. Une erreur est journalisée, jamais remontée : la
 * connexion de l'équipe ou l'envoi d'un e-mail ne doivent pas tomber pour autant.
 */
const NOM = /^[a-z_][a-z0-9_]*$/;

export async function activerRls(database: D1Database, tables: readonly string[]) {
  const noms = tables.filter((t) => NOM.test(t));
  if (!noms.length) return;
  try {
    const sansRls = await database
      .prepare(`SELECT relname FROM pg_class WHERE oid IN (${noms.map((t) => `to_regclass('${t}')`).join(',')}) AND NOT relrowsecurity`)
      .all<{ relname: string }>();
    for (const { relname } of sansRls.results)
      if (noms.includes(relname)) await database.prepare(`ALTER TABLE ${relname} ENABLE ROW LEVEL SECURITY`).run();
  } catch (error) {
    console.error('RLS non activée', noms.join(','), (error as { code?: string }).code || (error as Error).name);
  }
}
