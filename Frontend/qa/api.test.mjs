import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHttpClient } from '../src/api/http.ts'
import { createRemoteAuth } from '../src/api/auth.ts'

const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } })
test('login body has no role, token is sent on logout, 204 is accepted', async () => {
  const calls = []
  const client = createHttpClient('/api/v1/', async (url, options) => {
    calls.push({ url, options })
    return calls.length === 1 ? json({ user: { id: 's1', name: '学生', role: 'student' }, accessToken: 'token' }) : new Response(null, { status: 204 })
  })
  const auth = createRemoteAuth(client)
  assert.equal((await auth.login({ account: 's1', password: 'secret' })).role, 'student')
  await auth.logout()
  await client.request('/probe')
  assert.equal(calls[0].url, '/api/v1/auth/login')
  assert.deepEqual(JSON.parse(calls[0].options.body), { account: 's1', password: 'secret' })
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
  for (const body of [null, {}, {user:{id:'a',name:'管理',role:'admin'},accessToken:'token'}]) {
    const calls=[]
    const client=createHttpClient('',async (_,options)=>{calls.push(options);return json(body)})
    await assert.rejects(createRemoteAuth(client).login({account:'a',password:'x'}))
    await client.request('/probe')
    assert.equal(calls[1].headers.Authorization,undefined)
  }
})
test('failed logout clears local token', async () => {
  const calls=[]
  const client=createHttpClient('',async (_,options)=>{calls.push(options);return json({code:'UNAVAILABLE',message:'稍后重试'},503)})
  client.setToken('token')
  await assert.rejects(createRemoteAuth(client).logout())
  await assert.rejects(client.request('/probe'))
  assert.equal(calls[1].headers.Authorization,undefined)
})
