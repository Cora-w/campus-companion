import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mockAuth, syncDemoAccounts } from '../src/mocks/auth.ts'
import { initialAccounts } from '../src/data/data.ts'

const account = '3343625681'
const password = process.env.LOCAL_DEMO_ADMIN_TEST_PASSWORD

test('custom demo administrator accepts its configured password', { skip: !password }, async () => {
  assert.deepEqual(await mockAuth.login({ account, password }), { id: account, name: '本地演示管理员', role: 'admin' })
})
test('custom administrator rejects incorrect and shared sample passwords', async () => {
  for (const password of ['', 'wrong-password', 'Demo@2026']) {
    await assert.rejects(mockAuth.login({ account, password }), e => e.code === 'INVALID_CREDENTIALS')
  }
})
test('existing sample accounts keep their roles and credentials', async () => {
  for (const [account, role] of [['A-DEMO-01', 'admin'], ['T-DEMO-01', 'teacher'], ['S-DEMO-01', 'student']]) {
    assert.equal((await mockAuth.login({ account, password: 'Demo@2026' })).role, role)
  }
})
test('disabled custom administrator cannot sign in', { skip: !password }, async () => {
  syncDemoAccounts(initialAccounts.map(a => a.id === account ? { ...a, enabled: false } : a))
  try {
    await assert.rejects(mockAuth.login({ account, password }), e => e.code === 'ACCOUNT_DISABLED')
  } finally { syncDemoAccounts(initialAccounts) }
})
test('unknown accounts cannot sign in with shared sample password', async () => {
  await assert.rejects(mockAuth.login({ account: 'unknown', password: 'Demo@2026' }), e => e.code === 'INVALID_CREDENTIALS')
})
