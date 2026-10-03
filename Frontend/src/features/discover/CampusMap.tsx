import { rooms } from '../../data/hubData'
export function CampusMap({ selected, select }: { selected: string | null; select: (id: string) => void }) {
 const current=rooms.find(r=>r.building===selected)
 return <div className="guide-map-v2"><svg viewBox="0 0 400 300" role="img" aria-label="样例校园地图，可选择楼栋">
 <rect width="400" height="300" fill="#edf0e8"/><path d="M8 35Q90 65 75 150T40 280M350 0Q315 65 351 126T370 300" stroke="#d9e4d4" strokeWidth="28" fill="none"/>
 <rect x="143" y="14" width="106" height="50" rx="5" fill="#d3d8cc"/><text x="196" y="43" textAnchor="middle" fill="#687665" fontSize="11">图书馆</text>
 <ellipse cx="335" cy="238" rx="44" ry="22" fill="#d9e7e9"/><text x="335" y="242" textAnchor="middle" fill="#678185" fontSize="9">湖畔步道</text>
 <path d="M200 300V76M0 146H400M60 254H306" stroke="#fffdf8" strokeWidth="21" fill="none"/>
 <path d="M200 300V76M0 146H400" stroke="#ddd7ca" strokeWidth="1" strokeDasharray="3 5" fill="none"/>
 {rooms.filter((r,i,all)=>all.findIndex(x=>x.building===r.building)===i).map(r=><g key={r.id}><rect x={r.x*4-51} y={r.y*3-23} width="102" height="46" rx="5" fill={r.building===current?.building?'#a26348':'#ded7c9'} stroke="#cfc6b7"/><path d={`M${r.x*4-40} ${r.y*3-13}h80`} stroke="#fff8" strokeWidth="3"/></g>)}
 <circle cx="200" cy="282" r="6" fill="#aa6042" stroke="white" strokeWidth="3"/><text x="217" y="286" fontSize="10" fill="#746354">南门</text>
 <text x="369" y="24" fontSize="12" fill="#746354">N ↑</text>
 </svg><div className="map-select-layer">{rooms.filter((r,i,all)=>all.findIndex(x=>x.building===r.building)===i).map(r=><button key={r.id} style={{left:`${r.x}%`,top:`${r.y}%`}} aria-pressed={r.building===current?.building} className={r.building===current?.building?'chosen':''} onClick={()=>select(r.building)}>{r.building}</button>)}</div><span className="map-sample">样例校园 · 非实景地图</span></div>
}

