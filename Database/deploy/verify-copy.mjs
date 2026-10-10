import pg from 'pg';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { readConfig, validateConfig } from '../scripts/config.mjs';

const [action, file] = process.argv.slice(2);
if (!['capture', 'verify'].includes(action) || !file) throw new Error('Usage: node deploy/verify-copy.mjs capture|verify <manifest.json>');
const c = validateConfig(readConfig());
const db = new pg.Client({ connectionString: c.ADMIN_DATABASE_URL, connectionTimeoutMillis: 10000 });
const quote = name => '"' + name.replaceAll('"', '""') + '"';
try {
  await db.connect();
  await db.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  await db.query("SET LOCAL timezone='UTC'; SET LOCAL datestyle='ISO, YMD'; SET LOCAL intervalstyle='postgres'; SET LOCAL bytea_output='hex'; SET LOCAL extra_float_digits=3");
  const tables = {};
  const names = (await db.query("SELECT tablename FROM pg_tables WHERE schemaname='app' ORDER BY tablename")).rows;
  for (const { tablename } of names) {
    if (tablename === 'auth_sessions') continue; // Restore deliberately invalidates login sessions.
    const rows = (await db.query(`SELECT encode(sha256(convert_to(row_to_json(t)::text,'UTF8')),'hex') AS hash FROM app.${quote(tablename)} t ORDER BY hash`)).rows;
    tables[tablename] = { rows: rows.length, sha256: createHash('sha256').update(rows.map(r => r.hash).join('\n')).digest('hex') };
  }
  const sequences = (await db.query("SELECT sequencename,last_value::text FROM pg_sequences WHERE schemaname='app' ORDER BY sequencename")).rows;
  const manifest = { version: 1, tables, sequences };
  if (action === 'capture') {
    await writeFile(file, JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    console.log(`Captured integrity hashes for ${names.length} tables (login sessions excluded).`);
  } else {
    const expected = JSON.parse(await readFile(file, 'utf8'));
    if (JSON.stringify(expected) !== JSON.stringify(manifest)) throw new Error('Database content or sequence values differ from the source snapshot');
    const sessions = (await db.query('SELECT count(*)::int AS n FROM app.auth_sessions')).rows[0].n;
    if (sessions !== 0) throw new Error('Restored login sessions were not invalidated');
    console.log(`Verified all ${names.length} tables: business rows, ciphertext and sequences match; login sessions invalidated.`);
  }
  await db.query('COMMIT');
} catch (error) {
  await db.query('ROLLBACK').catch(() => {});
  console.error(error.code ? `Integrity check failed (${error.code}).` : error.message);
  process.exitCode = 1;
} finally {
  await db.end();
}
