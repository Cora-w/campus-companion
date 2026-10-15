export type TimetableCourse = {
 id:string; name:string; day:number; start:number; end:number; weeks:string;
 teacher:string; building:string; room:string; time:string; raw?:string; confidence?:number;
}
export type TimetableSettings = { startDate:string; week:number; totalWeeks:number; periods:{start:string;end:string}[] }
export type TimetableData = { version:1; courses:TimetableCourse[]; settings:TimetableSettings }
export const weekdayNames=['周一','周二','周三','周四','周五','周六','周日']
export function emptyCourse():TimetableCourse{return {id:crypto.randomUUID(),name:'',day:1,start:1,end:2,weeks:'',teacher:'',building:'',room:'',time:''}}
export function defaultSettings():TimetableSettings{return {startDate:'',week:1,totalWeeks:20,periods:Array.from({length:12},()=>({start:'',end:''}))}}
export function parseWeeks(value:string):number[]|null {
 const raw=value.replace(/\s/g,'').replace(/[（(]/g,'').replace(/[）)]/g,'').replace(/[~～—–至]/g,'-')
 const odd=/单/.test(raw),even=/双/.test(raw)
 if(odd&&even)return null
 const clean=raw.replace(/第|周|单|双/g,'').replace(/[，、；;]/g,',')
 if(!clean)return null
 const weeks=new Set<number>()
 for(const token of clean.split(',')){
  const m=token.match(/^(\d{1,2})(?:-(\d{1,2}))?$/);if(!m)return null
  const first=Number(m[1]),last=Number(m[2]||m[1]);if(first<1||last>30||last<first)return null
  for(let w=first;w<=last;w++)if((!odd||w%2===1)&&(!even||w%2===0))weeks.add(w)
 }
 return weeks.size?[...weeks].sort((a,b)=>a-b):null
}
export function courseErrors(c:TimetableCourse):string[]{
 const errors:string[]=[]
 if(!c.name.trim()||c.name.length>80)errors.push('课程名称（1—80字）')
 if(!Number.isInteger(c.day)||c.day<1||c.day>7)errors.push('星期')
 if(!Number.isInteger(c.start)||!Number.isInteger(c.end)||c.start<1||c.end<c.start||c.end>16)errors.push('节次（1—16，结束不早于开始）')
 if(!parseWeeks(c.weeks))errors.push('周次（如 1-16周、1-16单周）')
 if(c.time){const m=c.time.match(/^(\d{1,2}):(\d{2})\s*[-–—~～]\s*(\d{1,2}):(\d{2})$/);if(!m||Number(m[1])>23||Number(m[3])>23||Number(m[2])>59||Number(m[4])>59||Number(m[1])*60+Number(m[2])>=Number(m[3])*60+Number(m[4]))errors.push('上课时间（如08:00–09:40）')}
 return errors
}
export function courseConflicts(courses:TimetableCourse[]):string[]{
 const conflicts:string[]=[]
 for(let i=0;i<courses.length;i++)for(let j=i+1;j<courses.length;j++){
  const a=courses[i],b=courses[j],aw=parseWeeks(a.weeks),bw=parseWeeks(b.weeks)
  if(a.day===b.day&&a.start<=b.end&&b.start<=a.end&&aw&&bw&&aw.some(w=>bw.includes(w)))conflicts.push(`${a.name||'未命名课程'} / ${b.name||'未命名课程'}：${weekdayNames[a.day-1]}节次重叠`)
 }
 return conflicts
}
export function currentWeek(settings:TimetableSettings,now=new Date()):number {
 if(!settings.startDate)return settings.week
 const date=new Date(settings.startDate+'T12:00:00'),today=new Date(now.getFullYear(),now.getMonth(),now.getDate(),12)
 return Math.floor((today.getTime()-date.getTime())/604800000)+1
}
export function coursesForWeek(courses:TimetableCourse[],week:number){return courses.filter(c=>parseWeeks(c.weeks)?.includes(week)).sort((a,b)=>a.start-b.start||a.day-b.day)}
export function courseTime(course:TimetableCourse,settings:TimetableSettings){
 const first=settings.periods[course.start-1]?.start,last=settings.periods[course.end-1]?.end
 return first&&last?`${first}–${last}`:course.time||'时间待设置'
}
export function readTimetable(key:string):TimetableData {
 const fallback:TimetableData={version:1,courses:[],settings:defaultSettings()}
 try{
  const data=JSON.parse(localStorage.getItem(key)||'null')
  if(data?.version!==1||!Array.isArray(data.courses)||data.courses.length>200)return fallback
  if(data.courses.some((c:TimetableCourse)=>!c||typeof c.name!=='string'||typeof c.weeks!=='string'||typeof c.id!=='string'||['teacher','building','room','time'].some(k=>typeof c[k as keyof TimetableCourse]!=='string')||courseErrors(c).length))return fallback
  const settings=data.settings
  if(!settings||!Number.isInteger(settings.week)||settings.week<1||settings.week>30||!Number.isInteger(settings.totalWeeks)||settings.totalWeeks<1||settings.totalWeeks>30||typeof settings.startDate!=='string'||!Array.isArray(settings.periods)||settings.periods.length<12||settings.periods.length>16)return fallback
  if(settings.periods.some((p:{start:string;end:string})=>!p||typeof p.start!=='string'||typeof p.end!=='string'))return fallback
  if(settings.startDate&&(!/^\d{4}-\d{2}-\d{2}$/.test(settings.startDate)||!Number.isFinite(new Date(settings.startDate+'T12:00:00').getTime())))return fallback
  return data
 }catch{return fallback}
}
