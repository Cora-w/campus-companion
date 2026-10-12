import { useState } from 'react'
import { Drawer } from '../../navigation/BackOverlays'
import { Icon } from './Shared'

export function StaffHelp({ role }: { role:'teacher'|'admin' }) {
  const [open,setOpen] = useState(false)
  const topics = role === 'teacher' ? [
    ['工作待办','先复核状态摘要，再安排沟通、回访与必要的校内协调。'],
    ['学生档案','列表显示负责学生的必要信息。打开档案后，可切换概览与服务记录。'],
    ['约谈与记录','只可邀请已经复核并接手的学生；学生确认后，再标记会谈完成。记录依据实际沟通填写。'],
    ['授权与隐私','教师仅查看授权摘要和服务记录，不提供私人聊天原文。AI 线索由教师复核。'],
  ] : [
    ['账号管理','搜索和筛选账号，打开账号详情后编辑资料、调整身份或启停账号。当前登录账号不可停用或变更角色。'],
    ['开店授权','学生身份保持不变。授予权限后，学生可在“我的”中管理自己的店铺；收回授权会暂停接收新订单。'],
    ['校园服务','发布通知、处理学生反馈；重要变更会先要求确认。'],
    ['记录与权限','操作记录从“我的”进入。管理员不查看学生私人聊天或心理辅导档案。'],
  ]
  return <><button className="staff-help-button" aria-label="使用帮助" onClick={()=>setOpen(true)}><Icon name="help"/></button>
    <Drawer rootClassName="staff-help-overlay" className="staff-help-drawer" title="使用帮助" open={open} placement="right" size="min(480px, 100vw)" onClose={()=>setOpen(false)} destroyOnHidden>
      {topics.map(([title,body])=><section className="staff-help-topic" key={title}><h2>{title}</h2><p>{body}</p></section>)}
      <section className="staff-help-topic"><h2>当前体验</h2><p>当前使用演示数据，不发送真实推送。刷新会恢复样例，请勿输入真实隐私信息。</p></section>
    </Drawer></>
}
