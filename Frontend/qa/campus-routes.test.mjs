import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import vm from 'node:vm'
import {campusPlaces,facultyHousing,searchCampusPlaces} from '../src/data/campusMapData.ts'
import {createCampusRoute,southGate,walkingNavigationUrl} from '../src/features/discover/campusRoutes.ts'
const html=readFileSync('qa/reference-campus-map.html','utf8'),context={document:{querySelector:()=>null}}
vm.runInNewContext(html.split('<script>')[1].split('/* ---------- build SVG ---------- */')[0]+';globalThis.places=P})();',context)
for(const original of context.places){
 const actual=campusPlaces.find(p=>p.id===original.id)
 assert.ok(actual,original.id)
 assert.equal(actual.name,original.name);assert.equal(actual.description,original.desc)
 assert.equal(actual.x,original.c[0]);assert.equal(actual.y,original.c[1])
 assert.equal(JSON.stringify(actual.polygon),JSON.stringify(original.poly))
 assert.equal(actual.path,original.path)
 for(const unit of original.units||[])for(const value of unit)assert.ok(actual.room.includes(value))
 if(actual.id==='gate'){assert.equal(createCampusRoute(southGate.id,actual.name),null);continue}
 const bearing=createCampusRoute(southGate.id,actual.name)
 assert.deepEqual(bearing.points,[{x:977,y:1652},{x:actual.x,y:actual.y}]);assert.deepEqual(bearing.roads,[])
}
assert.equal(facultyHousing.length,16)
assert.equal(searchCampusPlaces('天舟食堂')[0].id,'tz')
assert.equal(searchCampusPlaces('北205')[0].name,'劝学楼')
assert.equal(createCampusRoute('south-gate','二期扩建区'),null)
assert.equal(createCampusRoute('construction','图书馆'),null)
assert.equal(createCampusRoute('current-location','图书馆'),null)
assert.equal(new URL(walkingNavigationUrl('图书馆','校门')).searchParams.get('mode'),'walking')
console.log('All source places, footprints, descriptions, offices, teacher apartments and honest direction bearings verified')
