// Postgres local pour le développement et les tests, sans Docker.
// Démarre une instance embarquée sur le port 54329 et crée la base `boutique`.
// DATABASE_URL correspondante : postgres://postgres:postgres@127.0.0.1:54329/boutique
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import EmbeddedPostgres from 'embedded-postgres';

const port = Number(process.env.LOCAL_PG_PORT || 54329);
const databaseDir = resolve('.postgres-local');
const pg = new EmbeddedPostgres({
  databaseDir,
  user: 'postgres',
  password: 'postgres',
  port,
  persistent: true,
});

if (!existsSync(resolve(databaseDir, 'PG_VERSION'))) {
  console.log('Initialisation du cluster local dans', databaseDir);
  await pg.initialise();
}
await pg.start();
try {
  await pg.createDatabase('boutique');
  console.log('Base `boutique` créée.');
} catch {
  console.log('Base `boutique` déjà présente.');
}
console.log(
  `Postgres local prêt : postgres://postgres:postgres@127.0.0.1:${port}/boutique`,
);
console.log('Ctrl+C pour arrêter.');

const stop = async () => {
  await pg.stop();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
setInterval(() => {}, 1 << 30);
