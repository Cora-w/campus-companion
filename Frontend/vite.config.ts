import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const manifest = readFileSync(new URL('../Android/AndroidManifest.xml', import.meta.url), 'utf8')
const version = manifest.match(/android:versionName="([^"]+)"/)?.[1]
if (!version) throw new Error('Android version is missing')
let revision = 'source-archive'
let dirty = false
try {
  revision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd:root, encoding:'utf8', stdio:['ignore','pipe','ignore'] }).trim()
  dirty = !!execFileSync('git', ['status', '--porcelain', '--', 'Frontend', 'Android'], { cwd:root, encoding:'utf8' }).trim()
} catch { /* Source ZIP builds are explicitly labeled, never guessed. */ }
const buildInfo = { version, revision, dirty, builtAt:new Date().toISOString() }

export default defineConfig({
  plugins: [react(), {
    name: 'campus-build-info',
    generateBundle() { this.emitFile({type:'asset',fileName:'build-info.json',source:JSON.stringify(buildInfo,null,2)}) },
  }],
  define: { __CAMPUS_BUILD_INFO__: JSON.stringify(buildInfo) },
})
