import { useEffect, useRef, useState } from 'react'
import { Button, Input } from 'antd'
import { authService, isDemoMode } from '../../services/auth'

export type PhoneVerification = { phone: string; verificationId: string; verificationCode: string }
export function RegistrationPhone({schoolId,value,onChange,disabled}:{schoolId:string;value:PhoneVerification;onChange:(value:PhoneVerification)=>void;disabled:boolean}) {
  const [sending,setSending]=useState(false),[error,setError]=useState(''),[demoCode,setDemoCode]=useState(''),[deadline,setDeadline]=useState(0),[remaining,setRemaining]=useState(0),[expires,setExpires]=useState(0)
  const version=useRef(0),pending=useRef(false)
  useEffect(()=>()=>{version.current++},[])
  useEffect(()=>{if(!deadline)return;const timer=setInterval(()=>setRemaining(Math.max(0,Math.ceil((deadline-Date.now())/1000))),250);return()=>clearInterval(timer)},[deadline])
  const request=async()=>{
    if(pending.current||remaining||disabled)return
    pending.current=true;setSending(true);setError('')
    const attempt=++version.current
    try {
      const response=await authService.requestRegistrationCode({schoolId,phone:value.phone})
      if(attempt!==version.current)return
      onChange({...value,verificationId:response.verificationId,verificationCode:''})
      setDemoCode(isDemoMode?response.demoCode||'':'');setExpires(response.expiresIn);setRemaining(response.resendAfter);setDeadline(Date.now()+response.resendAfter*1000)
    } catch(reason) {if(attempt===version.current)setError(reason instanceof Error?reason.message:'验证码获取失败，请重试。')}
    finally {if(attempt===version.current){pending.current=false;setSending(false)}}
  }
  return <div className="registration-phone-fields"><div className="account-field"><label htmlFor="register-phone">手机号码</label><Input id="register-phone" type="tel" inputMode="tel" autoComplete="tel-national" prefix={<span className="registration-phone-prefix">+86</span>} placeholder="中国大陆 11 位手机号" maxLength={11} disabled={disabled} value={value.phone} onChange={event=>{version.current++;pending.current=false;setSending(false);setError('');setDemoCode('');setExpires(0);setRemaining(0);setDeadline(0);onChange({phone:event.target.value.replace(/\D/g,''),verificationId:'',verificationCode:''})}}/></div>
    <div className="account-field"><label htmlFor="register-sms-code">手机验证码</label><div className="registration-code-row"><Input id="register-sms-code" inputMode="numeric" autoComplete="one-time-code" placeholder="6 位验证码" maxLength={6} disabled={disabled} value={value.verificationCode} onChange={event=>onChange({...value,verificationCode:event.target.value.replace(/\D/g,'')})}/><Button htmlType="button" loading={sending} disabled={disabled||sending||remaining>0||!schoolId||!/^1[3-9]\d{9}$/.test(value.phone)} onClick={()=>void request()}>{remaining?`${remaining} 秒后重试`:'获取验证码'}</Button></div></div>
    {error&&<p className="account-error" role="alert">{error}</p>}
    {value.verificationId&&<p className="registration-code-status" role="status">{isDemoMode?'演示模式，未发送真实短信。':'验证码已发送，请查看手机短信。'}有效期 {Math.ceil(expires/60)} 分钟。</p>}
    {demoCode&&<div className="registration-demo-code"><span>演示验证码：<b>{demoCode}</b></span><button type="button" disabled={disabled} onClick={()=>onChange({...value,verificationCode:demoCode})}>填入演示验证码</button></div>}
  </div>
}
