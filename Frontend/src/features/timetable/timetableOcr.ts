import type { OcrResult } from './timetableParser'
import { parseTable } from './timetableParser'
export async function recognizeTimetable(file:File,signal:AbortSignal,onProgress:(progress:number,status:string)=>void):Promise<OcrResult>{
 if(file.size>15*1024*1024)throw Error('图片超过15MB，请换一张清晰截图或压缩后再导入。')
 if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw Error('请导入 JPG、PNG 或 WebP 图片；HEIC 请先转为 JPG。')
 const {createWorker,PSM}=await import('tesseract.js')
 if(signal.aborted)throw new DOMException('Cancelled','AbortError')
 const url=URL.createObjectURL(file),image=new Image()
 try{
  await new Promise<void>((resolve,reject)=>{image.onload=()=>resolve();image.onerror=()=>reject(Error('图片无法读取，请重新导出截图。'));image.src=url})
  if(signal.aborted)throw new DOMException('Cancelled','AbortError')
  if(image.naturalWidth*image.naturalHeight>36000000)throw Error('图片尺寸过大，请只截取课表区域。')
  const scale=Math.min(1,2400/Math.max(image.naturalWidth,image.naturalHeight))
  const canvas=document.createElement('canvas');canvas.width=Math.round(image.naturalWidth*scale);canvas.height=Math.round(image.naturalHeight*scale)
  const context=canvas.getContext('2d');if(!context)throw Error('此设备无法处理图片。')
  context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0,canvas.width,canvas.height)
  onProgress(.02,'准备本机识别')
  let refining=false
  const worker=await createWorker(['chi_sim','eng'],1,{
   workerPath:new URL('/ocr/worker.min.js',location.origin).href,
   corePath:new URL('/ocr/core/',location.origin).href,
   langPath:new URL('/ocr/languages/',location.origin).href,
   workerBlobURL:false,gzip:false,cacheMethod:'none',
   logger:message=>{if(!signal.aborted&&!refining)onProgress(message.status==='recognizing text' ? .25+message.progress*.45 : .08,message.status==='recognizing text'?'正在识别课程':'加载本机识别模型')},
  })
  let terminated=false,abortRecognition:()=>void=()=>{}
  const terminate=()=>{if(!terminated){terminated=true;void worker.terminate()}}
  const cancelled=new Promise<never>((_,reject)=>{abortRecognition=()=>{terminate();reject(new DOMException('Cancelled','AbortError'))}})
  signal.addEventListener('abort',abortRecognition,{once:true})
  if(signal.aborted){signal.removeEventListener('abort',abortRecognition);terminate();throw new DOMException('Cancelled','AbortError')}
  try{
   await worker.setParameters({tessedit_pageseg_mode:PSM.SPARSE_TEXT,preserve_interword_spaces:'1'})
   const {data}=await Promise.race([worker.recognize(canvas,{}, {text:true,blocks:true}),cancelled])
   const result:OcrResult={text:data.text,confidence:data.confidence,width:canvas.width,height:canvas.height,lines:(data.blocks||[]).flatMap(b=>b.paragraphs.flatMap(p=>p.lines.map(l=>({text:l.text,confidence:l.confidence,bbox:l.bbox})))),words:(data.blocks||[]).flatMap(b=>b.paragraphs.flatMap(p=>p.lines.flatMap(l=>l.words.map(w=>({text:w.text,confidence:w.confidence,bbox:w.bbox})))))}
   // Re-read only detected course titles as isolated lines, where table segmentation
   // can otherwise drop a final Chinese character. Keep uncertain text editable.
   const titles=parseTable(result).slice(0,80).map(c=>result.lines!.find(l=>l.text.replace(/\s/g,'')===c.name)).filter((l):l is NonNullable<typeof l>=>!!l)
   if(titles.length){
    refining=true;await worker.setParameters({tessedit_pageseg_mode:PSM.SINGLE_LINE})
    for(let i=0;i<titles.length;i++){
     const line=titles[i],padding=(line.bbox.y1-line.bbox.y0)*1.5
     const left=Math.max(0,line.bbox.x0-padding),top=Math.max(0,line.bbox.y0-3)
     const rectangle={left:Math.floor(left),top:Math.floor(top),width:Math.floor(Math.min(canvas.width,line.bbox.x1+padding)-left),height:Math.floor(Math.min(canvas.height,line.bbox.y1+3)-top)}
     onProgress(.7+(i/titles.length)*.27,`增强课程文字识别 ${i+1}/${titles.length}`)
     const ret=await Promise.race([worker.recognize(canvas,{rectangle},{text:true}),cancelled])
     const text=ret.data.text.trim().replace(/^[|丨]+/,'').trim()
     if(text&&ret.data.confidence>=55&&!text.includes('\n')){line.text=text;line.confidence=ret.data.confidence}
    }
   }
   if(signal.aborted)throw new DOMException('Cancelled','AbortError')
   onProgress(1,'识别完成');return result
  }finally{signal.removeEventListener('abort',abortRecognition);terminate()}
 }finally{URL.revokeObjectURL(url)}
}
