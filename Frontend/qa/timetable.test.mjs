import test from 'node:test'
import assert from 'node:assert/strict'
import {parseWeeks,courseErrors,courseConflicts,coursesForWeek,currentWeek,defaultSettings,emptyCourse} from '../src/features/timetable/timetableModel.ts'
import {detectTable,parseTable} from '../src/features/timetable/timetableParser.ts'
test('week ranges, odd/even and invalid weeks',()=>{
 assert.deepEqual(parseWeeks('第1—8周（单）'),[1,3,5,7]);assert.deepEqual(parseWeeks('2,4,6周'),[2,4,6]);assert.deepEqual(parseWeeks('1-8双周'),[2,4,6,8]);assert.equal(parseWeeks('16-1周'),null);assert.equal(parseWeeks('0-31周'),null);assert.equal(parseWeeks('1-16单双周'),null)
})
test('course validation and weekly conflict detection',()=>{
 const a={...emptyCourse(),name:'高等数学',weeks:'1-8单周'},b={...emptyCourse(),name:'大学英语',weeks:'1-8双周'}
 assert.equal(courseErrors(a).length,0);assert.equal(courseConflicts([a,b]).length,0);assert.equal(courseConflicts([a,{...b,weeks:'1-8周'}]).length,1);assert.equal(coursesForWeek([a,b],2)[0].name,'大学英语');assert.ok(courseErrors({...a,start:3,end:2}).length)
})
test('semester week uses Monday date and does not pretend term has started',()=>{
 const settings={...defaultSettings(),startDate:'2026-09-07'};assert.equal(currentWeek(settings,new Date('2026-09-06T12:00:00')),0);assert.equal(currentWeek(settings,new Date('2026-09-14T12:00:00')),2)
})
const word=(text,x,y,w=100)=>({text,confidence:92,bbox:{x0:x,y0:y,x1:x+w,y1:y+22}})
const result={width:1200,height:800,confidence:92,text:'',words:[...['星期一','星期二','星期三','星期四','星期五'].map((d,i)=>word(d,170+i*200,30)),word('1-2',20,180,40),word('3-4',20,380,40),word('5-6',20,580,40),word('高等数学',170,130),word('1-16周',170,165),word('教室:A305',170,200),word('大学英语',370,340),word('2-16双周',370,375)]}
test('table layout comes from weekday headers and period labels',()=>{
 assert.equal(detectTable(result).headers.length,5);const courses=parseTable(result);assert.equal(courses.length,2);assert.equal(courses[0].name,'高等数学');assert.equal(courses[0].day,1);assert.equal(courses[0].start,1);assert.equal(courses[0].end,2);assert.equal(courses[0].weeks,'1-16周');assert.equal(courses[0].room,'A305');assert.equal(courses[1].day,2);assert.equal(courses[1].start,3)
})
test('no fabricated timetable when layout is unknown',()=>{
 assert.deepEqual(parseTable({...result,words:[word('高等数学',300,300)]}),[])
})
