import { readFile, readdir, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { resolve, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const hash = data => createHash('sha256').update(data).digest('hex')
async function filesAt(root, dir = root) {
  const result = []
  for (const item of await readdir(dir, {withFileTypes:true})) {
    const path = resolve(dir,item.name)
    if (item.isSymbolicLink()) throw new Error('Build assets must not contain symlinks')
    if (item.isDirectory()) result.push(...await filesAt(root,path))
    else result.push(relative(root,path).split(sep).join('/'))
  }
  return result.sort()
}

export async function verifyWeb(directory, writeIntegrity = false) {
  const root = resolve(directory)
  const names = await filesAt(root)
  const html = await readFile(resolve(root,'index.html'),'utf8')
  for (const [, url] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    if (/^(https?:|data:|#)/.test(url)) continue
    const path = resolve(root,url.replace(/^\//,''))
    if (!path.startsWith(root+sep)) throw new Error('Unsafe asset URL: '+url)
    await readFile(path) // Missing entry bundles must fail the build.
  }
  const map = 'maps/scavc-sanxingdui-2024.jpg'
  const image = await readFile(resolve(root,map))
  const expected = await readFile(new URL('../../Frontend/public/'+map,import.meta.url))
  if (hash(image) !== hash(expected)) throw new Error('Campus map differs from the source image')
  const js = (await Promise.all(names.filter(n=>n.endsWith('.js')).map(n=>readFile(resolve(root,n),'utf8')))).join('\n')
  if (!js.includes('scavc-sanxingdui-2024.jpg') || js.includes('样例校园地图，可选择楼栋')) throw new Error('Campus map component is missing or outdated')
  const catalog = JSON.parse(await readFile(new URL('../../Frontend/src/data/scavc-stores.json',import.meta.url),'utf8'))
  if (catalog.stores.length !== 16) throw new Error('Expected 16 campus shop/stall entries; review this check when updating the catalog')
  for (const store of catalog.stores) if (!js.includes(store.name)) throw new Error('Missing bundled campus shop: '+store.name)
  const build = JSON.parse(await readFile(resolve(root,'build-info.json'),'utf8'))
  const manifest = await readFile(new URL('../AndroidManifest.xml',import.meta.url),'utf8')
  if (build.version !== manifest.match(/android:versionName="([^"]+)"/)?.[1]) throw new Error('Web and Android versions differ')
  if (!build.revision || !build.builtAt || typeof build.dirty !== 'boolean') throw new Error('Build provenance missing')
  if (!js.includes(build.revision) || !js.includes(build.builtAt)) throw new Error('Build metadata differs from bundled UI')
  if (writeIntegrity) {
    const files = {}
    for (const name of names.filter(n=>n!=='asset-integrity.json')) files[name] = hash(await readFile(resolve(root,name)))
    await writeFile(resolve(root,'asset-integrity.json'),JSON.stringify({version:1,files},null,2)+'\n')
  }
  return {version:build.version,revision:build.revision,dirty:build.dirty,shops:catalog.stores.length,mapSha256:hash(image)}
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (!process.argv[2]) throw new Error('Usage: node Android/scripts/verify-web.mjs <web-output> [--write-integrity]')
    console.log('Campus assets verified:',await verifyWeb(process.argv[2],process.argv.includes('--write-integrity')))
  } catch (e) { console.error('APK content verification failed:',e.message); process.exitCode=1 }
}
