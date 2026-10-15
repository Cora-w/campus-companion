import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createMockAuth} from '../src/mocks/auth.ts'
import {registeredAccounts} from '../src/mocks/registeredAccounts.ts'
import {initialAccounts} from '../src/data/data.ts'
import {createRemoteAuth} from '../src/api/auth.ts'
import {createHttpClient} from '../src/api/http.ts'
const data=new Map();Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value)}})
const input={schoolId:'sichuan-aerospace-polytechnic',account:'new_student',nickname:'注册同学',password:'CampusTest2026',phone:'13800000000',verificationId:'server-challenge',verificationCode:'123456'}
const verified=async(auth,overrides={})=>{const draft={...input,...overrides};const challenge=await auth.requestRegistrationCode(draft);return {...draft,verificationId:challenge.verificationId,verificationCode:challenge.demoCode}}

test('registration persists salted credentials, always creates student and supports fresh login',async()=>{
 data.clear();const auth=createMockAuth(()=>initialAccounts)
 const session=await auth.register({...await verified(auth),role:'admin'})
 assert.equal(session.role,'student');assert.equal(session.name,input.nickname)
 assert.ok(![...data.values()].some(value=>value.includes(input.password)))
 assert.equal(registeredAccounts().length,1)
 const restored=createMockAuth(()=>initialAccounts)
 assert.equal((await restored.login(input)).id,session.id)
 await assert.rejects(restored.login({...input,password:'wrong'}),/密码不匹配/)
 await assert.rejects(restored.register(await verified(restored)),/已注册/)
 const disabled=createMockAuth(()=>[...initialAccounts,...registeredAccounts().map(a=>({...a,enabled:false}))])
 await assert.rejects(disabled.login(input),/已停用/)
 const other=await restored.register(await verified(restored,{schoolId:'qinghe-demo-university'}));assert.notEqual(other.id,session.id)
})
test('reserved credentials, invalid fields, unknown schools and storage failures cannot register',async()=>{
 data.clear();const auth=createMockAuth(()=>initialAccounts)
 await assert.rejects(auth.register({...input,account:'20262001'}),/已存在/)
 await assert.rejects(auth.register({...input,password:'12345678'}),/字母和数字/)
 await assert.rejects(auth.register({...input,verificationId:''}),/先获取/)
 await assert.rejects(auth.register({...input,verificationCode:''}),/6 位手机验证码/)
 await assert.rejects(auth.register({...input,phone:'123'}),/正确的中国大陆/)
 await assert.rejects(auth.register({...input,schoolId:'unknown'}),/学校不存在/)
 const valid=await verified(auth);const normal=localStorage.setItem;localStorage.setItem=()=>{throw Error('full')}
 try{await assert.rejects(auth.register(valid),/无法保存注册账号/);assert.equal(registeredAccounts().length,0)}finally{localStorage.setItem=normal}
})
test('remote registration sends no role and rejects privileged or cross-school sessions',async()=>{
 const calls=[];let user={id:'registered-remote',nickname:'注册同学',role:'student',schoolId:input.schoolId}
 const client=createHttpClient('/api/v1',async(url,options)=>{calls.push({url,body:JSON.parse(options.body)});return new Response(JSON.stringify({user,accessToken:'sample'}),{headers:{'Content-Type':'application/json'}})})
 const auth=createRemoteAuth(client);assert.equal((await auth.register({...input,role:'admin'})).role,'student')
 assert.equal(calls[0].url,'/api/v1/auth/register');assert.equal(calls[0].body.role,undefined)
 user={...user,role:'admin'};await assert.rejects(auth.register(input),/注册响应格式/);assert.equal(client.getToken(),null)
 user={...user,role:'student',schoolId:'other'};await assert.rejects(auth.register(input),/注册响应格式/)
})
