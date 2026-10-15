import{test}from'node:test'
import assert from'node:assert/strict'
import{createRegistrationCodes}from'../src/mocks/registrationCodes.ts'
import{createRemoteAuth}from'../src/api/auth.ts'
import{createHttpClient}from'../src/api/http.ts'
const contact={phone:'13800000000',schoolId:'school-a'}
test('codes expire, throttle resend, bind phone and school, and cannot be reused',()=>{
 let now=0;const codes=createRegistrationCodes(()=>now),one=codes.request(contact)
 const input={...contact,verificationId:one.verificationId,verificationCode:one.demoCode}
 assert.throws(()=>codes.request(contact),/频繁/)
 assert.throws(()=>codes.verify({...input,phone:'13900000000'}),/已更换/)
 assert.throws(()=>codes.verify({...input,schoolId:'school-b'}),/已更换/)
 const lease=codes.verify(input);assert.throws(()=>codes.verify(input),/重复提交/);lease.release()
 codes.verify(input).complete();assert.throws(()=>codes.verify(input),/已失效/)
 now=61000;const two=codes.request(contact);now+=300001;assert.throws(()=>codes.verify({...input,verificationId:two.verificationId,verificationCode:two.demoCode}),/失效/)
})
test('replacement invalidates previous code and five wrong attempts lock verification',()=>{
 let now=0;const codes=createRegistrationCodes(()=>now),old=codes.request(contact);now=61000;const next=codes.request(contact)
 assert.throws(()=>codes.verify({...contact,verificationId:old.verificationId,verificationCode:old.demoCode}),/失效/)
 const input={...contact,verificationId:next.verificationId,verificationCode:String((Number(next.demoCode)+1)%1000000).padStart(6,'0')}
 for(let n=0;n<5;n++)assert.throws(()=>codes.verify(input),/不正确/)
 assert.throws(()=>codes.verify({...input,verificationCode:next.demoCode}),/错误次数过多/)
})
test('production code requests never expose a demo code to UI',async()=>{
 let body;const client=createHttpClient('/api',async(url,options)=>{body=JSON.parse(options.body);assert.ok(url.endsWith('/auth/register/code'));return new Response(JSON.stringify({verificationId:'real',expiresIn:300,resendAfter:60,demoCode:'must-not-leak'}),{headers:{'Content-Type':'application/json'}})})
 const result=await createRemoteAuth(client).requestRegistrationCode(contact);assert.equal(result.demoCode,undefined);assert.deepEqual(body,contact)
})
