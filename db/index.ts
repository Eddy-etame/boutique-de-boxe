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
}

/** Après un échec de connexion, on n’essaie plus pendant 30 s : une base morte coûte une tentative, pas une par page. */
export function rememberFailure() {
  globalThis.__boutiqueSqlFailedAt = Date.now();
}

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
    try {
      const rows = await executor.unsafe(this.text, this.params as never[]);
      globalThis.__boutiqueSqlFailedAt = undefined;
      return rows;
    } catch (error) {
      const code = (error as { code?: string }).code || '';
      // Connexion impossible ou base sans tables : on mémorise l’échec.
      if (/ECONN|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|CONNECT_TIMEOUT|42P01|28P01|3D000/.test(code) || /timeout|connect/i.test(String((error as Error).message))) rememberFailure();
      throw error;
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
