import { writeFile } from 'node:fs/promises'
const targets=await (await fetch('http://127.0.0.1:9333/json')).json()
const ws=new WebSocket(targets.find(x=>x.type==='page').webSocketDebuggerUrl)
await new Promise(r=>ws.addEventListener('open',r,{once:true}))
let id=0;const pending=new Map();const browserErrors=[]
ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.method==='Runtime.exceptionThrown')browserErrors.push(JSON.stringify(m.params.exceptionDetails));if(m.id){const p=pending.get(m.id);pending.delete(m.id);if(m.error)p.reject(m.error);else p.resolve(m.result)}})
const call=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}))})
const ev=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value}
const wait=(ms=250)=>new Promise(r=>setTimeout(r,ms))
const click=async text=>{
 if(['学生','心理教师','管理员'].includes(text) && await ev("!!document.querySelector('[name=login-role]')")){const value={'学生':'student','心理教师':'teacher','管理员':'admin'}[text];await ev(`document.querySelector('input[name="login-role"][value="${value}"]').click()`);await wait();return}

 if(/^以.+身份体验/.test(text)){await click(text.includes('心理教师')?'心理教师':text.includes('管理员')?'管理员':'学生');await click('演示账号 查看');await click('填入演示账号');text='登录'}

 const find=`(()=>{const bs=[...document.querySelectorAll('button')].filter(b=>b.getClientRects().length);return bs.find(x=>x.getAttribute('aria-label')===${JSON.stringify(text)})||bs.find(x=>x.textContent.replace(/\\s/g,'')===${JSON.stringify(text.replace(/\s/g,''))})})()`
 let ready=false
 for(let i=0;i<50;i++){if(await ev(`!!${find}`)){ready=true;break}await wait(100)}
 if(!ready)throw Error('Missing after waiting: '+text)
 await ev(`(()=>{const el=${find};if(el.disabled)throw Error('Disabled button');el.click()})()`);await wait()
}
const fill=async(selector,value)=>{await ev(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing input');Object.getOwnPropertyDescriptor(e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))})()`);await wait()}
const check=async(expression,label)=>{if(!await ev(expression))throw Error('Failed: '+label);console.log('PASS '+label)}
const consent=async()=>{await ev("document.querySelector('input[type=checkbox]').click()");await wait()}
const close=async()=>{await ev("document.querySelector('.ant-drawer-open .ant-drawer-close').click()");await wait(500)}
const shot=async name=>{await wait(500);await writeFile(`qa/screenshots/${name}.png`,Buffer.from((await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data,'base64'))}
const resize=async(w,h=844)=>{await call('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile:true});await wait()}
const select=async(label,choice)=>{await ev(`document.querySelector('[aria-label="${label}"]').closest('.ant-select').querySelector('.ant-select-content').dispatchEvent(new MouseEvent('mousedown',{bubbles:true}))`);await wait();await ev(`document.querySelector('.ant-select-dropdown:not(.ant-select-dropdown-hidden) [title="${choice}"]').click()`);await wait()}






await call('Runtime.enable');await call('Page.enable');await resize(390,844);await call('Page.navigate',{url:'http://127.0.0.1:5174'});await wait(1500);await consent();await click('以学生身份体验 →');await click('发布');
for(const [width,height] of [[390,844],[375,667],[320,568]]){
 await resize(width,height);
 await check("(()=>{const f=document.querySelector('.compose-fields');return f.scrollHeight<=f.clientHeight+1})()",'all editing fields fit '+width+'x'+height);
 await check("(()=>{const a=document.querySelector('.compose-publish-bar').getBoundingClientRect();const n=document.querySelector('.bottom-nav').getBoundingClientRect();return a.top>0&&a.bottom<=n.top+1})()",'draft and publish visible '+width+'x'+height);
 await check('document.documentElement.scrollWidth<=innerWidth','no page overflow '+width);
}
await resize(390,844);await shot('publish-compact-empty');
await ev(`window.locationRequests=0;window.geoRequests=0;window.realFetch=window.fetch;window.fetch=async(url,...args)=>{if(!String(url).includes('photon.komoot.io'))return window.realFetch(url,...args);window.locationRequests++;window.lastPlaceUrl=String(url);if(window.placeFailure)throw new TypeError('offline');return new Response(JSON.stringify({features:[{properties:{osm_type:'N',osm_id:1,name:'测试大学图书馆',city:'测试市',street:'大学路'},geometry:{coordinates:[121.4738,31.2305]}},{properties:{osm_type:'N',osm_id:2,name:'测试大学第一食堂',city:'测试市',street:'校园东路'},geometry:{coordinates:[121.474,31.231]}}]}),{status:200,headers:{'Content-Type':'application/json'}})};navigator.geolocation.getCurrentPosition=(ok,fail)=>{window.geoRequests++;if(window.denyGeo)fail({code:1});else ok({coords:{latitude:31.2304,longitude:121.4737,accuracy:35}})}`);
await click('所在位置');await check('window.geoRequests===0&&window.locationRequests===0','opening picker does not locate or transmit');
await click('定位并查找附近地点');await wait(400);
await check("window.lastPlaceUrl.includes('/reverse/')&&document.querySelectorAll('.location-results button').length===2",'location fetch populates nearby places');
await check("document.querySelector('.publish-locate').textContent.includes('35 米')",'accuracy shown');
await ev("document.querySelector('.location-results button').click()");await fill('#post-location-detail','三楼 · 东侧自习室');await shot('publish-location-picker');await click('确认位置');
await check("document.querySelector('.compose-location-row').textContent.includes('测试大学图书馆 · 三楼 · 东侧自习室')",'specific location confirmed');
await click('所在位置');await fill('[aria-label="搜索地点"]','咖啡馆');await click('搜索');await check("window.lastPlaceUrl.includes('/api/')&&window.lastPlaceUrl.includes('q=')",'manual place search');await close();
await check("document.querySelector('.compose-location-row').textContent.includes('测试大学图书馆')",'cancel preserves selected place');
await click('所在位置');await ev('window.denyGeo=true');await click('定位并查找附近地点');await check("document.querySelector('[role=alert]').textContent.includes('未获得定位许可')",'permission denial explained');await fill('#post-location','校门口咖啡店');await click('确认位置');
await click('所在位置');await ev('window.denyGeo=false;window.placeFailure=true');await click('定位并查找附近地点');await check("document.querySelector('[role=alert]').textContent.includes('手动填写')",'network failure has manual fallback');await fill('#post-location','第一食堂');await fill('#post-location-detail','二楼 06 窗口');await click('确认位置');
await fill('#post-title','紧凑发布测试');await fill('#post-text','下课后来这里吃一碗面。');await shot('publish-compact-filled');await click('存草稿');await click('发布');await check("document.querySelector('.compose-location-row').textContent.includes('第一食堂 · 二楼 06 窗口')",'draft retains detailed place');
await click('预览');await check("document.querySelector('.compose-preview-location').textContent.includes('第一食堂 · 二楼 06 窗口')",'preview shows confirmed location');await click('确认发布');await check("document.querySelector('.wall-post .post-location').textContent.includes('第一食堂 · 二楼 06 窗口')",'published place matches');
await click('发布');await click('所在位置');await fill('#post-location','不保存的地点');await click('不显示位置');await check("document.querySelector('.compose-location-row').textContent.includes('选择附近地点')",'clear location');
await check('window.geoRequests===3','only explicit locate actions request position');
if(browserErrors.length)throw Error(browserErrors.join('\n'));ws.close();
