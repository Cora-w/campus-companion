import { createServer } from 'node:http'
import { createReadStream, statSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
const manifest = readFileSync(new URL('../AndroidManifest.xml', import.meta.url), 'utf8')
const version = manifest.match(/android:versionName="(\d+\.\d+\.\d+)"/)?.[1]
if (!version) throw new Error('Invalid application version')
const filename = `campus-companion-${version}.apk`
const apk = fileURLToPath(new URL(`../../Releases/${filename}`, import.meta.url))
const size = statSync(apk).size
const page = `<!doctype html><html lang="zh-CN"><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>心伙伴 · 安卓体验版</title><style>body{font-family:system-ui,sans-serif;background:#faf9f6;color:#302b27;max-width:420px;margin:60px auto;padding:24px;line-height:1.8}h1{margin:0}a{display:block;background:#98563f;color:white;text-align:center;padding:14px;border-radius:12px;text-decoration:none;margin:28px 0}small{color:#777}</style><h1>心伙伴</h1><p>校园生活，随时相伴。<br>安卓三端体验版 · ${version}</p><a href="/${filename}">下载安装包</a><p>账号：<b>S-DEMO-01</b><br>密码：<b>Demo@2026</b></p><small>Android 8.0 及以上。安装时可能需要允许当前浏览器安装应用。此版本为前端演示，部分图片需要联网。</small></html>`
createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405).end(); return }
  if (req.url === `/${filename}`) {
    res.writeHead(200, { 'Content-Type': 'application/vnd.android.package-archive', 'Content-Disposition': `attachment; filename="${filename}"`, 'Content-Length': size })
    if (req.method === 'HEAD') res.end()
    else createReadStream(apk).pipe(res)
  } else if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(req.method === 'HEAD' ? undefined : page)
  } else { res.writeHead(404).end('Not found') }
}).listen(8181, '0.0.0.0', () => console.log('APK download available on port 8181'))
