import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createMockAuth } from '../src/mocks/auth.ts'
import { initialAccounts } from '../src/data/data.ts'
import { publicProfile, readStudentIdentity } from '../src/features/identity/identityModel.ts'
import { footprintPosts } from '../src/features/student/footprintModel.ts'
const school = 'sichuan-aerospace-polytechnic', otherSchool = 'qinghe-demo-university'
test('identical student numbers resolve to different users only within the chosen school', async () => {
 const auth = createMockAuth(() => initialAccounts)
 const first = await auth.login({ schoolId: school, account: '20260001', password: 'Demo@2026' })
 const second = await auth.login({ schoolId: otherSchool, account: '20260001', password: 'Demo@2026' })
 assert.notEqual(first.id, second.id); assert.notEqual(first.name, second.name)
 assert.equal(first.schoolId, school); assert.equal(second.schoolId, otherSchool)
 for(const schoolId of ['', 'unknown', otherSchool]) await assert.rejects(auth.login({ schoolId, account: '20261001', password: 'Demo@2026' }))
 await assert.rejects(auth.login({schoolId:school,account:'20261002',password:'Demo@2026'}), e => e.code === 'ACCOUNT_DISABLED')
 assert.equal('realName' in first, false); assert.equal('studentNumber' in first, false)
})
test('public profile projection drops private fields; only enabled assigned same-school teachers read identity', () => {
 const identity={userId:'S-DEMO-01',schoolId:school,realName:'私密姓名',studentNumber:'20260001',schoolDetails:{college:'',major:'',grade:'',className:''}}
 assert.deepEqual(publicProfile({...identity,nickname:'小禾',avatar:'avatar'}),{userId:identity.userId,schoolId:school,nickname:'小禾',avatar:'avatar'})
 const cases=[{id:'case',schoolId:school,teacherId:'T-DEMO-01',studentAccountId:'S-DEMO-01'}]
 const teacher={id:'T-DEMO-01',schoolId:school,role:'teacher',name:'昵称'}
 assert.equal(readStudentIdentity(teacher,identity.userId,[identity],initialAccounts,cases)?.realName,identity.realName)
 for(const actor of [null,{...teacher,role:'student'},{...teacher,role:'admin'},{...teacher,id:'T-DEMO-02'},{...teacher,schoolId:otherSchool}]) assert.equal(readStudentIdentity(actor,identity.userId,[identity],initialAccounts,cases),null)
 assert.equal(readStudentIdentity(teacher,identity.userId,[identity],initialAccounts,[]),null)
 assert.equal(readStudentIdentity(teacher,'S-OTHER-01',[{...identity,userId:'S-OTHER-01',schoolId:otherSchool}],initialAccounts,cases),null)
 const returned=readStudentIdentity(teacher,identity.userId,[identity],initialAccounts,cases);returned.schoolDetails.college='changed';assert.equal(identity.schoolDetails.college,'')
})
test('footprints filter actual user comments and omit removed posts rather than matching a nickname',()=>{
 const posts=[{id:'viewed',comments:[]},{id:'liked',comments:[]},{id:'saved',comments:[]},{id:'commented',comments:[{author:'同名用户',authorId:'me'}]},{id:'peer',comments:[{author:'同名用户',authorId:'peer'}]}]
 const pick=filter=>footprintPosts(posts,filter,'me',['missing','viewed'],['liked'],['saved']).map(p=>p.id)
 assert.deepEqual(pick('浏览过'),['viewed']);assert.deepEqual(pick('赞过'),['liked']);assert.deepEqual(pick('收藏过'),['saved']);assert.deepEqual(pick('评论过'),['commented'])
})
