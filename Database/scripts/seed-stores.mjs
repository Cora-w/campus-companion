import pg from 'pg';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Add-only import: repeated runs preserve merchant edits and never duplicate rows.
export async function seedStores(db) {
  const data = JSON.parse(await readFile(new URL('../db/seeds/scavc-stores.json', import.meta.url), 'utf8'));
  let inserted = 0;
  await db.query('BEGIN');
  try {
    await db.query("SELECT pg_advisory_xact_lock(hashtext('scavc-store-directory-seed'))");
    for (const venue of data.venues) {
      const slug = `scavc-${venue.key}`;
      const photo = data.images.food;
      await db.query(`INSERT INTO app.places(slug,name,category,summary,description,address,cover_url,gallery)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(slug) DO NOTHING`,
        [slug,venue.name,venue.key === 'sports' ? '校园商业配套' : '校园食堂',venue.description,
          `${venue.description}\n${data.source_note}`,venue.address,photo.url,JSON.stringify([photo])]);
      const place = (await db.query('SELECT id FROM app.places WHERE slug=$1',[slug])).rows[0];
      for (const store of data.stores.filter(s => s.venue === venue.key)) {
        const image = data.images[store.image];
        const location = [venue.name,venue.address,store.floor ? `${store.floor}楼` : '',store.room ? `${store.room}号` : ''].filter(Boolean).join(' · ');
        const result = await db.query(`INSERT INTO app.stores
          (seed_key,place_id,name,store_type,description,location,category,floor,room_number,cover_url,image_credit,source_note)
          VALUES($1,$2,$3,'campus_store',$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT(seed_key) DO NOTHING`,
          [`${slug}-${store.key}`,place.id,store.name,store.description,location,store.category,store.floor,store.room,
            image.url,JSON.stringify(image),`${data.source_note} 记录类型：${store.kind === 'shop' ? '具名店铺' : '未命名档口分组'}。`]);
        inserted += result.rowCount;
      }
    }
    await db.query('COMMIT');
    return { venues: data.venues.length, stores: data.stores.length, inserted };
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (!process.env.ADMIN_DATABASE_URL) throw new Error('Missing ADMIN_DATABASE_URL');
  const db = new pg.Client({ connectionString: process.env.ADMIN_DATABASE_URL });
  await db.connect();
  try { console.log(await seedStores(db)); } finally { await db.end(); }
}
