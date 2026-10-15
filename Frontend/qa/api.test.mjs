import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHttpClient } from '../src/api/http.ts'
import { createRemoteAuth } from '../src/api/auth.ts'

const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } })
test('login body has no role, token is sent on logout, 204 is accepted', async () => {
  const calls = []
  const client = createHttpClient('/api/v1/', async (url, options) => {
    calls.push({ url, options })
    return calls.length === 1 ? json({ user: { id: 's1', nickname: '学生', role: 'student', schoolId: 'school-a' }, accessToken: 'token' }) : new Response(null, { status: 204 })
  })
  const auth = createRemoteAuth(client)
  assert.equal((await auth.login({ schoolId: 'school-a',  account: 's1', password: 'secret' })).role, 'student')
  await auth.logout()
  await client.request('/probe')
  assert.equal(calls[0].url, '/api/v1/auth/login')
  assert.deepEqual(JSON.parse(calls[0].options.body), { schoolId: 'school-a', account: 's1', password: 'secret' })
  assert.equal(calls[1].options.headers.Authorization, 'Bearer token')
  assert.equal(calls[2].options.headers.Authorization, undefined)
})
test('401 keeps backend error and clears stale token', async () => {
  const calls = []
  const client = createHttpClient('/api/v1', async (_, options) => { calls.push(options); return json({ code: 'INVALID_CREDENTIALS', message: '账号错误', requestId: 'r1' }, 401) })
  client.setToken('expired')
  await assert.rejects(client.request('/test'), e => e.status === 401 && e.requestId === 'r1' && e.message === '账号错误')
  await assert.rejects(client.request('/test'))
  assert.equal(calls[1].headers.Authorization, undefined)
})
test('network, timeout and invalid JSON are distinct failures', async () => {
  await assert.rejects(createHttpClient('', async () => { throw Error('offline') }).request('/a'), e => e.code === 'NETWORK_ERROR')
  await assert.rejects(createHttpClient('', async () => new Response('html')).request('/a'), e => e.code === 'INVALID_RESPONSE')
  const waiting = (_, options) => new Promise((_, reject) => options.signal.addEventListener('abort', () => reject(Error('aborted'))))
  await assert.rejects(createHttpClient('', waiting, 5).request('/a'), e => e.code === 'TIMEOUT')
})
test('unsupported identity and malformed login responses never authorize', async () => {
  for (const body of [null, {}, {user:{id:'a',name:'商家',role:'merchant'},accessToken:'token'}]) {
    const calls=[]
    const client=createHttpClient('',async (_,options)=>{calls.push(options);return json(body)})
    await assert.rejects(createRemoteAuth(client).login({ schoolId: 'school-a', account:'a',password:'x'}))
    await client.request('/probe')
    assert.equal(calls[1].headers.Authorization,undefined)
  }
})
test('teacher identity is accepted only from a valid server response', async () => {
  const calls = []
  const client = createHttpClient('', async (_, options) => {
    calls.push(options)
    return json({ user: { id: 't1', nickname: '心理教师', role: 'teacher', schoolId: 'school-a' }, accessToken: 'teacher-token' })
  })
  assert.equal((await createRemoteAuth(client).login({ schoolId: 'school-a',  account: 't1', password: 'secret' })).role, 'teacher')
  await client.request('/probe')
  assert.equal(calls[1].headers.Authorization, 'Bearer teacher-token')
  assert.deepEqual(JSON.parse(calls[0].body), { schoolId: 'school-a', account: 't1', password: 'secret' })
})
test('failed logout clears local token', async () => {
  const calls=[]
  const client=createHttpClient('',async (_,options)=>{calls.push(options);return json({code:'UNAVAILABLE',message:'稍后重试'},503)})
  client.setToken('token')
  await assert.rejects(createRemoteAuth(client).logout())
  await assert.rejects(client.request('/probe'))
  assert.equal(calls[1].headers.Authorization,undefined)
})

test('admin identity is accepted from the authenticated server response', async () => {
  const client = createHttpClient('', async () => json({ user: { id: 'a1', nickname: '管理员', role: 'admin', schoolId: 'school-a' }, accessToken: 'admin-token' }))
  assert.equal((await createRemoteAuth(client).login({ schoolId: 'school-a',  account: 'a1', password: 'secret' })).role, 'admin')
})

test('missing school, mismatched school response and private-field projection fail closed', async () => {
 let calls=0;const requests=[];const client=createHttpClient('',async(_,options)=>{calls++;requests.push(options);return json({user:{id:'s1',nickname:'公开昵称',name:'真实姓名',realName:'私密姓名',studentNumber:'secret-number',schoolId:'school-a',role:'student'},accessToken:'token'})});const auth=createRemoteAuth(client);
 await assert.rejects(auth.login({account:'123',password:'secret'}));assert.equal(calls,0);
 await assert.rejects(auth.login({schoolId:'school-b',account:'123',password:'secret'}));await client.request('/probe');assert.equal(requests.at(-1).headers.Authorization,undefined);
 const session=await auth.login({schoolId:'school-a',account:'123',password:'secret',role:'admin'});assert.equal(session.name,'公开昵称');assert.equal('realName' in session,false);assert.equal('studentNumber' in session,false);assert.deepEqual(JSON.parse(requests.at(-1).body),{schoolId:'school-a',account:'123',password:'secret'});
})
