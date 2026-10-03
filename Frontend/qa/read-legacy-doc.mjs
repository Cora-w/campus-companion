import {readFileSync} from 'node:fs'
const b=readFileSync('C:/wechat_history/xwechat_files/wxid_usfpxmu0twhb22_aaed/msg/file/2026-09/20260611计算机软件著作权登记申请表.doc')
const size=2**b.readUInt16LE(30), miniSize=2**b.readUInt16LE(32)
const sector=n=>b.subarray((n+1)*size,(n+2)*size)
const dif=[];for(let i=0;i<109;i++){const n=b.readUInt32LE(76+i*4);if(n<0xfffffffa)dif.push(n)}
let ds=b.readUInt32LE(68);for(let j=0;j<b.readUInt32LE(72);j++){const x=sector(ds);for(let i=0;i<size/4-1;i++){const n=x.readUInt32LE(i*4);if(n<0xfffffffa)dif.push(n)}ds=x.readUInt32LE(size-4)}
const fat=Buffer.concat(dif.map(sector));
const chain=(start,table,get)=>{const chunks=[];let n=start;const seen=new Set();while(n<0xfffffffa){if(seen.has(n))throw Error('cycle');seen.add(n);chunks.push(get(n));n=table.readUInt32LE(n*4)}return Buffer.concat(chunks)}
const regular=n=>chain(n,fat,sector)
const dir=regular(b.readUInt32LE(48));const entries=[];for(let i=0;i<dir.length;i+=128){const x=dir.subarray(i,i+128);if(x[66])entries.push({name:x.subarray(0,x.readUInt16LE(64)-2).toString('utf16le'),type:x[66],start:x.readUInt32LE(116),len:Number(x.readBigUInt64LE(120))})}
const root=entries.find(e=>e.type===5),minis=regular(root.start), miniFat=regular(b.readUInt32LE(60));
const stream=name=>{const e=entries.find(e=>e.name===name);if(!e)throw Error(name);return (e.len<4096?chain(e.start,miniFat,n=>minis.subarray(n*miniSize,(n+1)*miniSize)):regular(e.start)).subarray(0,e.len)}
const w=stream('WordDocument');const t=stream(w.readUInt16LE(10)&0x200?'1Table':'0Table');
let off=32;const csw=w.readUInt16LE(off);off+=2+csw*2;const cslw=w.readUInt16LE(off);off+=2+cslw*4;off+=2;
const fc=w.readUInt32LE(off+33*8),len=w.readUInt32LE(off+33*8+4);const clx=t.subarray(fc,fc+len)
let pos=0;while(clx[pos]===1)pos+=3+clx.readUInt16LE(pos+1);if(clx[pos]!==2)throw Error('piece table missing');const l=clx.readUInt32LE(pos+1),plc=clx.subarray(pos+5,pos+5+l),count=(l-4)/12;
let result='';for(let i=0;i<count;i++){const n=plc.readUInt32LE((i+1)*4)-plc.readUInt32LE(i*4),p=4*(count+1)+i*8,raw=plc.readUInt32LE(p+2),compressed=!!(raw&0x40000000),offset=(raw&0x3fffffff)/(compressed?2:1);result+=w.subarray(offset,offset+n*(compressed?1:2)).toString(compressed?'latin1':'utf16le')}
console.log(result.replace(/\r/g,'\n').replace(/\x07/g,' | ').replace(/[\x00-\x06\x08\x0b-\x1f]/g,''))
