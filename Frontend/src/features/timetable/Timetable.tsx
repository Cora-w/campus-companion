import { useEffect, useRef, useState } from 'react'
import { Button, Input, InputNumber, Select, message } from 'antd'
import { Modal } from '../../navigation/BackOverlays'
import { useBackNavigation } from '../../navigation/useBackNavigation'
import { Icon } from '../../components/shared/Shared'
import { courseConflicts, courseErrors, coursesForWeek, courseTime, currentWeek, emptyCourse, parseWeeks, readTimetable, weekdayNames } from './timetableModel'
import type { TimetableCourse, TimetableData, TimetableSettings } from './timetableModel'
import { recognizeTimetable } from './timetableOcr'
import { detectTable, parseTable } from './timetableParser'
import type { OcrResult, TableLayout } from './timetableParser'
import './Timetable.css'

type Props={storageKey:string;active:boolean;onLocate:(place:{name:string;building:string;room:string})=>void}
const tone=(course:TimetableCourse)=>[...course.name].reduce((sum,char)=>sum+char.charCodeAt(0),0)%4
export function Timetable({storageKey,active:visible,onLocate}:Props){
 const [saved,setSaved]=useState<TimetableData>(()=>readTimetable(storageKey))
 const [draft,setDraft]=useState<TimetableCourse[]|null>(null)
 const [editing,setEditing]=useState<TimetableCourse|null>(null)
 const [editingNew,setEditingNew]=useState(false)
 const [settingsDraft,setSettingsDraft]=useState<TimetableSettings|null>(null)
 const [imageUrl,setImageUrl]=useState(''),[ocr,setOcr]=useState<OcrResult|null>(null)
 const [busy,setBusy]=useState(false),[progress,setProgress]=useState(0),[status,setStatus]=useState(''),[error,setError]=useState('')
 const [mode,setMode]=useState<'today'|'week'>('today'),[day,setDay]=useState(new Date().getDay()||7)
 const [week,setWeek]=useState(()=>Math.max(1,Math.min(saved.settings.totalWeeks,currentWeek(saved.settings))))
 const [confirm,setConfirm]=useState<'replace'|'clear'|'discard'|null>(null)
 const [layoutOpen,setLayoutOpen]=useState(false),[layout,setLayout]=useState<TableLayout>({left:10,right:99,top:15,bottom:95,days:7,rows:6,span:2})
 const [commonWeeks,setCommonWeeks]=useState('1-16周')
 const input=useRef<HTMLInputElement>(null),abort=useRef<AbortController|null>(null),urlRef=useRef('')
 const [feedback,context]=message.useMessage()
 useEffect(()=>()=>{abort.current?.abort();if(urlRef.current)URL.revokeObjectURL(urlRef.current)},[])
 const clearImage=()=>{if(urlRef.current)URL.revokeObjectURL(urlRef.current);urlRef.current='';setImageUrl('');setOcr(null);setLayoutOpen(false)}
 const cancelImport=()=>{abort.current?.abort();abort.current=null;setBusy(false);setDraft(null);setEditing(null);setError('');clearImage()}
 const back=()=>{if(editing){setEditing(null);return}if(settingsDraft){setSettingsDraft(null);return}if(busy){cancelImport();return}if(draft)setConfirm('discard')}
 useBackNavigation(visible&&!!(draft||editing||settingsDraft||busy),back,1100)
 const persist=(next:TimetableData)=>{
  try{localStorage.setItem(storageKey,JSON.stringify(next));setSaved(next);setError('');return true}
  catch{setError('本机存储空间不足，课表尚未保存。请先释放空间后再试。');return false}
 }
 const importImage=async(file:File|undefined)=>{
  if(!file)return
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>15*1024*1024){setError('请选择15MB以内的 JPG、PNG 或 WebP 课表图片。');return}
  abort.current?.abort();clearImage();setDraft(null);setError('');setBusy(true);setProgress(0);setStatus('准备识别')
  const controller=new AbortController();abort.current=controller
  urlRef.current=URL.createObjectURL(file);setImageUrl(urlRef.current)
  try{
   const result=await recognizeTimetable(file,controller.signal,(n,s)=>{setProgress(n);setStatus(s)})
   if(controller.signal.aborted)return
   const courses=parseTable(result);setOcr(result);setDraft(courses);setLayoutOpen(!detectTable(result))
   if(!courses.length)setError('还未定位到完整课程。请调整表格范围重新整理，或手动补充；原课表未改动。')
  }catch(e){if(!controller.signal.aborted){setError(e instanceof Error?e.message:'识别失败，请重试。');clearImage()}}
  finally{if(abort.current===controller){setBusy(false);abort.current=null}}
 }
 const commitImport=()=>{
  if(!draft?.length||draft.some(c=>courseErrors(c).length)||courseConflicts(draft).length)return
  const courses=draft.map(c=>({...c,raw:undefined,confidence:undefined}))
  const totalWeeks=Math.max(saved.settings.totalWeeks,...courses.flatMap(c=>parseWeeks(c.weeks)||[]))
  if(persist({...saved,courses,settings:{...saved.settings,totalWeeks}})){cancelImport();void feedback.success('课表已保存');setDay(new Date().getDay()||7)}
 }
 const saveEditor=()=>{
  if(!editing||courseErrors(editing).length)return
  const target=draft||saved.courses
  const next=editingNew?[...target,editing]:target.map(c=>c.id===editing.id?editing:c)
  const conflicts=courseConflicts(next);if(conflicts.length){setError(conflicts[0]);return}
  if(draft)setDraft(next)
  else if(!persist({...saved,courses:next,settings:{...saved.settings,totalWeeks:Math.max(saved.settings.totalWeeks,...next.flatMap(c=>parseWeeks(c.weeks)||[]))}}))return
  setEditing(null);setError('')
 }
 const startAdd=()=>{if((draft||saved.courses).length>=200){setError('一份课表最多保存200门课程。');return}setEditing({...emptyCourse(),weeks:commonWeeks,day});setEditingNew(true);setError('')}
 const active=coursesForWeek(saved.courses,week),todayCourses=active.filter(c=>c.day===day)
 const invalid=draft?.filter(c=>courseErrors(c).length).length||0,conflicts=courseConflicts(draft||[])
 const patch=(key:keyof TimetableCourse,value:string|number)=>setEditing(c=>c?{...c,[key]:value}:null)
 const showError=error?<p className="tt-error" role="alert">{error}</p>:null
 const periodCount=Math.max(12,...saved.courses.map(c=>c.end)),weekDays=saved.courses.some(c=>c.day>5)?7:5
 const calendarWeek=currentWeek(saved.settings)

 if(editing)return <section className="timetable tt-editor tt-course-editor">{context}
 <header className="tt-editor-heading"><span className="tt-editor-symbol"><Icon name="calendar"/></span><div><small>我的课表</small><h2>{editingNew?'添加课程':'编辑课程'}</h2></div></header>
 <p className="tt-caption">先填写课程和上课安排，地点与教师可以稍后补充。</p>
 <form className="tt-course-form" onSubmit={e=>{e.preventDefault();saveEditor()}}>
 <section className="tt-form-card"><div className="tt-form-card-title"><h3>课程信息</h3><span>必填</span></div>
 <label>课程名称<Input aria-label="课程名称" placeholder="例如：高等数学" maxLength={80} value={editing.name} onChange={e=>patch('name',e.target.value)}/></label>
 <label>上课星期<Select aria-label="课程星期" value={editing.day} onChange={v=>patch('day',v)} options={weekdayNames.map((label,i)=>({label,value:i+1}))}/></label></section>
 <section className="tt-form-card"><div className="tt-form-card-title"><h3>上课安排</h3><span>必填</span></div>
 <div className="tt-form-row"><label>从第几节<Select aria-label="开始节次" value={editing.start} onChange={v=>setEditing(c=>c?{...c,start:v,end:Math.max(v,c.end)}:null)} options={Array.from({length:16},(_,i)=>({label:'第 '+(i+1)+' 节',value:i+1}))}/></label><label>到第几节<Select aria-label="结束节次" value={editing.end} onChange={v=>patch('end',v)} options={Array.from({length:17-editing.start},(_,i)=>({label:'第 '+(editing.start+i)+' 节',value:editing.start+i}))}/></label></div>
 <label>上课周次<Input aria-label="上课周次" placeholder="例如：1-16周" value={editing.weeks} maxLength={100} onChange={e=>patch('weeks',e.target.value)}/></label>
 <div className="tt-week-presets" role="group" aria-label="常用上课周次">{[{label:'每周',value:'1-'+saved.settings.totalWeeks+'周'},{label:'单周',value:'1-'+saved.settings.totalWeeks+'单周'},{label:'双周',value:'1-'+saved.settings.totalWeeks+'双周'}].map(p=><button key={p.label} type="button" aria-pressed={editing.weeks===p.value} onClick={()=>patch('weeks',p.value)}>{p.label}</button>)}</div><p className="tt-field-help">支持连续周次、单双周，也可填写 2,4,6周。</p>
 </section>
 <section className="tt-form-card"><div className="tt-form-card-title"><h3>更多信息</h3><span>选填</span></div>
 <label>上课地点<div className="tt-form-row"><Input aria-label="课程楼栋" placeholder="楼栋，如知行楼" value={editing.building} maxLength={60} onChange={e=>patch('building',e.target.value)}/><Input aria-label="课程教室" placeholder="教室，如 A203" value={editing.room} maxLength={40} onChange={e=>patch('room',e.target.value)}/></div></label>
 <label>任课教师<Input aria-label="课程教师" placeholder="填写教师姓名" value={editing.teacher} maxLength={40} onChange={e=>patch('teacher',e.target.value)}/></label>
 <label>上课时间<Input aria-label="上课时间" placeholder="例如：08:00–09:40" value={editing.time} maxLength={40} onChange={e=>patch('time',e.target.value)}/></label><p className="tt-field-help">也可以在课表设置中统一填写节次时间。</p>
 </section>
 {editing.raw&&<details className="tt-help"><summary>查看此课程识别原文</summary><pre>{editing.raw}</pre></details>}
 {showError}
 <div className="tt-editor-save"><p aria-live="polite">{courseErrors(editing).length>0?'请完善'+courseErrors(editing).join('、'):'课程信息已完整，可以保存'}</p><Button htmlType="submit" type="primary" block disabled={courseErrors(editing).length>0}>保存课程</Button></div>
 </form></section>

 if(settingsDraft)return <section className="timetable tt-editor">{context}<h2>课表设置</h2><p className="tt-caption">填写第一教学周的周一日期，APP才能自动计算当前周。</p>
 <label>第一周周一<input aria-label="第一周周一" type="date" value={settingsDraft.startDate} onChange={e=>setSettingsDraft({...settingsDraft,startDate:e.target.value})}/></label>
 {!settingsDraft.startDate&&<label>当前教学周<InputNumber aria-label="当前教学周" min={1} max={30} value={settingsDraft.week} onChange={v=>setSettingsDraft({...settingsDraft,week:v||1})}/></label>}
 <label>学期周数<InputNumber aria-label="学期周数" min={1} max={30} value={settingsDraft.totalWeeks} onChange={v=>setSettingsDraft({...settingsDraft,totalWeeks:v||20})}/></label>
 <h3>节次时间</h3><p className="tt-caption">按学校作息填写；未填写时只显示节次。</p>
 {settingsDraft.periods.map((p,i)=><div className="tt-period-setting" key={i}><span>第{i+1}节</span><input aria-label={`第${i+1}节开始时间`} type="time" value={p.start} onChange={e=>setSettingsDraft({...settingsDraft,periods:settingsDraft.periods.map((v,j)=>j===i?{...v,start:e.target.value}:v)})}/><span>至</span><input aria-label={`第${i+1}节结束时间`} type="time" value={p.end} onChange={e=>setSettingsDraft({...settingsDraft,periods:settingsDraft.periods.map((v,j)=>j===i?{...v,end:e.target.value}:v)})}/></div>)}
 {showError}<Button type="primary" block onClick={()=>{
  if(settingsDraft.startDate&&new Date(settingsDraft.startDate+'T12:00:00').getDay()!==1){setError('第一周开始日期请选择周一。');return}
  if(settingsDraft.totalWeeks<Math.max(1,...saved.courses.flatMap(c=>parseWeeks(c.weeks)||[]))){setError('学期周数不能少于已保存课程的最后上课周。');return}
  if(settingsDraft.periods.some(p=>(p.start||p.end)&&(!p.start||!p.end||p.end<=p.start))){setError('请检查节次时间：开始和结束需成对填写，结束晚于开始。');return}
  if(persist({...saved,settings:settingsDraft})){setWeek(Math.max(1,Math.min(settingsDraft.totalWeeks,currentWeek(settingsDraft))));setSettingsDraft(null);void feedback.success('设置已保存')}
 }}>保存设置</Button><p className="tt-caption">课表仅保存在当前账号的本机，不会自动同步到其他设备。</p></section>

 return <section className="timetable">{context}<input hidden ref={input} aria-label="导入课表图片" type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>{void importImage(e.target.files?.[0]);e.target.value=''}}/>
 <div className="tt-title"><div><small>{draft||busy?'图片导入':'我的课表'}</small><h2>{draft?'校对识别结果':busy?'正在整理课表':mode==='today'?'今日课程':'一周课表'}</h2></div>{!draft&&!busy&&<button className="tt-settings" onClick={()=>{setError('');setSettingsDraft(structuredClone(saved.settings))}} aria-label="课表设置"><Icon name="settings"/></button>}</div>
 {showError}
 {busy?<div className="tt-recognition"><img src={imageUrl} alt="正在识别的课表图片"/><div role="status"><span className="tt-spinner"/><strong>{status}</strong><span>{Math.round(progress*100)}%</span></div><progress aria-label="图片识别进度" max={1} value={progress}/><p>在本机识别，请保持页面打开。</p><Button onClick={cancelImport}>取消识别</Button></div>:draft?<>
 <p className="tt-caption">共整理出 {draft.length} 门课程，请对照原图检查。确认前不会替换原课表。</p>
 <details className="tt-help" open={!draft.length}><summary>对照课表原图</summary><img className="tt-source-image" src={imageUrl} alt="导入课表原图"/></details>
 {ocr&&<details className="tt-help" open={layoutOpen} onToggle={e=>setLayoutOpen(e.currentTarget.open)}><summary>调整表格识别范围</summary><p className="tt-caption">范围只包含课程格子，不包含星期标题、左侧节次和页脚。均分格子适用于规则周课表；合并单元格需手动校对。</p>
 <div className="tt-layout-preview"><img src={imageUrl} alt="表格范围预览"/><div className="tt-layout-grid" style={{left:`${layout.left}%`,top:`${layout.top}%`,width:`${layout.right-layout.left}%`,height:`${layout.bottom-layout.top}%`,gridTemplateColumns:`repeat(${layout.days},1fr)`,gridTemplateRows:`repeat(${layout.rows},1fr)`}}>{Array.from({length:layout.days*layout.rows},(_,i)=><span key={i}/>)}</div></div>
 <div className="tt-layout-inputs">{(['left','right','top','bottom'] as const).map((key,i)=><label key={key}>{['左边界 %','右边界 %','上边界 %','下边界 %'][i]}<InputNumber aria-label={['左边界','右边界','上边界','下边界'][i]} min={0} max={100} value={layout[key]} onChange={v=>setLayout({...layout,[key]:v||0})}/></label>)}</div>
 <div className="tt-form-row"><label>星期列数<Select aria-label="星期列数" value={layout.days} onChange={v=>setLayout({...layout,days:v})} options={[5,6,7].map(value=>({value,label:`周一至周${'五六日'[value-5]}`}))}/></label><label>课程行数<InputNumber aria-label="课程行数" min={1} max={16} value={layout.rows} onChange={v=>setLayout({...layout,rows:v||1})}/></label><label>每行节数<InputNumber aria-label="每行节数" min={1} max={4} value={layout.span} onChange={v=>setLayout({...layout,span:v||1})}/></label></div>
 <Button disabled={layout.right<=layout.left||layout.bottom<=layout.top||layout.rows*layout.span>16} onClick={()=>{if(draft.length&&!window.confirm('重新整理会替换尚未保存的校对结果，继续吗？'))return;setDraft(parseTable(ocr,layout));setError('');setLayoutOpen(false)}}>按此范围重新整理</Button></details>}
 <div className="tt-common-weeks"><label>为缺失周次的课程填写<Input aria-label="批量上课周次" value={commonWeeks} onChange={e=>setCommonWeeks(e.target.value)} placeholder="如 1-16周"/></label><Button onClick={()=>setDraft(draft.map(c=>c.weeks?c:{...c,weeks:commonWeeks}))}>应用</Button></div>
 <div className="tt-review-list">{draft.map(c=><article key={c.id}><button className="tt-review-open" onClick={()=>{setEditing(c);setEditingNew(false);setError('')}}><div><strong>{c.name||'未识别课程名'}</strong><span>{weekdayNames[c.day-1]} · 第{c.start}–{c.end}节 · {c.weeks||'周次待填写'}</span><small>{[c.building,c.room,c.teacher].filter(Boolean).join(' · ')||'地点与教师可补充'}</small></div><span className={courseErrors(c).length?'tt-review-warning':'tt-review-tag'}>{courseErrors(c).length?'需补全':'校对'}</span></button><button className="tt-delete-course" aria-label={`移除${c.name}`} onClick={()=>setDraft(draft.filter(v=>v.id!==c.id))}>移除</button></article>)}</div>
 <button className="tt-add-course" onClick={startAdd}>＋ 手动补充课程</button>
 {conflicts.length>0&&<p className="tt-error" role="alert">{conflicts[0]}，请修改或移除重复项。</p>}{invalid>0&&<p className="tt-caption">还有 {invalid} 门课程需补全名称、星期、节次或周次。</p>}
 <div className="tt-import-actions"><Button type="primary" disabled={!draft.length||invalid>0||conflicts.length>0} onClick={()=>saved.courses.length?setConfirm('replace'):commitImport()}>确认生成课表</Button><Button onClick={()=>setConfirm('discard')}>取消导入</Button></div>
 </>:<>
 <div className="tt-view-switch" role="group" aria-label="课表视图">{(['today','week'] as const).map(v=><button key={v} className={mode===v?'active':''} aria-pressed={mode===v} onClick={()=>setMode(v)}>{v==='today'?'今日':'整周'}</button>)}<button className="tt-import" onClick={()=>input.current?.click()}><Icon name="image"/>导入图片</button></div>
 {!saved.courses.length?<div className="tt-empty"><div className="tt-empty-icon"><Icon name="calendar"/></div><h3>把课表放进口袋</h3><p>导入清晰课表截图，识别后校对，<br/>生成你的今日课程和一周课表。</p><Button type="primary" onClick={()=>input.current?.click()}>从相册导入课表</Button><button onClick={startAdd}>也可以手动添加课程</button></div>:<>
 <div className="tt-week-bar"><button aria-label="上一教学周" disabled={week<=1} onClick={()=>setWeek(w=>w-1)}><Icon name="back"/></button><div><strong>第 {week} 周</strong><small>{saved.settings.startDate?'教学周':'开学日期待设置'}</small></div><button aria-label="下一教学周" disabled={week>=saved.settings.totalWeeks} onClick={()=>setWeek(w=>w+1)}><Icon name="next"/></button></div>
 {saved.settings.startDate&&(calendarWeek<1||calendarWeek>saved.settings.totalWeeks)&&<p className="tt-caption">{calendarWeek<1?'学期尚未开始，可提前查看课程安排。':'本学期已结束，当前可回看教学周课表。'}</p>}{mode==='today'?<><div className="tt-day-strip">{weekdayNames.map((name,i)=><button key={name} aria-label={name} aria-pressed={day===i+1} className={day===i+1?'active':''} onClick={()=>setDay(i+1)}>{name}<span>{active.filter(c=>c.day===i+1).length?'·':' '}</span></button>)}</div><div className="tt-today-summary"><strong>{weekdayNames[day-1]}</strong><span>{todayCourses.length} 门课程</span></div><div className="tt-day-courses">{todayCourses.map(c=><article className={`tt-course tt-tone-${tone(c)}`} key={c.id}><div className="tt-course-time"><strong>{courseTime(c,saved.settings)}</strong><span>第{c.start}–{c.end}节</span></div><button className="tt-course-main" onClick={()=>{setEditing(c);setEditingNew(false)}}><h3>{c.name}</h3><p>{[c.building,c.room].filter(Boolean).join(' · ')||'上课地点待补充'}</p><span>{c.teacher||'教师待补充'} · {c.weeks}</span></button>{c.building&&<button className="tt-locate" aria-label={`在地图查找${c.name}教室`} onClick={()=>onLocate({name:c.name,building:c.building,room:c.room})}><Icon name="location"/></button>}</article>)}</div>{!todayCourses.length&&<div className="tt-free-day"><Icon name="check"/><h3>这一天没有课</h3><p>第{week}周没有安排课程，留点时间给自己。</p></div>}</>:<div className="tt-week-scroll" data-disable-back-gesture="true"><p className="tt-grid-hint">{weekDays>5?'左右滑动查看整周 · 点击课程可编辑':'点击课程查看详情或编辑'}</p><div className="tt-week-grid" style={{gridTemplateColumns:`34px repeat(${weekDays},minmax(${weekDays>5?'72px':'0'},1fr))`,gridTemplateRows:`36px repeat(${periodCount},54px)`}}><div className="tt-grid-corner">节次</div>{weekdayNames.slice(0,weekDays).map((d,i)=><div key={d} className="tt-grid-day" style={{gridColumn:i+2,gridRow:1}}>{d}</div>)}{Array.from({length:periodCount},(_,i)=><div className="tt-grid-period" key={i} style={{gridColumn:1,gridRow:i+2}}>{i+1}</div>)}{Array.from({length:periodCount*weekDays},(_,i)=><div className="tt-grid-cell" key={i} style={{gridColumn:i%weekDays+2,gridRow:Math.floor(i/weekDays)+2}}/>)}{active.map(c=><button className={`tt-grid-course tt-tone-${tone(c)}`} key={c.id} style={{gridColumn:c.day+1,gridRow:`${c.start+1} / span ${c.end-c.start+1}`}} onClick={()=>{setEditing(c);setEditingNew(false)}}><strong>{c.name}</strong><span>{[c.building,c.room].filter(Boolean).join(' ')||'地点待补充'}</span></button>)}</div></div>}
 <div className="tt-footer-actions"><button onClick={startAdd}>＋ 添加课程</button><button onClick={()=>setConfirm('clear')}>清空课表</button></div></>}
 <details className="tt-help"><summary>图片导入小提示</summary><p>优先使用原始截图，保留星期、节次和周次，避免倾斜、反光和遮挡。识别完成后请检查合并课程格、单双周及教室。图片在本机识别，原图不会保存到课表中。</p></details>
 </>}
 <Modal open={confirm!==null} title={confirm==='replace'?'替换已有课表？':confirm==='clear'?'清空已保存课表？':'放弃本次校对？'} okText={confirm==='replace'?'确认替换':confirm==='clear'?'确认清空':'放弃校对'} cancelText="继续保留" onCancel={()=>setConfirm(null)} onOk={()=>{const action=confirm;setConfirm(null);if(action==='replace')commitImport();else if(action==='clear'){if(persist({...saved,courses:[]}))void feedback.success('课表已清空')}else cancelImport()}}><p>{confirm==='replace'?'新课表会替换当前账号在本机保存的课程。':confirm==='clear'?'清空后无法恢复，需要重新导入。':'尚未保存的识别结果与修改会被丢弃，原课表保留。'}</p></Modal>
 </section>
}
