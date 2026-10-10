import pg from 'pg';
import { readConfig, validateConfig } from '../scripts/config.mjs';

const c = validateConfig(readConfig());
const url = new URL(c.ADMIN_DATABASE_URL);
url.pathname = '/postgres';
const db = new pg.Client({ connectionString: url.toString(), connectionTimeoutMillis: 10000 });
const identifier = value => '"' + value.replaceAll('"', '""') + '"';
const literal = value => "'" + value.replaceAll("'", "''") + "'";
try {
  await db.connect();
  await db.query('BEGIN');
  await db.query("SELECT pg_advisory_xact_lock(hashtext('project-database-bootstrap'))");
  await db.query('SET standard_conforming_strings = on');
  for (const [role, password] of [['app_backend', c.BACKEND_DB_PASSWORD], ['app_agent', c.AGENT_DB_PASSWORD]]) {
    if ((await db.query('SELECT 1 FROM pg_roles WHERE rolname=$1', [role])).rowCount) {
      throw new Error('Deployment bootstrap requires a new cluster without application roles');
    }
    await db.query(`CREATE ROLE ${identifier(role)} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD ${literal(password)}`);
  }
  await db.query('COMMIT');
  console.log('Created restricted application roles; passwords hidden.');
} catch (error) {
  await db.query('ROLLBACK').catch(() => {});
  console.error(`Role bootstrap failed (${error.code ?? 'configuration/cluster validation'}).`);
  process.exitCode = 1;
} finally {
  await db.end();
}
