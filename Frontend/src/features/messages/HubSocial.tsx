import { ChatOptions } from './ChatOptions'
import { useSocial } from './socialContext'
import { PhotoAlbum } from '../../components/shared/PhotoAlbum'
import { UserAvatar } from '../../components/shared/UserAvatar'
import { useState } from 'react'
import { Button, Drawer, Input } from 'antd'
import { Icon } from '../../components/shared/Shared'
import { sampleProductPhotos } from '../../data/hubSocialData'
import type { MarketItem } from '../../data/hubData'
export function Person({ name, small=false }: {name:string;small?:boolean}) {return <span className={`hub-person ${small?'small':''}`}><UserAvatar name={name} className="hub-avatar">{name.replace('同学','').slice(-2)}</UserAvatar>{!small&&<span><b>{name}</b><small>校园同学 · 演示身份</small></span>}</span>}
export function ProductPhotos({item}: {item:MarketItem}) {const images=item.photos || sampleProductPhotos[item.id] || [];return images.length?<><PhotoAlbum images={images} label={item.title}/>{!item.photos&&<small className="photo-credit">示意照片，非卖家实拍 · <a href="https://unsplash.com" target="_blank" rel="noreferrer">Unsplash</a></small>}</>:<p className="hub-caption">卖家暂未提供照片，请联系确认实物情况。</p>}
export type HubConversation={id:string;kind:'market'|'group';title:string;person:string}
export function HubChat({conversation,close,allowed}:{conversation:HubConversation|null;close:()=>void;allowed:boolean}) {
 const social=useSocial()
 const [draft,setDraft]=useState('')
 const [history,setHistory]=useState<Record<string,{text:string;mine:boolean}[]>>({})
 const list=conversation?history[conversation.id]||[]:[]
 return <Drawer extra={conversation&&<ChatOptions key={conversation.id} messages={list.map((m,i)=>({id:'service-'+conversation.id+'-'+i,text:m.text,author:m.mine?'我':conversation.person}))} clear={()=>setHistory(prev=>({...prev,[conversation.id]:[]}))} profile={conversation.kind==='market'?()=>social.open(conversation.person):undefined}/>} zIndex={1400} rootClassName="hub-chat-root" className="service-chat-drawer" closeIcon={<Icon name="back"/>} title={conversation?.kind==='group'?'活动群聊':conversation?.person} open={!!conversation} onClose={()=>{setDraft('');close()}} placement="bottom"><div className="hub-chat-context"><Person name={conversation?.person||'同学'}/><p>{conversation?.title}</p><small>{conversation?.kind==='group'?'仅已加入成员可发言，退出或活动结束后停止发送。':'沟通仅关联这件商品，不会自动添加好友。'}</small></div><p className="hub-caption">本机消息演示，未连接真实用户；不会伪造对方回复。</p><div className="hub-chat-log" role="log">{!list.length&&<p>可以在这里询问价格、确认位置或商量集合安排。</p>}{list.map((m,i)=><div id={'service-'+conversation?.id+'-'+i} tabIndex={-1} className="listen-mine" key={i}>{m.text}<small>仅本机记录</small></div>)}</div><form className="listen-composer" onSubmit={e=>{e.preventDefault();if(conversation&&allowed&&draft.trim()){setHistory(prev=>({...prev,[conversation.id]:[...(prev[conversation.id]||[]),{text:draft.trim(),mine:true}]}));setDraft('')}}}><Input aria-label="服务聊天消息" value={draft} onChange={e=>setDraft(e.target.value)} maxLength={1000} disabled={!allowed} placeholder={allowed?'说点什么…':'当前状态不能发送消息'}/><Button htmlType="submit" type="primary" disabled={!allowed||!draft.trim()}>发送</Button></form></Drawer>
}

