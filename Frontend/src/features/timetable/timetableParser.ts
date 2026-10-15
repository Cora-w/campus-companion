import type { TimetableCourse } from './timetableModel.ts'
import { emptyCourse } from './timetableModel.ts'
export type OcrWord={text:string;confidence:number;bbox:{x0:number;y0:number;x1:number;y1:number}}
export type OcrResult={words:OcrWord[];lines?:OcrWord[];text:string;width:number;height:number;confidence:number}
export type TableLayout={left:number;right:number;top:number;bottom:number;days:number;rows:number;span:number}
const cx=(w:OcrWord)=>(w.bbox.x0+w.bbox.x1)/2
const cy=(w:OcrWord)=>(w.bbox.y0+w.bbox.y1)/2
function lines(words:OcrWord[]):OcrWord[][] {
 const output:OcrWord[][]=[]
 for(const word of [...words].sort((a,b)=>cy(a)-cy(b)||cx(a)-cx(b))){
  const row=output.find(r=>Math.abs(cy(r[0])-cy(word))<Math.max(8,(word.bbox.y1-word.bbox.y0)*.65))
  if(row)row.push(word);else output.push([word])
 }
 return output.map(row=>row.sort((a,b)=>cx(a)-cx(b)))
}
export function detectTable(result:OcrResult):{headers:{day:number;x:number}[];top:number;rows:{y:number;start:number;end:number}[]}|null {
 const grouped=lines(result.lines||result.words)
 let best:{headers:{day:number;x:number}[];top:number}|null=null
 for(const line of grouped){
  const text=line.map(w=>w.text.replace(/\s/g,'')).join(''),headers:{day:number;x:number}[]=[]
  for(const match of text.matchAll(/(?:星期|周|礼拜)([一二三四五六日天1-7])/g)){
   const index=match.index!,end=index+match[0].length
   let offset=0;const matched=line.filter(w=>{const a=offset;offset+=w.text.replace(/\s/g,'').length;return a<end&&offset>index})
   const day='一二三四五六日'.indexOf(match[1])+1||Number(match[1])||7
   if(matched.length&&!headers.some(h=>h.day===day))headers.push({day,x:(matched[0].bbox.x0+matched.at(-1)!.bbox.x1)/2})
  }
  if(headers.length>=3&&(!best||headers.length>best.headers.length))best={headers,top:Math.max(...line.map(w=>w.bbox.y1))}
 }
 if(!best)return null
 const known=best.headers.sort((a,b)=>a.day-b.day)
 const distances=known.slice(1).map((h,i)=>(h.x-known[i].x)/(h.day-known[i].day)).sort((a,b)=>a-b)
 const spacing=distances[Math.floor(distances.length/2)]
 if(!Number.isFinite(spacing)||spacing<=0)return null
 const headers=Array.from({length:known.at(-1)!.day-known[0].day+1},(_,i)=>{const day=known[0].day+i;return known.find(h=>h.day===day)||{day,x:known[0].x+(day-known[0].day)*spacing}})
 const leftEdge=headers[0].x-spacing/2,rows:{y:number;start:number;end:number}[]=[]
 for(const row of lines((result.lines||result.words).filter(w=>cx(w)<leftEdge&&w.bbox.y0>best!.top))){
  const text=row.map(w=>w.text).join('').replace(/\s/g,'').replace(/[~～—–至]/g,'-')
  const m=text.match(/^第?(\d{1,2})(?:[-,、](\d{1,2}))?节?$/)
  if(m){const start=Number(m[1]),end=Number(m[2]||m[1]);if(start>0&&end>=start&&end<=16&&!rows.some(r=>r.start===start))rows.push({y:cy(row[0]),start,end})}
 }
 return rows.length>=2?{headers,top:best.top,rows:rows.sort((a,b)=>a.y-b.y)}:null
}
function courseFromWords(words:OcrWord[],day:number,start:number,end:number):TimetableCourse|null {
 const textLines=lines(words).map(row=>row.map(w=>w.text).join(' ').trim()).filter(Boolean)
 if(!textLines.length)return null
 const raw=textLines.join('\n'),compact=raw.replace(/\s/g,'').replace(/[~～—–至]/g,'-')
 const name=textLines.map(t=>t.replace(/^(?:课程|课程名称)\s*[:：]\s*/,'').replace(/\d{1,2}(?:[-—–~～至]\d{1,2})?[单双]?周(?:[（(][单双][）)])?/g,'').trim()).find(t=>! /^(?:星期|周[一二三四五六日天]$|周$|第.*节|教师|教室|地点|上课时间|时间)/.test(t)&&! /\d{1,2}[:：]\d{2}/.test(t)&&! /^[-\d.,（()）\s]+$/.test(t))?.replace(/\s+/g,'')||''
 if(!name||name.length<2)return null
 const weeks=compact.match(/\d{1,2}(?:-\d{1,2})?(?:[,，、]\d{1,2}(?:-\d{1,2})?)*[（(]?[单双]?[）)]?周(?:[（(][单双][）)])?/)?.[0]||''
 const period=compact.match(/(?:第)?(\d{1,2})-(\d{1,2})节/)
 const building=compact.match(/(?:知行|文汇|致远|勤学|明志|西园综合|实验|教学)[楼]?楼?[A-F]?区?/)?.[0]||''
 const room=compact.match(/(?:教室|地点|上课地点)[:：]?([A-F]?\d{3,4})/)?.[1]||compact.match(/[A-F]\d{3,4}/)?.[0]||''
 const teacher=raw.match(/(?:教师|老师)\s*[:：]\s*([^\n]+)/)?.[1]?.trim().replace(/\s+/g,'')||''
 const time=compact.match(/\d{1,2}[:：]\d{2}[-]\d{1,2}[:：]\d{2}/)?.[0]?.replace(/：/g,':')||''
 return {...emptyCourse(),name,day,start:period?Number(period[1]):start,end:period?Number(period[2]):end,weeks,teacher,building,room,time,raw,confidence:Math.round(words.reduce((n,w)=>n+w.confidence,0)/words.length)}
}
export function parseTable(result:OcrResult,manual?:TableLayout):TimetableCourse[]{
 const detected=manual?null:detectTable(result)
 if(!detected&&!manual)return []
 const cells=new Map<string,{day:number;start:number;end:number;words:OcrWord[]}>()
 const columnWidth=manual?(manual.right-manual.left)/100*result.width:((detected!.headers.at(-1)!.x-detected!.headers[0].x)/(detected!.headers.length-1))
 const items=result.lines?.flatMap(line=>line.bbox.x1-line.bbox.x0<=columnWidth*1.15?[line]:result.words.filter(w=>w.bbox.x0>=line.bbox.x0&&w.bbox.x1<=line.bbox.x1&&Math.abs(cy(w)-cy(line))<Math.max(12,line.bbox.y1-line.bbox.y0)))||result.words
 for(const word of items){
  let day:number,start:number,end:number
  if(manual){
   const x=cx(word)/result.width*100,y=cy(word)/result.height*100
   if(x<manual.left||x>=manual.right||y<manual.top||y>=manual.bottom)continue
   day=Math.floor((x-manual.left)/(manual.right-manual.left)*manual.days)+1
   const row=Math.floor((y-manual.top)/(manual.bottom-manual.top)*manual.rows)
   start=row*manual.span+1;end=start+manual.span-1;if(end>16)continue
  }else{
   const table=detected!,spacing=(table.headers.at(-1)!.x-table.headers[0].x)/(table.headers.length-1)
   if(word.bbox.y0<=table.top||cx(word)<table.headers[0].x-spacing/2||cx(word)>table.headers.at(-1)!.x+spacing/2)continue
   const rowHeight=table.rows.length>1?(table.rows.at(-1)!.y-table.rows[0].y)/(table.rows.length-1):80
   if(cy(word)>table.rows.at(-1)!.y+rowHeight/2)continue
   day=table.headers.reduce((a,b)=>Math.abs(cx(word)-a.x)<Math.abs(cx(word)-b.x)?a:b).day
   const row=table.rows.reduce((a,b)=>Math.abs(cy(word)-a.y)<Math.abs(cy(word)-b.y)?a:b)
   start=row.start;end=row.end
  }
  const key=`${day}:${start}`;const cell=cells.get(key)||{day,start,end,words:[]};cell.words.push(word);cells.set(key,cell)
 }
 return [...cells.values()].map(c=>courseFromWords(c.words,c.day,c.start,c.end)).filter((c):c is TimetableCourse=>c!==null).sort((a,b)=>a.day-b.day||a.start-b.start)
}
