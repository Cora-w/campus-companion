export function StaffFormSteps({ labels, step }: { labels:string[]; step:number }) {
  return <ol className="staff-form-steps" aria-label="填写进度">{labels.map((label,index)=><li key={label} aria-current={index===step?'step':undefined} className={index===step?'active':index<step?'complete':''}><span>{index+1}</span><b>{label}</b></li>)}</ol>
}
