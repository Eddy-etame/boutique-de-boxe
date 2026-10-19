import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

/**
 * Accès Postgres (Supabase) et adaptateur compatible avec l’API D1 utilisée
 * par le code applicatif : prepare(sql).bind(...).first()/all()/run() et
 * batch([...]) exécuté dans une transaction.
 *
 * Les requêtes gardent leurs marqueurs « ? » ; ils sont convertis en $1…$n.
 */

type Row = Record<string, unknown>;

export type D1Result<T = Row> = {
  results: T[];
  success: true;
  meta: { changes: number };
};

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Row>(): Promise<T | null>;
  first<T = unknown>(column: string): Promise<T | null>;
  all<T = Row>(): Promise<D1Result<T>>;
  run<T = Row>(): Promise<D1Result<T>>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = Row>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
}

type Executor = postgres.Sql | postgres.TransactionSql;

const int8AsNumber = {
  to: 20,
  from: [20],
  serialize: (value: number | bigint | string) => String(value),
  parse: (value: string) => Number(value),
};

declare global {
  var __boutiqueSql: postgres.Sql | undefined;
  var __boutiqueSqlFailedAt: number | undefined;
  /** Le pooler a refusé le paramètre de démarrage statement_timeout : on s’en passe (le délai côté client reste). */
  var __boutiqueSqlPlainStartup: boolean | undefined;
}

/** Délai d’une requête (19/10, D16) : une requête bloquée ne retient plus un rendu ou un paiement sans limite. */
export const STATEMENT_TIMEOUT_MS = 8000;

/** Après un échec de connexion, on n’essaie plus pendant 30 s : une base morte coûte une tentative, pas une par page. */
export function rememberFailure() {
  globalThis.__boutiqueSqlFailedAt = Date.now();
}

/**
 * Le disjoncteur ne se déclenche que sur une connexion impossible (D16) : hôte introuvable, refusé,
 * délai de connexion, mot de passe refusé (28P01), base inconnue (3D000). Une requête annulée par
 * statement_timeout (57014), une table absente (42P01) ou une contrainte violée ne coupent plus la
 * base pour toute l’instance pendant 30 s.
 */
export const CONNECTION_FAILURE = /^(?:ECONNREFUSED|ENOTFOUND|EAI_AGAIN|ETIMEDOUT|CONNECT_TIMEOUT|28P01|3D000)$/;
export const isConnectionFailure = (error: unknown) => {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === 'string' && CONNECTION_FAILURE.test(code);
};
/** Un pooler (PgBouncer) qui refuse un paramètre de démarrage inconnu. */
const startupRefused = (error: unknown) =>
  /unsupported startup parameter|statement_timeout/i.test(String((error as Error | null)?.message ?? ''));

export function sqlClient(): postgres.Sql {
  if (globalThis.__boutiqueSqlFailedAt && Date.now() - globalThis.__boutiqueSqlFailedAt < 30_000) {
    throw new Error('Base indisponible (nouvel essai dans quelques secondes).');
  }
  if (!globalThis.__boutiqueSql) {
    const url = process.env.DATABASE_URL?.trim();
    if (!url) {
      throw new Error(
        'DATABASE_URL manquante : renseignez la chaîne de connexion Postgres (Supabase) dans l’environnement.',
      );
    }
    const local = /localhost|127\.0\.0\.1/.test(url);
    globalThis.__boutiqueSql = postgres(url, {
      prepare: false,
      max: 4,
      idle_timeout: 20,
      connect_timeout: 4,
      ssl: local ? undefined : 'require',
      types: { int8AsNumber },
      // Côté serveur quand la connexion l’accepte (directe, locale) ; le pooler en mode transaction ne
      // garde pas les réglages de session : le délai côté client (Statement.execute) vaut partout.
      ...(globalThis.__boutiqueSqlPlainStartup ? {} : { connection: { statement_timeout: STATEMENT_TIMEOUT_MS } }),
    });
  }
  return globalThis.__boutiqueSql;
}

export function getDb() {
  return drizzle(sqlClient(), { schema });
}

export function toPositionalParameters(query: string): string {
  let out = '';
  let index = 0;
  let inString = false;
  for (let i = 0; i < query.length; i++) {
    const ch = query[i];
    if (ch === "'") {
      inString = !inString;
      out += ch;
      continue;
    }
    if (ch === '?' && !inString) {
      index += 1;
      out += '$' + index;
      continue;
    }
    out += ch;
  }
  return out;
}

class Statement implements D1PreparedStatement {
  constructor(
    private readonly executor: Executor,
    private readonly text: string,
    private readonly params: unknown[] = [],
  ) {}

  bind(...values: unknown[]): D1PreparedStatement {
    return new Statement(this.executor, this.text, values);
  }

  withExecutor(executor: Executor): Statement {
    return new Statement(executor, this.text, this.params);
  }

  private async execute(executor: Executor = this.executor) {
    const query = executor.unsafe(this.text, this.params as never[]);
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      // Filet côté client : au-delà du délai (+ une marge pour le délai du serveur), la requête est
      // annulée et la promesse rejetée avec le code de Postgres (57014), qui ne coupe pas la base.
      const rows = await Promise.race([
        query,
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            try {
              query.cancel();
            } catch {
              /* déjà terminée */
            }
            reject(Object.assign(new Error('canceling statement due to statement timeout (client)'), { code: '57014' }));
          }, STATEMENT_TIMEOUT_MS + 1000);
        }),
      ]);
      globalThis.__boutiqueSqlFailedAt = undefined;
      return rows;
    } catch (error) {
      if (!globalThis.__boutiqueSqlPlainStartup && startupRefused(error) && !isConnectionFailure(error)) {
        // Le pooler refuse statement_timeout au démarrage : client refait sans ce paramètre, sans disjoncter.
        globalThis.__boutiqueSqlPlainStartup = true;
        const old = globalThis.__boutiqueSql;
        globalThis.__boutiqueSql = undefined;
        void old?.end({ timeout: 1 }).catch(() => undefined);
      } else if (isConnectionFailure(error)) rememberFailure();
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  async first<T = Row>(column?: string): Promise<T | null> {
    const rows = await this.execute();
    const row = rows[0] as Row | undefined;
    if (!row) return null;
    if (column !== undefined) return (row[column] as T) ?? null;
    return row as unknown as T;
  }

  async all<T = Row>(): Promise<D1Result<T>> {
    return this.collect<T>(await this.execute());
  }

  async run<T = Row>(): Promise<D1Result<T>> {
    return this.collect<T>(await this.execute());
  }

  async runOn<T = Row>(executor: Executor): Promise<D1Result<T>> {
    return this.collect<T>(await this.execute(executor));
  }

  private collect<T>(rows: postgres.RowList<postgres.Row[]>): D1Result<T> {
    return {
      results: [...rows] as unknown as T[],
      success: true,
      meta: { changes: rows.count },
    };
  }
}

export function d1Compat(): D1Database {
  const sql = sqlClient();
  return {
    prepare(query: string) {
      return new Statement(sql, toPositionalParameters(query));
    },
    async batch<T = Row>(statements: D1PreparedStatement[]) {
      return sql.begin(async (tx) => {
        const out: D1Result<T>[] = [];
        for (const statement of statements) {
          out.push(await (statement as Statement).runOn<T>(tx));
        }
        return out;
      }) as Promise<D1Result<T>[]>;
    },
  };
}
