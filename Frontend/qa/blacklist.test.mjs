import assert from 'node:assert/strict'
import {blacklistKey,readBlacklist,changeBlacklist} from '../src/features/messages/blacklist.ts'
const data=new Map(),storage={getItem:key=>data.get(key)||null}
const a=blacklistKey('school-a','user-a'),b=blacklistKey('school-a','user-b'),c=blacklistKey('school-b','user-a')
data.set(a,JSON.stringify(changeBlacklist([],'friend-lin',true)))
assert.deepEqual(readBlacklist(storage,a),['friend-lin']);assert.deepEqual(readBlacklist(storage,b),[]);assert.deepEqual(readBlacklist(storage,c),[])
assert.deepEqual(changeBlacklist(['friend-lin'],'friend-lin',true),['friend-lin'])
assert.deepEqual(changeBlacklist(['friend-lin','friend-zhou'],'friend-lin',false),['friend-zhou'])
data.set(a,'broken');assert.deepEqual(readBlacklist(storage,a),[])
data.set(a,JSON.stringify(['friend-lin',null,7,'','friend-lin']));assert.deepEqual(readBlacklist(storage,a),['friend-lin'])
assert.deepEqual(readBlacklist({getItem(){throw Error('Denied')}},a),[])
console.log('PASS blacklist persistence parsing, deduplication, removal and school/account separation')
