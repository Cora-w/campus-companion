import assert from 'node:assert/strict'
import { installViewportTracking } from '../src/layout/viewport.ts'
const styles = new Map(); let writes=0; let next=0; const frames=new Map()
const root={clientHeight:844,clientWidth:390,dataset:{},style:{getPropertyValue:n=>styles.get(n)||'',setProperty:(n,v)=>{styles.set(n,v);writes++},removeProperty:n=>styles.delete(n)}}
const viewport=Object.assign(new EventTarget(),{height:844,offsetTop:0,scale:1})
globalThis.document=Object.assign(new EventTarget(),{documentElement:root,activeElement:null})
globalThis.window=Object.assign(new EventTarget(),{visualViewport:viewport,innerHeight:844,matchMedia:()=>({matches:true})})
globalThis.requestAnimationFrame=fn=>{frames.set(++next,fn);return next}
globalThis.cancelAnimationFrame=id=>frames.delete(id)
const flush=()=>{const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn())}
const stop=installViewportTracking()
for(const height of [760,640,510,490,510,640,760,844]){viewport.height=height;viewport.dispatchEvent(new Event('resize'));viewport.dispatchEvent(new Event('scroll'));assert.equal(frames.size,1);flush();assert.equal(styles.get('--viewport-height'),'844px');assert.equal(styles.get('--overlay-viewport-height'),height+'px');assert.equal(styles.get('--overlay-bottom'),(844-height)+'px')}
viewport.height=500;viewport.offsetTop=40;viewport.dispatchEvent(new Event('scroll'));flush();assert.equal(styles.get('--overlay-bottom'),'304px')
const oldWrites=writes;viewport.dispatchEvent(new Event('resize'));flush();assert.equal(writes,oldWrites)
viewport.scale=2;viewport.height=250;viewport.dispatchEvent(new Event('resize'));flush();assert.equal(writes,oldWrites)
viewport.scale=1;viewport.offsetTop=0;root.clientHeight=390;viewport.height=390;window.dispatchEvent(new Event('resize'));flush();assert.equal(styles.get('--viewport-height'),'390px');assert.equal(styles.get('--overlay-bottom'),'0px')

// Keyboard visibility depends on text focus, not just a viewport resize.
root.clientHeight=844;viewport.height=844;viewport.dispatchEvent(new Event('resize'));flush();
document.activeElement={matches:()=>true};document.dispatchEvent(new Event('focusin'));flush();
assert.equal(root.dataset.keyboardOpen,'false');
viewport.height=480;viewport.dispatchEvent(new Event('resize'));flush();assert.equal(root.dataset.keyboardOpen,'true');
document.activeElement=null;document.dispatchEvent(new Event('focusout'));flush();assert.equal(root.dataset.keyboardOpen,'true');
viewport.height=844;viewport.dispatchEvent(new Event('resize'));flush();assert.equal(root.dataset.keyboardOpen,'false');
document.activeElement={matches:()=>true};document.dispatchEvent(new Event('focusin'));flush();
for(const height of [800,760,720,680,600,480]){root.clientHeight=height;viewport.height=height;viewport.dispatchEvent(new Event('resize'));flush()}
assert.equal(root.dataset.keyboardOpen,'true');
root.clientHeight=844;viewport.height=844;viewport.dispatchEvent(new Event('resize'));flush();assert.equal(root.dataset.keyboardOpen,'false');
document.activeElement=null;
viewport.dispatchEvent(new Event('resize'));stop();assert.equal(frames.size,0);assert.equal(styles.size,0);viewport.dispatchEvent(new Event('resize'));assert.equal(frames.size,0)
window.visualViewport=null;root.clientHeight=600;const stopFallback=installViewportTracking();assert.equal(styles.get('--viewport-height'),'600px');assert.equal(styles.get('--overlay-bottom'),'0px');stopFallback()
console.log('PASS keyboard open/close, pan, event coalescing, unchanged geometry, zoom, rotation, cleanup and fallback')
